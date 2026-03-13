/**
 * scanForContentSignals
 * ─────────────────────────────────────────────────────────────────
 * Batch scan across recent platform data and generate ContentSignal
 * records where meaningful editorial changes are detected.
 *
 * Admin only. Use for:
 *   - Manual trigger from editorial dashboard
 *   - Scheduled automation (set up separately)
 *   - Diagnostics / backfill
 *
 * Optional body params:
 *   scan_window_hours  number  — hours to look back (default: 24)
 *   dry_run            bool    — inspect only, don't create signals
 *
 * Returns:
 *   {
 *     success, dry_run, scan_window_hours,
 *     scanned_updates, signals_created, signals_skipped,
 *     duplicates_avoided, warnings, errors, sources
 *   }
 *
 * Safety: never auto-publishes, never creates StoryRecommendation.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ─── HELPERS ──────────────────────────────────────────────────────

async function dispatch(base44, payload, dryRun) {
  if (dryRun) return { data: { created: false, skipped: true, dry_run: true, reason: 'dry_run' } };
  return await base44.asServiceRole.functions.invoke('createContentSignalFromUpdate', payload);
}

function recordResult(stats, source, entityId, res) {
  const d = res?.data ?? {};
  let outcome, signal_id = null, reason = null, dedupe_key = null;

  if (d.dry_run) {
    outcome = 'dry_run';
  } else if (d.created) {
    outcome = 'created';
    signal_id = d.signal_id;
    dedupe_key = d.dedupe_key;
    stats.created++;
  } else if (d.deduped) {
    outcome = 'deduped';
    reason = d.reason ?? 'duplicate_within_cooldown';
    dedupe_key = d.dedupe_key;
    stats.deduped++;
  } else if (d.skipped) {
    outcome = 'skipped';
    reason = d.reason;
    stats.skipped++;
  } else {
    outcome = 'unknown';
    stats.skipped++;
  }

  stats.row_results.push({ source, entity_id: entityId, outcome, signal_id, reason, dedupe_key });
  stats.scanned++;
}

function isRecent(record, cutoff) {
  const ts = record.created_date ?? record.updated_date ?? record.detected_at;
  return ts && ts >= cutoff;
}

async function logOp(base44, event_type, meta) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: event_type,
      entity_name: 'ContentSignal',
      entity_id: '',
      status: 'success',
      message: event_type,
      metadata: meta,
      function_name: 'scanForContentSignals',
      source_type: 'api_function',
    });
  } catch (_) { /* fire and forget */ }
}

// ─── SOURCE SCANNERS ──────────────────────────────────────────────

async function scanResults(base44, cutoff, dryRun, stats) {
  const results = await base44.asServiceRole.entities.Results.list('-created_date', 100);
  const recent = results.filter(r => isRecent(r, cutoff) && r.position);

  for (const r of recent) {
    stats.scanned++;
    const isNotable = r.position === 1 || r.position <= 3;
    const trigger = isNotable ? 'notable_finish_or_podium' : 'result_created';

    try {
      const res = await dispatch(base44, {
        source_entity_type: 'Results',
        source_entity_id: r.id,
        source_entity_name: r.driver_id ?? 'Unknown Driver',
        trigger_action: trigger,
        new_value: String(r.position),
        detected_at: r.created_date,
        metadata: {
          position: r.position,
          session_type: r.session_type,
          event_id: r.event_id,
          driver_id: r.driver_id,
          series_id: r.series_id,
        },
      }, dryRun);
      recordResult(stats, 'Results', r.id, res);
    } catch (err) {
      stats.errors.push(`Results ${r.id}: ${err.message}`);
      stats.row_results.push({ source: 'Results', entity_id: r.id, outcome: 'error', reason: err.message });
    }
  }
}

async function scanEvents(base44, cutoff, dryRun, stats) {
  const events = await base44.asServiceRole.entities.Event.list('-updated_date', 100);

  for (const ev of events) {
    if (!isRecent({ created_date: ev.updated_date ?? ev.created_date }, cutoff)) continue;
    stats.scanned++;

    let trigger = null;
    if (ev.status === 'cancelled') trigger = 'event_cancelled';
    else if (ev.status === 'postponed') trigger = 'event_postponed';
    else if (isRecent(ev, cutoff) && ev.created_date === ev.updated_date) trigger = 'event_created';

    if (!trigger) {
      stats.skipped++;
      stats.row_results.push({ source: 'Events', entity_id: ev.id, outcome: 'skipped', reason: 'no_meaningful_trigger' });
      continue;
    }

    try {
      const res = await dispatch(base44, {
        source_entity_type: 'Event',
        source_entity_id: ev.id,
        source_entity_name: ev.name ?? ev.title ?? 'Event',
        trigger_action: trigger,
        new_value: ev.status,
        detected_at: ev.updated_date ?? ev.created_date,
        metadata: {
          event_status: ev.status,
          series_id: ev.series_id,
          track_id: ev.track_id,
          start_date: ev.start_date,
        },
      }, dryRun);
      recordResult(stats, 'Events', ev.id, res);
    } catch (err) {
      stats.errors.push(`Event ${ev.id}: ${err.message}`);
      stats.row_results.push({ source: 'Events', entity_id: ev.id, outcome: 'error', reason: err.message });
    }
  }
}

