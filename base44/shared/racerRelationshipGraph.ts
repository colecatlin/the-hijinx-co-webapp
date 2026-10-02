/**
 * racerRelationshipGraph.ts — reusable validation for the canonical racer chain.
 *
 * PersonIdentity → RacerProfile → SeasonParticipation → Entry → Results/Standings
 *
 * Every import, repair and creation path calls validateRacerRelationshipGraph
 * before committing a downstream relationship, so a dangling link is caught at
 * the point it would be created rather than discovered later.
 *
 * Errors are integrity failures (the canonical chain is broken).
 * Warnings are compatibility or completeness concerns (legacy Driver missing,
 * a second profile for one identity, an orphan participation).
 */

export const CRITICAL_GRAPH_CODES = [
  'MISSING_PERSON_IDENTITY',
  'MISSING_RACER_PROFILE',
  'DANGLING_PROFILE_IDENTITY',
  'IDENTITY_PROFILE_MISMATCH',
  'DUPLICATE_RACER_PROFILE',
  'DANGLING_PARTICIPATION_PROFILE',
  'PARTICIPATION_IDENTITY_MISMATCH',
];

export interface GraphIssue {
  code: string;
  message: string;
  entity: string;
  id: string | null;
  severity: 'error' | 'warning';
}

export interface RacerGraphValidation {
  ok: boolean;
  errors: GraphIssue[];
  warnings: GraphIssue[];
  blocking: GraphIssue[];
  identity: any | null;
  racer_profile: any | null;
  legacy_driver: any | null;
  participations: any[];
  participation_ids: string[];
  entries: any[];
  results: any[];
  standings: any[];
}

function issue(list: GraphIssue[], severity: 'error' | 'warning', code: string, message: string, entity: string, id: string | null) {
  list.push({ code, message, entity, id: id || null, severity });
}

const MAX_DOWNSTREAM = 500;

/**
 * Validate the graph around a PersonIdentity and/or a RacerProfile.
 * Read-only. Never writes, never repairs.
 */
