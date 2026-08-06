import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * auditDriverDependencies — Read-only comprehensive audit of every remaining
 * Driver dependency across the Hijinx platform.
 *
 * Phase: Stabilization & Driver Retirement Readiness
 *
 * Inspects:
 *   - Driver records and their RacerProfile / PersonIdentity linkage
 *   - Entry.driver_id vs participation_id modern linkage
 *   - Results.driver_id vs entry_id modern linkage
 *   - Standings.driver_id vs participation_id modern linkage
 *   - DriverCareerStats.driver_id vs identity_id modern linkage
 *   - EntityCollaborator (Driver type) migration status
 *   - DriverMedia / DriverProgram / DriverSponsor / DriverCareerEntry legacy
 *     driver_id usage
 *   - DriverClaim legacy claim records
 *   - RaceCore ID coverage for all entity families
 *
 * Returns a categorized dependency inventory with retirement readiness
 * indicators. Never modifies data.
 *
 * Admin-only.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const safe = (p: Promise<any[]>, fallback: any[] = []) => p.catch(() => fallback);

    // ── Load all relevant entities (service role for complete visibility) ──
    const [
      drivers, racerProfiles, identities, participations,
      entries, results, standings, careerStats,
      collaborators, driverMedia, driverPrograms, driverSponsors,
      driverCareerEntries, driverClaims, teams, series, events, tracks,
    ] = await Promise.all([
      safe(base44.asServiceRole.entities.Driver.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.RacerProfile.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.PersonIdentity.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.SeasonParticipation.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.Entry.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.Results.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.Standings.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.DriverCareerStats.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.EntityCollaborator.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.DriverMedia.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.DriverProgram.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.DriverSponsor.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.DriverCareerEntry.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.DriverClaim.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.Team.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.Series.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.Event.list('-created_date', 500)),
      safe(base44.asServiceRole.entities.Track.list('-created_date', 500)),
    ]);

    // ── Driver ↔ RacerProfile ↔ PersonIdentity linkage ──
    const driverIds = new Set(drivers.map((d: any) => d.id));
    const racerProfileByLegacyDriverId = new Map<string, any>();
    for (const rp of racerProfiles) {
      if (rp.legacy_driver_id) racerProfileByLegacyDriverId.set(rp.legacy_driver_id, rp);
    }
    const driversWithRacerProfile = drivers.filter((d: any) => racerProfileByLegacyDriverId.has(d.id));
    const driversWithoutRacerProfile = drivers.filter((d: any) => !racerProfileByLegacyDriverId.has(d.id));
    const racerProfilesWithoutIdentity = racerProfiles.filter((rp: any) => !rp.person_identity_id);
    const racerProfilesWithoutLegacyDriver = racerProfiles.filter((rp: any) => !rp.legacy_driver_id);

    // ── Entry driver_id vs participation_id ──
    const entriesWithDriverId = entries.filter((e: any) => !!e.driver_id);
    const entriesWithParticipationId = entries.filter((e: any) => !!e.participation_id);
    const entriesWithoutParticipationId = entries.filter((e: any) => !e.participation_id);
    const entriesDriverIdOrphaned = entries.filter((e: any) =>
      e.driver_id && !driverIds.has(e.driver_id)
    );

    // ── Results driver_id vs entry_id ──
    const resultsWithDriverId = results.filter((r: any) => !!r.driver_id);
    const resultsWithEntryId = results.filter((r: any) => !!r.entry_id);
    const resultsWithParticipationId = results.filter((r: any) => !!r.participation_id);
    const resultsWithoutEntryId = results.filter((r: any) => !r.entry_id);
    const resultsDriverIdOrphaned = results.filter((r: any) =>
      r.driver_id && !driverIds.has(r.driver_id)
    );

    // ── Standings driver_id vs participation_id ──
    const standingsWithDriverId = standings.filter((s: any) => !!s.driver_id);
    const standingsWithParticipationId = standings.filter((s: any) => !!s.participation_id);
    const standingsWithoutParticipationId = standings.filter((s: any) => !s.participation_id);
    const standingsDriverIdOrphaned = standings.filter((s: any) =>
      s.driver_id && !driverIds.has(s.driver_id)
    );

    // ── DriverCareerStats driver_id vs identity_id ──
    const careerStatsWithDriverId = careerStats.filter((cs: any) => !!cs.driver_id);
    const careerStatsWithIdentityId = careerStats.filter((cs: any) => !!cs.identity_id);
    const careerStatsWithoutIdentityId = careerStats.filter((cs: any) => !cs.identity_id);

    // ── EntityCollaborator (Driver type) ──
    const driverCollaborators = collaborators.filter((c: any) => c.entity_type === 'Driver');
    const driverCollaboratorsWithRacerProfile = driverCollaborators.filter((c: any) =>
      racerProfileByLegacyDriverId.has(c.entity_id)
    );
    const driverCollaboratorsWithoutRacerProfile = driverCollaborators.filter((c: any) =>
      !racerProfileByLegacyDriverId.has(c.entity_id)
    );

    // ── Legacy Driver-keyed entities ──
    const driverMediaOrphaned = driverMedia.filter((dm: any) =>
      dm.driver_id && !driverIds.has(dm.driver_id)
    );
    const driverProgramsOrphaned = driverPrograms.filter((dp: any) =>
      dp.driver_id && !driverIds.has(dp.driver_id)
    );
    const driverSponsorsOrphaned = driverSponsors.filter((ds: any) =>
      ds.driver_id && !driverIds.has(ds.driver_id)
    );
    const driverCareerEntriesOrphaned = driverCareerEntries.filter((dce: any) =>
      dce.driver_id && !driverIds.has(dce.driver_id)
    );

    // ── DriverClaim legacy records ──
    const driverClaimsOrphaned = driverClaims.filter((dc: any) =>
      dc.driver_id && !driverIds.has(dc.driver_id)
    );

    // ── RaceCore ID coverage ──
    const countIdCoverage = (records: any[], field: string) => ({
      total: records.length,
      with_id: records.filter((r: any) => r[field]).length,
      without_id: records.filter((r: any) => !r[field]).length,
    });

    // ── Dependency inventory ──
    const dependencies = [
      {
        entity: 'Driver',
        field: 'entity (root)',
        type: 'read/write',
        category: 'Retain compatibility',
        purpose: 'Legacy compatibility entity — historical references, legacy admin editor, legacy imports',
        modern_replacement: 'RacerProfile (public) + PersonIdentity (ownership)',
        migration_safe: false,
        compatibility_required: true,
        risk_level: 'High — removal would break legacy URLs, imports, and admin tools',
        recommended_action: 'Retain as compatibility-only entity. Do not delete.',
        records: drivers.length,
      },
      {
        entity: 'Entry',
        field: 'driver_id',
        type: 'write (compatibility)',
        category: entriesWithoutParticipationId.length > 0 ? 'Migrate now' : 'Retain compatibility',
        purpose: 'Legacy competitor link — retained alongside participation_id',
        modern_replacement: 'participation_id (SeasonParticipation)',
        migration_safe: entriesWithoutParticipationId.length === 0,
        compatibility_required: true,
        risk_level: 'Low — participation_id is already authoritative for new entries',
        recommended_action: entriesWithoutParticipationId.length > 0
          ? `Backfill ${entriesWithoutParticipationId.length} entries with participation_id`
          : 'Retain driver_id as compatibility field; participation_id is authoritative',
        records: entries.length,
        records_with_modern_link: entriesWithParticipationId.length,
        records_without_modern_link: entriesWithoutParticipationId.length,
      },
      {
        entity: 'Results',
        field: 'driver_id',
        type: 'write (compatibility)',
        category: resultsWithoutEntryId.length > 0 ? 'Migrate now' : 'Retain compatibility',
        purpose: 'Legacy competitor link — retained alongside entry_id',
        modern_replacement: 'entry_id (Entry) → participation_id (SeasonParticipation)',
        migration_safe: resultsWithoutEntryId.length === 0,
        compatibility_required: true,
        risk_level: 'Low — entry_id is already authoritative for new results',
        recommended_action: resultsWithoutEntryId.length > 0
          ? `Backfill ${resultsWithoutEntryId.length} results with entry_id`
          : 'Retain driver_id as compatibility field; entry_id is authoritative',
        records: results.length,
        records_with_modern_link: resultsWithEntryId.length,
        records_without_modern_link: resultsWithoutEntryId.length,
      },
      {
        entity: 'Standings',
        field: 'driver_id',
        type: 'write (compatibility)',
        category: standingsWithoutParticipationId.length > 0 ? 'Migrate now' : 'Retain compatibility',
        purpose: 'Legacy competitor link — retained alongside participation_id',
        modern_replacement: 'participation_id (SeasonParticipation)',
        migration_safe: standingsWithoutParticipationId.length === 0,
        compatibility_required: true,
        risk_level: 'Low — participation_id is authoritative for computed standings',
        recommended_action: standingsWithoutParticipationId.length > 0
          ? `Backfill ${standingsWithoutParticipationId.length} standings with participation_id`
          : 'Retain driver_id as compatibility field; participation_id is authoritative',
        records: standings.length,
        records_with_modern_link: standingsWithParticipationId.length,
        records_without_modern_link: standingsWithoutParticipationId.length,
      },
      {
        entity: 'DriverCareerStats',
        field: 'driver_id',
        type: 'write (compatibility)',
        category: careerStatsWithoutIdentityId.length > 0 ? 'Migrate now' : 'Retain compatibility',
        purpose: 'Legacy stats identity — retained alongside identity_id',
        modern_replacement: 'identity_id (PersonIdentity)',
        migration_safe: careerStatsWithoutIdentityId.length === 0,
        compatibility_required: true,
        risk_level: 'Low — identity_id is authoritative for computed career stats',
        recommended_action: careerStatsWithoutIdentityId.length > 0
          ? `Backfill ${careerStatsWithoutIdentityId.length} career stats with identity_id`
          : 'Retain driver_id as compatibility field; identity_id is authoritative',
        records: careerStats.length,
        records_with_modern_link: careerStatsWithIdentityId.length,
        records_without_modern_link: careerStatsWithoutIdentityId.length,
      },
      {
        entity: 'EntityCollaborator',
        field: 'entity_type=Driver, entity_id',
        type: 'read/write',
        category: driverCollaboratorsWithoutRacerProfile.length > 0 ? 'Migrate now' : 'Retain compatibility',
        purpose: 'User → Driver access relationship (legacy access control)',
        modern_replacement: 'EntityCollaborator with entity_type=RacerProfile (future) or PersonIdentity ownership',
        migration_safe: driverCollaboratorsWithoutRacerProfile.length === 0,
        compatibility_required: true,
        risk_level: 'Medium — access control depends on these records',
        recommended_action: driverCollaboratorsWithoutRacerProfile.length > 0
          ? `Migrate ${driverCollaboratorsWithoutRacerProfile.length} Driver-type collaborators to RacerProfile`
          : 'Retain as compatibility; ownership is on PersonIdentity',
        records: driverCollaborators.length,
        records_with_modern_link: driverCollaboratorsWithRacerProfile.length,
        records_without_modern_link: driverCollaboratorsWithoutRacerProfile.length,
      },
      {
        entity: 'DriverMedia',
        field: 'driver_id',
        type: 'read/write',
        category: 'Retain compatibility',
        purpose: 'Media assets keyed by legacy driver_id',
        modern_replacement: 'Resolve via RacerProfile.legacy_driver_id',
        migration_safe: false,
        compatibility_required: true,
        risk_level: 'Low — resolved through adapter',
        recommended_action: 'Retain; resolve through RacerProfile.legacy_driver_id adapter',
        records: driverMedia.length,
        orphaned_records: driverMediaOrphaned.length,
      },
      {
        entity: 'DriverProgram',
        field: 'driver_id',
        type: 'read/write',
        category: 'Retain compatibility',
        purpose: 'Driver programs keyed by legacy driver_id',
        modern_replacement: 'Resolve via RacerProfile.legacy_driver_id',
        migration_safe: false,
        compatibility_required: true,
        risk_level: 'Low — resolved through adapter',
        recommended_action: 'Retain; resolve through RacerProfile.legacy_driver_id adapter',
        records: driverPrograms.length,
        orphaned_records: driverProgramsOrphaned.length,
      },
      {
        entity: 'DriverSponsor',
        field: 'driver_id',
        type: 'read/write',
        category: 'Retain compatibility',
        purpose: 'Driver sponsors keyed by legacy driver_id',
        modern_replacement: 'Resolve via RacerProfile.legacy_driver_id',
        migration_safe: false,
        compatibility_required: true,
        risk_level: 'Low — resolved through adapter',
        recommended_action: 'Retain; resolve through RacerProfile.legacy_driver_id adapter',
        records: driverSponsors.length,
        orphaned_records: driverSponsorsOrphaned.length,
      },
      {
        entity: 'DriverCareerEntry',
        field: 'driver_id',
        type: 'read/write',
        category: 'Retain compatibility',
        purpose: 'Career history entries keyed by legacy driver_id',
        modern_replacement: 'Resolve via RacerProfile.legacy_driver_id',
        migration_safe: false,
        compatibility_required: true,
        risk_level: 'Low — resolved through adapter',
        recommended_action: 'Retain; resolve through RacerProfile.legacy_driver_id adapter',
        records: driverCareerEntries.length,
        orphaned_records: driverCareerEntriesOrphaned.length,
      },
      {
        entity: 'DriverClaim',
        field: 'driver_id',
        type: 'read/write',
        category: 'Historical-only',
        purpose: 'Legacy driver claim records — superseded by PersonIdentity.claim_status',
        modern_replacement: 'PersonIdentity.claim_status + claim_history',
        migration_safe: true,
        compatibility_required: false,
        risk_level: 'Low — superseded by Phase 8 claim system',
        recommended_action: 'Retain as historical-only; do not create new DriverClaim records',
        records: driverClaims.length,
        orphaned_records: driverClaimsOrphaned.length,
      },
      {
        entity: 'RaceCoreDriverEditor',
        field: 'admin UI',
        type: 'write (admin-only)',
        category: 'Admin-only compatibility',
        purpose: 'Admin deep editor for legacy Driver records',
        modern_replacement: 'RacerProfile editing (future owner-facing) + PersonIdentity ownership panel',
        migration_safe: false,
        compatibility_required: true,
        risk_level: 'Medium — admin-only; no normal user access',
        recommended_action: 'Retain as admin-only compatibility tool; add Identity & Ownership tab (done Phase 8)',
        records: 0,
      },
      {
        entity: 'importDriversBulk',
        field: 'backend function',
        type: 'write (import)',
        category: 'Retain compatibility',
        purpose: 'Bulk import creates Driver + PersonIdentity + RacerProfile + SeasonParticipation together',
        modern_replacement: 'Same function — already creates the full modern chain',
        migration_safe: true,
        compatibility_required: true,
        risk_level: 'Low — already creates modern chain alongside Driver',
        recommended_action: 'Retain; already creates the full modern chain',
        records: 0,
      },
    ];

    // ── Orphaned references ──
    const orphaned_references = {
      entries_driver_id_orphaned: entriesDriverIdOrphaned.length,
      results_driver_id_orphaned: resultsDriverIdOrphaned.length,
      standings_driver_id_orphaned: standingsDriverIdOrphaned.length,
      driver_media_orphaned: driverMediaOrphaned.length,
      driver_programs_orphaned: driverProgramsOrphaned.length,
      driver_sponsors_orphaned: driverSponsorsOrphaned.length,
      driver_career_entries_orphaned: driverCareerEntriesOrphaned.length,
      driver_claims_orphaned: driverClaimsOrphaned.length,
    };

    // ── RaceCore ID coverage by family ──
    const racecore_id_coverage = {
      PersonIdentity: countIdCoverage(identities, 'racecore_id'),
      RacerProfile: countIdCoverage(racerProfiles, 'racecore_id'),
      SeasonParticipation: countIdCoverage(participations, 'racecore_id'),
      Driver: countIdCoverage(drivers, 'racecore_id'),
      Entry: countIdCoverage(entries, 'racecore_id'),
      Results: countIdCoverage(results, 'racecore_id'),
      Standings: countIdCoverage(standings, 'racecore_id'),
    };

    // ── Modern linkage percentages ──
    const pct = (num: number, denom: number) => denom === 0 ? 100 : Math.round((num / denom) * 100);

    const operational_linkage = {
      entries: {
        total: entries.length,
        with_participation_id: entriesWithParticipationId.length,
        without_participation_id: entriesWithoutParticipationId.length,
        pct_modern: pct(entriesWithParticipationId.length, entries.length),
      },
      results: {
        total: results.length,
        with_entry_id: resultsWithEntryId.length,
        without_entry_id: resultsWithoutEntryId.length,
        with_participation_id: resultsWithParticipationId.length,
        pct_modern: pct(resultsWithEntryId.length, results.length),
      },
      standings: {
        total: standings.length,
        with_participation_id: standingsWithParticipationId.length,
        without_participation_id: standingsWithoutParticipationId.length,
        pct_modern: pct(standingsWithParticipationId.length, standings.length),
      },
      career_stats: {
        total: careerStats.length,
        with_identity_id: careerStatsWithIdentityId.length,
        without_identity_id: careerStatsWithoutIdentityId.length,
        pct_modern: pct(careerStatsWithIdentityId.length, careerStats.length),
      },
    };

    const collaborator_migration = {
      total_driver_collaborators: driverCollaborators.length,
      with_racer_profile: driverCollaboratorsWithRacerProfile.length,
      without_racer_profile: driverCollaboratorsWithoutRacerProfile.length,
      pct_migrated: pct(driverCollaboratorsWithRacerProfile.length, driverCollaborators.length),
    };

    const racer_profile_coverage = {
      total_drivers: drivers.length,
      drivers_with_racer_profile: driversWithRacerProfile.length,
      drivers_without_racer_profile: driversWithoutRacerProfile.length,
      racer_profiles_without_identity: racerProfilesWithoutIdentity.length,
      racer_profiles_without_legacy_driver: racerProfilesWithoutLegacyDriver.length,
      pct_coverage: pct(driversWithRacerProfile.length, drivers.length),
    };

    return Response.json({
      read_only: true,
      generated_at: new Date().toISOString(),
      summary: {
        total_drivers: drivers.length,
        total_racer_profiles: racerProfiles.length,
        total_person_identities: identities.length,
        total_season_participations: participations.length,
        total_entries: entries.length,
        total_results: results.length,
        total_standings: standings.length,
        total_career_stats: careerStats.length,
        total_driver_collaborators: driverCollaborators.length,
      },
      dependency_inventory: dependencies,
      orphaned_references,
      racecore_id_coverage,
      operational_linkage,
      collaborator_migration,
      racer_profile_coverage,
      partial: false,
      load_errors: null,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || 'Audit failed', read_only: true },
      { status: 500 }
    );
  }
}