import { base44 } from '@/api/base44Client';

const ROLE_RANK = { owner: 2, editor: 1 };

/**
 * Load all EntityCollaborator records for a given userId.
 * Returns a normalized array of collaborator objects.
 */
export async function getUserEntityRoles(userId) {
  if (!userId) return [];
  const records = await base44.entities.EntityCollaborator.filter({ user_id: userId });
  return records || [];
}

/**
 * Returns true if the user has any collaborator record for the given entity.
 */
export async function hasEntityAccess({ userId, entityType, entityId }) {
  if (!userId || !entityType || !entityId) return false;
  const records = await base44.entities.EntityCollaborator.filter({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
  });
  return records && records.length > 0;
}

/**
 * Returns true if the user has a collaborator record for the entity
 * with a role in the allowedRoles array.
 */
export async function hasEntityRole({ userId, entityType, entityId, allowedRoles = [] }) {
  if (!userId || !entityType || !entityId) return false;
  const records = await base44.entities.EntityCollaborator.filter({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
  });
  if (!records || records.length === 0) return false;
  return records.some(r => allowedRoles.includes(r.role));
}

/**
 * Given an already-loaded array of collaborations, find the highest role
 * the user has for a specific entity. Returns 'owner', 'editor', or null.
 * This is the sync variant — use it when you already have the collaborations loaded.
 */
export function getHighestEntityRole({ collaborations = [], entityType, entityId }) {
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