/**
 * Entity access helpers for Race Core.
 * Used to gate Approve buttons in CollaborationApprovalPanel.
 */
import { base44 } from '@/api/base44Client';

/**
 * Check if a user has collaborator access to a specific entity.
 *
 * @param {string} userId
 * @param {string} entityType  'Track' | 'Series' | 'Driver' | 'Team'
 * @param {string} entityId
 * @returns {Promise<{ hasAccess: boolean, role: string|null, collaboratorRecord: object|null }>}
 */
export async function getEntityAccessForUser(userId, entityType, entityId) {
  if (!userId || !entityType || !entityId) {
    return { hasAccess: false, role: null, collaboratorRecord: null };
  }
  const results = await base44.entities.EntityCollaborator.filter({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
  });
  const record = results?.[0] || null;
  return {
    hasAccess: !!record,
    role: record?.role || null,
    collaboratorRecord: record,
  };
}

/**
 * Determine if a user can approve a collaboration for a given side.
 *
 * @param {string} entityType  'Track' | 'Series'
 * @param {{ hasAccess: boolean }} accessResult  from getEntityAccessForUser
 * @param {boolean} isAdmin
 * @returns {boolean}
 */
export function canApproveCollaboration(entityType, accessResult, isAdmin) {
  if (isAdmin) return true;
  return !!(accessResult?.hasAccess);
}