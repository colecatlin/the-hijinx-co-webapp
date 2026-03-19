/**
 * backfillTrackNormalization.js
 *
 * Populates missing normalization fields on all existing Track records.
 * Only fills missing fields — never overwrites existing values.
 * Does NOT fake sync_last_seen_at.
 *
 * For each Track:
 *   - normalized_name ← from name if missing
 *   - canonical_slug  ← from normalized_name if missing
 *   - canonical_key   ← track:{external_uid}
 *                       else track:{normalized_name}:{location_state_or_country}
 *                       else track:{normalized_name}
 *
 * Input:  { dry_run?: boolean }  — default false (actually runs)
 * Output: {
 *   total_tracks, backfilled_normalized_name, backfilled_canonical_slug,
 *   backfilled_canonical_key, already_complete, skipped, warnings
 * }
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

function buildTrackCanonicalKey(record, normalizedName) {
  if (record.external_uid) return `track:${record.external_uid}`;
  const norm = normalizedName || normalizeName(record.name || '');
  if (!norm) return null;
  const loc = normalizeName(record.location_state || record.location_country || '');
  return loc ? `track:${norm}:${loc}` : `track:${norm}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    const allTracks = await base44.asServiceRole.entities.Track.list('-created_date', 3000);

    const stats = {
      total_tracks: allTracks.length,
      backfilled_normalized_name: 0,
      backfilled_canonical_slug: 0,
      backfilled_canonical_key: 0,
      already_complete: 0,
      skipped: 0,
      warnings: [],
    };

    for (const t of allTracks) {
      // Skip records already marked as duplicates
      if (t.canonical_key?.includes('DUPLICATE_OF') || (t.notes || '').includes('DUPLICATE_OF')) {
        stats.skipped++;
        continue;
      }

      const rawName = (t.name || '').trim();
      if (!rawName) {
        stats.skipped++;
        stats.warnings.push(`Track id=${t.id} has no name — skipped`);
        continue;
      }

      const normalized = t.normalized_name || normalizeName(rawName);
      if (!normalized) {
        stats.skipped++;
        stats.warnings.push(`Track id=${t.id} name="${rawName}" produced empty normalized_name — skipped`);
        continue;
      }

      const slug    = t.canonical_slug || generateEntitySlug(normalized);
      const cKey    = t.canonical_key  || buildTrackCanonicalKey(t, normalized);

      if (!cKey) {
        stats.skipped++;
        stats.warnings.push(`Track id=${t.id} could not build canonical_key — skipped`);
        continue;
      }

      const needsNorm = !t.normalized_name;
      const needsSlug = !t.canonical_slug;
      const needsKey  = !t.canonical_key;

      if (!needsNorm && !needsSlug && !needsKey) {
        stats.already_complete++;
        continue;
      }

      const patch = {};
      if (needsNorm) { patch.normalized_name = normalized; stats.backfilled_normalized_name++; }
      if (needsSlug) { patch.canonical_slug  = slug;       stats.backfilled_canonical_slug++; }
      if (needsKey)  { patch.canonical_key   = cKey;       stats.backfilled_canonical_key++; }

      if (!dry_run) {
        await base44.asServiceRole.entities.Track.update(t.id, patch)
          .catch(e => stats.warnings.push(`update_failed id=${t.id}: ${e.message}`));
      }
    }

    // Write OperationLog (live run only)
    if (!dry_run) {
      const totalBackfilled = stats.backfilled_normalized_name + stats.backfilled_canonical_slug + stats.backfilled_canonical_key;
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'track_normalization_backfill_completed',
        entity_name: 'Track',
        status: 'success',
        metadata: {
          source_path: 'backfill_track_normalization',
          dry_run,
          total_tracks: stats.total_tracks,
          total_backfilled: totalBackfilled,
          backfilled_normalized_name: stats.backfilled_normalized_name,
          backfilled_canonical_slug:  stats.backfilled_canonical_slug,
          backfilled_canonical_key:   stats.backfilled_canonical_key,
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