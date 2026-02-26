import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth, createAuthError } from './helpers/authUtils.js';
import { validateRequired, validateDateFormat, createValidationError } from './helpers/validationUtils.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAuth(base44);

    const payload = await req.json().catch(() => ({}));
    validateRequired(payload, ['code']);

    const { code } = payload;

    // Find pending invitation
    const invitations = await base44.asServiceRole.entities.Invitation.filter({
      code,
      status: 'pending'
    });

    if (invitations.length === 0) {
      return createAuthError(404, 'Invitation not found or already accepted');
    }

    const invitation = invitations[0];

    // Check expiration
    if (new Date(invitation.expiration_date) < new Date()) {
      return createValidationError(400, 'Invitation has expired');
    }

    // Get entity access code
    const accessCode = invitation.access_code || await (async () => {
      const entity = await base44.asServiceRole.entities[invitation.entity_type].get(invitation.entity_id);
      return entity?.numeric_id;
    })();

    if (!accessCode) {
      return createAuthError(404, 'Entity access code not found');
    }

    // Create collaborator (as owner)
    const collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
      user_id: user.id,
      user_email: user.email,
      entity_type: invitation.entity_type,
      entity_id: invitation.entity_id,
      entity_name: invitation.entity_name,
      access_code: accessCode,
      role: 'owner'
    });

    // Mark invitation accepted
    await base44.asServiceRole.entities.Invitation.update(invitation.id, {
      status: 'accepted',
      accepted_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Invitation accepted successfully',
      collaborator: {
        id: collaborator.id,
        entityType: collaborator.entity_type,
        entityId: collaborator.entity_id,
        role: collaborator.role
      }
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return createAuthError(401, error.message);
    }
    if (error.message.includes('required')) {
      return createValidationError(400, error.message);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});