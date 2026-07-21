/**
 * components/access/entityEditPermission.js
 *
 * Surface-level edit-permission resolution for shared entities.
 * Resolves through useIdentityAccess (canonical: approved collaborators,
 * permission_level, granted_permissions), with the Driver owner_user_id short-circuit
 * retained as a transitional compatibility path.
 *
 * Returns:
 *   canEditManagement       — admin OR Driver direct-owner OR staff-or-above collaborator
 *   canEditRaceCore         — admin OR relationship-admin (owner) of the entity
 *   canEditProtectedFields  — admin only (override/featured/numeric id fields)
 *   isLoadingPermission     — true while identity context resolves
 */

import { useIdentityAccess } from '@/hooks/useIdentityAccess';
import {
  getCollaboratorsForEntity,
  isRelationshipAdmin,
  isRelationshipStaffOrAbove,
  getPermissionLevel,
  isActiveCollaborator,
} from '@/lib/identityAccess';
import { base44 } from '@/api/base44Client';

export function useEntityEditPermission(entityType, entityId, entityRecord = null) {
  const { user, collaborators, isLoading } = useIdentityAccess();

  const isAdmin = user?.role === 'admin';

  const isDirectOwner =
    entityType === 'Driver' &&
    !!entityRecord?.owner_user_id &&
    !!user?.id &&
    entityRecord.owner_user_id === user.id;

  const activeForEntity =
    entityId && entityId !== 'new'
      ? getCollaboratorsForEntity(collaborators, entityType, entityId)
      : [];

  const collabRole = activeForEntity.some(isRelationshipAdmin)
    ? 'owner'
    : activeForEntity.some(isRelationshipStaffOrAbove)
      ? 'editor'
      : activeForEntity.length > 0
        ? 'viewer'
        : null;

  const isCollaborator = activeForEntity.length > 0;
  const permissionLevel = activeForEntity.length > 0 ? getPermissionLevel(activeForEntity[0]) : null;

  // Management / profile fields: admin, Driver direct-owner, or staff-or-above collaborator.
  const canEditManagement =
    isAdmin || isDirectOwner || activeForEntity.some(isRelationshipStaffOrAbove);

  // Race Core operational fields: admin or the entity's relationship-admin (owner runs their own ops).
  const canEditRaceCore = isAdmin || activeForEntity.some(isRelationshipAdmin);

  // Protected core fields (overrides, featured flags, numeric IDs, canonical keys): admin only.
  const canEditProtectedFields = isAdmin;

  const isLoadingPermission =
    isLoading || (!user) || (!!entityId && entityId !== 'new' && !collaborators && !isAdmin);

  return {
    user,
    isAdmin,
    isDirectOwner,
    isCollaborator,
    collabRole,
    permissionLevel,
    canEditManagement,
    canEditRaceCore,
    canEditProtectedFields,
    isLoadingPermission,
  };
}

// ─── Standalone async helpers (non-hook, for event handlers / save actions) ──

import {
  canManageEntityCanonical,
  isEntityOwnerCanonical,
} from '@/lib/identityAccess';

export async function canEditManagementEntity(user, entityType, entityId, entityRecord = null) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (entityType === 'Driver' && entityRecord?.owner_user_id === user.id) return true;
  try {
    const collaborators = await base44.entities.EntityCollaborator.filter({ user_id: user.id });
    return canManageEntityCanonical(user, collaborators, entityType, entityId);
  } catch {
    return false;
  }
}

export async function canEditRaceCoreEntity(user, entityType, entityId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  try {
    const collaborators = await base44.entities.EntityCollaborator.filter({ user_id: user.id });
    return isEntityOwnerCanonical(user, collaborators, entityType, entityId);
  } catch {
    return false;
  }
}

export async function canEditProtectedCoreFields(user) {
  return user?.role === 'admin';
}