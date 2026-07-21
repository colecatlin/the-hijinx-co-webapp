/**
 * relationshipLifecycle
 * ---------------------------------------------------------------------------
 * The single source of truth for the EntityCollaborator relationship lifecycle.
 *
 * Actions:
 *   create   — a user requests access to an organization     → status pending
 *   approve  — an admin grants access                          → status approved
 *   deny     — an admin rejects a pending request              → status denied
 *   revoke   — an admin withdraws previously-granted access    → status revoked
 *
 * Design rules enforced here (organization-agnostic):
 *   • The authenticated user is the actor. `create` always uses auth.me().
 *   • Entity existence is validated against the live org entity.
 *   • Duplicate ACTIVE (pending/approved) relationships for the same
 *     user + entity + role_key are rejected. Reapplication after a deny/revoke
 *     creates a NEW record (history is never deleted or mutated).
 *   • Approve/deny/revoke require authority: platform admin OR an approved
 *     admin-level relationship on the same org. Self-approval is blocked.
 *   • Permission templates live in the role registry (frontend) and are
 *     supplied by the caller at approve time — this function performs no
 *     role-specific lookups. granted_permissions defaults to [] when omitted.
 *   • Every transition emits a RelationshipEvent hook (see shared module),
 *     persisting a best-effort AuditLog entry so history is reconstructable.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import {
  emitRelationshipEvent,
  RELATIONSHIP_EVENTS,
} from '../../shared/relationshipEvents.ts';

// EntityCollaborator.entity_type enum — the only org shapes this engine serves.
const ALLOWED_ENTITY_TYPES = new Set(['Driver', 'Team', 'Track', 'Series', 'Event']);

// Legacy `role` field is required by the schema but superseded by role_key.
const LEGACY_ROLE_DEFAULT = 'editor';

// permission_level enum
const ALLOWED_PERMISSION_LEVELS = new Set(['admin', 'staff', 'viewer']);

const ACTIVE_STATUSES = ['pending', 'approved'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    if (!action) {
      return Response.json({ error: 'Missing action' }, { status: 400 });
    }

    if (action === 'create') return await handleCreate(base44, user, body);
    if (action === 'approve') return await handleApprove(base44, user, body);
    if (action === 'deny') return await handleDeny(base44, user, body);
    if (action === 'revoke') return await handleRevoke(base44, user, body);

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Lifecycle error' }, { status: 500 });
  }
});

// ─── helpers ────────────────────────────────────────────────────────────────

function bad(msg: string, status = 400) {
  return Response.json({ error: msg }, { status });
}

async function fetchEntity(base44: any, entityType: string, entityId: string) {
  const entityApi = base44.asServiceRole.entities[entityType];
  if (!entityApi) return null;
  try {
    return await entityApi.get(entityId);
  } catch {
    return null;
  }
}

async function findActiveFor(
  base44: any,
  userId: string,
  entityType: string,
  entityId: string,
  roleKey: string,
) {
  const list = await base44.asServiceRole.entities.EntityCollaborator.filter({
    user_id: userId,
    entity_type: entityType,
    entity_id: entityId,
    role_key: roleKey,
  });
  return (list || []).filter((c: any) => ACTIVE_STATUSES.includes(c.status));
}

async function assertAuthority(base44: any, approver: any, collab: any) {
  // Platform admins always have authority.
  if (approver.role === 'admin') return null;
  // Self-approval is prohibited for non-admins.
  if (collab.user_id === approver.id) {
    return 'Self-approval is not allowed';
  }
  // Otherwise the approver must hold an approved admin relationship on the
  // same organization.
  const owners = await base44.asServiceRole.entities.EntityCollaborator.filter({
    user_id: approver.id,
    entity_type: collab.entity_type,
    entity_id: collab.entity_id,
    status: 'approved',
    permission_level: 'admin',
  });
  if ((owners || []).length === 0) {
    return 'You do not have authority over this organization';
  }
  return null;
}

// ─── create ────────────────────────────────────────────────────────────────

async function handleCreate(base44: any, user: any, body: any) {
  const entityType = body.entity_type;
  const entityId = body.entity_id;
  const roleKey = body.role_key;
  if (!entityType || !entityId || !roleKey) {
    return bad('entity_type, entity_id and role_key are required');
  }
  if (!ALLOWED_ENTITY_TYPES.has(entityType)) {
    return bad(`Invalid entity_type: ${entityType}`);
  }

  // Validate the org entity exists (service-role read — orgs may not be
  // owned by the requester).
  const entity = await fetchEntity(base44, entityType, entityId);
  if (!entity) {
    return bad(`${entityType} not found`, 404);
  }

  // Prevent duplicate active relationships. A prior denied/revoked record is
  // left untouched — reapplication creates a fresh pending record.
  const active = await findActiveFor(base44, user.id, entityType, entityId, roleKey);
  if (active.some((c: any) => c.status === 'approved')) {
    return bad('An approved relationship already exists for this organization and role');
  }
  if (active.some((c: any) => c.status === 'pending')) {
    return bad('A pending request already exists for this organization and role');
  }

  const now = new Date().toISOString();
  const record = {
    user_id: user.id,
    user_email: user.email,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entity.name || null,
    access_code: body.access_code || '',
    role: LEGACY_ROLE_DEFAULT,
    role_key: roleKey,
    status: 'pending',
    permission_level: null,
    granted_permissions: [],
    request_message: body.request_message || null,
    requested_at: now,
  };

  const created = await base44.asServiceRole.entities.EntityCollaborator.create(record);

  await emitRelationshipEvent(base44, {
    eventType: RELATIONSHIP_EVENTS.REQUESTED,
    collaboratorId: created.id,
    entityType,
    entityId,
    entityName: record.entity_name || undefined,
    before: null,
    after: created,
    performedBy: user.id,
    performedByName: user.full_name || user.email,
    notes: body.request_message || null,
  });

  return Response.json({
    ok: true,
    event: RELATIONSHIP_EVENTS.REQUESTED,
    collaborator: created,
  });
}

// ─── approve ────────────────────────────────────────────────────────────────

async function handleApprove(base44: any, user: any, body: any) {
  const collabId = body.collaborator_id;
  if (!collabId) return bad('collaborator_id is required');

  const permissionLevel = body.permission_level || 'staff';
  if (!ALLOWED_PERMISSION_LEVELS.has(permissionLevel)) {
    return bad(`Invalid permission_level: ${permissionLevel}`);
  }
  const grantedPermissions = Array.isArray(body.granted_permissions)
    ? body.granted_permissions
    : [];

  const collab = await base44.asServiceRole.entities.EntityCollaborator.get(collabId);
  if (!collab) return bad('Relationship not found', 404);
  if (collab.status !== 'pending') {
    return bad(`Cannot approve a relationship that is ${collab.status}`);
  }

  const authError = await assertAuthority(base44, user, collab);
  if (authError) return bad(authError, 403);

  const now = new Date().toISOString();
  const updated = await base44.asServiceRole.entities.EntityCollaborator.update(collabId, {
    status: 'approved',
    reviewed_at: now,
    reviewed_by: user.id,
    permission_level: permissionLevel,
    granted_permissions: grantedPermissions,
    review_notes: body.review_notes || null,
  });

  await emitRelationshipEvent(base44, {
    eventType: RELATIONSHIP_EVENTS.APPROVED,
    collaboratorId: collabId,
    entityType: collab.entity_type,
    entityId: collab.entity_id,
    entityName: collab.entity_name || undefined,
    before: collab,
    after: updated,
    performedBy: user.id,
    performedByName: user.full_name || user.email,
    notes: body.review_notes || null,
  });

  return Response.json({
    ok: true,
    event: RELATIONSHIP_EVENTS.APPROVED,
    collaborator: updated,
  });
}

// ─── deny ───────────────────────────────────────────────────────────────────

async function handleDeny(base44: any, user: any, body: any) {
  const collabId = body.collaborator_id;
  if (!collabId) return bad('collaborator_id is required');

  const collab = await base44.asServiceRole.entities.EntityCollaborator.get(collabId);
  if (!collab) return bad('Relationship not found', 404);
  if (collab.status !== 'pending') {
    return bad(`Cannot deny a relationship that is ${collab.status}`);
  }

  const authError = await assertAuthority(base44, user, collab);
  if (authError) return bad(authError, 403);

  const now = new Date().toISOString();
  const updated = await base44.asServiceRole.entities.EntityCollaborator.update(collabId, {
    status: 'denied',
    reviewed_at: now,
    reviewed_by: user.id,
    review_notes: body.review_notes || null,
  });

  await emitRelationshipEvent(base44, {
    eventType: RELATIONSHIP_EVENTS.DENIED,
    collaboratorId: collabId,
    entityType: collab.entity_type,
    entityId: collab.entity_id,
    entityName: collab.entity_name || undefined,
    before: collab,
    after: updated,
    performedBy: user.id,
    performedByName: user.full_name || user.email,
    notes: body.review_notes || null,
  });

  return Response.json({
    ok: true,
    event: RELATIONSHIP_EVENTS.DENIED,
    collaborator: updated,
  });
}

// ─── revoke ─────────────────────────────────────────────────────────────────

async function handleRevoke(base44: any, user: any, body: any) {
  const collabId = body.collaborator_id;
  if (!collabId) return bad('collaborator_id is required');

  const collab = await base44.asServiceRole.entities.EntityCollaborator.get(collabId);
  if (!collab) return bad('Relationship not found', 404);
  if (collab.status !== 'approved') {
    return bad(`Cannot revoke a relationship that is ${collab.status}`);
  }

  const authError = await assertAuthority(base44, user, collab);
  if (authError) return bad(authError, 403);

  const now = new Date().toISOString();
  const updated = await base44.asServiceRole.entities.EntityCollaborator.update(collabId, {
    status: 'revoked',
    revoked_at: now,
    revoked_by: user.id,
    review_notes: body.review_notes || null,
  });

  await emitRelationshipEvent(base44, {
    eventType: RELATIONSHIP_EVENTS.REVOKED,
    collaboratorId: collabId,
    entityType: collab.entity_type,
    entityId: collab.entity_id,
    entityName: collab.entity_name || undefined,
    before: collab,
    after: updated,
    performedBy: user.id,
    performedByName: user.full_name || user.email,
    notes: body.review_notes || null,
  });

  return Response.json({
    ok: true,
    event: RELATIONSHIP_EVENTS.REVOKED,
    collaborator: updated,
  });
}