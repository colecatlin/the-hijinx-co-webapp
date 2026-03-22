/**
 * components/entities/entityAccess.js
 *
 * Thin compatibility shim — re-exports from the canonical ownership helpers.
 * All new code should import directly from @/components/access/entityAccess.
 *
 * Legacy helpers preserved for backward compat with RegistrationDashboard
 * components that pass a collaborator object and expect .role on it.
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

// ─── Legacy helpers (kept for RegistrationDashboard compatibility) ──────────────

/**
 * @deprecated Pass (userId, entityType, entityId, collaborations) to isEntityOwnerSync instead.
 * Old signature accepted a collaborator record with .role on it.
 */
export function isAdmin(user) {
  return user?.role === 'admin';
}

/** Check if a collaborator record represents an owner. */
export function isCollaboratorOwner(collab) {
  return collab?.role === 'owner';
}

/** Check if a collaborator record represents an editor. */
export function isCollaboratorEditor(collab) {
  return collab?.role === 'editor';
}

/** Check if a collaborator record can open Race Core (Track or Series). */
export function canOpenRaceCore(collab) {
  return collab?.entity_type === 'Track' || collab?.entity_type === 'Series';
}