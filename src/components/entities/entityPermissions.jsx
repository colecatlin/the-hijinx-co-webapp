/**
 * components/entities/entityPermissions.js
 *
 * Re-exports canonical ownership/permission helpers for components that import from here.
 * Canonical source: @/components/access/entityAccess
 */

export {
  canManageEntity,
  isEntityOwner,
  getEntityRole,
  getUserOwnedEntities,
  canManageEntitySync,
  isEntityOwnerSync,
  getHighestRoleSync,
  getUserOwnedEntitiesSync,
  getCollaborationsByType,
  getMyCollaborations,
  requireEntityAccess,
  // Surface-level permission helpers
  canEditManagementEntity,
  canEditRaceCoreEntity,
  canEditProtectedCoreFields,
  useEntityEditPermission,
} from '@/components/access/entityAccess';

// hasEntityAccess — backward compat alias used by RegistrationDashboard
export { hasEntityAccess } from '@/components/access/entityAccess';

/**
 * getHighestEntityRole — sync helper using pre-loaded collaborations array.
 * Kept here for backward compat with components that import from entityPermissions.
 */
export function getHighestEntityRole({ collaborations = [], entityType, entityId }) {
  const ROLE_RANK = { owner: 2, editor: 1 };
  const matching = collaborations.filter(
    c => c.entity_type === entityType && c.entity_id === entityId
  );
  if (matching.length === 0) return null;
  return matching.reduce((best, c) => {
    const rank = ROLE_RANK[c.role] || 0;
    const bestRank = ROLE_RANK[best] || 0;
    return rank > bestRank ? c.role : best;
  }, null);
}

/**
 * getUserEntityRoles — load all EntityCollaborator records for a userId.
 * Kept here for backward compat.
 */
export async function getUserEntityRoles(userId) {
  const { base44 } = await import('@/api/base44Client');
  if (!userId) return [];
  const records = await base44.entities.EntityCollaborator.filter({ user_id: userId });
  return records || [];
}