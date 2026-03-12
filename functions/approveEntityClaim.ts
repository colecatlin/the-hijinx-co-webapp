import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

  const { claim_id, action, role = 'owner' } = await req.json();
  if (!claim_id || !action) return Response.json({ error: 'Missing claim_id or action' }, { status: 400 });

  // Fetch claim (list + find since SDK has no get-by-id)
  const allClaims = await base44.asServiceRole.entities.EntityClaimRequest.list('-created_date', 500);
  const claim = allClaims.find(c => c.id === claim_id);
  if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });
  if (claim.status !== 'pending') return Response.json({ error: 'Claim is no longer pending' }, { status: 400 });

  const now = new Date().toISOString();

  if (action === 'reject') {
    await base44.asServiceRole.entities.EntityClaimRequest.update(claim_id, {
      status: 'rejected',
      reviewed_by_user_id: user.id,
      reviewed_at: now,
    });

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_claim_rejected',
      entity_name: 'EntityClaimRequest',
      entity_id: claim_id,
      status: 'success',
      message: `Claim rejected for ${claim.entity_name} (${claim.entity_type}) requested by ${claim.user_email}`,
      initiated_by: user.email,
      metadata: {
        entity_type: claim.entity_type,
        entity_id: claim.entity_id,
        target_user_email: claim.user_email,
        acted_by_user_id: user.id,
      },
    });

    return Response.json({ success: true, action: 'rejected' });
  }

  if (action === 'approve') {
    // Check for existing collaborators on this entity
    const existingCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
      entity_type: claim.entity_type,
      entity_id: claim.entity_id,
    });

    const existingOwners = existingCollabs.filter(c => c.role === 'owner');
    const alreadyLinked = existingCollabs.find(
      c => c.user_id === claim.user_id || c.user_email === claim.user_email
    );

    if (alreadyLinked) {
      // Update role if different
      if (alreadyLinked.role !== role) {
        await base44.asServiceRole.entities.EntityCollaborator.update(alreadyLinked.id, { role });
      }
    } else {
      // Determine access code: reuse existing owner code or generate new
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

    await base44.asServiceRole.entities.EntityClaimRequest.update(claim_id, {
      status: 'approved',
      reviewed_by_user_id: user.id,
      reviewed_at: now,
      granted_role: role,
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

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_claim_approved',
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

  return Response.json({ error: 'Invalid action. Use approve or reject.' }, { status: 400 });
});