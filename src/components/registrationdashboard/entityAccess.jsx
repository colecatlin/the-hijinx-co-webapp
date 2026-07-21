/**
 * Entity access helpers for Race Core.
 * Canonical: approval-approvers require relationship-admin (permission_level admin /
 * legacy owner) of the SAME entity. Returns canonical collaborator context to the UI.
 *
 * Migration: previously any collaborator (incl. pending) could approve a collaboration.
 * Now only an approved admin/owner of the same entity may approve.
 */
import { base44 } from '@/api/base44Client';
import {
  isApprovedCollaborator,
  getPermissionLevel,
  isRelationshipAdmin,
} from '@/lib/identityAccess';

export async function getEntityAccessForUser(userId, entityType, entityId) {
  if (!userId || !entityType || !entityId) {
    return { hasAccess: false, role: null, permission_level: null, collaboratorRecord: null };
  }
  const results = await base44.entities.EntityCollaborator.filter({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
  });
  const record = (results || []).find(isApprovedCollaborator) || null;
  return {
    hasAccess: !!record,
    role: record?.role || null,
    permission_level: getPermissionLevel(record),
    collaboratorRecord: record,
  };
}

export function canApproveCollaboration(entityType, accessResult, isAdmin) {
  if (isAdmin) return true;
  // Canonical: only a relationship-admin (permission_level admin / legacy owner) of the
  // receiving entity may approve a new collaboration for that entity.
  return !!(accessResult?.hasAccess && isRelationshipAdmin(accessResult.collaboratorRecord));
}