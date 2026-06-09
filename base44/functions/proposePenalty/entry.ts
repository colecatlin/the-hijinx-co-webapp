/**
 * proposePenalty
 * R9BP Sprint 1 — Creates a new Penalty in Proposed state.
 * Does NOT modify Results or Standings — cascade is deferred to Sprint 2.
 * Permission: admin OR canProposePenalty
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PROPOSE_ROLES = ['Race Director', 'Competition Director', 'Chief Steward', 'Steward', 'Technical Director'];

async function nextEventNumber(base44, entityName, field, prefix, eventId) {
  const existing = await base44.asServiceRole.entities[entityName].filter({ event_id: eventId });
  const nums = existing
    .map((r) => { const m = (r[field] || '').match(/^[A-Z]+-(\d+)$/); return m ? parseInt(m[1], 10) : 0; })
    .filter((n) => n > 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      event_id, session_id, incident_id, penalty_type, driver_id, entry_id, team_id,
      reason, rule_reference, position_delta, time_seconds, points_deduction,
      fine_amount, suspension_events, suspension_start_event_id, probation_end_date,
      public_note, internal_note, affects_standings,
    } = body;

    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
    if (!penalty_type) return Response.json({ error: 'penalty_type is required' }, { status: 400 });
    if (!driver_id) return Response.json({ error: 'driver_id is required' }, { status: 400 });
    if (!reason) return Response.json({ error: 'reason is required' }, { status: 400 });

    // Permission check
    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id, user_id: user.id,
      });
      const permitted = officials.some(
        (o) => PROPOSE_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: canProposePenalty required' }, { status: 403 });
    }

    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    if (!events || events.length === 0) return Response.json({ error: 'Event not found' }, { status: 404 });

    const penalty_number = await nextEventNumber(base44, 'Penalty', 'penalty_number', 'PEN', event_id);

    const penalty = await base44.asServiceRole.entities.Penalty.create({
      event_id,
      session_id: session_id || undefined,
      incident_id: incident_id || undefined,
      penalty_number,
      penalty_type,
      status: 'Proposed',
      driver_id,
      entry_id: entry_id || undefined,
      team_id: team_id || undefined,
      reason,
      rule_reference: rule_reference || '',
      position_delta: position_delta || undefined,
      time_seconds: time_seconds || undefined,
      points_deduction: points_deduction || undefined,
      fine_amount: fine_amount || undefined,
      fine_paid: false,
      suspension_events: suspension_events || undefined,
      suspension_start_event_id: suspension_start_event_id || undefined,
      probation_end_date: probation_end_date || undefined,
      proposed_by_user_id: user.id,
      public_note: public_note || '',
      internal_note: internal_note || '',
      affects_standings: affects_standings !== false,
    });

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'penalty_proposed',
      status: 'success',
      entity_name: 'Penalty',
      entity_id: penalty.id,
      event_id,
      message: `${penalty_number} proposed: ${penalty_type} for driver ${driver_id}`,
      metadata: { penalty_number, penalty_type, driver_id, proposed_by: user.id },
    }).catch(() => {});

    return Response.json({ penalty });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});