export async function validateRacerRelationshipGraph(
  sr: any,
  target: { person_identity_id?: string | null; racer_profile_id?: string | null },
): Promise<RacerGraphValidation> {
  const errors: GraphIssue[] = [];
  const warnings: GraphIssue[] = [];

  let identity: any = null;
  let profile: any = null;

  // ── Resolve the profile first (it carries both links) ──
  if (target.racer_profile_id) {
    profile = await sr.entities.RacerProfile.get(target.racer_profile_id).catch(() => null);
    if (!profile) {
      issue(errors, 'error', 'MISSING_RACER_PROFILE', 'RacerProfile does not exist', 'RacerProfile', target.racer_profile_id);
    }
  }

  const identityId = target.person_identity_id || profile?.person_identity_id || null;
  if (!identityId) {
    if (profile) {
      issue(errors, 'error', 'MISSING_PERSON_IDENTITY', 'RacerProfile has no person_identity_id', 'RacerProfile', profile.id);
    }
  } else {
    identity = await sr.entities.PersonIdentity.get(identityId).catch(() => null);
    if (!identity) {
      issue(errors, 'error', 'MISSING_PERSON_IDENTITY', 'PersonIdentity does not exist', 'PersonIdentity', identityId);
    }
  }

  // ── Identity ↔ profile ──
  if (identity) {
    const profiles = await sr.entities.RacerProfile
      .filter({ person_identity_id: identity.id, is_archived: false }).catch(() => []);
    const list = (profiles || []).filter((p: any) => p);
    if (!profile && list.length === 0) {
      issue(errors, 'error', 'MISSING_RACER_PROFILE', 'PersonIdentity has no RacerProfile', 'PersonIdentity', identity.id);
    }
    if (list.length > 1) {
      issue(errors, 'error', 'DUPLICATE_RACER_PROFILE', 'PersonIdentity has ' + list.length + ' RacerProfiles', 'PersonIdentity', identity.id);
    }
    if (profile && list.length > 0 && !list.some((p: any) => p.id === profile.id)) {
      issue(errors, 'error', 'IDENTITY_PROFILE_MISMATCH', 'RacerProfile does not belong to this PersonIdentity', 'RacerProfile', profile.id);
    }
  }

  // ── Legacy Driver compatibility (warning-level: never blocks publication) ──
  let legacyDriver: any = null;
  const legacyId = profile?.legacy_driver_id || identity?.canonical_driver_id || null;
  if (legacyId) {
    legacyDriver = await sr.entities.Driver.get(legacyId).catch(() => null);
    if (!legacyDriver) {
      issue(warnings, 'warning', 'DANGLING_LEGACY_DRIVER', 'Legacy Driver reference does not resolve', 'Driver', legacyId);
    }
  }
  if (identity?.canonical_driver_id && profile?.legacy_driver_id
      && identity.canonical_driver_id !== profile.legacy_driver_id) {
    issue(warnings, 'warning', 'LEGACY_DRIVER_LINK_MISMATCH', 'Identity canonical Driver differs from the profile legacy Driver', 'PersonIdentity', identity.id);
  }

  // ── Participations ──
  const participations: any[] = [];
  if (profile) {
    const rows = await sr.entities.SeasonParticipation
      .filter({ racer_profile_id: profile.id }).catch(() => []);
    for (const p of (rows || [])) {
      if (!p) continue;
      participations.push(p);
      if (!p.person_identity_id) {
        issue(warnings, 'warning', 'PARTICIPATION_IDENTITY_MISSING', 'Participation has no denormalized person_identity_id', 'SeasonParticipation', p.id);
      } else if (identity && p.person_identity_id !== identity.id) {
        issue(errors, 'error', 'PARTICIPATION_IDENTITY_MISMATCH', 'Participation points at a different PersonIdentity', 'SeasonParticipation', p.id);
      }
      if (!p.series_id) {
        issue(errors, 'error', 'PARTICIPATION_SERIES_MISSING', 'Participation has no series_id', 'SeasonParticipation', p.id);
      }
      if (p.legacy_driver_id) {
        const d = await sr.entities.Driver.get(p.legacy_driver_id).catch(() => null);
        if (!d) {
          issue(warnings, 'warning', 'DANGLING_PARTICIPATION_DRIVER', 'Participation legacy Driver does not resolve', 'SeasonParticipation', p.id);
        }
      }
    }
  }

  // ── Orphan participations claiming this identity but pointing elsewhere ──
  if (identity) {
    const byIdentity = await sr.entities.SeasonParticipation
      .filter({ person_identity_id: identity.id }).catch(() => []);
    for (const p of (byIdentity || [])) {
      if (!p) continue;
      if (profile && p.racer_profile_id && p.racer_profile_id !== profile.id) {
        issue(errors, 'error', 'DANGLING_PARTICIPATION_PROFILE', 'Participation racer_profile_id does not resolve to this RacerProfile', 'SeasonParticipation', p.id);
      }
      if (p.racer_profile_id) {
        const rp = await sr.entities.RacerProfile.get(p.racer_profile_id).catch(() => null);
        if (!rp) {
          issue(errors, 'error', 'DANGLING_PARTICIPATION_PROFILE', 'Participation racer_profile_id does not exist', 'SeasonParticipation', p.id);
        }
      }
    }
  }

  const participationIds = participations.map((p: any) => p.id);

  // ── Entry → Results → Standings (bounded) ──
  const entries: any[] = [];
  const results: any[] = [];
  const standings: any[] = [];

  if (participationIds.length > 0) {
    for (const pid of participationIds) {
      if (entries.length >= MAX_DOWNSTREAM) break;
      const rows = await sr.entities.Entry.filter({ participation_id: pid }).catch(() => []);
      for (const e of (rows || [])) if (e) entries.push(e);
    }
    for (const pid of participationIds) {
      if (results.length >= MAX_DOWNSTREAM) break;
      const rows = await sr.entities.Results.filter({ participation_id: pid }).catch(() => []);
      for (const r of (rows || [])) if (r) results.push(r);
    }
    for (const pid of participationIds) {
      if (standings.length >= MAX_DOWNSTREAM) break;
      const rows = await sr.entities.Standings.filter({ participation_id: pid }).catch(() => []);
      for (const s of (rows || [])) if (s) standings.push(s);
    }
  }

  const entryIds = new Set<string>(entries.map((e: any) => e.id));
  for (const e of entries) {
    if (e.participation_id && !participationIds.includes(e.participation_id)) {
      issue(errors, 'error', 'DANGLING_ENTRY_PARTICIPATION', 'Entry participation_id is not one of this racer’s participations', 'Entry', e.id);
    }
  }
  for (const r of results) {
    if (r.entry_id && !entryIds.has(r.entry_id)) {
      const entry = await sr.entities.Entry.get(r.entry_id).catch(() => null);
      if (!entry) {
        issue(errors, 'error', 'DANGLING_RESULT_ENTRY', 'Result entry_id does not exist', 'Results', r.id);
      }
    }
  }
  for (const s of standings) {
    if (s.participation_id && !participationIds.includes(s.participation_id)) {
      issue(errors, 'error', 'DANGLING_STANDING_PARTICIPATION', 'Standing participation_id is not one of this racer’s participations', 'Standings', s.id);
    }
  }

  const blocking = errors.filter((e) => CRITICAL_GRAPH_CODES.includes(e.code));

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    blocking,
    identity,
    racer_profile: profile,
    legacy_driver: legacyDriver,
    participations,
    participation_ids: participationIds,
    entries,
    results,
    standings,
  };
}

/**
 * Publication gate: integrity only. A racer with a valid identity, profile,
 * slug and display name publishes even when its bio, images, team, results,
 * standings or social links are missing — those are completeness, not integrity.
 */
export function isPublishable(graph: RacerGraphValidation): { publishable: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (!graph.identity) blockers.push('PersonIdentity is missing');
  if (!graph.racer_profile) blockers.push('RacerProfile is missing');
  if (graph.racer_profile && !graph.racer_profile.display_name) blockers.push('Display name is missing');
  if (graph.racer_profile && !graph.racer_profile.slug) blockers.push('Public slug is missing');
  for (const b of graph.blocking) blockers.push(b.code + (b.id ? ' (' + b.id + ')' : ''));
  return { publishable: blockers.length === 0, blockers };
}