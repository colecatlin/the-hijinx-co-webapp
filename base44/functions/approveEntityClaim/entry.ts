import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

const ENTITY_SDK_MAP = { Driver: 'Driver', Team: 'Team', Track: 'Track', Series: 'Series' };

async function syncEntityOwnership({ base44, entityType, entityId, entityName, userId, userEmail, role, actedByEmail, actedByUserId, forceOverride }) {
  const existingCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
    entity_type: entityType, entity_id: entityId,
  });

  const existingOwners = existingCollabs.filter(c => c.role === 'owner');
  const previousOwnerCollab = existingOwners.find(c => c.user_id !== userId);
  const alreadyLinked = existingCollabs.find(c => c.user_id === userId || c.user_email === userEmail);
  let collaboratorId = null;
  let previousOwnerId = previousOwnerCollab?.user_id || null;

  if (role === 'owner' && previousOwnerCollab) {
    if (!forceOverride) {
      // For non-forced ownership: downgrade previous owner to editor
    }
    // Always downgrade prior owner when granting new owner
    await base44.asServiceRole.entities.EntityCollaborator.update(previousOwnerCollab.id, { role: 'editor' });
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_claim_owner_overridden',
      entity_name: entityType, entity_id: entityId, status: 'success',
      message: `Previous owner ${previousOwnerCollab.user_email} downgraded to editor on ${entityName} (${entityType})`,
      initiated_by: actedByEmail,
      metadata: {
        claim_request_id: null, entity_type: entityType, entity_id: entityId,
        previous_owner_user_id: previousOwnerCollab.user_id, new_owner_user_id: userId,
        acted_by_user_id: actedByUserId, collaborator_record_id: previousOwnerCollab.id,
      },
    });
  }

  if (alreadyLinked) {
    if (alreadyLinked.role !== role) {
      await base44.asServiceRole.entities.EntityCollaborator.update(alreadyLinked.id, { role });
    }
    collaboratorId = alreadyLinked.id;
  } else {
    const accessCode = (existingOwners.length > 0 && existingOwners[0].access_code)
      ? existingOwners[0].access_code
      : await generateUniqueCode(base44);
    if (!accessCode) throw new Error('Failed to generate unique access code');

    const created = await base44.asServiceRole.entities.EntityCollaborator.create({
      user_id: userId, user_email: userEmail,
      entity_type: entityType, entity_id: entityId, entity_name: entityName,
      role, access_code: accessCode,
    });
    collaboratorId = created?.id || null;
  }

  // Sync owner_user_id on the entity itself
  if (role === 'owner') {
    try {
      const entitySdk = base44.asServiceRole.entities[ENTITY_SDK_MAP[entityType]];
      if (entitySdk) await entitySdk.update(entityId, { owner_user_id: userId });
    } catch (_) { /* non-critical */ }
  }

  return { collaboratorId, previousOwnerId };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

  const { claim_id, resolution_type, admin_notes = '' } = await req.json();
  if (!claim_id || !resolution_type) {
    return Response.json({ error: 'Missing claim_id or resolution_type' }, { status: 400 });
  }

  const validResolutions = [
    'approved_as_owner', 'approved_as_editor',
    'ownership_overridden', 'ownership_retained',
    'denied', 'needs_more_info',
  ];
  if (!validResolutions.includes(resolution_type)) {
    return Response.json({ error: `Invalid resolution_type. Must be one of: ${validResolutions.join(', ')}` }, { status: 400 });
  }

  const allClaims = await base44.asServiceRole.entities.EntityClaimRequest.list('-created_date', 500);
  const claim = allClaims.find(c => c.id === claim_id);
  if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });
  if (claim.status !== 'pending' && claim.status !== 'needs_more_info') {
    return Response.json({ error: 'Claim is no longer actionable' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const claimMode = claim.claim_mode || (claim.claim_type === 'dispute' ? 'dispute' : 'claim');

  // ── NEEDS MORE INFO ──────────────────────────────────────────────────────────
  if (resolution_type === 'needs_more_info') {
    await base44.asServiceRole.entities.EntityClaimRequest.update(claim_id, {
      status: 'needs_more_info', admin_notes,
      admin_resolution_type: 'needs_more_info',
      reviewed_by_user_id: user.id, reviewed_at: now,
    });
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_claim_more_info_requested',
      entity_name: 'EntityClaimRequest', entity_id: claim_id, status: 'success',
      message: `More info requested for ${claimMode}: ${claim.entity_name} (${claim.entity_type}) by ${claim.user_email}`,
      initiated_by: user.email,
      metadata: {
        claim_request_id: claim_id, entity_type: claim.entity_type, entity_id: claim.entity_id,
        claimant_user_id: claim.user_id, claim_mode: claimMode,
        acted_by_user_id: user.id, admin_notes,
      },
    });
    return Response.json({ success: true, resolution_type });
  }

  // ── DENIED / OWNERSHIP RETAINED ─────────────────────────────────────────────
  if (resolution_type === 'denied' || resolution_type === 'ownership_retained') {
    await base44.asServiceRole.entities.EntityClaimRequest.update(claim_id, {
      status: 'rejected', admin_notes,
      admin_resolution_type: resolution_type,
      reviewed_by_user_id: user.id, reviewed_at: now,
    });
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_claim_denied',
      entity_name: 'EntityClaimRequest', entity_id: claim_id, status: 'success',
      message: resolution_type === 'ownership_retained'
        ? `Dispute denied — ownership retained for ${claim.entity_name} (${claim.entity_type}). Claimant: ${claim.user_email}`
        : `${claimMode} denied for ${claim.entity_name} (${claim.entity_type}). Claimant: ${claim.user_email}`,
      initiated_by: user.email,
      metadata: {
        claim_request_id: claim_id, entity_type: claim.entity_type, entity_id: claim.entity_id,
        claimant_user_id: claim.user_id, claim_mode: claimMode,
        existing_owner_user_id: claim.existing_owner_user_id || null,
        acted_by_user_id: user.id, resolution_type, admin_notes,
      },
    });
    return Response.json({ success: true, resolution_type });
  }

  // ── APPROVE (owner, editor, or override) ────────────────────────────────────
  if (['approved_as_owner', 'approved_as_editor', 'ownership_overridden'].includes(resolution_type)) {
    const role = resolution_type === 'approved_as_editor' ? 'editor' : 'owner';
    const forceOverride = resolution_type === 'ownership_overridden';

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
      forceOverride,
    });

    await base44.asServiceRole.entities.EntityClaimRequest.update(claim_id, {
      status: 'approved', admin_notes,
      admin_resolution_type: resolution_type,
      reviewed_by_user_id: user.id, reviewed_at: now,
      granted_role: role,
    });

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: resolution_type === 'ownership_overridden'
        ? 'entity_claim_owner_overridden'
        : role === 'owner' ? 'entity_claim_approved_as_owner' : 'entity_claim_approved_as_editor',
      entity_name: claim.entity_type, entity_id: claim.entity_id, status: 'success',
      message: `${claimMode} approved (${resolution_type}): ${claim.entity_name} (${claim.entity_type}) — ${claim.user_email} granted ${role}`,
      initiated_by: user.email,
      metadata: {
        claim_request_id: claim_id,
        entity_type: claim.entity_type, entity_id: claim.entity_id,
        entity_name: claim.entity_name,
        claimant_user_id: claim.user_id,
        existing_owner_user_id: claim.existing_owner_user_id || null,
        previous_owner_user_id: previousOwnerId,
        new_owner_user_id: claim.user_id,
        granted_role: role,
        admin_resolution_type: resolution_type,
        acted_by_user_id: user.id,
        collaborator_record_id: collaboratorId,
        claim_mode: claimMode,
      },
    });

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_claim_access_synced',
      entity_name: 'EntityClaimRequest', entity_id: claim_id, status: 'success',
      message: `Access synced: ${claim.user_email} → ${role} on ${claim.entity_name} (${claim.entity_type})`,
      initiated_by: user.email,
      metadata: {
        claim_request_id: claim_id, entity_type: claim.entity_type, entity_id: claim.entity_id,
        claimant_user_id: claim.user_id, granted_role: role, collaborator_record_id: collaboratorId,
        acted_by_user_id: user.id,
      },
    });

    // Auto-set primary entity on claimant if unset
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

    return Response.json({ success: true, resolution_type, role, collaborator_id: collaboratorId });
  }

  return Response.json({ error: 'Unhandled resolution_type' }, { status: 400 });
});