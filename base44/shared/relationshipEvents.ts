/**
 * Relationship Lifecycle — Event Hooks
 * ---------------------------------------------------------------------------
 * Single emission point for the EntityCollaborator lifecycle so future
 * notification systems (email, in-app, push, audit reports) can subscribe to
 * one place. Today it persists a best-effort AuditLog entry; the signature is
 * generic so additional side-effects can be added here without touching the
 * lifecycle service or any UI caller.
 *
 * This module contains NO organization-specific logic and NO notification
 * delivery — it only records the event. Phase 3 deliberately stops here.
 */

export const RELATIONSHIP_EVENTS = {
  REQUESTED: 'RelationshipRequested',
  APPROVED: 'RelationshipApproved',
  DENIED: 'RelationshipDenied',
  REVOKED: 'RelationshipRevoked',
} as const;

export type RelationshipEventType =
  | 'RelationshipRequested'
  | 'RelationshipApproved'
  | 'RelationshipDenied'
  | 'RelationshipRevoked';

// Map lifecycle events onto the AuditLog.action enum. The descriptive event
// name is also stored in `notes` so historical reporting can reconstruct the
// exact transition without parsing snapshots.
const ACTION_FOR_EVENT: Record<RelationshipEventType, string> = {
  RelationshipRequested: 'created',
  RelationshipApproved: 'lifecycle_change',
  RelationshipDenied: 'lifecycle_change',
  RelationshipRevoked: 'lifecycle_change',
};

export interface EmitRelationshipEventArgs {
  eventType: RelationshipEventType;
  /** Collaborator record id (and entity reference) the event concerns. */
  collaboratorId: string;
  /** entity_type/entity_id of the related org (for AuditLog scoping). */
  entityType: string;
  entityId: string;
  entityName?: string;
  /** Snapshot before the transition (empty for create). */
  before?: Record<string, unknown> | null;
  /** Snapshot after the transition. */
  after?: Record<string, unknown> | null;
  performedBy: string;
  performedByName?: string;
  notes?: string;
}

/**
 * Persist a lifecycle event to the AuditLog. Best-effort: never throws into
 * the caller — a logging failure must not roll back a relationship change.
 * Returns the created AuditLog id, or null if it could not be written.
 */
export async function emitRelationshipEvent(
  base44: { asServiceRole: { entities: { AuditLog: { create: (data: Record<string, unknown>) => Promise<{ id: string }> } } } },
  args: EmitRelationshipEventArgs,
): Promise<string | null> {
  try {
    const audit = await base44.asServiceRole.entities.AuditLog.create({
      entity_type: 'EntityCollaborator',
      entity_id: args.collaboratorId,
      entity_name: args.entityName || null,
      action: ACTION_FOR_EVENT[args.eventType],
      before_data: args.before || null,
      after_data: args.after || null,
      performed_by: args.performedBy,
      performed_by_name: args.performedByName || null,
      timestamp: new Date().toISOString(),
      notes: `${args.eventType}${args.notes ? ` — ${args.notes}` : ''}`,
    } as Record<string, unknown>);
    return audit?.id || null;
  } catch (_err) {
    // Notification/audit must never break the lifecycle op.
    return null;
  }
}