/**
 * verifyRoundAssignmentCompleteness.js — R9EA Phase 8
 *
 * Checks that all points-enabled and Final/Feature sessions have round_number set.
 * Also checks multi-day events with multiple finals for distinct round numbers.
 *
 * Input:  { event_ids?: string[], series_id?: string, season?: string, sample_size?: number }
 * Output: { issues[], warnings[], pass, checks_run }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { event_ids, series_id, season, sample_size = 200 } = body;

    const sr = base44.asServiceRole;
    const issues = [];
    const warnings = [];
    let sessions = [];

    if (event_ids && event_ids.length > 0) {
      for (const eid of event_ids) {
        const batch = await sr.entities.Session.filter({ event_id: eid }).catch(() => []);
        sessions = sessions.concat(batch);
      }
    } else if (series_id) {
      const events = await sr.entities.Event.filter({ series_id, season: season || undefined }).catch(() => []);
      for (const evt of events.slice(0, 50)) {
        const batch = await sr.entities.Session.filter({ event_id: evt.id }).catch(() => []);
        sessions = sessions.concat(batch);
      }
    } else {
      sessions = await sr.entities.Session.list('-created_date', sample_size).catch(() => []);
    }

    const FINAL_TYPES = new Set(['Final', 'Feature']);

    // Group by event
    const byEvent = {};
    for (const s of sessions) {
      if (!byEvent[s.event_id]) byEvent[s.event_id] = [];
      byEvent[s.event_id].push(s);
    }

    for (const [eventId, eventSessions] of Object.entries(byEvent)) {
      for (const session of eventSessions) {
        // Check 1: points-enabled sessions must have round_number
        if (session.points_enabled && !session.round_number) {
          issues.push({
            type: 'missing_round_number',
            severity: 'error',
            session_id: session.id,
            session_name: session.name,
            event_id: eventId,
            message: `Points-enabled session "${session.name}" (event ${eventId}) is missing round_number`,
          });
        }

        // Check 2: Final/Feature sessions must have round_number
        if (FINAL_TYPES.has(session.session_type) && !session.round_number) {
          issues.push({
            type: 'final_missing_round_number',
            severity: 'error',
            session_id: session.id,
            session_name: session.name,
            event_id: eventId,
            message: `Final/Feature session "${session.name}" (event ${eventId}) is missing round_number`,
          });
        }
      }

      // Check 3: Multi-final events must have distinct round_numbers
      const finals = eventSessions.filter(s => FINAL_TYPES.has(s.session_type) && s.round_number);
      const roundNumbers = finals.map(s => s.round_number);
      const uniqueRounds = new Set(roundNumbers);
      if (finals.length > 1 && uniqueRounds.size < finals.length) {
        warnings.push({
          type: 'duplicate_round_numbers',
          severity: 'warning',
          event_id: eventId,
          round_numbers: roundNumbers,
          message: `Event ${eventId} has ${finals.length} finals but only ${uniqueRounds.size} unique round_number(s) — duplicate round numbers detected`,
        });
      }
    }

    return Response.json({
      pass: issues.length === 0,
      issues,
      warnings,
      checks_run: ['points_enabled_round_number', 'final_feature_round_number', 'multi_final_distinct_rounds'],
      sessions_checked: sessions.length,
      events_checked: Object.keys(byEvent).length,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});