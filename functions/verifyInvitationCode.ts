import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, email } = await req.json();

    if (!code || !email) {
      return Response.json({ error: 'Missing code or email' }, { status: 400 });
    }

    // Verify email matches
    if (user.email !== email) {
      return Response.json({ error: 'Email does not match logged in user' }, { status: 400 });
    }

    // Find the invitation by code
    const invitations = await base44.asServiceRole.entities.Invitation.filter({ code });

    if (!invitations || invitations.length === 0) {
      return Response.json({ error: 'Invalid invitation code' }, { status: 404 });
    }

    const invitation = invitations[0];

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return Response.json({ error: 'Invitation has already been used or is no longer valid' }, { status: 400 });
    }

    // Check if invitation has expired
    const expirationDate = new Date(invitation.expiration_date);
    if (new Date() > expirationDate) {
      return Response.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Check if invitation email matches
    if (invitation.email !== user.email) {
      return Response.json({ error: 'This invitation was sent to a different email address' }, { status: 400 });
    }

    // Create EntityCollaborator record to grant access
    await base44.asServiceRole.entities.EntityCollaborator.create({
      user_id: user.id,
      user_email: user.email,
      entity_type: invitation.entity_type,
      entity_id: invitation.entity_id,
      entity_name: invitation.entity_name,
      role: 'editor',
    });

    // Update invitation status to accepted
    await base44.asServiceRole.entities.Invitation.update(invitation.id, {
      status: 'accepted',
      accepted_date: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        entity_type: invitation.entity_type,
        entity_id: invitation.entity_id,
        entity_name: invitation.entity_name,
        role: 'editor',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});