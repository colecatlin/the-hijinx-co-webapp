import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function generateNumericCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { entity_type, entity_id, entity_name, email, role = 'editor' } = await req.json();
  if (!entity_type || !entity_id || !entity_name || !email) {
    return Response.json({ error: 'Missing required fields: entity_type, entity_id, entity_name, email' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Verify current user owns this entity or is admin
  const ownerCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
    entity_type,
    entity_id,
    role: 'owner',
  });
  const isOwner = ownerCollabs.some(c => c.user_email === user.email || c.user_id === user.id);
  if (!isOwner && user.role !== 'admin') {
    return Response.json({ error: 'Only entity owners can send invitations' }, { status: 403 });
  }

  // Check for existing pending invitation for same email + entity
  const existingInvitations = await base44.asServiceRole.entities.Invitation.filter({
    email: normalizedEmail,
    entity_id,
    status: 'pending',
  });
  if (existingInvitations && existingInvitations.length > 0) {
    return Response.json({ invitation: existingInvitations[0], duplicate: true });
  }

  // Generate unique invitation code
  let code;
  for (let i = 0; i < 20; i++) {
    const candidate = generateNumericCode();
    const existing = await base44.asServiceRole.entities.Invitation.filter({ code: candidate });
    if (!existing || existing.length === 0) { code = candidate; break; }
  }
  if (!code) return Response.json({ error: 'Failed to generate unique code' }, { status: 500 });

  const expirationDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const invitation = await base44.asServiceRole.entities.Invitation.create({
    email: normalizedEmail,
    code,
    entity_type,
    entity_id,
    entity_name,
    status: 'pending',
    expiration_date: expirationDate,
    invited_by: user.email,
  });

  await base44.asServiceRole.entities.OperationLog.create({
    operation_type: 'entity_invitation_created',
    entity_name: entity_type,
    entity_id,
    status: 'success',
    message: `Invitation sent to ${normalizedEmail} for ${entity_name} (${entity_type}) as ${role}`,
    initiated_by: user.email,
    metadata: {
      entity_type,
      entity_id,
      target_user_email: normalizedEmail,
      role,
      acted_by_user_id: user.id,
    },
  });

  return Response.json({ success: true, invitation });
});