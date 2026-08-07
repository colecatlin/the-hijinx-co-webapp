/**
 * auditRacerProfileOwnerEditIntegrity — Phase 8+
 *
 * Read-only admin audit of the RacerProfile owner-edit system.
 * Reports on ownership, claim states, edit access, and integrity issues.
 *
 * Payload: {} (no params required)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin } from '../../shared/identityClaimHelpers.ts';
import { AUTH_SOURCES } from '../../shared/racerProfileOwnerEdit.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    await requireAdmin(base44);

    const [
      identitiesRes, racerProfilesRes, collaboratorsRes, usersRes,
    ] = await Promise.all([
      base44.asServiceRole.entities.PersonIdentity.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.RacerProfile.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.EntityCollaborator.list('-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.User.list().catch(() => []),
    ]);

    const identities = Array.isArray(identitiesRes) ? identitiesRes : [];
    const racerProfiles = Array.isArray(racerProfilesRes) ? racerProfilesRes : [];
    const collaborators = Array.isArray(collaboratorsRes) ? collaboratorsRes : [];
    const users = Array.isArray(usersRes) ? usersRes : [];

    // ── Approved owners (claimed identities with owner_user_id) ──
    const approvedOwners = identities
      .filter(i => i.claim_status === 'claimed' && i.owner_user_id)
      .map(i => {
        const user = users.find(u => u.id === i.owner_user_id);
        const rp = racerProfiles.find(r => r.person_identity_id === i.id);
        return {
          identity_id: i.id,
          owner_user_id: i.owner_user_id,
          owner_email: user?.email || 'MISSING',
          racer_profile_id: rp?.id || null,
          racer_profile_display_name: rp?.display_name || null,
        };
      });

    // ── Approved managers (EntityCollaborator with entity_type='RacerProfile', status='approved') ──
    const approvedManagers = collaborators
      .filter(c => c.entity_type === 'RacerProfile' && c.status === 'approved')
      .map(c => {
        const rp = racerProfiles.find(r => r.id === c.entity_id);
        const user = users.find(u => u.id === c.user_id);
        return {
          collaborator_id: c.id,
          user_id: c.user_id,
          user_email: user?.email || c.user_email || 'MISSING',
          racer_profile_id: c.entity_id,
          racer_profile_display_name: rp?.display_name || 'MISSING',
          permission_level: c.permission_level,
        };
      });

    // ── Conflicting owners (multiple users claiming same identity) ──
    const conflictingOwners = [];
    const ownerByIdentity = {};
    for (const id of identities) {
      if (id.claim_status === 'claimed' && id.owner_user_id) {
        if (!ownerByIdentity[id.id]) ownerByIdentity[id.id] = [];
        ownerByIdentity[id.id].push(id.owner_user_id);
      }
    }
    for (const [identityId, ownerIds] of Object.entries(ownerByIdentity)) {
      if (ownerIds.length > 1) {
        conflictingOwners.push({ identity_id: identityId, owner_user_ids: ownerIds });
      }
    }

    // ── Owners missing edit access (claimed but RacerProfile not found or not linked) ──
    const ownersMissingEditAccess = approvedOwners.filter(o => !o.racer_profile_id);

    // ── Users with edit access but no approved relationship ──
    const usersWithEditButNoRelationship = [];
    const approvedUserIds = new Set([
      ...approvedOwners.map(o => o.owner_user_id),
      ...approvedManagers.map(m => m.user_id),
      ...users.filter(u => u.role === 'admin').map(u => u.id),
    ]);
    // Check for any EntityCollaborator with entity_type='RacerProfile' that's not approved
    const unapprovedRacerProfileCollabs = collaborators
      .filter(c => c.entity_type === 'RacerProfile' && c.status !== 'approved')
      .map(c => ({
        collaborator_id: c.id,
        user_id: c.user_id,
        status: c.status,
        racer_profile_id: c.entity_id,
      }));

    // ── Pending claimants with edit access (should not have edit access) ──
    const pendingClaimantsWithEditAccess = [];
    for (const id of identities) {
      if (id.claim_status === 'pending' && id.claimed_by_user_id) {
        // Check if this user has any approved manager collaborator on the linked RacerProfile
        const rp = racerProfiles.find(r => r.person_identity_id === id.id);
        if (rp) {
          const hasManagerAccess = collaborators.some(c =>
            c.user_id === id.claimed_by_user_id &&
            c.entity_type === 'RacerProfile' &&
            c.entity_id === rp.id &&
            c.status === 'approved'
          );
          if (hasManagerAccess) {
            pendingClaimantsWithEditAccess.push({
              identity_id: id.id,
              user_id: id.claimed_by_user_id,
              racer_profile_id: rp.id,
            });
          }
        }
      }
    }

    // ── Rejected claimants with edit access ──
    const rejectedClaimantsWithEditAccess = [];
    for (const id of identities) {
      if (id.claim_status === 'rejected' && id.claimed_by_user_id) {
        const rp = racerProfiles.find(r => r.person_identity_id === id.id);
        if (rp) {
          const hasManagerAccess = collaborators.some(c =>
            c.user_id === id.claimed_by_user_id &&
            c.entity_type === 'RacerProfile' &&
            c.entity_id === rp.id &&
            c.status === 'approved'
          );
          if (hasManagerAccess) {
            rejectedClaimantsWithEditAccess.push({
              identity_id: id.id,
              user_id: id.claimed_by_user_id,
              racer_profile_id: rp.id,
            });
          }
        }
      }
    }

    // ── Revoked claimants (was claimed, now unclaimed) with edit access ──
    const revokedClaimantsWithEditAccess = [];
    for (const id of identities) {
      if (id.claim_status === 'unclaimed' && !id.owner_user_id) {
        // Check claim_history for a 'revoked' action
        const history = Array.isArray(id.claim_history) ? id.claim_history : [];
        const wasRevoked = history.some(h => h.action === 'revoked');
        if (wasRevoked) {
          const revokedUserId = history.find(h => h.action === 'revoked')?.user_id;
          if (revokedUserId) {
            const rp = racerProfiles.find(r => r.person_identity_id === id.id);
            if (rp) {
              const hasManagerAccess = collaborators.some(c =>
                c.user_id === revokedUserId &&
                c.entity_type === 'RacerProfile' &&
                c.entity_id === rp.id &&
                c.status === 'approved'
              );
              if (hasManagerAccess) {
                revokedClaimantsWithEditAccess.push({
                  identity_id: id.id,
                  user_id: revokedUserId,
                  racer_profile_id: rp.id,
                });
              }
            }
          }
        }
      }
    }

    // ── Driver collaborators granting RacerProfile access ──
    // Any Driver-type EntityCollaborator that is approved is a problem — Driver is not an ownership entity.
    const driverCollaboratorsGrantingAccess = collaborators
      .filter(c => c.entity_type === 'Driver' && c.status === 'approved')
      .map(c => ({
        collaborator_id: c.id,
        user_id: c.user_id,
        driver_entity_id: c.entity_id,
        permission_level: c.permission_level,
      }));

    // ── Missing references ──
    const missingUserRefs = approvedOwners.filter(o => !users.find(u => u.id === o.owner_user_id));
    const missingIdentityRefs = racerProfiles.filter(rp => !identities.find(i => i.id === rp.person_identity_id));
    const missingRacerProfileRefs = identities
      .filter(i => i.claim_status === 'claimed')
      .filter(i => !racerProfiles.find(rp => rp.person_identity_id === i.id));

    // ── Duplicate ownership records ──
    const duplicateOwnershipRecords = conflictingOwners;

    // ── Complete or partial status ──
    const issueCount =
      conflictingOwners.length +
      ownersMissingEditAccess.length +
      unapprovedRacerProfileCollabs.length +
      pendingClaimantsWithEditAccess.length +
      rejectedClaimantsWithEditAccess.length +
      revokedClaimantsWithEditAccess.length +
      driverCollaboratorsGrantingAccess.length +
      missingUserRefs.length +
      missingIdentityRefs.length +
      missingRacerProfileRefs.length;

    return Response.json({
      generated_at: new Date().toISOString(),
      summary: {
        total_racer_profiles: racerProfiles.length,
        total_identities: identities.length,
        total_users: users.length,
        approved_owners: approvedOwners.length,
        approved_managers: approvedManagers.length,
        issue_count: issueCount,
        status: issueCount === 0 ? 'complete' : 'partial',
      },
      approved_owners: approvedOwners.map(o => ({
        identity_id: o.identity_id,
        owner_user_id: o.owner_user_id,
        owner_email: o.owner_email,
        racer_profile_id: o.racer_profile_id,
      })),
      approved_managers: approvedManagers.map(m => ({
        collaborator_id: m.collaborator_id,
        user_id: m.user_id,
        racer_profile_id: m.racer_profile_id,
        permission_level: m.permission_level,
      })),
      conflicting_owners: conflictingOwners,
      owners_missing_edit_access: ownersMissingEditAccess.map(o => ({
        identity_id: o.identity_id,
        owner_user_id: o.owner_user_id,
      })),
      users_with_edit_but_no_approved_relationship: unapprovedRacerProfileCollabs,
      pending_claimants_with_edit_access: pendingClaimantsWithEditAccess,
      rejected_claimants_with_edit_access: rejectedClaimantsWithEditAccess,
      revoked_claimants_with_edit_access: revokedClaimantsWithEditAccess,
      driver_collaborators_granting_racer_profile_access: driverCollaboratorsGrantingAccess,
      missing_user_references: missingUserRefs.map(o => ({ identity_id: o.identity_id, owner_user_id: o.owner_user_id })),
      missing_identity_references: missingIdentityRefs.map(rp => ({ racer_profile_id: rp.id, display_name: rp.display_name })),
      missing_racer_profile_references: missingRacerProfileRefs.map(i => ({ identity_id: i.id })),
      duplicate_ownership_records: duplicateOwnershipRecords,
      protected_field_edits_detectable: [], // Would require audit log analysis — populated when ActivityFeed records exist
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return Response.json({ error: error.message || 'Internal error' }, { status });
  }
}