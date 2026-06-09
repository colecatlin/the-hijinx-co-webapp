/**
 * holdSessionResults
 * R9BP Sprint 1 — Sets Session.results_on_hold and Session.standings_hold = true.
 * Does NOT modify Results or Standings records.
 * Permission: admin OR canHoldResults
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ROLES = ['Race Director', 'Competition Director', 'Chief Steward'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id, hold_reason } = await req.json();
    if (!session_id) return Response.json({ error: 'session_id is required' }, { status: 400 });
    if (!hold_reason) return Response.json({ error: 'hold_reason is required' }, { status: 400 });

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

    // Cannot hold a Locked session
    if (session.status === 'Locked') {
      return Response.json({ error: 'Cannot hold a Locked session' }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.Session.update(session_id, {
      standings_hold: true,
      results_on_hold: true,
      hold_reason,
      hold_started_at: new Date().toISOString(),
    });

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'session_results_held',
      status: 'success',
      entity_name: 'Session',
      entity_id: session_id,
      event_id: session.event_id,
      message: `Session results held: ${hold_reason}`,
      metadata: { hold_reason, held_by: user.id },
    }).catch(() => {});

    return Response.json({ session: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});