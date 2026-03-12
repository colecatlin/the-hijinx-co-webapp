/**
 * User Context Checker
 * High-level helpers for checking access and context in React components
 */

import { resolveUserManagedEntities, resolvePrimaryEntity } from './userContextResolver';

/**
 * Can user manage a specific entity?
 * Access truth: EntityCollaborator only
 */
export function canManageEntity(user, entityType, entityId, collaborators = []) {
  if (!user || !entityType || !entityId) return false;
  
  return collaborators.some(
    c => (c.user_id === user.id || c.user_email === user.email) &&
         c.entity_type === entityType &&
         c.entity_id === entityId
  );
}

/**
 * Get all entity types user can manage
 */
export function getUserManagedEntityTypes(user, collaborators = []) {
  const managed = resolveUserManagedEntities(user, collaborators);
  return [...new Set(managed.map(m => m.entity_type))];
}

/**
 * Get primary entity for dashboard context
 * Context truth: primary_entity_type and primary_entity_id
 */
export function getPrimaryEntityContext(user, collaborators = []) {
  const { primary_entity, is_valid } = resolvePrimaryEntity(user, collaborators);
  return primary_entity && is_valid ? primary_entity : null;
}

/**
 * Does user need to set up primary entity?
 */
export function needsPrimaryEntitySetup(user, collaborators = []) {
  const managed = resolveUserManagedEntities(user, collaborators);
  if (managed.length === 0) return false; // No entities to manage
  
  const { is_valid } = resolvePrimaryEntity(user, collaborators);
  return !is_valid;
}