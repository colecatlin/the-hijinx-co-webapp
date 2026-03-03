/**
 * Entity Access Control Utility
 * Provides functions to check user access to entities based on EntityCollaborator records
 */

import { base44 } from '@/api/base44Client';

/**
 * Get all collaborations for the current user
 * @returns {Promise<Array>} Array of EntityCollaborator records for current user, or empty array if not authenticated
 */
export async function getMyCollaborations() {
  try {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) return [];
    
    const user = await base44.auth.me();
    if (!user) return [];
    
    return await base44.entities.EntityCollaborator.filter({ user_id: user.id });
  } catch (error) {
    console.error('Error fetching collaborations:', error);
    return [];
  }
}

/**
 * Check if current user can manage a specific entity
 * @param {string} entityType - Entity type (Driver, Team, Track, Series, Event)
 * @param {string} entityId - Entity ID
 * @returns {Promise<boolean>} True if user has owner or editor access to the entity
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
  } catch (error) {
    console.error('Error checking entity access:', error);
    return false;
  }
}

/**
 * Get the current user's role for a specific entity
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @returns {Promise<string|null>} 'owner', 'editor', or null if no access
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
    return collabs[0].role || null;
  } catch (error) {
    console.error('Error getting entity role:', error);
    return null;
  }
}

/**
 * Require entity access or throw an error
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @throws {Error} If user doesn't have access
 */
export async function requireEntityAccess(entityType, entityId) {
  const hasAccess = await canManageEntity(entityType, entityId);
  if (!hasAccess) {
    throw new Error(`You do not have access to manage this ${entityType}`);
  }
}