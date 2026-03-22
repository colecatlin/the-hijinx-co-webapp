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
} from '@/components/access/entityAccess';

// Also re-export the sync variant from entityPermissions for legacy callers
export { getHighestEntityRole } from '@/components/access/entityAccess';