/**
 * racerIdentityRepair.ts — deterministic repair engine for the racer chain.
 *
 * Dry-run by default. Idempotent. Validates every target before writing.
 * Never deletes, and never guesses: an ambiguous or unprovable relationship is
 * reported for human review instead of being written.
 *
 * Repair order (fixed):
 *   1 RacerProfile → PersonIdentity
 *   2 RacerProfile → legacy Driver
 *   3 PersonIdentity → canonical Driver compatibility
 *   4 SeasonParticipation → RacerProfile
 *   5 SeasonParticipation → PersonIdentity
 *   6 SeasonParticipation → legacy Driver
 *   7 DriverImportIdentityLink validation
 *   8 DriverCareerStats → PersonIdentity
 *   9 ownership / claims
 *  10 slug aliases
 */

export interface RepairAction {
  phase: string;
  entity: string;
  id: string;
  outcome: string;
  message: string;
  changes?: Record<string, unknown>;
}

export interface RepairReport {
  dry_run: boolean;
  started_at: string;
  finished_at: string;
  actions: RepairAction[];
  counts: Record<string, number>;
  applied: number;
  review_required: number;
  truncated: boolean;
}

const DEFAULT_LIMIT = 500;

function push(report: RepairReport, action: RepairAction) {
  report.actions.push(action);
  report.counts[action.outcome] = (report.counts[action.outcome] || 0) + 1;
}

async function resolves(sr: any, entity: string, id: string | null | undefined): Promise<boolean> {
  if (!id) return false;
  const record = await sr.entities[entity].get(id).catch(() => null);
  return !!record;
}

async function applyChange(
  sr: any,
  report: RepairReport,
  action: RepairAction,
  write: () => Promise<unknown>,
) {
  if (report.dry_run) {
    push(report, action);
    return;
  }
  try {
    await write();
    report.applied += 1;
    push(report, action);
  } catch (error: any) {
    push(report, { ...action, outcome: 'ERROR', message: error?.message || 'write failed' });
  }
}

