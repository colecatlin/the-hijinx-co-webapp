/**
 * findOrphanedRecords.js
 * 
 * Detects records that reference missing parent entities.
 * Returns orphaned record groups without auto-deleting.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const sr = base44.asServiceRole;
    const orphan_groups = [];
    const limit = 100;

    // ── Check Results orphans ──
    let offset = 0;
    const orphanResults = [];
    while (true) {
      const batch = await sr.entities.Results.list('-created_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;

      for (const result of batch) {
        if (result.driver_id && result.session_id) {
          const [driver, session] = await Promise.all([
            sr.entities.Driver.filter({ id: result.driver_id }).then(r => r?.[0]),
            sr.entities.Session.filter({ id: result.session_id }).then(r => r?.[0]),
          ]);
          if (!driver || !session) {
            orphanResults.push(result.id);
          }
        }
      }
    }
    if (orphanResults.length > 0) {
      orphan_groups.push({
        entity: 'Results',
        record_ids: orphanResults,
        missing_reference_type: 'driver_id or session_id',
      });
    }

    // ── Check Entries orphans ──
    offset = 0;
    const orphanEntries = [];
    while (true) {
      const batch = await sr.entities.Entry.list('-created_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;

      for (const entry of batch) {
        const [event, driver, eventClass] = await Promise.all([
          sr.entities.Event.filter({ id: entry.event_id }).then(r => r?.[0]),
          sr.entities.Driver.filter({ id: entry.driver_id }).then(r => r?.[0]),
          sr.entities.EventClass.filter({ id: entry.event_class_id }).then(r => r?.[0]),
        ]);
        if (!event || !driver || !eventClass) {
          orphanEntries.push(entry.id);
        }
      }
    }
    if (orphanEntries.length > 0) {
      orphan_groups.push({
        entity: 'Entry',
        record_ids: orphanEntries,
        missing_reference_type: 'event_id, driver_id, or event_class_id',
      });
    }

    // ── Check Standings orphans ──
    offset = 0;
    const orphanStandings = [];
    while (true) {
      const batch = await sr.entities.Standings.list('-created_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;

      for (const standing of batch) {
        const [driver, series] = await Promise.all([
          sr.entities.Driver.filter({ id: standing.driver_id }).then(r => r?.[0]),
          sr.entities.Series.filter({ id: standing.series_id }).then(r => r?.[0]),
        ]);
        if (!driver || !series) {
          orphanStandings.push(standing.id);
        }
      }
    }
    if (orphanStandings.length > 0) {
      orphan_groups.push({
        entity: 'Standings',
        record_ids: orphanStandings,
        missing_reference_type: 'driver_id or series_id',
      });
    }

    // ── Check Event orphans ──
    offset = 0;
    const orphanEvents = [];
    while (true) {
      const batch = await sr.entities.Event.list('-created_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;

      for (const event of batch) {
        if (event.series_id || event.track_id) {
          const checks = [];
          if (event.series_id) checks.push(sr.entities.Series.filter({ id: event.series_id }).then(r => r?.[0]));
          if (event.track_id) checks.push(sr.entities.Track.filter({ id: event.track_id }).then(r => r?.[0]));
          const results = await Promise.all(checks);
          const hasMissing = results.some(r => !r);
          if (hasMissing) orphanEvents.push(event.id);
        }
      }
    }
    if (orphanEvents.length > 0) {
      orphan_groups.push({
        entity: 'Event',
        record_ids: orphanEvents,
        missing_reference_type: 'series_id or track_id',
      });
    }

    // ── Check Session orphans ──
    offset = 0;
    const orphanSessions = [];
    while (true) {
      const batch = await sr.entities.Session.list('-created_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;

      for (const session of batch) {
        const event = await sr.entities.Event.filter({ id: session.event_id }).then(r => r?.[0]);
        if (!event) orphanSessions.push(session.id);
      }
    }
    if (orphanSessions.length > 0) {
      orphan_groups.push({
        entity: 'Session',
        record_ids: orphanSessions,
        missing_reference_type: 'event_id',
      });
    }

    // ── Check EntityCollaborator orphans ──
    offset = 0;
    const orphanCollaborators = [];
    while (true) {
      const batch = await sr.entities.EntityCollaborator.list('-created_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;

      for (const collab of batch) {
        const entity = await sr.entities.Entity.filter({ id: collab.entity_id }).then(r => r?.[0]);
        if (!entity) orphanCollaborators.push(collab.id);
      }
    }
    if (orphanCollaborators.length > 0) {
      orphan_groups.push({
        entity: 'EntityCollaborator',
        record_ids: orphanCollaborators,
        missing_reference_type: 'entity_id',
      });
    }

    return Response.json({
      orphan_groups,
      total_orphaned: orphan_groups.reduce((sum, g) => sum + g.record_ids.length, 0),
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});