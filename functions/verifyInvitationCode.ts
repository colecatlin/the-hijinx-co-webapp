import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function generateNumericCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

async function generateUniqueAccessCode(base44) {
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

  const { code, email } = await req.json();
  if (!code) return Response.json({ error: 'Missing required field: code' }, { status: 400 });

  const normalizedEmail = (email || user.email).trim().toLowerCase();

  // Find invitation by code
  const invitations = await base44.asServiceRole.entities.Invitation.filter({ code, status: 'pending' });
  if (!invitations || invitations.length === 0) {
    return Response.json({ error: 'Invitation not found or already used.' }, { status: 404 });
  }

  const invitation = invitations[0];

  // Verify email matches
  if (invitation.email !== normalizedEmail) {
    return Response.json({ error: 'This invitation is for a different email address.' }, { status: 403 });
  }

  // Check expiration
  if (invitation.expiration_date && new Date(invitation.expiration_date) < new Date()) {
    await base44.asServiceRole.entities.Invitation.update(invitation.id, { status: 'expired' });
    return Response.json({ error: 'This invitation has expired.' }, { status: 410 });
  }

  // Check for existing collaborator
  const existingCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
    entity_type: invitation.entity_type,
    entity_id: invitation.entity_id,
    user_email: normalizedEmail,
  });

  if (!existingCollabs || existingCollabs.length === 0) {
    // Determine access code from owner
    const ownerCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
      entity_type: invitation.entity_type,
      entity_id: invitation.entity_id,
      role: 'owner',
    });
    let accessCode = '';
    if (ownerCollabs && ownerCollabs.length > 0 && ownerCollabs[0].access_code) {
      accessCode = ownerCollabs[0].access_code;
    } else {
      accessCode = await generateUniqueAccessCode(base44) || '';
    }

    await base44.asServiceRole.entities.EntityCollaborator.create({
      user_id: user.id,
      user_email: normalizedEmail,
      entity_type: invitation.entity_type,
      entity_id: invitation.entity_id,
      entity_name: invitation.entity_name,
      role: 'editor',
      access_code: accessCode,
    });
  }

  // Mark invitation as accepted
  await base44.asServiceRole.entities.Invitation.update(invitation.id, {
    status: 'accepted',
    accepted_date: new Date().toISOString(),
  });

  await base44.asServiceRole.entities.OperationLog.create({
    operation_type: 'entity_invitation_accepted',
    entity_name: invitation.entity_type,
    entity_id: invitation.entity_id,
    status: 'success',
    message: `Invitation accepted: ${normalizedEmail} joined ${invitation.entity_name} (${invitation.entity_type}) as editor`,
    initiated_by: normalizedEmail,
    metadata: {
      entity_type: invitation.entity_type,
      entity_id: invitation.entity_id,
      target_user_email: normalizedEmail,
      role: 'editor',
      acted_by_user_id: user.id,
    },
  });

  return Response.json({
    success: true,
    entity_name: invitation.entity_name,
    entity_type: invitation.entity_type,
    entity_id: invitation.entity_id,
  });
});