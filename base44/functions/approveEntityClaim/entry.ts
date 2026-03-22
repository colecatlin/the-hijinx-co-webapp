import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

function generateNumericCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

async function generateUniqueCode(base44) {
  for (let i = 0; i < 20; i++) {
    const candidate = generateNumericCode();
    const existing = await base44.asServiceRole.entities.EntityCollaborator.filter({ access_code: candidate });
    if (!existing || existing.length === 0) return candidate;
  }
  return null;
}

const ENTITY_SDK_MAP = {
  Driver: 'Driver',
  Team: 'Team',
  Track: 'Track',
  Series: 'Series',
};

// ─── Sync ownership: owner_user_id + EntityCollaborator in one atomic-ish block ────
async function syncEntityOwnership({ base44, entityType, entityId, entityName, userId, userEmail, role, actedByEmail, actedByUserId, now }) {
  const existingCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
    entity_type: entityType,
    entity_id: entityId,
  });

  const existingOwners = existingCollabs.filter(c => c.role === 'owner');
  const previousOwnerCollab = existingOwners.find(c => c.user_id !== userId);
  const alreadyLinked = existingCollabs.find(c => c.user_id === userId || c.user_email === userEmail);

  let collaboratorId = null;
  let previousOwnerId = null;

  // Capture previous owner for audit
  if (previousOwnerCollab) {
    previousOwnerId = previousOwnerCollab.user_id;
    // Downgrade prior owner to editor to avoid conflicting owners
    await base44.asServiceRole.entities.EntityCollaborator.update(previousOwnerCollab.id, { role: 'editor' });
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_owner_overridden',
      entity_name: entityType,
      entity_id: entityId,
      status: 'success',
      message: `Previous owner ${previousOwnerCollab.user_email} downgraded to editor on ${entityName} (${entityType})`,
      initiated_by: actedByEmail,
      metadata: {
        entity_type: entityType,
        entity_id: entityId,
        previous_owner_user_id: previousOwnerCollab.user_id,
        new_owner_user_id: userId,
        acted_by_user_id: actedByUserId,
        collaborator_record_id: previousOwnerCollab.id,
      },
    });
  }

  // Create or upgrade the new owner's collaborator record
  if (alreadyLinked) {
    if (alreadyLinked.role !== role) {
      await base44.asServiceRole.entities.EntityCollaborator.update(alreadyLinked.id, { role });
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'entity_owner_permissions_synced',
        entity_name: entityType,
        entity_id: entityId,
        status: 'success',
        message: `Collaborator role upgraded to ${role} for ${userEmail} on ${entityName}`,
        initiated_by: actedByEmail,
        metadata: {
          entity_type: entityType,
          entity_id: entityId,
          new_owner_user_id: userId,
          previous_owner_user_id: previousOwnerId,
          acted_by_user_id: actedByUserId,
          collaborator_record_id: alreadyLinked.id,
        },
      });
    }
    collaboratorId = alreadyLinked.id;
  } else {
    // Reuse access code from existing owner if available, else generate new
    let accessCode = existingOwners.length > 0 && existingOwners[0].access_code
      ? existingOwners[0].access_code
      : await generateUniqueCode(base44);
    if (!accessCode) throw new Error('Failed to generate unique access code');

    const created = await base44.asServiceRole.entities.EntityCollaborator.create({
      user_id: userId,
      user_email: userEmail,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      role,
      access_code: accessCode,
    });
    collaboratorId = created?.id || null;

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_owner_assigned',
      entity_name: entityType,
      entity_id: entityId,
      status: 'success',
      message: `Owner collaborator record created for ${userEmail} on ${entityName} (${entityType})`,
      initiated_by: actedByEmail,
      metadata: {
        entity_type: entityType,
        entity_id: entityId,
        new_owner_user_id: userId,
        previous_owner_user_id: previousOwnerId,
        acted_by_user_id: actedByUserId,
        collaborator_record_id: collaboratorId,
      },
    });
  }

  // Sync owner_user_id on the entity record itself
  if (role === 'owner') {
    try {
      const entitySdk = base44.asServiceRole.entities[ENTITY_SDK_MAP[entityType]];
      if (entitySdk) {
        await entitySdk.update(entityId, { owner_user_id: userId });
      }
    } catch (_) { /* non-critical — entity may not have owner_user_id field */ }
  }

  return { collaboratorId, previousOwnerId };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

  const { claim_id, action, role = 'owner', admin_notes = '' } = await req.json();
  if (!claim_id || !action) return Response.json({ error: 'Missing claim_id or action' }, { status: 400 });

  const validActions = ['approve', 'reject', 'needs_more_info'];
  if (!validActions.includes(action)) return Response.json({ error: 'Invalid action' }, { status: 400 });

  const allClaims = await base44.asServiceRole.entities.EntityClaimRequest.list('-created_date', 500);
  const claim = allClaims.find(c => c.id === claim_id);
  if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });
  if (claim.status !== 'pending' && claim.status !== 'needs_more_info') {
    return Response.json({ error: 'Claim is no longer actionable' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // ── NEEDS MORE INFO ─────────────────────────────────────────────
  if (action === 'needs_more_info') {
    await base44.asServiceRole.entities.EntityClaimRequest.update(claim_id, {
      status: 'needs_more_info',
      admin_notes,
      reviewed_by_user_id: user.id,
      reviewed_at: now,
    });
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'claim_more_info_requested',
      entity_name: 'EntityClaimRequest',
      entity_id: claim_id,
      status: 'success',
      message: `More info requested for claim: ${claim.entity_name} (${claim.entity_type}) by ${claim.user_email}`,
      initiated_by: user.email,
      metadata: { entity_type: claim.entity_type, entity_id: claim.entity_id, target_user_email: claim.user_email, admin_notes },
    });
    return Response.json({ success: true, action: 'needs_more_info' });
  }

  // ── REJECT ──────────────────────────────────────────────────────
  if (action === 'reject') {
    await base44.asServiceRole.entities.EntityClaimRequest.update(claim_id, {
      status: 'rejected',
      admin_notes,
      reviewed_by_user_id: user.id,
      reviewed_at: now,
    });
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'claim_denied',
      entity_name: 'EntityClaimRequest',
      entity_id: claim_id,
      status: 'success',
      message: `Claim rejected for ${claim.entity_name} (${claim.entity_type}) by ${claim.user_email}`,
      initiated_by: user.email,
      metadata: { entity_type: claim.entity_type, entity_id: claim.entity_id, target_user_email: claim.user_email, admin_notes },
    });
    return Response.json({ success: true, action: 'rejected' });
  }

  // ── APPROVE ─────────────────────────────────────────────────────
  if (action === 'approve') {
    const { collaboratorId, previousOwnerId } = await syncEntityOwnership({
      base44,
      entityType: claim.entity_type,
      entityId: claim.entity_id,
      entityName: claim.entity_name,
      userId: claim.user_id,
      userEmail: claim.user_email,
      role,
      actedByEmail: user.email,
      actedByUserId: user.id,
      now,
    });

    // Update claim record
    await base44.asServiceRole.entities.EntityClaimRequest.update(claim_id, {
      status: 'approved',
      admin_notes,
      reviewed_by_user_id: user.id,
      reviewed_at: now,
      granted_role: role,
    });

    // Ownership transfer log
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'ownership_transferred',
      entity_name: claim.entity_type,
      entity_id: claim.entity_id,
      status: 'success',
      message: `Ownership of ${claim.entity_name} (${claim.entity_type}) transferred to ${claim.user_email}`,
      initiated_by: user.email,
      metadata: {
        entity_type: claim.entity_type,
        entity_id: claim.entity_id,
        previous_owner_user_id: previousOwnerId,
        new_owner_user_id: claim.user_id,
        acted_by_user_id: user.id,
        role,
        collaborator_record_id: collaboratorId,
        source: 'claim_approval',
      },
    });

    // Claim approved log
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'claim_approved',
      entity_name: 'EntityClaimRequest',
      entity_id: claim_id,
      status: 'success',
      message: `Claim approved: ${claim.entity_name} (${claim.entity_type}) granted to ${claim.user_email} as ${role}`,
      initiated_by: user.email,
      metadata: {
        entity_type: claim.entity_type,
        entity_id: claim.entity_id,
        target_user_email: claim.user_email,
        previous_owner_user_id: previousOwnerId,
        new_owner_user_id: claim.user_id,
        role,
        acted_by_user_id: user.id,
        collaborator_record_id: collaboratorId,
        had_existing_owner: !!previousOwnerId,
      },
    });

    // Auto-set primary entity if claimant has none
    try {
      const claimants = await base44.asServiceRole.entities.User.filter({ id: claim.user_id });
      const claimant = claimants[0];
      if (claimant && !claimant.primary_entity_id) {
        await base44.asServiceRole.entities.User.update(claimant.id, {
          primary_entity_type: claim.entity_type,
          primary_entity_id: claim.entity_id,
        });
      }
    } catch (_) { /* non-critical */ }

    return Response.json({ success: true, action: 'approved', role, collaborator_id: collaboratorId });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
});