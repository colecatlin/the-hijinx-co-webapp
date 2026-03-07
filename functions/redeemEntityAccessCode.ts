import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id, user_email, code } = await req.json();

  if (!user_id || !user_email || !code) {
    return Response.json({ error: 'Missing required fields: user_id, user_email, code' }, { status: 400 });
  }

  const normalizedCode = code.trim();

  // ── Step 1: Try Invitation first ────────────────────────────────────────
  const invitations = await base44.asServiceRole.entities.Invitation.filter({
    code: normalizedCode,
    status: 'pending',
  });

  if (invitations && invitations.length > 0) {
    const invitation = invitations[0];

    // Email guard: if invitation is email-scoped, it must match
    if (invitation.email && invitation.email.toLowerCase() !== user_email.toLowerCase()) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'entity_access_code_redeemed',
        entity_name: 'EntityCollaborator',
        status: 'error',
        metadata: { user_id, code: normalizedCode, reason: 'email_mismatch' },
      });
      return Response.json({ error: 'This invitation code is for a different email address.' }, { status: 403 });
    }

    // Link the user via canonical linker
    const linkRes = await base44.functions.invoke('linkUserToEntityAccess', {
      user_id,
      user_email,
      entity_type: invitation.entity_type,
      entity_id: invitation.entity_id,
      role: invitation.role || 'editor',
      access_code: normalizedCode,
      source: 'invitation',
    });

    const linkData = linkRes?.data;

    // Mark invitation accepted
    await base44.asServiceRole.entities.Invitation.update(invitation.id, { status: 'accepted' });

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_access_code_redeemed',
      entity_name: 'EntityCollaborator',
      status: 'success',
      metadata: { user_id, code: normalizedCode, source: 'invitation', action: linkData?.action },
    });

    return Response.json({
      action: linkData?.action || 'created',
      source: 'invitation',
      entity_type: invitation.entity_type,
      entity_id: invitation.entity_id,
      entity_name: linkData?.collaborator?.entity_name || invitation.entity_name || '',
      role: invitation.role || 'editor',
      collaborator: linkData?.collaborator,
      message: linkData?.action === 'unchanged'
        ? 'You already have access to this entity.'
        : 'Access granted via invitation.',
    });
  }

  // ── Step 2: Try owner EntityCollaborator code ────────────────────────────
  const ownerCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
    access_code: normalizedCode,
    role: 'owner',
  });

  if (ownerCollabs && ownerCollabs.length > 0) {
    const ownerRecord = ownerCollabs[0];

    // Grant editor access
    const linkRes = await base44.functions.invoke('linkUserToEntityAccess', {
      user_id,
      user_email,
      entity_type: ownerRecord.entity_type,
      entity_id: ownerRecord.entity_id,
      role: 'editor',
      access_code: normalizedCode,
      source: 'access_code',
    });

    const linkData = linkRes?.data;

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_access_code_redeemed',
      entity_name: 'EntityCollaborator',
      status: 'success',
      metadata: { user_id, code: normalizedCode, source: 'access_code', action: linkData?.action },
    });

    return Response.json({
      action: linkData?.action || 'created',
      source: 'access_code',
      entity_type: ownerRecord.entity_type,
      entity_id: ownerRecord.entity_id,
      entity_name: linkData?.collaborator?.entity_name || ownerRecord.entity_name || '',
      role: 'editor',
      collaborator: linkData?.collaborator,
      message: linkData?.action === 'unchanged'
        ? 'You already have access to this entity.'
        : 'Editor access granted.',
    });
  }

  // ── Step 3: Not found ────────────────────────────────────────────────────
  await base44.asServiceRole.entities.OperationLog.create({
    operation_type: 'entity_access_code_redeemed',
    entity_name: 'EntityCollaborator',
    status: 'error',
    metadata: { user_id, code: normalizedCode, reason: 'not_found' },
  });

  return Response.json({ error: 'Invalid or expired access code.' }, { status: 404 });
});