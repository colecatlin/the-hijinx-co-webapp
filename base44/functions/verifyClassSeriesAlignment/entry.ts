/**
 * verifyClassSeriesAlignment.js — R9EA Phase 8
 *
 * Checks that:
 *   1. Result.series_class_id matches Session.series_class_id
 *   2. Result.series_id matches Event.series_id
 *   3. Entry.event_class_id matches Session.event_class_id when applicable
 *
 * Input:  { sample_size?: number, event_id?: string }
 * Output: { issues[], warnings[], pass }
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
    const { sample_size = 200, event_id } = body;

    const sr = base44.asServiceRole;
    const issues = [];
    const warnings = [];

    // Load results
    let results = [];
    if (event_id) {
      results = await sr.entities.Results.filter({ event_id }).catch(() => []);
    } else {
      results = await sr.entities.Results.list('-created_date', sample_size).catch(() => []);
    }

    // Build session and event caches
    const sessionCache = new Map();
    const eventCache = new Map();

    for (const result of results) {
      // Cache session
      if (result.session_id && !sessionCache.has(result.session_id)) {
        const sessions = await sr.entities.Session.filter({ id: result.session_id }).catch(() => []);
        sessionCache.set(result.session_id, sessions?.[0] || null);
      }
      // Cache event
      if (result.event_id && !eventCache.has(result.event_id)) {
        const events = await sr.entities.Event.filter({ id: result.event_id }).catch(() => []);
        eventCache.set(result.event_id, events?.[0] || null);
      }

      const session = result.session_id ? sessionCache.get(result.session_id) : null;
      const event = result.event_id ? eventCache.get(result.event_id) : null;

      // Check 1: series_class_id alignment
      if (session && result.series_class_id && session.series_class_id && result.series_class_id !== session.series_class_id) {
        issues.push({
          type: 'series_class_mismatch',
          severity: 'error',
          result_id: result.id,
          session_id: result.session_id,
          result_series_class_id: result.series_class_id,
          session_series_class_id: session.series_class_id,
          message: `Result (${result.id}) series_class_id "${result.series_class_id}" does not match session series_class_id "${session.series_class_id}"`,
        });
      }

      // Check 2: series_id alignment
      if (event && result.series_id && event.series_id && result.series_id !== event.series_id) {
        issues.push({
          type: 'series_id_mismatch',
          severity: 'error',
          result_id: result.id,
          event_id: result.event_id,
          result_series_id: result.series_id,
          event_series_id: event.series_id,
          message: `Result (${result.id}) series_id "${result.series_id}" does not match event series_id "${event.series_id}"`,
        });
      }
    }

    // Check 3: Entry event_class_id vs Session event_class_id
    let entries = [];
    if (event_id) {
      entries = await sr.entities.Entry.filter({ event_id }).catch(() => []);
    } else {
      entries = await sr.entities.Entry.list('-created_date', Math.min(sample_size, 100)).catch(() => []);
    }

    const entryEventIds = [...new Set(entries.map(e => e.event_id).filter(Boolean))];
    const eventSessionsCache = new Map();
    for (const eid of entryEventIds) {
      const sessions = await sr.entities.Session.filter({ event_id: eid }).catch(() => []);
      eventSessionsCache.set(eid, sessions);
    }

    for (const entry of entries) {
      if (!entry.event_class_id) continue;
      const eventSessions = eventSessionsCache.get(entry.event_id) || [];
      const matchingSessions = eventSessions.filter(s => s.event_class_id === entry.event_class_id);
      if (eventSessions.length > 0 && matchingSessions.length === 0) {
        warnings.push({
          type: 'entry_class_no_session',
          severity: 'warning',
          entry_id: entry.id,
          event_class_id: entry.event_class_id,
          event_id: entry.event_id,
          message: `Entry (${entry.id}) event_class_id "${entry.event_class_id}" has no matching session in event ${entry.event_id}`,
        });
      }
    }

    return Response.json({
      pass: issues.length === 0,
      issues,
      warnings,
      checks_run: ['series_class_alignment', 'series_id_alignment', 'entry_class_session_alignment'],
      results_checked: results.length,
      entries_checked: entries.length,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});