/**
 * backfillSeriesNormalization.js
 *
 * Populates missing normalization fields on all existing Series records.
 * Only fills missing fields — never overwrites existing values.
 *
 * For each Series:
 *   - normalized_name ← from name or full_name if missing
 *   - canonical_slug  ← from normalized_name if missing
 *   - canonical_key   ← series:{external_uid} or series:{normalized_name} if missing
 *   - sync_last_seen_at is NOT faked (left null if missing)
 *
 * Input:  { dry_run?: boolean }  — default false (actually runs)
 * Output: { total_series, backfilled_normalized_name, backfilled_canonical_slug,
 *            backfilled_canonical_key, skipped, warnings }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Unified slug utilities (inlined per platform constraints) ──
function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function generateEntitySlug(text) {
  if (!text) return '';
  return text.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function buildCanonicalKey(normalized, external_uid) {
  if (external_uid) return `series:${external_uid}`;
  return `series:${normalized}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    // Fetch all series
    const allSeries = await base44.asServiceRole.entities.Series.list('-created_date', 3000);

    const stats = {
      total_series: allSeries.length,
      backfilled_normalized_name: 0,
      backfilled_canonical_slug: 0,
      backfilled_canonical_key: 0,
      already_complete: 0,
      skipped: 0,
      warnings: [],
    };

    for (const s of allSeries) {
      const rawName = (s.name || s.full_name || '').trim();
      if (!rawName) {
        stats.skipped++;
        stats.warnings.push(`Series id=${s.id} has no name or full_name — skipped`);
        continue;
      }

      const normalized = s.normalized_name || normalizeName(rawName);
      if (!normalized) {
        stats.skipped++;
        stats.warnings.push(`Series id=${s.id} name="${rawName}" produced empty normalized_name — skipped`);
        continue;
      }

      const slug       = s.canonical_slug  || generateEntitySlug(normalized);
      const cKey       = s.canonical_key   || buildCanonicalKey(normalized, s.external_uid || null);

      const needsNorm  = !s.normalized_name;
      const needsSlug  = !s.canonical_slug;
      const needsKey   = !s.canonical_key;

      if (!needsNorm && !needsSlug && !needsKey) {
        stats.already_complete++;
        continue;
      }

      const patch = {};
      if (needsNorm) { patch.normalized_name = normalized; stats.backfilled_normalized_name++; }
      if (needsSlug) { patch.canonical_slug  = slug;       stats.backfilled_canonical_slug++; }
      if (needsKey)  { patch.canonical_key   = cKey;       stats.backfilled_canonical_key++; }

      if (!dry_run) {
        await base44.asServiceRole.entities.Series.update(s.id, patch)
          .catch(e => stats.warnings.push(`update_failed id=${s.id}: ${e.message}`));
      }
    }

    // Write OperationLog
    if (!dry_run) {
      const totalBackfilled = stats.backfilled_normalized_name + stats.backfilled_canonical_slug + stats.backfilled_canonical_key;
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'series_normalization_backfill_completed',
        entity_name: 'Series',
        status: 'success',
        metadata: {
          source_path: 'backfill_series_normalization',
          dry_run,
          total_series: stats.total_series,
          total_backfilled: totalBackfilled,
          backfilled_normalized_name: stats.backfilled_normalized_name,
          backfilled_canonical_slug:  stats.backfilled_canonical_slug,
          backfilled_canonical_key:   stats.backfilled_canonical_key,
          already_complete: stats.already_complete,
          skipped: stats.skipped,
        },
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      dry_run,
      ...stats,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});