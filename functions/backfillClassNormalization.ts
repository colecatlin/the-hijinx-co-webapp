/**
 * backfillClassNormalization.js
 * Populates normalized keys on SeriesClass and EventClass records.
 * 
 * For each SeriesClass:
 * - generate normalized_series_class_key
 * 
 * For each EventClass:
 * - generate normalized_event_class_key
 * 
 * Returns counts for backfilled and skipped.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function buildNormalizedSeriesClassKey(series_id, class_name) {
  if (!series_id || !class_name) return null;
  return `series_class:${series_id}:${normalizeName(class_name)}`;
}

function buildNormalizedEventClassKey(event_id, class_name) {
  if (!event_id || !class_name) return null;
  return `event_class:${event_id}:${normalizeName(class_name)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let seriesTotal = 0, seriesBackfilled = 0, seriesSkipped = 0;
    let eventTotal = 0, eventBackfilled = 0, eventSkipped = 0;
    const warnings = [];

    // ── Backfill SeriesClass ──
    let offset = 0;
    const limit = 100;
    while (true) {
      const batch = await base44.asServiceRole.entities.SeriesClass.list('-updated_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;
      seriesTotal += batch.length;

      for (const cls of batch) {
        const key = buildNormalizedSeriesClassKey(cls.series_id, cls.class_name);
        if (!key) {
          seriesSkipped++;
          continue;
        }

        if (!cls.normalized_series_class_key || cls.normalized_series_class_key !== key) {
          await base44.asServiceRole.entities.SeriesClass.update(cls.id, {
            normalized_series_class_key: key,
          }).catch((err) => {
            warnings.push(`SeriesClass ${cls.id}: update failed — ${err.message}`);
          });
          seriesBackfilled++;
        }
      }
    }

    // ── Backfill EventClass ──
    offset = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.EventClass.list('-updated_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;
      eventTotal += batch.length;

      for (const cls of batch) {
        const key = buildNormalizedEventClassKey(cls.event_id, cls.class_name);
        if (!key) {
          eventSkipped++;
          continue;
        }

        if (!cls.normalized_event_class_key || cls.normalized_event_class_key !== key) {
          await base44.asServiceRole.entities.EventClass.update(cls.id, {
            normalized_event_class_key: key,
          }).catch((err) => {
            warnings.push(`EventClass ${cls.id}: update failed — ${err.message}`);
          });
          eventBackfilled++;
        }
      }
    }

    // Write audit log
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'class_normalization_backfill_completed',
      entity_name: 'Class',
      status: 'success',
      metadata: {
        total_series_classes: seriesTotal,
        series_class_keys_backfilled: seriesBackfilled,
        series_class_skipped: seriesSkipped,
        total_event_classes: eventTotal,
        event_class_keys_backfilled: eventBackfilled,
        event_class_skipped: eventSkipped,
        warning_count: warnings.length,
      },
    }).catch(() => {});

    return Response.json({
      success: true,
      total_series_classes: seriesTotal,
      series_class_keys_backfilled: seriesBackfilled,
      total_event_classes: eventTotal,
      event_class_keys_backfilled: eventBackfilled,
      skipped: seriesSkipped + eventSkipped,
      warnings: warnings,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});