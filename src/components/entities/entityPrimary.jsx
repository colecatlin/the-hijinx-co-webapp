/**
 * entityPrimary.js
 * Helpers for getting and setting the user's primary entity.
 * Never uses legacy user.driver_id / team_id / series_id / track_id.
 */

import { base44 } from '@/api/base44Client';

/**
 * Returns the valid primary resolved entity for the user, or null.
 * Priority:
 * 1. user.primary_entity_id matches a resolved entity
 * 2. First Track or Series collaborator
 * 3. First collaborator of any type
 * 4. null
 */
export function getValidPrimaryEntity(user, resolvedEntities) {
  if (!resolvedEntities?.length) return null;

  if (user?.primary_entity_id) {
    const explicit = resolvedEntities.find(e => e.entity_id === user.primary_entity_id);
    if (explicit) return explicit;
  }

  return resolvedEntities.find(e => e.is_racecore_entity) || resolvedEntities[0] || null;
}

/**
 * Returns true if the user's stored primary_entity_id is stale
 * (set but not found in current collaborations).
 */
export function isPrimaryEntityStale(user, resolvedEntities) {
  if (!user?.primary_entity_id) return false;
  if (!resolvedEntities?.length) return true;
  return !resolvedEntities.find(e => e.entity_id === user.primary_entity_id);
}

/**
 * Updates the user's primary entity via updateUserProfile.
 * Only writes primary_entity_type and primary_entity_id — does not touch other fields.
 */
export async function setPrimaryEntityOnUser({ currentUser, entityType, entityId }) {
  await base44.auth.updateMe({
    primary_entity_type: entityType,
    primary_entity_id: entityId,
  });
  await base44.functions.invoke('updateUserProfile', {
    formData: {
      primary_entity_type: entityType,
      primary_entity_id: entityId,
    },
  });
}