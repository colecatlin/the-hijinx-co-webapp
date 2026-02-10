import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code) {
      return Response.json({ error: 'Invitation code is required' }, { status: 400 });
    }

    // Find the invitation
    const invitations = await base44.asServiceRole.entities.Invitation.filter({
      code,
      status: 'pending'
    });

    if (invitations.length === 0) {
      return Response.json({ error: 'Invitation not found or already accepted' }, { status: 404 });
    }

    const invitation = invitations[0];

    // Check if invitation has expired
    if (new Date(invitation.expiration_date) < new Date()) {
      return Response.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Fetch the entity to get its numeric_id if not in invitation
    const accessCode = invitation.access_code || await (async () => {
      const entity = await base44.asServiceRole.entities[invitation.entity_type].get(invitation.entity_id);
      return entity?.numeric_id;
    })();

    if (!accessCode) {
      return Response.json({ error: 'Entity access code not found' }, { status: 404 });
    }

    // Create EntityCollaborator record (user becomes owner)
    const collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
      user_id: user.id,
      user_email: user.email,
      entity_type: invitation.entity_type,
      entity_id: invitation.entity_id,
      entity_name: invitation.entity_name,
      access_code: accessCode,
      role: 'owner'
    });

    // Update invitation status
    await base44.asServiceRole.entities.Invitation.update(invitation.id, {
      status: 'accepted',
      accepted_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Invitation accepted successfully',
      collaborator: {
        id: collaborator.id,
        entity_type: collaborator.entity_type,
        entity_id: collaborator.entity_id,
        role: collaborator.role
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});