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
    const existingCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
      entity_type: claim.entity_type,
      entity_id: claim.entity_id,
    });

    const existingOwners = existingCollabs.filter(c => c.role === 'owner');
    const alreadyLinked = existingCollabs.find(
      c => c.user_id === claim.user_id || c.user_email === claim.user_email
    );

    if (alreadyLinked) {
      if (alreadyLinked.role !== role) {
        await base44.asServiceRole.entities.EntityCollaborator.update(alreadyLinked.id, { role });
      }
    } else {
      let accessCode = '';
      if (existingOwners.length > 0 && existingOwners[0].access_code) {
        accessCode = existingOwners[0].access_code;
      } else {
        accessCode = await generateUniqueCode(base44);
        if (!accessCode) return Response.json({ error: 'Failed to generate unique access code' }, { status: 500 });
      }
      await base44.asServiceRole.entities.EntityCollaborator.create({
        user_id: claim.user_id,
        user_email: claim.user_email,
        entity_type: claim.entity_type,
        entity_id: claim.entity_id,
        entity_name: claim.entity_name,
        role,
        access_code: accessCode,
      });
    }

    // Update owner_user_id on the entity itself when granting owner role
    if (role === 'owner') {
      try {
        const entitySdk = base44.asServiceRole.entities[ENTITY_SDK_MAP[claim.entity_type]];
        if (entitySdk) {
          await entitySdk.update(claim.entity_id, { owner_user_id: claim.user_id });
        }
      } catch (_) { /* non-critical if entity doesn't have owner_user_id */ }
    }

    await base44.asServiceRole.entities.EntityClaimRequest.update(claim_id, {
      status: 'approved',
      admin_notes,
      reviewed_by_user_id: user.id,
      reviewed_at: now,
      granted_role: role,
    });

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
        role,
        acted_by_user_id: user.id,
        had_existing_owner: existingOwners.length > 0,
      },
    });

    // Log ownership transfer
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'ownership_transferred',
      entity_name: claim.entity_type,
      entity_id: claim.entity_id,
      status: 'success',
      message: `Ownership of ${claim.entity_name} transferred to ${claim.user_email}`,
      initiated_by: user.email,
      metadata: { user_id: claim.user_id, user_email: claim.user_email, role, source: 'claim_approval' },
    });

    // Auto-set primary entity for claimant if they have none yet
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

    return Response.json({ success: true, action: 'approved', role });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
});