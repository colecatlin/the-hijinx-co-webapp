/**
 * components/access/entityEditPermission.js
 *
 * React hook providing surface-level edit permission resolution for shared entities.
 *
 * Returns:
 *   canEditManagement  — Management/profile fields: admin, entity owner, or EntityCollaborator
 *   canEditRaceCore    — Race Core operational fields: admin only (no separate role model yet)
 *   canEditProtectedFields — Protected core overrides: admin only
 *   isLoadingPermission — true while async checks are in-flight
 *
 * Usage:
 *   const { canEditManagement, canEditProtectedFields, isAdmin } =
 *     useEntityEditPermission('Driver', driverId, driverRecord);
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useEntityEditPermission(entityType, entityId, entityRecord = null) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  // Driver has an owner_user_id field — check direct ownership
  const isDirectOwner =
    entityType === 'Driver' &&
    !!entityRecord?.owner_user_id &&
    !!user?.id &&
    entityRecord.owner_user_id === user.id;

  // EntityCollaborator lookup (skipped for admins and new records)
  const { data: collabs = [], isLoading: isLoadingCollabs } = useQuery({
    queryKey: ['entityCollabPermission', entityType, entityId, user?.id],
    queryFn: () =>
      base44.entities.EntityCollaborator.filter({
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
      }),
    enabled: !!entityId && entityId !== 'new' && !!user?.id && !isAdmin,
    staleTime: 60_000,
  });

  const collabRole = collabs.length > 0
    ? (collabs.some(c => c.role === 'owner') ? 'owner' : (collabs[0]?.role || null))
    : null;

  const isCollaborator = !!collabRole;

  // ── Surface-level permission resolution ──────────────────────────────────────

  /**
   * canEditManagement: admin OR entity owner OR EntityCollaborator (any role)
   * Covers all Management-owned presentation/profile fields.
   */
  const canEditManagement = isAdmin || isDirectOwner || isCollaborator;

  /**
   * canEditRaceCore: admin only until a dedicated Race Core role model exists.
   * Entity owners/collaborators who do NOT have Race Core access are blocked.
   */
  const canEditRaceCore = isAdmin;

  /**
   * canEditProtectedFields: admin only — covers override fields, featured flags,
   * numeric IDs, canonical keys, etc.
   */
  const canEditProtectedFields = isAdmin;

  const isLoadingPermission =
    !user || (!isAdmin && !!entityId && entityId !== 'new' && isLoadingCollabs);

  return {
    user,
    isAdmin,
    isDirectOwner,
    isCollaborator,
    collabRole,
    canEditManagement,
    canEditRaceCore,
    canEditProtectedFields,
    isLoadingPermission,
  };
}

/**
 * Standalone async helpers (non-hook, for use in event handlers / save actions)
 */

/**
 * canEditManagementEntity — async permission check for Management surfaces.
 * @param {object} user  — current user object (must have .id and .role)
 * @param {string} entityType
 * @param {string} entityId
 * @param {object} [entityRecord] — optional; used for owner_user_id on Driver
 */
export async function canEditManagementEntity(user, entityType, entityId, entityRecord = null) {
  if (!user) return false;
  if (user.role === 'admin') return true;

  // Driver direct ownership
  if (entityType === 'Driver' && entityRecord?.owner_user_id === user.id) return true;

  // EntityCollaborator
  try {
    const collabs = await base44.entities.EntityCollaborator.filter({
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
    });
    return collabs && collabs.length > 0 && collabs.some(c => ['owner', 'editor'].includes(c.role));
  } catch {
    return false;
  }
}

/**
 * canEditRaceCoreEntity — admin only for now.
 */
export async function canEditRaceCoreEntity(user) {
  return user?.role === 'admin';
}

/**
 * canEditProtectedCoreFields — admin only.
 */
export async function canEditProtectedCoreFields(user) {
  return user?.role === 'admin';
}