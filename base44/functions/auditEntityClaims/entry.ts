import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

  const warnings = [];
  const errors = [];

  const [claims, collabs] = await Promise.all([
    base44.asServiceRole.entities.EntityClaimRequest.list('-created_date', 1000),
    base44.asServiceRole.entities.EntityCollaborator.list('-created_date', 2000),
  ]);

  const approvedClaims = claims.filter(c => c.status === 'approved');
  const pendingClaims = claims.filter(c => c.status === 'pending');
  const disputes = claims.filter(c =>
    (c.claim_mode === 'dispute' || c.claim_type === 'dispute') && c.status === 'pending'
  );

  // 1. Approved claims with no collaborator record
  const approvedClaimsWithoutAccess = [];
  for (const claim of approvedClaims) {
    const linked = collabs.find(c =>
      c.user_id === claim.user_id &&
      c.entity_type === claim.entity_type &&
      c.entity_id === claim.entity_id
    );
    if (!linked) {
      approvedClaimsWithoutAccess.push({
        claim_id: claim.id,
        entity_name: claim.entity_name,
        entity_type: claim.entity_type,
        entity_id: claim.entity_id,
        user_email: claim.user_email,
        granted_role: claim.granted_role || 'unknown',
        approved_at: claim.reviewed_at,
      });
      warnings.push(`Approved claim ${claim.id} (${claim.entity_name}) has no collaborator record for ${claim.user_email}`);
    }
  }

  // 2. Approved owner claims where entity owner_user_id doesn't match
  const ENTITY_SDKS = {
    Driver: base44.asServiceRole.entities.Driver,
    Team: base44.asServiceRole.entities.Team,
    Track: base44.asServiceRole.entities.Track,
    Series: base44.asServiceRole.entities.Series,
  };
  const ownerSyncFailures = [];
  const ownerClaims = approvedClaims.filter(c => c.granted_role === 'owner' || c.admin_resolution_type === 'approved_as_owner' || c.admin_resolution_type === 'ownership_overridden');
  for (const claim of ownerClaims) {
    try {
      const entity = await ENTITY_SDKS[claim.entity_type]?.get(claim.entity_id).catch(() => null);
      if (entity && entity.owner_user_id && entity.owner_user_id !== claim.user_id) {
        ownerSyncFailures.push({
          claim_id: claim.id,
          entity_name: claim.entity_name,
          entity_type: claim.entity_type,
          entity_id: claim.entity_id,
          claim_user_id: claim.user_id,
          entity_owner_user_id: entity.owner_user_id,
        });
        warnings.push(`Owner sync mismatch on ${claim.entity_name} (${claim.entity_type}): claim says ${claim.user_id}, entity says ${entity.owner_user_id}`);
      }
    } catch (_) {}
  }

  // 3. Duplicate pending claims (same user + entity)
  const duplicatePendingClaims = [];
  const pendingKey = {};
  for (const claim of pendingClaims) {
    const key = `${claim.user_id}:${claim.entity_type}:${claim.entity_id}`;
    if (pendingKey[key]) {
      duplicatePendingClaims.push({ key, claim_ids: [pendingKey[key], claim.id] });
      warnings.push(`Duplicate pending claims for ${claim.entity_name} by user ${claim.user_email}: ${pendingKey[key]} and ${claim.id}`);
    } else {
      pendingKey[key] = claim.id;
    }
  }

  // 4. Unresolved disputes
  const unresolvedDisputes = disputes.map(c => ({
    claim_id: c.id,
    entity_name: c.entity_name,
    entity_type: c.entity_type,
    entity_id: c.entity_id,
    user_email: c.user_email,
    dispute_reason: c.dispute_reason || null,
    existing_owner_user_id: c.existing_owner_user_id || null,
    submitted: c.created_date,
  }));

  // 5. Conflicting owner states (entity has 2+ owner-role collaborators)
  const conflictingOwners = [];
  const ownersByEntity = {};
  for (const collab of collabs) {
    if (collab.role === 'owner') {
      const key = `${collab.entity_type}:${collab.entity_id}`;
      if (!ownersByEntity[key]) ownersByEntity[key] = [];
      ownersByEntity[key].push(collab);
    }
  }
  for (const [key, owners] of Object.entries(ownersByEntity)) {
    if (owners.length > 1) {
      const [entityType, entityId] = key.split(':');
      conflictingOwners.push({
        entity_type: entityType,
        entity_id: entityId,
        owner_count: owners.length,
        owners: owners.map(o => ({ collab_id: o.id, user_email: o.user_email, user_id: o.user_id })),
      });
      errors.push(`Entity ${key} has ${owners.length} conflicting owner-role collaborators`);
    }
  }

  return Response.json({
    approved_claims_without_access: approvedClaimsWithoutAccess,
    owner_sync_failures: ownerSyncFailures,
    duplicate_pending_claims: duplicatePendingClaims,
    unresolved_disputes: unresolvedDisputes,
    conflicting_owners: conflictingOwners,
    warnings,
    errors,
    summary: {
      total_claims: claims.length,
      approved: approvedClaims.length,
      pending: pendingClaims.length,
      disputes_pending: disputes.length,
      issues_found: warnings.length + errors.length,
    },
  });
});