export async function repairRacerIdentityRelationships(
  sr: any,
  options: {
    dry_run?: boolean;
    limit?: number;
    audit_user_id?: string | null;
    audit_user_name?: string | null;
  } = {},
): Promise<RepairReport> {
  const dryRun = options.dry_run !== false;
  const limit = Math.min(options.limit || DEFAULT_LIMIT, 2000);
  const started = new Date().toISOString();

  const report: RepairReport = {
    dry_run: dryRun,
    started_at: started,
    finished_at: started,
    actions: [],
    counts: {},
    applied: 0,
    review_required: 0,
    truncated: false,
  };

  const profiles = await sr.entities.RacerProfile.list('-created_date', limit).catch(() => []);
  const participations = await sr.entities.SeasonParticipation.list('-created_date', limit).catch(() => []);
  const links = await sr.entities.DriverImportIdentityLink.list('-created_date', limit).catch(() => []);
  const statsRows = await sr.entities.DriverCareerStats.list('-created_date', limit).catch(() => []);

  const identities = await sr.entities.PersonIdentity.list('-created_date', limit).catch(() => []);
  const identityById = new Map<string, any>();
  for (const i of (identities || [])) if (i) identityById.set(i.id, i);

  const profileById = new Map<string, any>();
  for (const p of (profiles || [])) if (p) profileById.set(p.id, p);

  const profilesByIdentity = new Map<string, any[]>();
  for (const p of (profiles || [])) {
    if (!p || !p.person_identity_id) continue;
    if (!profilesByIdentity.has(p.person_identity_id)) profilesByIdentity.set(p.person_identity_id, []);
    (profilesByIdentity.get(p.person_identity_id) as any[]).push(p);
  }

  /** Link rows are the surviving proof of an identity ↔ Driver pairing. */
  const linkByIdentity = new Map<string, any>();
  const linkByDriver = new Map<string, any>();
  const linkByProfile = new Map<string, any>();
  for (const l of (links || [])) {
    if (!l) continue;
    if (l.person_identity_id && !linkByIdentity.has(l.person_identity_id)) linkByIdentity.set(l.person_identity_id, l);
    if (l.legacy_driver_id && !linkByDriver.has(l.legacy_driver_id)) linkByDriver.set(l.legacy_driver_id, l);
    if (l.racer_profile_id && !linkByProfile.has(l.racer_profile_id)) linkByProfile.set(l.racer_profile_id, l);
  }

  // ── 1. RacerProfile → PersonIdentity ─────────────────────────────────────
  for (const profile of (profiles || [])) {
    if (!profile) continue;
    const identityOk = await resolves(sr, 'PersonIdentity', profile.person_identity_id);
    if (identityOk) {
      push(report, { phase: 'racer_profile_to_identity', entity: 'RacerProfile', id: profile.id, outcome: 'ALREADY_VALID', message: 'person_identity_id resolves' });
      continue;
    }

    const candidates = new Set<string>();
    const link = linkByProfile.get(profile.id);
    if (link?.person_identity_id) candidates.add(link.person_identity_id);
    const byDriverLink = profile.legacy_driver_id ? linkByDriver.get(profile.legacy_driver_id) : null;
    if (byDriverLink?.person_identity_id) candidates.add(byDriverLink.person_identity_id);

    const proven: string[] = [];
    for (const candidateId of Array.from(candidates)) {
      if (await resolves(sr, 'PersonIdentity', candidateId)) proven.push(candidateId);
    }

    if (proven.length === 1) {
      await applyChange(sr, report, {
        phase: 'racer_profile_to_identity',
        entity: 'RacerProfile',
        id: profile.id,
        outcome: 'REPAIRED',
        message: 'person_identity_id recovered from an existing deterministic link',
        changes: { person_identity_id: proven[0] },
      }, () => sr.entities.RacerProfile.update(profile.id, { person_identity_id: proven[0] }));
    } else {
      report.review_required += 1;
      push(report, {
        phase: 'racer_profile_to_identity',
        entity: 'RacerProfile',
        id: profile.id,
        outcome: proven.length > 1 ? 'REVIEW_REQUIRED' : 'REVIEW_REQUIRED',
        message: proven.length > 1
          ? 'More than one identity candidate — needs a human decision'
          : 'No deterministic identity could be proven (no fuzzy or name-only matching)',
      });
    }
  }

  // ── 2. RacerProfile → legacy Driver ──────────────────────────────────────
  for (const profile of (profiles || [])) {
    if (!profile) continue;
    const driverOk = await resolves(sr, 'Driver', profile.legacy_driver_id);
    if (driverOk) {
      push(report, { phase: 'racer_profile_to_legacy_driver', entity: 'RacerProfile', id: profile.id, outcome: 'ALREADY_VALID', message: 'legacy_driver_id resolves' });
      continue;
    }
    const identity = identityById.get(profile.person_identity_id);
    const candidates: string[] = [];
    if (identity?.canonical_driver_id && await resolves(sr, 'Driver', identity.canonical_driver_id)) candidates.push(identity.canonical_driver_id);
    const link = linkByProfile.get(profile.id);
    if (link?.legacy_driver_id && await resolves(sr, 'Driver', link.legacy_driver_id)) candidates.push(link.legacy_driver_id);

    const unique = Array.from(new Set(candidates));
    if (!profile.legacy_driver_id && unique.length === 1) {
      await applyChange(sr, report, {
        phase: 'racer_profile_to_legacy_driver',
        entity: 'RacerProfile',
        id: profile.id,
        outcome: 'REPAIRED',
        message: 'legacy Driver compatibility link set from a proven surviving Driver',
        changes: { legacy_driver_id: unique[0] },
      }, () => sr.entities.RacerProfile.update(profile.id, { legacy_driver_id: unique[0] }));
    } else if (profile.legacy_driver_id) {
      report.review_required += 1;
      push(report, {
        phase: 'racer_profile_to_legacy_driver',
        entity: 'RacerProfile',
        id: profile.id,
        outcome: 'MISSING_CANONICAL_DRIVER',
        message: 'Legacy Driver reference is dangling and no deterministic replacement exists',
      });
    } else {
      push(report, {
        phase: 'racer_profile_to_legacy_driver',
        entity: 'RacerProfile',
        id: profile.id,
        outcome: 'SKIPPED',
        message: 'No legacy Driver reference — compatibility link left unset rather than fabricated',
      });
    }
  }

  // ── 3. PersonIdentity → canonical Driver compatibility ───────────────────
  for (const identity of (identities || [])) {
    if (!identity) continue;
    if (identity.status === 'merged') continue;
    const currentOk = await resolves(sr, 'Driver', identity.canonical_driver_id);
    if (currentOk) {
      push(report, { phase: 'identity_to_canonical_driver', entity: 'PersonIdentity', id: identity.id, outcome: 'ALREADY_VALID', message: 'canonical_driver_id resolves' });
      continue;
    }

    const candidates: string[] = [];
    const owned = profilesByIdentity.get(identity.id) || [];
    for (const p of owned) {
      if (p.legacy_driver_id && await resolves(sr, 'Driver', p.legacy_driver_id)) candidates.push(p.legacy_driver_id);
    }
    const link = linkByIdentity.get(identity.id);
    if (link?.legacy_driver_id && await resolves(sr, 'Driver', link.legacy_driver_id)) candidates.push(link.legacy_driver_id);

    const unique = Array.from(new Set(candidates));
    if (unique.length === 1) {
      await applyChange(sr, report, {
        phase: 'identity_to_canonical_driver',
        entity: 'PersonIdentity',
        id: identity.id,
        outcome: 'REPAIRED',
        message: 'canonical_driver_id set from a proven surviving Driver',
        changes: { canonical_driver_id: unique[0] },
      }, () => sr.entities.PersonIdentity.update(identity.id, { canonical_driver_id: unique[0] }));
    } else {
      if (identity.canonical_driver_id) report.review_required += 1;
      push(report, {
        phase: 'identity_to_canonical_driver',
        entity: 'PersonIdentity',
        id: identity.id,
        outcome: 'MISSING_CANONICAL_DRIVER',
        message: unique.length > 1
          ? 'Multiple Driver candidates — needs a human decision'
          : 'No deterministic Driver could be proven; field left unset',
      });
    }
  }

  // ── 4-6. SeasonParticipation ─────────────────────────────────────────────
  for (const participation of (participations || [])) {
    if (!participation) continue;

    // 4 — racer_profile_id
    let profileId = participation.racer_profile_id;
    const profileOk = await resolves(sr, 'RacerProfile', profileId);
    if (profileOk && profileById.has(profileId) && participation.person_identity_id
        && profileById.get(profileId).person_identity_id !== participation.person_identity_id) {
      report.review_required += 1;
      push(report, {
        phase: 'participation_to_profile',
        entity: 'SeasonParticipation',
        id: participation.id,
        outcome: 'REVIEW_REQUIRED',
        message: 'Participation racer_profile_id resolves to a different identity than its person_identity_id',
      });
    } else if (profileOk) {
      push(report, { phase: 'participation_to_profile', entity: 'SeasonParticipation', id: participation.id, outcome: 'ALREADY_VALID', message: 'racer_profile_id resolves' });
    } else {
      const identityId = participation.person_identity_id;
      const candidates = identityId ? (profilesByIdentity.get(identityId) || []) : [];
      if (candidates.length === 1) {
        profileId = candidates[0].id;
        await applyChange(sr, report, {
          phase: 'participation_to_profile',
          entity: 'SeasonParticipation',
          id: participation.id,
          outcome: 'REPAIRED',
          message: 'racer_profile_id repaired through the participation person_identity_id',
          changes: { racer_profile_id: profileId },
        }, () => sr.entities.SeasonParticipation.update(participation.id, { racer_profile_id: profileId }));
      } else if (candidates.length > 1) {
        report.review_required += 1;
        push(report, { phase: 'participation_to_profile', entity: 'SeasonParticipation', id: participation.id, outcome: 'AMBIGUOUS_RACER_PROFILE', message: candidates.length + ' RacerProfiles exist for this identity' });
      } else {
        report.review_required += 1;
        push(report, { phase: 'participation_to_profile', entity: 'SeasonParticipation', id: participation.id, outcome: 'MISSING_RACER_PROFILE', message: 'No RacerProfile exists for this participation’s identity' });
      }
    }

    const resolvedProfile = profileId ? profileById.get(profileId) || null : null;

    // 5 — person_identity_id
    if (resolvedProfile && (!participation.person_identity_id || !identityById.has(participation.person_identity_id))) {
      if (resolvedProfile.person_identity_id && identityById.has(resolvedProfile.person_identity_id)) {
        await applyChange(sr, report, {
          phase: 'participation_to_identity',
          entity: 'SeasonParticipation',
          id: participation.id,
          outcome: 'REPAIRED',
          message: 'person_identity_id repaired from the resolved RacerProfile',
          changes: { person_identity_id: resolvedProfile.person_identity_id },
        }, () => sr.entities.SeasonParticipation.update(participation.id, { person_identity_id: resolvedProfile.person_identity_id }));
      }
    }

    // 6 — legacy Driver
    if (participation.legacy_driver_id) {
      const driverOk = await resolves(sr, 'Driver', participation.legacy_driver_id);
      if (!driverOk) {
        const replacement = resolvedProfile?.legacy_driver_id
          && await resolves(sr, 'Driver', resolvedProfile.legacy_driver_id)
          ? resolvedProfile.legacy_driver_id : null;
        if (replacement) {
          await applyChange(sr, report, {
            phase: 'participation_to_legacy_driver',
            entity: 'SeasonParticipation',
            id: participation.id,
            outcome: 'REPAIRED',
            message: 'legacy_driver_id repaired from the RacerProfile’s proven Driver',
            changes: { legacy_driver_id: replacement },
          }, () => sr.entities.SeasonParticipation.update(participation.id, { legacy_driver_id: replacement }));
        } else {
          push(report, { phase: 'participation_to_legacy_driver', entity: 'SeasonParticipation', id: participation.id, outcome: 'MISSING_CANONICAL_DRIVER', message: 'Dangling legacy_driver_id with no deterministic replacement' });
        }
      }
    } else if (resolvedProfile?.legacy_driver_id
        && await resolves(sr, 'Driver', resolvedProfile.legacy_driver_id)) {
      await applyChange(sr, report, {
        phase: 'participation_to_legacy_driver',
        entity: 'SeasonParticipation',
        id: participation.id,
        outcome: 'REPAIRED',
        message: 'legacy_driver_id set from the RacerProfile compatibility link',
        changes: { legacy_driver_id: resolvedProfile.legacy_driver_id },
      }, () => sr.entities.SeasonParticipation.update(participation.id, { legacy_driver_id: resolvedProfile.legacy_driver_id }));
    }
  }

  // ── 7. DriverImportIdentityLink validation ────────────────────────────────
  for (const link of (links || [])) {
    if (!link) continue;
    const problems: string[] = [];
    if (link.person_identity_id && !(await resolves(sr, 'PersonIdentity', link.person_identity_id))) problems.push('person_identity_id');
    if (link.racer_profile_id && !(await resolves(sr, 'RacerProfile', link.racer_profile_id))) problems.push('racer_profile_id');
    if (link.season_participation_id && !(await resolves(sr, 'SeasonParticipation', link.season_participation_id))) problems.push('season_participation_id');
    if (link.legacy_driver_id && !(await resolves(sr, 'Driver', link.legacy_driver_id))) problems.push('legacy_driver_id');

    if (problems.length === 0) {
      push(report, { phase: 'import_link_validation', entity: 'DriverImportIdentityLink', id: link.id, outcome: 'ALREADY_VALID', message: 'all referenced records resolve' });
      continue;
    }

    let repaired = false;
    if (problems.includes('racer_profile_id') && link.person_identity_id) {
      const owned = profilesByIdentity.get(link.person_identity_id) || [];
      if (owned.length === 1) {
        await applyChange(sr, report, {
          phase: 'import_link_validation',
          entity: 'DriverImportIdentityLink',
          id: link.id,
          outcome: 'REPAIRED',
          message: 'racer_profile_id re-pointed to the identity’s single RacerProfile',
          changes: { racer_profile_id: owned[0].id },
        }, () => sr.entities.DriverImportIdentityLink.update(link.id, { racer_profile_id: owned[0].id }));
        repaired = true;
      }
    }
    if (!repaired) {
      report.review_required += 1;
      push(report, {
        phase: 'import_link_validation',
        entity: 'DriverImportIdentityLink',
        id: link.id,
        outcome: 'REVIEW_REQUIRED',
        message: 'Dangling references: ' + problems.join(', '),
      });
    }
  }

  // ── 8. DriverCareerStats → PersonIdentity ────────────────────────────────
  for (const stats of (statsRows || [])) {
    if (!stats) continue;
    if (stats.identity_id && identityById.has(stats.identity_id)) {
      push(report, { phase: 'career_stats_to_identity', entity: 'DriverCareerStats', id: stats.id, outcome: 'ALREADY_VALID', message: 'identity_id resolves' });
      continue;
    }
    const candidates: string[] = [];
    if (stats.driver_id) {
      const byCanonical = (identities || []).filter((i: any) => i && i.canonical_driver_id === stats.driver_id);
      for (const i of byCanonical) candidates.push(i.id);
      const link = linkByDriver.get(stats.driver_id);
      if (link?.person_identity_id && identityById.has(link.person_identity_id)) candidates.push(link.person_identity_id);
    }
    const unique = Array.from(new Set(candidates));
    if (unique.length === 1) {
      await applyChange(sr, report, {
        phase: 'career_stats_to_identity',
        entity: 'DriverCareerStats',
        id: stats.id,
        outcome: 'REPAIRED',
        message: 'identity_id set from a deterministic Driver → PersonIdentity relationship',
        changes: { identity_id: unique[0] },
      }, () => sr.entities.DriverCareerStats.update(stats.id, { identity_id: unique[0] }));
    } else {
      if (stats.driver_id) report.review_required += 1;
      push(report, {
        phase: 'career_stats_to_identity',
        entity: 'DriverCareerStats',
        id: stats.id,
        outcome: 'MISSING_PERSON_IDENTITY',
        message: unique.length > 1 ? 'Multiple identity candidates' : 'No deterministic identity could be proven',
      });
    }
  }

  // ── 9. Ownership / claims (Driver-based legacy claims → identity) ─────────
  const claimRequests = await sr.entities.EntityClaimRequest.list('-created_date', limit).catch(() => []);
  for (const claim of (claimRequests || [])) {
    if (!claim) continue;
    if (claim.entity_type !== 'Driver') continue;
    if (claim.status !== 'approved') continue;

    const link = linkByDriver.get(claim.entity_id);
    const identityId = link?.person_identity_id || null;
    const identity = identityId ? identityById.get(identityId) : null;
    if (!identity) {
      push(report, { phase: 'ownership_claims', entity: 'EntityClaimRequest', id: claim.id, outcome: 'SKIPPED', message: 'Approved Driver claim with no deterministic identity — historical record preserved as-is' });
      continue;
    }
    if (identity.owner_user_id && identity.owner_user_id !== claim.user_id) {
      report.review_required += 1;
      push(report, { phase: 'ownership_claims', entity: 'EntityClaimRequest', id: claim.id, outcome: 'REVIEW_REQUIRED', message: 'Identity already owned by a different user — left for manual review' });
      continue;
    }
    if (identity.owner_user_id === claim.user_id) {
      push(report, { phase: 'ownership_claims', entity: 'EntityClaimRequest', id: claim.id, outcome: 'ALREADY_VALID', message: 'Identity already owned by the claim holder' });
      continue;
    }
    await applyChange(sr, report, {
      phase: 'ownership_claims',
      entity: 'PersonIdentity',
      id: identity.id,
      outcome: 'REPAIRED',
      message: 'Approved Driver claim ownership migrated onto the identity',
      changes: { owner_user_id: claim.user_id, claim_status: 'claimed' },
    }, () => sr.entities.PersonIdentity.update(identity.id, {
      owner_user_id: claim.user_id,
      claim_status: 'claimed',
      claimed_at: new Date().toISOString(),
      claimed_by_user_id: claim.user_id,
    }));
  }

  // ── 10. Slug aliases ─────────────────────────────────────────────────────
  const bySlug = new Map<string, any[]>();
  for (const profile of (profiles || [])) {
    if (!profile || !profile.slug) continue;
    const key = String(profile.slug).toLowerCase();
    if (!bySlug.has(key)) bySlug.set(key, []);
    (bySlug.get(key) as any[]).push(profile);
  }
  for (const [slug, owners] of Array.from(bySlug.entries())) {
    if (owners.length === 1) continue;
    report.review_required += 1;
    push(report, {
      phase: 'slug_aliases',
      entity: 'RacerProfile',
      id: owners[0].id,
      outcome: 'REVIEW_REQUIRED',
      message: 'Slug "' + slug + '" is shared by ' + owners.length + ' RacerProfiles — needs a human decision',
    });
  }

  report.finished_at = new Date().toISOString();
  report.truncated = (profiles || []).length >= limit || (participations || []).length >= limit;

  if (!dryRun && report.applied > 0 && options.audit_user_id) {
    await sr.entities.AuditLog.create({
      entity_type: 'PersonIdentity',
      entity_id: 'graph',
      action: 'updated',
      performed_by: options.audit_user_id,
      performed_by_name: options.audit_user_name || null,
      timestamp: report.finished_at,
      notes: 'repairRacerIdentityRelationships applied ' + report.applied + ' changes',
      after_data: { counts: report.counts, review_required: report.review_required },
    }).catch(() => null);
  }

  return report;
}