/**
 * verifyEventSeriesIntegrity()
 *
 * Audits the Event → Series relationship health.
 *
 * Checks:
 *   1. Events with no series_id (orphans)
 *   2. Events with a series_id pointing to a non-existent Series (broken links)
 *   3. Events missing EventClass records (no class structure)
 *   4. Results referencing event_ids that don't exist
 *   5. Series Profile query viability (events queryable by series_id)
 *
 * Orphan resolution strategy:
 *   - Attempts name-based match against known Series names
 *   - If confident match found → listed as "resolvable" with suggested series_id
 *   - If ambiguous → listed as "needs_manual_review"
 *   - Never auto-assigns — admin must confirm
 *
 * Returns:
 *   {
 *     total_events, valid_events, orphan_events, invalid_series_links,
 *     broken_result_links, resolvable_orphans, unresolvable_orphans,
 *     events_missing_classes, series_summary, warnings, failures
 *   }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const db = base44.asServiceRole;

    // Load all required data in parallel
    const [allEvents, allSeries, allResults, allEventClasses] = await Promise.all([
      db.entities.Event.list('-event_date', 5000),
      db.entities.Series.list(),
      db.entities.Results.list('-created_date', 5000),
      db.entities.EventClass.list(),
    ]);

    const seriesIdSet = new Set(allSeries.map(s => s.id));
    const eventIdSet = new Set(allEvents.map(e => e.id));

    const warnings = [];
    const failures = [];
    const orphan_events = [];
    const invalid_series_links = [];
    const broken_result_links = [];
    const events_missing_classes = [];
    const resolvable_orphans = [];
    const unresolvable_orphans = [];

    // Build series name lookup for orphan matching
    // Map: normalized_name → series record
    const seriesByNormalizedName = new Map();
    for (const s of allSeries) {
      const names = [s.name, s.full_name, s.normalized_name].filter(Boolean);
      for (const name of names) {
        const normalized = name.toLowerCase().trim();
        if (!seriesByNormalizedName.has(normalized)) {
          seriesByNormalizedName.set(normalized, s);
        }
      }
    }

    // Build EventClass event_id set
    const eventIdsWithClasses = new Set(allEventClasses.map(ec => ec.event_id));

    // --- Check 1 & 2: Orphan events and broken series_id links ---
    let valid_events = 0;
    for (const event of allEvents) {
      if (!event.series_id) {
        orphan_events.push({
          id: event.id,
          name: event.name,
          event_date: event.event_date,
          location_note: event.location_note || null,
          status: event.status,
        });

        // Attempt name-based resolution
        const eventNameNormalized = (event.name || '').toLowerCase().trim();
        const suggestions = [];
        for (const [seriesName, seriesRecord] of seriesByNormalizedName) {
          // Check if series name appears inside the event name
          if (eventNameNormalized.includes(seriesName) || seriesName.includes(eventNameNormalized.split(' ')[0])) {
            suggestions.push({ series_id: seriesRecord.id, series_name: seriesRecord.name, match_method: 'name_contains' });
          }
        }
        // Dedupe suggestions by series_id
        const seen = new Set();
        const uniqueSuggestions = suggestions.filter(s => {
          if (seen.has(s.series_id)) return false;
          seen.add(s.series_id);
          return true;
        });

        if (uniqueSuggestions.length === 1) {
          resolvable_orphans.push({
            event_id: event.id,
            event_name: event.name,
            event_date: event.event_date,
            suggested_series_id: uniqueSuggestions[0].series_id,
            suggested_series_name: uniqueSuggestions[0].series_name,
            match_method: uniqueSuggestions[0].match_method,
          });
          warnings.push(`Orphan event "${event.name}" (${event.id}) — 1 likely Series match: "${uniqueSuggestions[0].series_name}". Needs admin confirmation.`);
        } else if (uniqueSuggestions.length > 1) {
          unresolvable_orphans.push({
            event_id: event.id,
            event_name: event.name,
            event_date: event.event_date,
            suggestions: uniqueSuggestions,
            reason: 'Multiple Series candidates — ambiguous',
          });
          warnings.push(`Orphan event "${event.name}" (${event.id}) — ${uniqueSuggestions.length} candidate Series found. Manual review required.`);
        } else {
          unresolvable_orphans.push({
            event_id: event.id,
            event_name: event.name,
            event_date: event.event_date,
            suggestions: [],
            reason: 'No Series name match found',
          });
          failures.push(`Orphan event "${event.name}" (${event.id}) — no Series match found. Needs manual assignment.`);
        }
      } else if (!seriesIdSet.has(event.series_id)) {
        invalid_series_links.push({
          id: event.id,
          name: event.name,
          event_date: event.event_date,
          series_id: event.series_id,
          reason: 'series_id references a non-existent Series record',
        });
        failures.push(`Event "${event.name}" (${event.id}) has series_id "${event.series_id}" but no matching Series exists`);
      } else {
        valid_events++;
      }

      // --- Check 3: Events missing class structure ---
      if (!eventIdsWithClasses.has(event.id)) {
        events_missing_classes.push({
          id: event.id,
          name: event.name,
          event_date: event.event_date,
          series_id: event.series_id || null,
          status: event.status,
        });
      }
    }

    // --- Check 4: Results with invalid event_id ---
    for (const result of allResults) {
      if (result.event_id && !eventIdSet.has(result.event_id)) {
        broken_result_links.push({
          result_id: result.id,
          driver_id: result.driver_id,
          event_id: result.event_id,
          reason: 'event_id points to non-existent Event',
        });
        failures.push(`Result (${result.id}) references unknown event_id "${result.event_id}"`);
      }
    }

    // --- Check 5: Per-series event count summary ---
    const eventCountBySeries = {};
    for (const event of allEvents) {
      if (event.series_id && seriesIdSet.has(event.series_id)) {
        eventCountBySeries[event.series_id] = (eventCountBySeries[event.series_id] || 0) + 1;
      }
    }
    const series_summary = allSeries.map(s => ({
      id: s.id,
      name: s.name,
      event_count: eventCountBySeries[s.id] || 0,
      status: eventCountBySeries[s.id] ? 'ok' : 'no_events',
    }));

    const seriesWithNoEvents = series_summary.filter(s => s.event_count === 0);
    if (seriesWithNoEvents.length > 0) {
      warnings.push(`${seriesWithNoEvents.length} Series record(s) have no linked Events`);
    }

    const series_class_ready = failures.length === 0;

    // Log the audit
    try {
      await db.entities.OperationLog.create({
        operation_type: 'event_series_audit_run',
        entity_name: 'Event',
        status: series_class_ready ? 'success' : 'failed',
        message: `Audited ${allEvents.length} events. Orphans: ${orphan_events.length}. Invalid series links: ${invalid_series_links.length}. Broken result links: ${broken_result_links.length}.`,
        total_records: allEvents.length,
        metadata: {
          total_events: allEvents.length,
          valid_events,
          orphan_count: orphan_events.length,
          invalid_series_links: invalid_series_links.length,
          broken_result_links: broken_result_links.length,
          resolvable_orphans: resolvable_orphans.length,
          unresolvable_orphans: unresolvable_orphans.length,
          events_missing_classes: events_missing_classes.length,
        },
        initiated_by: user.email,
      });
    } catch (_e) { /* non-fatal */ }

    return Response.json({
      series_events_ready: series_class_ready,
      total_events: allEvents.length,
      valid_events,
      orphan_events,
      invalid_series_links,
      broken_result_links,
      resolvable_orphans,
      unresolvable_orphans,
      events_missing_classes,
      series_summary,
      series_with_no_events: seriesWithNoEvents,
      warnings,
      failures,
      notes: [
        'Event.series_id is optional in the schema — orphans are events without any series_id.',
        'Series Profile queries events via Event.filter({ series_id }) — requires series_id to be set.',
        'Orphan resolution is suggestion-only — admin must confirm before any series_id is written.',
        'Results.event_id is the primary join key — broken links here are highest priority to fix.',
        'EventClass records are optional per event but needed for class-level results grouping.',
      ],
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});