/**
 * backfillEntryAndClassIdentityKeys.js
 *
 * Populates entry_identity_key, series_class_identity_key, and event_class_identity_key
 * on all records missing them. Never overwrites an existing key.
 *
 * Input:  { dry_run?: boolean }
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeClassName(name) {
  return (name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}
function buildEntryKey(event_id, driver_id, class_id) {
  return `entry:${event_id || 'none'}:${driver_id || 'none'}:${class_id || 'none'}`;
}
function buildSeriesClassKey(series_id, class_name) {
  return `series_class:${series_id || 'none'}:${normalizeClassName(class_name)}`;
}
function buildEventClassKey(event_id, class_name) {
  return `event_class:${event_id || 'none'}:${normalizeClassName(class_name)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    const report = { dry_run, entries_backfilled: 0, entries_already_complete: 0, series_classes_backfilled: 0, series_classes_already_complete: 0, event_classes_backfilled: 0, event_classes_already_complete: 0, skipped: 0, warnings: [] };

    // ── Entries ──────────────────────────────────────────────────────────────
    const allEntries = await base44.asServiceRole.entities.Entry.list('-created_date', 10000);
    for (const e of allEntries) {
      if (e.entry_identity_key) { report.entries_already_complete++; continue; }
      if (!e.event_id || !e.driver_id) { report.skipped++; continue; }
      const class_id = e.event_class_id || e.series_class_id || null;
      const key = buildEntryKey(e.event_id, e.driver_id, class_id);
      if (!dry_run) {
        await base44.asServiceRole.entities.Entry.update(e.id, { entry_identity_key: key }).catch(err => report.warnings.push(`entry:${e.id}:${err.message}`));
      }
      report.entries_backfilled++;
    }

    // ── SeriesClass ───────────────────────────────────────────────────────────
    const allSeriesClasses = await base44.asServiceRole.entities.SeriesClass.list('-created_date', 5000);
    for (const c of allSeriesClasses) {
      if (c.series_class_identity_key) { report.series_classes_already_complete++; continue; }
      if (!c.series_id || !c.class_name) { report.skipped++; continue; }
      const key = buildSeriesClassKey(c.series_id, c.class_name);
      if (!dry_run) {
        await base44.asServiceRole.entities.SeriesClass.update(c.id, { series_class_identity_key: key }).catch(err => report.warnings.push(`series_class:${c.id}:${err.message}`));
      }
      report.series_classes_backfilled++;
    }

    // ── EventClass ───────────────────────────────────────────────────────────
    const allEventClasses = await base44.asServiceRole.entities.EventClass.list('-created_date', 5000);
    for (const c of allEventClasses) {
      if (c.event_class_identity_key) { report.event_classes_already_complete++; continue; }
      if (!c.event_id || !c.class_name) { report.skipped++; continue; }
      const key = buildEventClassKey(c.event_id, c.class_name);
      if (!dry_run) {
        await base44.asServiceRole.entities.EventClass.update(c.id, { event_class_identity_key: key }).catch(err => report.warnings.push(`event_class:${c.id}:${err.message}`));
      }
      report.event_classes_backfilled++;
    }

    if (!dry_run) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'entry_class_identity_backfill_completed',
        entity_name: 'Entry',
        status: 'success',
        metadata: { entries_backfilled: report.entries_backfilled, series_classes_backfilled: report.series_classes_backfilled, event_classes_backfilled: report.event_classes_backfilled },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});