/**
 * Authentication and authorization utilities for backend functions
 */

export async function requireAuth(base44) {
  const user = await base44.auth.me();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdminAuth(base44) {
  const user = await base44.auth.me();
  if (!user) {
    throw new Error('Unauthorized');
  }
  if (user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return user;
}

export function isAdmin(user) {
  return user?.role === 'admin';
}

export async function checkEntityAccess(base44, userId, entityType, entityId, requiredRole = 'editor') {
  const ROLE_HIERARCHY = { 'owner': 2, 'editor': 1 };
  
  const collaborators = await base44.asServiceRole.entities.EntityCollaborator.filter({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId
  });

  if (collaborators.length === 0) {
    return { hasAccess: false, reason: 'no_collaboration_found' };
  }

  const collaborator = collaborators[0];
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 1;
  const userLevel = ROLE_HIERARCHY[collaborator.role] || 0;

  if (userLevel < requiredLevel) {
    return {
      hasAccess: false,
      reason: 'insufficient_permissions',
      userRole: collaborator.role,
      requiredRole
    };
  }

  return {
    hasAccess: true,
    reason: 'collaborator',
    userRole: collaborator.role,
    collaboratorId: collaborator.id
  };
}

export function createAuthError(status, message) {
  return Response.json({ error: message }, { status });
}