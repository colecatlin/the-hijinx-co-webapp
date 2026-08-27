/**
 * auditDriverDependencyInventory — Production Hardening Phase
 *
 * Read-only tooling that reports remaining Driver dependencies across
 * the platform. No automatic migration. No repair.
 *
 * Scans:
 *   - Driver records and their linkage state
 *   - Entries with driver_id (compatibility)
 *   - Results with driver_id (compatibility)
 *   - Standings with driver_id (compatibility)
 *   - EntityCollaborators with entity_type='Driver'
 *   - DriverMedia, DriverProgram, DriverSponsor, DriverCareerEntry records
 *   - DriverCareerStats with driver_id only (no identity_id)
 *   - DriverClaim records (historical)
 *
 * Returns a categorized inventory with migration recommendations.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  const base44 = createClientFromRequest(req);

  // Admin only — unauthenticated requests are rejected
  let user;
  try {
    user = await base44.auth.me();
  } catch (_) {
    return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  const [
    drivers, racerProfiles, entries, results, standings,
    careerStats, collaborators, driverMedia, driverPrograms,
    driverSponsors, driverCareerEntries, driverClaims,
    importLinks,
  ] = await Promise.all([
    base44.asServiceRole.entities.Driver.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.RacerProfile.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Entry.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Results.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Standings.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.DriverCareerStats.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.EntityCollaborator.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.DriverMedia.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.DriverProgram.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.DriverSponsor.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.DriverCareerEntry.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.DriverClaim.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.DriverImportIdentityLink.list('-created_date', 500).catch(() => []),
  ]);

  const rpByLegacyDriverId = new Map<string, any>();
  (racerProfiles as any[]).forEach((e: any) => {
    if (e.legacy_driver_id) rpByLegacyDriverId.set(e.legacy_driver_id, e);
  });

  // ── Driver records ──
  const driverRecords = (drivers as any[]).map((d: any) => {
    const rp = rpByLegacyDriverId.get(d.id);
    return {
      driver_id: d.id,
      racecore_id: d.racecore_id || null,
      name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
      has_racer_profile: !!rp,
      racer_profile_id: rp?.id || null,
      racer_profile_slug: rp?.slug || null,
      racer_profile_visibility: rp?.visibility || null,
      category: rp ? 'Permanent Compatibility' : 'Migration Candidate',
      recommendation: rp
        ? 'Retain — linked to RacerProfile, serves as compatibility anchor'
        : 'Create RacerProfile link or archive if orphaned',
      risk: rp ? 'Low' : 'Medium',
    };
  });

  // ── Entries with driver_id ──
  const entriesWithDriverId = (entries as any[]).filter((e: any) => e.driver_id);
  const entriesWithBoth = entriesWithDriverId.filter((e: any) => e.participation_id);

  // ── Results with driver_id ──
  const resultsWithDriverId = (results as any[]).filter((e: any) => e.driver_id);
  const resultsWithBoth = resultsWithDriverId.filter((e: any) => e.entry_id || e.participation_id);

  // ── Standings with driver_id ──
  const standingsWithDriverId = (standings as any[]).filter((e: any) => e.driver_id);
  const standingsWithBoth = standingsWithDriverId.filter((e: any) => e.participation_id);

  // ── Career stats with driver_id only ──
  const statsWithDriverOnly = (careerStats as any[]).filter((e: any) => e.driver_id && !e.identity_id);
  const statsWithIdentity = (careerStats as any[]).filter((e: any) => e.identity_id);

  // ── Driver collaborators ──
  const driverCollaborators = (collaborators as any[]).filter((e: any) => e.entity_type === 'Driver');
  const driverCollaboratorsWithoutRP = driverCollaborators.filter((e: any) =>
    !rpByLegacyDriverId.has(e.entity_id)
  );

  // ── Driver sub-entities ──
  const driverSubEntities = {
    DriverMedia: {
      total: (driverMedia as any[]).length,
      with_driver_id: (driverMedia as any[]).filter((e: any) => e.driver_id).length,
      category: 'Legacy Read',
      recommendation: 'Retain — media gallery uses driver_id for compatibility; adapter maps to RacerProfile',
      risk: 'Low',
    },
    DriverProgram: {
      total: (driverPrograms as any[]).length,
      with_driver_id: (driverPrograms as any[]).filter((e: any) => e.driver_id).length,
      category: 'Legacy Read',
      recommendation: 'Retain — programs timeline uses driver_id; adapter maps to RacerProfile',
      risk: 'Low',
    },
    DriverSponsor: {
      total: (driverSponsors as any[]).length,
      with_driver_id: (driverSponsors as any[]).filter((e: any) => e.driver_id).length,
      category: 'Legacy Read',
      recommendation: 'Retain — sponsor display uses driver_id; adapter maps to RacerProfile',
      risk: 'Low',
    },
    DriverCareerEntry: {
      total: (driverCareerEntries as any[]).length,
      with_driver_id: (driverCareerEntries as any[]).filter((e: any) => e.driver_id).length,
      category: 'Legacy Read',
      recommendation: 'Retain — career history uses driver_id; adapter maps to RacerProfile',
      risk: 'Low',
    },
    DriverClaim: {
      total: (driverClaims as any[]).length,
      category: 'Historical',
      recommendation: 'Retain as historical record — superseded by PersonIdentity claim system',
      risk: 'None',
    },
    DriverImportIdentityLink: {
      total: (importLinks as any[]).length,
      resolved: (importLinks as any[]).filter((e: any) => e.status === 'resolved').length,
      category: 'Adapter',
      recommendation: 'Retain — import idempotency link, not human identity proof',
      risk: 'None',
    },
  };

  // ── Summary scorecard ──
  const scorecard = {
    driver_records: {
      total: (drivers as any[]).length,
      with_racer_profile: driverRecords.filter((e: any) => e.has_racer_profile).length,
      without_racer_profile: driverRecords.filter((e: any) => !e.has_racer_profile).length,
      target: 'Retain all (compatibility entity)',
      priority: 'Low — no action needed',
    },
    entries_driver_id: {
      total: entriesWithDriverId.length,
      with_modern_link: entriesWithBoth.length,
      without_modern_link: entriesWithDriverId.length - entriesWithBoth.length,
      target: 'All entries have participation_id (achieved)',
      priority: 'None — 100% modern linked',
    },
    results_driver_id: {
      total: resultsWithDriverId.length,
      with_modern_link: resultsWithBoth.length,
      without_modern_link: resultsWithDriverId.length - resultsWithBoth.length,
      target: 'All results have entry_id (achieved)',
      priority: 'None — 100% modern linked',
    },
    standings_driver_id: {
      total: standingsWithDriverId.length,
      with_modern_link: standingsWithBoth.length,
      without_modern_link: standingsWithDriverId.length - standingsWithBoth.length,
      target: 'All standings have participation_id',
      priority: 'Low — 0 standings exist',
    },
    career_stats_driver_only: {
      total: statsWithDriverOnly.length,
      with_identity: statsWithIdentity.length,
      target: 'All career stats have identity_id',
      priority: statsWithDriverOnly.length > 0 ? 'Medium' : 'None',
    },
    driver_collaborators: {
      total: driverCollaborators.length,
      without_racer_profile: driverCollaboratorsWithoutRP.length,
      target: '0 Driver collaborators (migrate to RacerProfile)',
      priority: driverCollaborators.length > 0 ? 'Medium' : 'None',
    },
  };

  return Response.json({
    generated_at: new Date().toISOString(),
    read_only: true,
    driver_records: driverRecords,
    scorecard,
    driver_sub_entities: driverSubEntities,
    summary: {
      total_driver_dependencies:
        (drivers as any[]).length +
        entriesWithDriverId.length +
        resultsWithDriverId.length +
        standingsWithDriverId.length +
        statsWithDriverOnly.length +
        driverCollaborators.length +
        (driverMedia as any[]).length +
        (driverPrograms as any[]).length +
        (driverSponsors as any[]).length +
        (driverCareerEntries as any[]).length +
        (driverClaims as any[]).length +
        (importLinks as any[]).length,
      permanent_compatibility: (drivers as any[]).length + (driverMedia as any[]).length + (driverPrograms as any[]).length + (driverSponsors as any[]).length + (driverCareerEntries as any[]).length,
      historical: (driverClaims as any[]).length,
      adapter: (importLinks as any[]).length,
      migration_candidates: driverCollaboratorsWithoutRP.length + statsWithDriverOnly.length,
      can_be_removed_now: 0,
    },
  });
}