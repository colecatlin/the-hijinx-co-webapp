/**
 * entityAccess.js
 * Canonical entity ownership & permission checks. Resolves through identityAccess:
 * approved status, permission_level, granted_permissions. Legacy owner/editor are
 * transparently mapped to admin/staff for transitional (backfilled) records.
 *
 * TWO usage patterns:
 *   1. Async (no collaborations loaded yet) — canManageEntity(), isEntityOwner(), getEntityRole()
 *   2. Sync  (collaborations already loaded) — canManageEntitySync(), isEntityOwnerSync(), getHighestRoleSync()
 *
 * Admin users always have full access — caller may check user.role === 'admin' first.
 */

import { base44 } from '@/api/base44Client';
import {
  canManageEntityCanonical,
  isActiveCollaborator,
  isRelationshipAdmin,
  isRelationshipStaffOrAbove,
  getActiveCollaborators,
} from '@/lib/identityAccess';

// ─── ASYNC HELPERS ─────────────────────────────────────────────────────────────

export async function getMyCollaborations() {
  try {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return [];
    const user = await base44.auth.me();
    if (!user) return [];
    return await base44.entities.EntityCollaborator.filter({ user_id: user.id });
  } catch {
    return [];
  }
}

export async function canManageEntity(entityType, entityId) {
  try {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return false;
    const user = await base44.auth.me();
    if (!user) return false;
    const collaborators = await base44.entities.EntityCollaborator.filter({ user_id: user.id });
    return canManageEntityCanonical(user, collaborators, entityType, entityId);
  } catch {
    return false;
  }
}

export async function isEntityOwner(userId, entityType, entityId) {
  if (!userId || !entityType || !entityId) return false;
  try {
    const collaborators = await base44.entities.EntityCollaborator.filter({ user_id: userId });
    return getActiveCollaborators(collaborators).some(
      (c) => c.entity_type === entityType && c.entity_id === entityId && isRelationshipAdmin(c),
    );
  } catch {
    return false;
  }
}

export async function getEntityRole(entityType, entityId) {
  try {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return null;
    const user = await base44.auth.me();
    if (!user) return null;
    const collaborators = await base44.entities.EntityCollaborator.filter({ user_id: user.id });
    const related = getActiveCollaborators(collaborators).filter(
      (c) => c.entity_type === entityType && c.entity_id === entityId,
    );
    if (related.length === 0) return null;
    if (related.some(isRelationshipAdmin)) return 'owner';
    if (related.some(isRelationshipStaffOrAbove)) return 'editor';
    return null;
  } catch {
    return null;
  }
}

export async function getUserOwnedEntities(userId) {
  if (!userId) return [];
  try {
    const all = await base44.entities.EntityCollaborator.filter({ user_id: userId });
    return (all || []).filter((c) => isRelationshipAdmin(c) && isActiveCollaborator(c));
  } catch {
    return [];
  }
}

export async function hasEntityAccess({ userId, entityType, entityId }) {
  if (!userId || !entityType || !entityId) return false;
  try {
    const collabs = await base44.entities.EntityCollaborator.filter({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
    });
    return (collabs || []).some(isActiveCollaborator);
  } catch {
    return false;
  }
}

export async function requireEntityAccess(entityType, entityId) {
  const hasAccess = await canManageEntity(entityType, entityId);
  if (!hasAccess) throw new Error(`You do not have access to manage this ${entityType}`);
}

// ─── SYNC HELPERS (use when collaborations are already fetched) ─────────────────

export function canManageEntitySync(userId, entityType, entityId, collaborations = []) {
  return collaborations.some(
    (c) =>
      c.user_id === userId &&
      c.entity_type === entityType &&
      c.entity_id === entityId &&
      isActiveCollaborator(c) &&
      isRelationshipStaffOrAbove(c),
  );
}

export function isEntityOwnerSync(userId, entityType, entityId, collaborations = []) {
  return collaborations.some(
    (c) =>
      c.user_id === userId &&
      c.entity_type === entityType &&
      c.entity_id === entityId &&
      isActiveCollaborator(c) &&
      isRelationshipAdmin(c),
  );
}

export function getHighestRoleSync(userId, entityType, entityId, collaborations = []) {
  const matching = collaborations.filter(
    (c) =>
      c.user_id === userId &&
      c.entity_type === entityType &&
      c.entity_id === entityId &&
      isActiveCollaborator(c),
  );
  if (matching.length === 0) return null;
  if (matching.some(isRelationshipAdmin)) return 'owner';
  if (matching.some(isRelationshipStaffOrAbove)) return 'editor';
  return null;
}

export function getUserOwnedEntitiesSync(userId, collaborations = []) {
  return (collaborations || []).filter(
    (c) => c.user_id === userId && isActiveCollaborator(c) && isRelationshipAdmin(c),
  );
}

export function getCollaborationsByType(userId, entityType, collaborations = []) {
  return (collaborations || []).filter(
    (c) => c.user_id === userId && c.entity_type === entityType && isActiveCollaborator(c),
  );
}

// ─── Surface-level permission helpers (re-exported for convenience) ───────────
export {
  canEditManagementEntity,
  canEditRaceCoreEntity,
  canEditProtectedCoreFields,
  useEntityEditPermission,
} from '@/components/access/entityEditPermission';