/**
 * backfillEventNormalization.js
 *
 * Populates missing event normalization fields on all existing Event records.
 * Only fills missing fields — never overwrites existing values.
 *
 * For each Event:
 *   - normalized_name ← normalizeName(name) if missing
 *   - slug ← normalized_name with spaces replaced by hyphens if missing
 *   - normalized_event_key ← deterministic composite key if missing
 *   - canonical_key ← generated if missing
 *
 * Rules:
 *   - Skip records already marked DUPLICATE_OF
 *   - Log warning if series_id or track_id missing (weak key)
 *
 * Input:  { dry_run?: boolean }
 * Output: { total_events, backfilled_keys, already_complete, skipped, warnings }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildNormalizedEventKey({ name, event_date, track_id, series_id }) {
  const norm = normalizeName(name || '');
  const date = event_date || 'none';
  const track = track_id || 'none';
  const series = series_id || 'none';
  return `event:${series}:${track}:${date}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    const allEvents = await base44.asServiceRole.entities.Event.list('-created_date', 5000);

    const stats = {
      total_events: allEvents.length,
      backfilled_normalized_name: 0,
      backfilled_slug: 0,
      backfilled_normalized_event_key: 0,
      backfilled_canonical_key: 0,
      already_complete: 0,
      skipped: 0,
      warnings: [],
    };

    for (const e of allEvents) {
      // Skip records marked as duplicates
      if (e.canonical_key?.includes('DUPLICATE_OF') || (e.notes || '').includes('DUPLICATE_OF')) {
        stats.skipped++;
        continue;
      }

      if (!e.name) {
        stats.skipped++;
        stats.warnings.push(`Event id=${e.id} has no name — skipped`);
        continue;
      }

      const normalized = e.normalized_name || normalizeName(e.name);
      if (!normalized) {
        stats.skipped++;
        stats.warnings.push(`Event id=${e.id} name="${e.name}" produced empty normalized_name — skipped`);
        continue;
      }

      const slug = e.slug || normalized.replace(/\s+/g, '-');
      const evKey = e.normalized_event_key || buildNormalizedEventKey({
        name: e.name,
        event_date: e.event_date,
        track_id: e.track_id,
        series_id: e.series_id,
      });
      const cKey = e.canonical_key || `event:${normalized}`;

      // Check if series or track missing (weak key warning)
      if (!e.series_id || !e.track_id) {
        stats.warnings.push(`Event id=${e.id} name="${e.name}" missing series_id or track_id — normalized_event_key will be weak`);
      }

      const needsNorm = !e.normalized_name;
      const needsSlug = !e.slug;
      const needsEvKey = !e.normalized_event_key;
      const needsCKey = !e.canonical_key;

      if (!needsNorm && !needsSlug && !needsEvKey && !needsCKey) {
        stats.already_complete++;
        continue;
      }

      const patch = {};
      if (needsNorm)   { patch.normalized_name = normalized; stats.backfilled_normalized_name++; }
      if (needsSlug)   { patch.slug = slug; stats.backfilled_slug++; }
      if (needsEvKey)  { patch.normalized_event_key = evKey; stats.backfilled_normalized_event_key++; }
      if (needsCKey)   { patch.canonical_key = cKey; stats.backfilled_canonical_key++; }

      if (!dry_run) {
        await base44.asServiceRole.entities.Event.update(e.id, patch)
          .catch(err => stats.warnings.push(`update_failed id=${e.id}: ${err.message}`));
      }
    }

    // Write OperationLog (live run only)
    if (!dry_run) {
      const totalBackfilled = stats.backfilled_normalized_name + stats.backfilled_slug + stats.backfilled_normalized_event_key + stats.backfilled_canonical_key;
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'event_normalization_backfill_completed',
        entity_name: 'Event',
        status: 'success',
        metadata: {
          source_path: 'backfill_event_normalization',
          dry_run,
          total_events: stats.total_events,
          total_backfilled: totalBackfilled,
          backfilled_normalized_name: stats.backfilled_normalized_name,
          backfilled_slug: stats.backfilled_slug,
          backfilled_normalized_event_key: stats.backfilled_normalized_event_key,
          backfilled_canonical_key: stats.backfilled_canonical_key,
          already_complete: stats.already_complete,
          skipped: stats.skipped,
        },
      }).catch(() => {});
    }

    return Response.json({ success: true, dry_run, ...stats });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});