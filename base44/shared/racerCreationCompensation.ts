/**
 * racerCreationCompensation.ts — rollback for a racer commit that stopped half way.
 *
 * A racer is created as a chain: PersonIdentity → RacerProfile → RaceCore ID →
 * workbook linkage. The runtime has no multi-record transaction, so the chain is
 * made safe by compensating cleanup: if this commit created the PersonIdentity
 * and the rest of the chain did not complete, the identity this commit created is
 * removed again, so a half-built racer can never be mistaken for one that
 * arrived. Nothing that existed before this commit is ever touched.
 */

export interface PartialRacerDecision {
  /** True when THIS commit created the PersonIdentity. */
  identityCreated: boolean;
  /** The outcome the racer row reached: 'created' | 'skipped' | 'failed'. */
  outcome: string;
  /** True when the identity already owns a RacerProfile. */
  profileExists: boolean;
}

/**
 * A racer commit is rolled back only when all three hold: this commit created
 * the identity, no racer profile exists for it, and the row did not settle as
 * created. A reused identity, or one that already has a profile, is never
 * removed — that would destroy real racer state.
 */
export function shouldCompensatePartialRacer(input: PartialRacerDecision): boolean {
  if (!input || input.identityCreated !== true) return false;
  if (input.profileExists === true) return false;
  return input.outcome !== 'created';
}

export interface CompensationInput {
  person_identity_id?: string | null;
  /** Alias ids created by this commit only. */
  created_alias_ids?: string[] | null;
  /** Evidence id created by this commit only. */
  evidence_id?: string | null;
  reason?: string | null;
  import_run_id?: string | null;
  actor?: { id?: string | null; full_name?: string | null } | null;
}

export interface CompensationResult {
  rolled_back: boolean;
  reason: string;
  removed: { aliases: number; evidence: number; identity: boolean };
}

/**
 * Remove the identity this commit created, plus the alias and evidence rows it
 * wrote for that identity. Refuses to act when the identity owns a profile, so a
 * half-built commit can never delete a real racer.
 */
export async function compensatePartialRacerCreation(sr: any, input: CompensationInput): Promise<CompensationResult> {
  const removed = { aliases: 0, evidence: 0, identity: false };
  const identityId = input && input.person_identity_id;
  if (!identityId) {
    return { rolled_back: false, reason: 'nothing_to_roll_back', removed };
  }

  // Deliberately not swallowed: if the profile check cannot be read, we abort
  // rather than risk deleting an identity that does own a profile.
  const profiles = await sr.entities.RacerProfile.filter({ person_identity_id: identityId });
  if ((profiles || []).length > 0) {
    return { rolled_back: false, reason: 'identity_owns_a_racer_profile', removed };
  }

  for (const aliasId of input.created_alias_ids || []) {
    if (!aliasId) continue;
    try {
      await sr.entities.IdentityAlias.delete(aliasId);
      removed.aliases += 1;
    } catch (error) { /* best-effort: a stale alias is inert */ }
  }

  if (input.evidence_id) {
    try {
      await sr.entities.IdentityEvidence.delete(input.evidence_id);
      removed.evidence = 1;
    } catch (error) { /* best-effort: evidence may already be gone */ }
  }

  try {
    await sr.entities.PersonIdentity.delete(identityId);
    removed.identity = true;
  } catch (error) {
    return { rolled_back: false, reason: 'identity_could_not_be_removed', removed };
  }

  await sr.entities.AuditLog.create({
    entity_type: 'PersonIdentity',
    entity_id: identityId,
    entity_name: null,
    action: 'deleted',
    performed_by: (input.actor && input.actor.id) || 'system',
    performed_by_name: (input.actor && input.actor.full_name) || null,
    timestamp: new Date().toISOString(),
    notes: 'Rolled back a racer commit that did not complete: ' +
      (input.reason || 'the racer profile was never established') +
      '. The identity this commit created was removed so an incomplete racer cannot be mistaken for one that arrived.',
  }).catch(() => null);

  return { rolled_back: removed.identity, reason: input.reason || 'partial_racer_creation', removed };
}