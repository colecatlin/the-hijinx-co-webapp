/**
 * entityAccess.js
 * Single source of truth for entity ownership and permission checks.
 *
 * TWO usage patterns:
 *   1. Async (when you don't yet have collaborations loaded) — canManageEntity(), isEntityOwner(), getEntityRole()
 *   2. Sync  (when collaborations are already loaded)        — canManageEntitySync(), isEntityOwnerSync(), getUserOwnedEntities()
 *
 * Admin users always have full access — check user.role === 'admin' first in the calling component.
 */

import { base44 } from '@/api/base44Client';

// ─── ASYNC HELPERS ─────────────────────────────────────────────────────────────

/**
 * Get all collaborations for the current user.
 */
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

/**
 * Check if the current user can manage a specific entity (owner or editor).
 * Admins should be handled by the caller — this only checks EntityCollaborator.
 */
export async function canManageEntity(entityType, entityId) {
  try {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return false;
    const user = await base44.auth.me();
    if (!user) return false;
    const collabs = await base44.entities.EntityCollaborator.filter({
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
    });
    return collabs.length > 0 && collabs.some(c => ['owner', 'editor'].includes(c.role));
  } catch {
    return false;
  }
}

/**
 * Check if a specific user (by userId) is the owner of a specific entity.
 */
export async function isEntityOwner(userId, entityType, entityId) {
  if (!userId || !entityType || !entityId) return false;
  try {
    const collabs = await base44.entities.EntityCollaborator.filter({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
    });
    return collabs.some(c => c.role === 'owner');
  } catch {
    return false;
  }
}

/**
 * Get the current user's role for a specific entity. Returns 'owner', 'editor', or null.
 */
export async function getEntityRole(entityType, entityId) {
  try {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return null;
    const user = await base44.auth.me();
    if (!user) return null;
    const collabs = await base44.entities.EntityCollaborator.filter({
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
    });
    if (collabs.length === 0) return null;
    // Prefer highest role if multiple records exist
    return collabs.some(c => c.role === 'owner') ? 'owner' : (collabs[0].role || null);
  } catch {
    return null;
  }
}

/**
 * Get all entities owned by a specific user (async, by userId).
 * Returns array of EntityCollaborator records with role === 'owner'.
 */
export async function getUserOwnedEntities(userId) {
  if (!userId) return [];
  try {
    const all = await base44.entities.EntityCollaborator.filter({ user_id: userId });
    return (all || []).filter(c => c.role === 'owner');
  } catch {
    return [];
  }
}

/**
 * Check if a specific user has any access (owner or editor) to a specific entity.
 * Sync variant — pass pre-loaded collaborations array.
 * Also available as async: use canManageEntity() instead.
 */
export async function hasEntityAccess({ userId, entityType, entityId }) {
  if (!userId || !entityType || !entityId) return false;
  try {
    const collabs = await base44.entities.EntityCollaborator.filter({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
    });
    return collabs && collabs.length > 0;
  } catch {
    return false;
  }
}

/**
 * Throw if current user cannot manage the entity.
 */
export async function requireEntityAccess(entityType, entityId) {
  const hasAccess = await canManageEntity(entityType, entityId);
  if (!hasAccess) throw new Error(`You do not have access to manage this ${entityType}`);
}

// ─── SYNC HELPERS (use when collaborations are already fetched) ─────────────────

const ROLE_RANK = { owner: 2, editor: 1 };

/**
 * Check if a user can manage an entity using an already-loaded collaborations array.
 */
export function canManageEntitySync(userId, entityType, entityId, collaborations = []) {
  return collaborations.some(
    c => c.user_id === userId && c.entity_type === entityType && c.entity_id === entityId
      && ['owner', 'editor'].includes(c.role)
  );
}

/**
 * Check if a user is the owner of an entity using an already-loaded collaborations array.
 */
export function isEntityOwnerSync(userId, entityType, entityId, collaborations = []) {
  return collaborations.some(
    c => c.user_id === userId && c.entity_type === entityType && c.entity_id === entityId
      && c.role === 'owner'
  );
}

/**
 * Get the highest role a user has for an entity from an already-loaded collaborations array.
 * Returns 'owner', 'editor', or null.
 */
export function getHighestRoleSync(userId, entityType, entityId, collaborations = []) {
  const matching = collaborations.filter(
    c => c.user_id === userId && c.entity_type === entityType && c.entity_id === entityId
  );
  if (matching.length === 0) return null;
  return matching.reduce((best, c) => {
    return (ROLE_RANK[c.role] || 0) > (ROLE_RANK[best] || 0) ? c.role : best;
  }, null);
}

/**
 * Get all entities owned by a user from an already-loaded collaborations array.
 * Returns array of EntityCollaborator records with role === 'owner'.
 */
export function getUserOwnedEntitiesSync(userId, collaborations = []) {
  return collaborations.filter(c => c.user_id === userId && c.role === 'owner');
}

/**
 * Filter collaborations by entity type for a specific user.
 */
export function getCollaborationsByType(userId, entityType, collaborations = []) {
  return collaborations.filter(c => c.user_id === userId && c.entity_type === entityType);
}