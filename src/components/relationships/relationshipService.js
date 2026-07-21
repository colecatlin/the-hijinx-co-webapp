/**
 * Relationship Lifecycle — Frontend Service
 * ---------------------------------------------------------------------------
 * Thin, reusable client for the EntityCollaborator lifecycle engine. Every
 * caller in the app (onboarding wizard, profile settings, future org pages)
 * goes through here — no component owns relationship state or approval logic.
 *
 * All calls hit the `relationshipLifecycle` backend function; data is in
 * `response.data`.
 */

import { base44 } from '@/api/base44Client';
import { getRole } from '@/config/onboardingRoles';

// ─── Lifecycle actions ─────────────────────────────────────────────────────

/** Request access to an organization (creates a pending relationship). */
export async function requestRelationship({
  entityType,
  entityId,
  roleKey,
  requestMessage,
  accessCode,
}) {
  const res = await base44.functions.invoke('relationshipLifecycle', {
    action: 'create',
    entity_type: entityType,
    entity_id: entityId,
    role_key: roleKey,
    request_message: requestMessage,
    access_code: accessCode,
  });
  return res.data;
}

/** Approve a pending relationship. Admin callers should pass the role's
 *  permission template as granted_permissions (see getPermissionTemplateForRole). */
export async function approveRelationship({
  collaboratorId,
  permissionLevel = 'staff',
  grantedPermissions = [],
  reviewNotes,
}) {
  const res = await base44.functions.invoke('relationshipLifecycle', {
    action: 'approve',
    collaborator_id: collaboratorId,
    permission_level: permissionLevel,
    granted_permissions: grantedPermissions,
    review_notes: reviewNotes,
  });
  return res.data;
}

/** Deny a pending relationship. Preserves history. */
export async function denyRelationship({ collaboratorId, reviewNotes }) {
  const res = await base44.functions.invoke('relationshipLifecycle', {
    action: 'deny',
    collaborator_id: collaboratorId,
    review_notes: reviewNotes,
  });
  return res.data;
}

/** Revoke previously-granted access. Removes org access immediately. */
export async function revokeRelationship({ collaboratorId, reviewNotes }) {
  const res = await base44.functions.invoke('relationshipLifecycle', {
    action: 'revoke',
    collaborator_id: collaboratorId,
    review_notes: reviewNotes,
  });
  return res.data;
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** Direct entity reads — lightweight queries used across the app. */
export async function listMyRelationships(userId, status) {
  const query = status ? { user_id: userId, status } : { user_id: userId };
  return base44.entities.EntityCollaborator.filter(query, '-updated_date', 200);
}

export async function listRelationshipsForEntity(entityType, entityId, status) {
  const query = status
    ? { entity_type: entityType, entity_id: entityId, status }
    : { entity_type: entityType, entity_id: entityId };
  return base44.entities.EntityCollaborator.filter(query, '-requested_at', 200);
}

// ─── Permission templates ─────────────────────────────────────────────────────

/**
 * Create a brand-new Team for a Team Owner during onboarding. Goes through
 * the `createOrganization` backend with a granular `owner_role_key`, which:
 *   1. creates the Team record,
 *   2. upserts OrganizationSettings,
 *   3. creates an APPROVED owner EntityCollaborator
 *      (permission_level=admin, granted_permissions=['*'], role_key=team_owner).
 *
 * This is the B2 fix — the Team Owner create flow is no longer session-only.
 */
export async function createTeamOwnerOrganization({ name }) {
  const res = await base44.functions.invoke('createOrganization', {
    entity_type: 'Team',
    owner_role_key: 'team_owner',
    fields: { name },
  });
  return res.data;
}

/** Returns the registry's default permission template for a role, or null. */
export function getPermissionTemplateForRole(roleId) {
  const role = getRole(roleId);
  return role?.default_permission_template || null;
}

/** Convenience: build the approve payload for a role using its template. */
export function buildApprovalFromTemplate(roleId, overrides = {}) {
  const tmpl = getPermissionTemplateForRole(roleId);
  return {
    permissionLevel: overrides.permissionLevel || tmpl?.permission_level || 'staff',
    grantedPermissions:
      overrides.grantedPermissions ||
      (tmpl?.granted_permissions ? [...tmpl.granted_permissions] : []),
  };
}