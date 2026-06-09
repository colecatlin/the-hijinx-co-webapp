/**
 * releaseSessionResultsHold
 * R9BP Sprint 1 — Releases the standings and results hold on a Session.
 * Does NOT trigger standings recalculation — that remains manual or deferred to Sprint 2.
 * Permission: admin OR canHoldResults
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ROLES = ['Race Director', 'Competition Director', 'Chief Steward'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id, release_note } = await req.json();
    if (!session_id) return Response.json({ error: 'session_id is required' }, { status: 400 });

    const sessions = await base44.asServiceRole.entities.Session.filter({ id: session_id });
    if (!sessions || sessions.length === 0) return Response.json({ error: 'Session not found' }, { status: 404 });
    const session = sessions[0];

    // Permission check
    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id: session.event_id, user_id: user.id,
      });
      const permitted = officials.some(
        (o) => ALLOWED_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: canHoldResults required' }, { status: 403 });
    }

    // Check currently on hold
    if (!session.standings_hold && !session.results_on_hold) {
      return Response.json({
        message: 'Session is not currently on hold — no change needed',
        session,
      });
    }

    const now = new Date().toISOString();
    const updated = await base44.asServiceRole.entities.Session.update(session_id, {
      standings_hold: false,
      results_on_hold: false,
      hold_released_at: now,
      hold_released_by_user_id: user.id,
    });

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'session_results_released',
      status: 'success',
      entity_name: 'Session',
      entity_id: session_id,
      event_id: session.event_id,
      message: `Session results hold released${release_note ? ': ' + release_note : ''}`,
      metadata: { released_by: user.id, release_note: release_note || '', previous_hold_reason: session.hold_reason },
    }).catch(() => {});

    return Response.json({ session: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});