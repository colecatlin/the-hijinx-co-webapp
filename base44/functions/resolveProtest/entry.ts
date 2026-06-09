/**
 * resolveProtest
 * R9BP Sprint 1 — Issues a decision on a protest and optionally releases the session hold.
 * Does NOT modify Results or Standings — cascade is Sprint 2.
 * Permission: admin OR canReviewProtest
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_ROLES = ['Race Director', 'Competition Director', 'Chief Steward', 'Steward'];
const DECISION_STATUSES = ['Decision Issued', 'Closed', 'Rejected'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { protest_id, status, decision, decision_type, steward_notes, hearing_notes, release_hold } = await req.json();
    if (!protest_id) return Response.json({ error: 'protest_id is required' }, { status: 400 });
    if (!status) return Response.json({ error: 'status is required' }, { status: 400 });

    const protests = await base44.asServiceRole.entities.Protest.filter({ id: protest_id });
    if (!protests || protests.length === 0) return Response.json({ error: 'Protest not found' }, { status: 404 });
    const protest = protests[0];

    // Permission check
    if (user.role !== 'admin') {
      const officials = await base44.asServiceRole.entities.EventOfficial.filter({
        event_id: protest.event_id, user_id: user.id,
      });
      const permitted = officials.some(
        (o) => ALLOWED_ROLES.includes(o.role) && ['Invited', 'Confirmed', 'Active'].includes(o.status)
      );
      if (!permitted) return Response.json({ error: 'Forbidden: canReviewProtest required' }, { status: 403 });
    }

    // Decision required for Decision Issued status
    if (status === 'Decision Issued' && (!decision || !decision_type)) {
      return Response.json({ error: 'decision and decision_type are required when status is Decision Issued' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updates = { status };
    if (steward_notes !== undefined) updates.steward_notes = steward_notes;
    if (hearing_notes !== undefined) updates.hearing_notes = hearing_notes;
    if (decision) updates.decision = decision;
    if (decision_type) updates.decision_type = decision_type;
    if (DECISION_STATUSES.includes(status)) {
      updates.decision_issued_by_user_id = user.id;
      updates.decision_issued_at = now;
    }

    const updated = await base44.asServiceRole.entities.Protest.update(protest_id, updates);

    // Release session hold if decision issued and release_hold = true
    if (DECISION_STATUSES.includes(status) && release_hold && protest.session_id) {
      await base44.asServiceRole.entities.Session.update(protest.session_id, {
        standings_hold: false,
        results_on_hold: false,
        hold_released_at: now,
        hold_released_by_user_id: user.id,
      });

      base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'session_results_released',
        status: 'success',
        entity_name: 'Session',
        entity_id: protest.session_id,
        event_id: protest.event_id,
        message: `Session hold released: ${protest.protest_number} resolved`,
        metadata: { protest_id, decision_type, released_by: user.id },
      }).catch(() => {});
    }

    base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'protest_resolved',
      status: 'success',
      entity_name: 'Protest',
      entity_id: protest_id,
      event_id: protest.event_id,
      message: `${protest.protest_number}: ${protest.status} → ${status}${decision_type ? ' — ' + decision_type : ''}`,
      metadata: { protest_number: protest.protest_number, decision_type, decided_by: user.id },
    }).catch(() => {});

    return Response.json({ protest: updated, hold_released: !!(DECISION_STATUSES.includes(status) && release_hold && protest.session_id) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});