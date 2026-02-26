import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAuth, isAdmin, checkEntityAccess, createAuthError } from './helpers/authUtils.js';
import { validateRequired, createValidationError } from './helpers/validationUtils.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAuth(base44);

    const payload = await req.json().catch(() => ({}));
    validateRequired(payload, ['entity_type', 'entity_id']);

    const { entity_type, entity_id, required_role = 'editor' } = payload;

    // Admins always have access
    if (isAdmin(user)) {
      return Response.json({
        hasAccess: true,
        reason: 'admin_user',
        userId: user.id
      });
    }

    // Check collaborator access
    const access = await checkEntityAccess(base44, user.id, entity_type, entity_id, required_role);
    
    if (!access.hasAccess) {
      return createAuthError(403, `Access denied: ${access.reason}`);
    }

    return Response.json({
      hasAccess: true,
      ...access,
      userId: user.id
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