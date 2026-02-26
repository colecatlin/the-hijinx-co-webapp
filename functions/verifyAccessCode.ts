import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth, createAuthError } from './helpers/authUtils.js';
import { validateRequired, createValidationError } from './helpers/validationUtils.js';

const ENTITY_TYPES = ['Driver', 'Series', 'Team', 'Track'];
const ENTITY_NAME_FIELDS = {
  Driver: (e) => `${e.first_name} ${e.last_name}`,
  Series: (e) => e.name,
  Team: (e) => e.name,
  Track: (e) => e.name
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAuth(base44);

    const payload = await req.json().catch(() => ({}));
    validateRequired(payload, ['code']);

    const { code } = payload;

    // Try each entity type
    for (const entityType of ENTITY_TYPES) {
      const results = await base44.asServiceRole.entities[entityType].filter({ numeric_id: code });
      
      if (results.length > 0) {
        const entity = results[0];
        const getEntityName = ENTITY_NAME_FIELDS[entityType];
        
        const collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
          user_id: user.id,
          user_email: user.email,
          entity_type: entityType,
          entity_id: entity.id,
          entity_name: getEntityName(entity),
          access_code: code,
          role: 'editor'
        });

        return Response.json({
          success: true,
          entity,
          entityType,
          entityId: entity.id,
          collaboratorId: collaborator.id
        });
      }
    }

    return createAuthError(404, 'Invalid access code');
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