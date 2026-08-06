/**
 * auditIdentityOwnership — Phase 8
 *
 * Read-only admin audit of the User → PersonIdentity ownership and claiming
 * system. Produces a comprehensive report covering:
 *   - User ownership coverage
 *   - Claim integrity
 *   - Permission integrity (EntityCollaborator references)
 *   - Driver retirement readiness
 *   - Remaining Driver dependencies
 *
 * Payload: {} (no params required)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin } from '../../shared/identityClaimHelpers.ts';

const DRIVER_WRITE_ENTITIES = [
  'Entry', 'Results', 'Standings', 'DriverProgram', 'DriverSponsor',
  'DriverMedia', 'DriverCareerEntry', 'DriverCareerStats', 'DriverClaim',
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    await requireAdmin(base44);

    const [
      identitiesRes, racerProfilesRes, driversRes, collaboratorsRes,
      usersRes, entriesRes, resultsRes, standingsRes,
    ] = await Promise.all([
      base44.asServiceRole.entities.PersonIdentity.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.RacerProfile.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Driver.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.EntityCollaborator.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.User.list().catch(() => []),
      base44.asServiceRole.entities.Entry.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Results.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Standings.list('-created_date', 500).catch(() => []),
    ]);

    const identities = Array.isArray(identitiesRes) ? identitiesRes : [];
    const racerProfiles = Array.isArray(racerProfilesRes) ? racerProfilesRes : [];
    const drivers = Array.isArray(driversRes) ? driversRes : [];
    const collaborators = Array.isArray(collaboratorsRes) ? collaboratorsRes : [];
    const users = Array.isArray(usersRes) ? usersRes : [];
    const entries = Array.isArray(entriesRes) ? entriesRes : [];
    const results = Array.isArray(resultsRes) ? resultsRes : [];
    const standings = Array.isArray(standingsRes) ? standingsRes : [];

    // ── User ownership coverage ──
    const claimedIdentities = identities.filter((i) => i.claim_status === 'claimed');
    const pendingIdentities = identities.filter((i) => i.claim_status === 'pending');
    const rejectedIdentities = identities.filter((i) => i.claim_status === 'rejected');
    const unclaimedIdentities = identities.filter((i) => i.claim_status === 'unclaimed' || !i.claim_status);

    const usersWithOwnership = new Set(claimedIdentities.map((i) => i.owner_user_id).filter(Boolean));
    const usersWithoutOwnership = users.filter((u) => !usersWithOwnership.has(u.id));

    // ── Claim integrity ──
    const claimIntegrityIssues = [];
    for (const id of identities) {
      if (id.claim_status === 'claimed' && !id.owner_user_id) {
        claimIntegrityIssues.push({ identityId: id.id, issue: 'claimed status without owner_user_id' });
      }
      if (id.claim_status === 'claimed' && !id.claimed_at) {
        claimIntegrityIssues.push({ identityId: id.id, issue: 'claimed status without claimed_at' });
      }
      if (id.claim_status === 'pending' && !id.claimed_by_user_id) {
        claimIntegrityIssues.push({ identityId: id.id, issue: 'pending status without claimed_by_user_id' });
      }
      if (id.owner_user_id && id.claim_status !== 'claimed') {
        claimIntegrityIssues.push({ identityId: id.id, issue: `owner_user_id set but claim_status is ${id.claim_status}` });
      }
    }

    // ── Multi-ownership check (one user, multiple identities) ──
    const ownershipByUser = {};
    for (const id of claimedIdentities) {
      const uid = id.owner_user_id;
      if (!ownershipByUser[uid]) ownershipByUser[uid] = [];
      ownershipByUser[uid].push(id.id);
    }
    const multiOwnership = Object.entries(ownershipByUser)
      .filter(([uid, ids]) => ids.length > 1)
      .map(([uid, ids]) => ({ userId: uid, identityIds: ids, count: ids.length }));

    // ── RacerProfile ↔ PersonIdentity linkage ──
    const racerProfilesWithoutIdentity = racerProfiles.filter((rp) => !rp.person_identity_id);
    const racerProfilesWithClaimedIdentity = racerProfiles.filter((rp) => {
      const id = identities.find((i) => i.id === rp.person_identity_id);
      return id && id.claim_status === 'claimed';
    });
    const racerProfileClaimFlagMismatches = [];
    for (const rp of racerProfiles) {
      const id = identities.find((i) => i.id === rp.person_identity_id);
      if (id) {
        const expected = id.claim_status === 'claimed';
        if (rp.is_claimed !== expected) {
          racerProfileClaimFlagMismatches.push({
            racerProfileId: rp.id,
            identityId: id.id,
            is_claimed: rp.is_claimed,
            expected,
          });
        }
      }
    }

    // ── EntityCollaborator Driver dependencies ──
    const driverCollaborators = collaborators.filter((c) => c.entity_type === 'Driver');
    const driverCollaboratorsWithLegacyDriver = driverCollaborators.filter((c) => {
      return drivers.some((d) => d.id === c.entity_id);
    });
    const driverCollaboratorsWithoutRacerProfile = driverCollaborators.filter((c) => {
      return !racerProfiles.some((rp) => rp.legacy_driver_id === c.entity_id);
    });

    // ── Driver retirement readiness ──
    const driversWithRacerProfile = drivers.filter((d) =>
      racerProfiles.some((rp) => rp.legacy_driver_id === d.id)
    );
    const driversWithoutRacerProfile = drivers.filter((d) =>
      !racerProfiles.some((rp) => rp.legacy_driver_id === d.id)
    );

    // Remaining Driver reads/writes
    const entriesWithDriverId = entries.filter((e) => e.driver_id);
    const entriesWithParticipationId = entries.filter((e) => e.participation_id);
    const resultsWithDriverId = results.filter((r) => r.driver_id);
    const resultsWithEntryId = results.filter((r) => r.entry_id);
    const standingsWithDriverId = standings.filter((s) => s.driver_id);
    const standingsWithParticipationId = standings.filter((s) => s.participation_id);

    const totalOperationalRecords = entries.length + results.length + standings.length;
    const modernLinkedRecords =
      entriesWithParticipationId.length + resultsWithEntryId.length + standingsWithParticipationId.length;
    const driverLinkedRecords =
      entriesWithDriverId.length + resultsWithDriverId.length + standingsWithDriverId.length;

    // ── Driver write entities (remaining dependencies) ──
    const driverDependencySummary = {
      Driver_total: drivers.length,
      Driver_with_RacerProfile: driversWithRacerProfile.length,
      Driver_without_RacerProfile: driversWithoutRacerProfile.length,
      EntityCollaborator_Driver_type: driverCollaborators.length,
      EntityCollaborator_Driver_without_RacerProfile: driverCollaboratorsWithoutRacerProfile.length,
      DriverMedia_records: 'see DriverMedia entity',
      DriverProgram_records: 'see DriverProgram entity',
      DriverSponsor_records: 'see DriverSponsor entity',
      DriverCareerEntry_records: 'see DriverCareerEntry entity',
      DriverClaim_records: 'see DriverClaim entity',
    };

    // ── Retirement readiness score ──
    // Weighted: identity coverage (40%), operational modern linkage (30%),
    // collaborator migration (15%), racer profile coverage (15%)
    const identityCoverage = identities.length > 0
      ? (claimedIdentities.length / identities.length) : 0;
    const operationalModernRatio = totalOperationalRecords > 0
      ? (modernLinkedRecords / totalOperationalRecords) : 1;
    const collaboratorMigrationRatio = driverCollaborators.length > 0
      ? (1 - (driverCollaboratorsWithoutRacerProfile.length / driverCollaborators.length)) : 1;
    const racerProfileCoverage = drivers.length > 0
      ? (driversWithRacerProfile.length / drivers.length) : 0;

    const retirementReadinessScore = Math.round(
      (identityCoverage * 0.40 + operationalModernRatio * 0.30 +
       collaboratorMigrationRatio * 0.15 + racerProfileCoverage * 0.15) * 100
    );

    return Response.json({
      generated_at: new Date().toISOString(),
      summary: {
        total_identities: identities.length,
        total_racer_profiles: racerProfiles.length,
        total_drivers: drivers.length,
        total_users: users.length,
        users_with_ownership: usersWithOwnership.size,
        users_without_ownership: usersWithoutOwnership.length,
      },
      user_ownership: {
        claimed: claimedIdentities.length,
        pending: pendingIdentities.length,
        rejected: rejectedIdentities.length,
        unclaimed: unclaimedIdentities.length,
        multi_ownership_cases: multiOwnership,
      },
      claim_integrity: {
        issues: claimIntegrityIssues,
        issue_count: claimIntegrityIssues.length,
      },
      racer_profile_linkage: {
        without_identity: racerProfilesWithoutIdentity.length,
        claimed_via_identity: racerProfilesWithClaimedIdentity.length,
        claim_flag_mismatches: racerProfileClaimFlagMismatches,
      },
      collaborator_migration: {
        driver_type_collaborators: driverCollaborators.length,
        with_legacy_driver: driverCollaboratorsWithLegacyDriver.length,
        without_racer_profile: driverCollaboratorsWithoutRacerProfile.length,
      },
      driver_retirement: {
        drivers_with_racer_profile: driversWithRacerProfile.length,
        drivers_without_racer_profile: driversWithoutRacerProfile.length,
        driver_dependency_summary: driverDependencySummary,
        operational_records: {
          total: totalOperationalRecords,
          modern_linked: modernLinkedRecords,
          driver_linked: driverLinkedRecords,
          entries: {
            total: entries.length,
            with_driver_id: entriesWithDriverId.length,
            with_participation_id: entriesWithParticipationId.length,
          },
          results: {
            total: results.length,
            with_driver_id: resultsWithDriverId.length,
            with_entry_id: resultsWithEntryId.length,
          },
          standings: {
            total: standings.length,
            with_driver_id: standingsWithDriverId.length,
            with_participation_id: standingsWithParticipationId.length,
          },
        },
      },
      retirement_readiness_score: retirementReadinessScore,
      readiness_breakdown: {
        identity_coverage_pct: Math.round(identityCoverage * 100),
        operational_modern_linkage_pct: Math.round(operationalModernRatio * 100),
        collaborator_migration_pct: Math.round(collaboratorMigrationRatio * 100),
        racer_profile_coverage_pct: Math.round(racerProfileCoverage * 100),
      },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return Response.json({ error: error.message || 'Internal error' }, { status });
  }
}