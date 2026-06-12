/**
 * updateSessionStatus.js
 *
 * Backend-enforced session lifecycle state machine.
 * Validates transitions before writing to prevent corruption of
 * the Draft → Provisional → Official → Locked lifecycle.
 *
 * Allowed transitions:
 *   Draft       → Provisional
 *   Provisional → Official
 *   Official    → Locked
 *   Official    → Provisional  (rollback, non-admin blocked)
 *   Locked      → Official     (admin only — emergency unlock)
 *
 * Forbidden transitions (return 409):
 *   Locked  → Draft
 *   Locked  → Provisional
 *   Official → Draft
 *   Any backward skip (e.g. Locked → Draft directly)
 *
 * Input:  { session_id, new_status, force? }
 * Output: { ok, session, transition }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// R9DC Phase 1: Unified lifecycle — results lifecycle + operational lifecycle in one state machine.
// Results lifecycle:   Draft → Provisional → Official → Locked
// Operational lifecycle: Draft/Scheduled → Live → Completed (used by Race Control)
const STATUS_ORDER = ['Draft', 'Provisional', 'Official', 'Locked', 'Scheduled', 'Live', 'Completed'];

// Explicit allowed transitions map (R9DC: added operational states)
const ALLOWED_TRANSITIONS = {
  'Draft':       ['Provisional', 'Scheduled', 'Live'],
  'Scheduled':   ['Live', 'Draft'],
  'Live':        ['Completed', 'Scheduled'],
  'Completed':   ['Official', 'Draft'],
  'Provisional': ['Official', 'Draft'],
  'Official':    ['Locked', 'Provisional'],
  'Locked':      ['Official'],
};

// Transitions that require admin role
const ADMIN_ONLY_TRANSITIONS = new Set([
  'Official→Locked',
  'Locked→Official',
  'Official→Provisional',
  'Provisional→Draft',
  'Completed→Draft',
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id, new_status } = await req.json();

    if (!session_id || !new_status) {
      return Response.json({ error: 'session_id and new_status are required' }, { status: 400 });
    }

    if (!STATUS_ORDER.includes(new_status)) {
      return Response.json({
        error: `Invalid status. Allowed: ${STATUS_ORDER.join(', ')}`,
        allowed: STATUS_ORDER,
      }, { status: 400 });
    }

    // Load current session
    const sessions = await base44.asServiceRole.entities.Session.filter({ id: session_id }).catch(() => []);
    const session = sessions?.[0];
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    const currentStatus = session.status || 'Draft';
    const transition = `${currentStatus}→${new_status}`;

    // No-op: already in target status
    if (currentStatus === new_status) {
      return Response.json({ ok: true, session, transition, note: 'no_change' });
    }

    // Validate transition is allowed
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(new_status)) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'session_transition_rejected',
        entity_name: 'Session',
        entity_id: session_id,
        status: 'error',
        message: `Rejected transition ${transition} for session ${session.name}`,
        initiated_by: user.email,
        metadata: {
          session_id,
          session_name: session.name,
          current_status: currentStatus,
          requested_status: new_status,
          transition,
          rejected_by: user.email,
        },
      }).catch(() => {});

      return Response.json({
        error: `Invalid transition: ${transition}. ${currentStatus} can only move to: ${allowed.join(', ')}`,
        transition,
        current_status: currentStatus,
      }, { status: 409 });
    }

    // Check admin requirement for privileged transitions
    if (ADMIN_ONLY_TRANSITIONS.has(transition) && user.role !== 'admin') {
      return Response.json({
        error: `Transition ${transition} requires admin role`,
        transition,
      }, { status: 403 });
    }

    // Build update payload
    const updateData = { status: new_status };
    // Keep locked boolean in sync with status
    if (new_status === 'Locked') updateData.locked = true;
    if (new_status !== 'Locked') updateData.locked = false;

    const updated = await base44.asServiceRole.entities.Session.update(session_id, updateData);

    // AUTO-SYNC: When session becomes Official or Locked, automatically sync result visibility.
    // When session rolls back below Official, also sync to retract visibility.
    const visibilityStates = new Set(['Official', 'Locked', 'Provisional', 'Draft']);
    if (visibilityStates.has(new_status)) {
      base44.functions.invoke('syncResultsVisibilityFromSession', { session_id }).catch(() => {});
    }

    // Log the transition
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'session_status_changed',
      entity_name: 'Session',
      entity_id: session_id,
      status: 'success',
      message: `Session ${session.name} transitioned ${transition}`,
      initiated_by: user.email,
      metadata: {
        session_id,
        session_name: session.name,
        event_id: session.event_id,
        previous_status: currentStatus,
        new_status,
        transition,
        changed_by: user.email,
        changed_by_user_id: user.id,
        is_admin: user.role === 'admin',
      },
    }).catch(() => {});

    return Response.json({ ok: true, session: updated, transition });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});