async function scanStandings(base44, cutoff, dryRun, stats) {
  const standings = await base44.asServiceRole.entities.Standings.list('-updated_date', 100);
  const recent = standings.filter(s => isRecent({ created_date: s.updated_date ?? s.created_date }, cutoff));

  // Group by series_class_id to avoid flooding — one signal per class per scan
  const seenClasses = new Set();

  for (const s of recent) {
    const classKey = s.series_class_id ?? s.series_id ?? 'unknown';
    if (seenClasses.has(classKey)) {
      stats.skipped++;
      stats.row_results.push({ source: 'Standings', entity_id: s.id, outcome: 'skipped', reason: 'class_already_signaled' });
      continue;
    }
    seenClasses.add(classKey);
    stats.scanned++;

    try {
      const res = await dispatch(base44, {
        source_entity_type: 'Standings',
        source_entity_id: s.id,
        source_entity_name: s.driver_id ?? 'Standings',
        trigger_action: 'standings_updated',
        new_value: s.position ? `P${s.position}` : undefined,
        detected_at: s.updated_date ?? s.created_date,
        metadata: {
          position: s.position,
          points: s.points,
          series_class_id: s.series_class_id,
          series_id: s.series_id,
          class_name: classKey,
        },
      }, dryRun);
      recordResult(stats, 'Standings', s.id, res);
    } catch (err) {
      stats.errors.push(`Standings ${s.id}: ${err.message}`);
      stats.row_results.push({ source: 'Standings', entity_id: s.id, outcome: 'error', reason: err.message });
    }
  }
}

async function scanAnnouncements(base44, cutoff, dryRun, stats) {
  const announcements = await base44.asServiceRole.entities.Announcement.list('-created_date', 50);
  const recent = announcements.filter(a => a.active && isRecent(a, cutoff));

  for (const a of recent) {
    stats.scanned++;
    try {
      const res = await dispatch(base44, {
        source_entity_type: 'Announcement',
        source_entity_id: a.id,
        source_entity_name: 'Announcement',
        trigger_action: 'announcement_published',
        new_value: a.message?.slice(0, 120),
        detected_at: a.created_date,
        metadata: {
          message: a.message,
          link_url: a.link_url,
          background_color: a.background_color,
        },
      }, dryRun);
      recordResult(stats, 'Announcements', a.id, res);
    } catch (err) {
      stats.errors.push(`Announcement ${a.id}: ${err.message}`);
      stats.row_results.push({ source: 'Announcements', entity_id: a.id, outcome: 'error', reason: err.message });
    }
  }
}

async function scanPublishedStories(base44, cutoff, dryRun, stats) {
  const stories = await base44.asServiceRole.entities.OutletStory.list('-updated_date', 50);
  const recentPublished = stories.filter(s =>
    s.status === 'published' && isRecent({ created_date: s.updated_date ?? s.created_date }, cutoff)
  );

  for (const story of recentPublished) {
    stats.scanned++;
    try {
      const res = await dispatch(base44, {
        source_entity_type: 'OutletStory',
        source_entity_id: story.id,
        source_entity_name: story.title ?? 'Outlet Story',
        trigger_action: 'announcement_published',
        new_value: 'published',
        detected_at: story.updated_date ?? story.created_date,
        metadata: {
          story_title: story.title,
          primary_category: story.primary_category,
          featured: story.featured,
        },
      }, dryRun);

      if (res?.data?.created || res?.dry_run) stats.created++;
      else if (res?.data?.skipped) stats.skipped++;
      else if (res?.data?.deduped) stats.deduped++;
    } catch (err) {
      stats.errors.push(`OutletStory ${story.id}: ${err.message}`);
    }
  }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin only
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    const cutoff = new Date(Date.now() - scanWindowHours * 60 * 60 * 1000).toISOString();

    // Support scan_window_minutes for short windows, fallback to scan_window_hours
    let scanWindowHours;
    if (body.scan_window_minutes != null) {
      scanWindowHours = Number(body.scan_window_minutes) / 60;
    } else {
      scanWindowHours = Number(body.scan_window_hours) || 24;
    }

    const stats = {
      scanned: 0,
      created: 0,
      skipped: 0,
      deduped: 0,
      errors: [],
      warnings: [],
      row_results: [],
    };

    const sources = {};

    // ── Scan each source ──
    const scanners = [
      { name: 'Results', fn: scanResults },
      { name: 'Events', fn: scanEvents },
      { name: 'Standings', fn: scanStandings },
      { name: 'Announcements', fn: scanAnnouncements },
      { name: 'OutletStories', fn: scanPublishedStories },
    ];

    for (const scanner of scanners) {
      const before = { ...stats };
      try {
        await scanner.fn(base44, cutoff, dryRun, stats);
        sources[scanner.name] = {
          scanned: stats.scanned - before.scanned,
          created: stats.created - before.created,
          skipped: stats.skipped - before.skipped,
          deduped: stats.deduped - before.deduped,
        };
      } catch (err) {
        stats.errors.push(`${scanner.name} scanner failed: ${err.message}`);
        sources[scanner.name] = { error: err.message };
      }
    }

    // ── Log the scan run ──
    await logOp(base44, 'story_radar_signal_scan_run', {
      scan_window_hours: scanWindowHours,
      dry_run: dryRun,
      scanned_updates: stats.scanned,
      signals_created: stats.created,
      signals_skipped: stats.skipped,
      duplicates_avoided: stats.deduped,
      error_count: stats.errors.length,
    });

    return Response.json({
      success: true,
      dry_run: dryRun,
      scan_window_hours: scanWindowHours,
      scanned_updates: stats.scanned,
      signals_created: stats.created,
      signals_skipped: stats.skipped,
      duplicates_avoided: stats.deduped,
      warnings: stats.warnings,
      errors: stats.errors,
      sources,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});