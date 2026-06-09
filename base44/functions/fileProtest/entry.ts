/**
 * fileProtest
 * R9BP Sprint 1 — Files a protest and holds the session standings.
 * Side effect: sets Session.standings_hold = true, Session.results_on_hold = true
 * Permission: admin OR canReviewProtest OR canCreateIncident
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ROLES = ['Race Director', 'Competition Director', 'Chief Steward', 'Steward'];

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
      event_id, session_id, protest_type, filing_driver_id, filing_team_id,
      against_driver_id, against_entry_id, incident_id, penalty_id,
      description, rule_reference, evidence_urls, protest_fee_paid, protest_fee_amount,
    } = body;

    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
    if (!protest_type) return Response.json({ error: 'protest_type is required' }, { status: 400 });
    if (!filing_driver_id) return Response.json({ error: 'filing_driver_id is required' }, { status: 400 });
    if (!description) return Response.json({ error: 'description is required' }, { status: 400 });

    // Permission check
    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id, user_id: user.id,
      });
      const permitted = officials.some(
        (o) => ALLOWED_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: canReviewProtest or canCreateIncident required' }, { status: 403 });
    }

    const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
    if (!events || events.length === 0) return Response.json({ error: 'Event not found' }, { status: 404 });

    // Validate session if provided
    if (session_id) {
      const sessions = await base44.asServiceRole.entities.Session.filter({ id: session_id });
      if (!sessions || sessions.length === 0) return Response.json({ error: 'Session not found' }, { status: 404 });
      const session = sessions[0];
      // Cannot file protest against a Locked session
      if (session.status === 'Locked') {
        return Response.json({ error: 'Cannot file protest against a Locked session' }, { status: 400 });
      }
    }

    const protest_number = await nextEventNumber(base44, 'Protest', 'protest_number', 'PRO', event_id);
    const now = new Date().toISOString();

    const protest = await base44.asServiceRole.entities.Protest.create({
      event_id,
      session_id: session_id || undefined,
      protest_number,
      protest_type,
      status: 'Filed',
      filing_driver_id,
      filing_team_id: filing_team_id || undefined,
      against_driver_id: against_driver_id || undefined,
      against_entry_id: against_entry_id || undefined,
      incident_id: incident_id || undefined,
      penalty_id: penalty_id || undefined,
      description,
      rule_reference: rule_reference || '',
      evidence_urls: evidence_urls || [],
      protest_fee_paid: protest_fee_paid || false,
      protest_fee_amount: protest_fee_amount || undefined,
      fee_refundable: true,
      filed_at: now,
    });

    // Hold session standings if session_id provided
    if (session_id) {
      await base44.asServiceRole.entities.Session.update(session_id, {
        standings_hold: true,
        results_on_hold: true,
        hold_reason: `Protest filed: ${protest_number}`,
        hold_started_at: now,
      });

      base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'session_results_held',
        status: 'success',
        entity_name: 'Session',
        entity_id: session_id,
        event_id,
        message: `Session results held: ${protest_number} filed`,
        metadata: { protest_number, protest_id: protest.id },
      }).catch(() => {});
    }

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'protest_filed',
      status: 'success',
      entity_name: 'Protest',
      entity_id: protest.id,
      event_id,
      message: `${protest_number} filed: ${protest_type} by driver ${filing_driver_id}`,
      metadata: { protest_number, protest_type, filing_driver_id, session_id },
    }).catch(() => {});

    return Response.json({ protest, session_held: !!session_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});