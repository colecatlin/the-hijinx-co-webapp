/**
 * backfillTrackAndSeriesNormalization.js
 *
 * One-time normalization backfill for all existing Track and Series records
 * that are missing normalization fields.
 *
 * Fills in (only when missing / empty):
 *   - normalized_name
 *   - canonical_slug
 *   - canonical_key
 *
 * Does NOT set sync_last_seen_at — do not fake external sync timestamps.
 * Does NOT overwrite fields that already exist.
 * Does NOT touch records already marked DUPLICATE_OF.
 *
 * Input:  { dry_run?: boolean }   default false (actually runs)
 * Output: { series_backfilled, tracks_backfilled, series_to_backfill,
 *           tracks_to_backfill, series_already_complete, tracks_already_complete,
 *           skipped, warnings }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeName(v) {
  if (!v) return '';
  return v.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildSlug(v) {
  return normalizeName(v).replace(/\s+/g, '-');
}

function buildSeriesCanonicalKey(record) {
  if (record.external_uid) return `series:${record.external_uid}`;
  const norm = normalizeName(record.name || record.full_name || '');
  return norm ? `series:${norm}` : null;
}

function buildTrackCanonicalKey(record) {
  if (record.external_uid) return `track:${record.external_uid}`;
  const norm = normalizeName(record.name || '');
  if (!norm) return null;
  const loc = normalizeName(record.location_state || record.location_country || '');
  return loc ? `track:${norm}:${loc}` : `track:${norm}`;
}

function needsBackfill(record) {
  return !record.normalized_name || !record.canonical_slug || !record.canonical_key;
}

function isDuplicateMarker(record) {
  return record.canonical_key?.includes('DUPLICATE_OF') || record.notes?.includes('DUPLICATE_OF');
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    const sr = base44.asServiceRole;
    const warnings = [];

    // ── SERIES backfill ───────────────────────────────────────────────────────
    const allSeries = await sr.entities.Series.list('-created_date', 3000);

    let seriesBackfilled = 0;
    let seriesAlreadyComplete = 0;
    let seriesSkipped = 0;
    const seriesNeedingBackfill = [];

    for (const s of allSeries) {
      if (isDuplicateMarker(s)) { seriesSkipped++; continue; }
      if (!needsBackfill(s)) { seriesAlreadyComplete++; continue; }

      const norm = normalizeName(s.name || s.full_name || '');
      if (!norm) {
        warnings.push(`Series ${s.id} has no usable name — skipped`);
        seriesSkipped++;
        continue;
      }

      const canonicalKey = buildSeriesCanonicalKey(s);
      if (!canonicalKey) {
        warnings.push(`Series ${s.id} could not build canonical_key — skipped`);
        seriesSkipped++;
        continue;
      }

      // Build patch with only the missing fields
      const patch = {};
      if (!s.normalized_name) patch.normalized_name = norm;
      if (!s.canonical_slug)  patch.canonical_slug  = buildSlug(s.name || s.full_name || '');
      if (!s.canonical_key)   patch.canonical_key   = canonicalKey;

      seriesNeedingBackfill.push({ id: s.id, name: s.name, patch });

      if (!dry_run) {
        await sr.entities.Series.update(s.id, patch)
          .catch(e => warnings.push(`Series update failed ${s.id}: ${e.message}`));
        seriesBackfilled++;
      }
    }

    // ── TRACK backfill ────────────────────────────────────────────────────────
    const allTracks = await sr.entities.Track.list('-created_date', 3000);

    let tracksBackfilled = 0;
    let tracksAlreadyComplete = 0;
    let tracksSkipped = 0;
    const tracksNeedingBackfill = [];

    for (const t of allTracks) {
      if (isDuplicateMarker(t)) { tracksSkipped++; continue; }
      if (!needsBackfill(t)) { tracksAlreadyComplete++; continue; }

      const norm = normalizeName(t.name || '');
      if (!norm) {
        warnings.push(`Track ${t.id} has no usable name — skipped`);
        tracksSkipped++;
        continue;
      }

      const canonicalKey = buildTrackCanonicalKey(t);
      if (!canonicalKey) {
        warnings.push(`Track ${t.id} could not build canonical_key — skipped`);
        tracksSkipped++;
        continue;
      }

      const patch = {};
      if (!t.normalized_name) patch.normalized_name = norm;
      if (!t.canonical_slug)  patch.canonical_slug  = buildSlug(t.name || '');
      if (!t.canonical_key)   patch.canonical_key   = canonicalKey;

      tracksNeedingBackfill.push({ id: t.id, name: t.name, patch });

      if (!dry_run) {
        await sr.entities.Track.update(t.id, patch)
          .catch(e => warnings.push(`Track update failed ${t.id}: ${e.message}`));
        tracksBackfilled++;
      }
    }

    // ── OperationLog ──────────────────────────────────────────────────────────
    if (!dry_run && (seriesBackfilled > 0 || tracksBackfilled > 0)) {
      await sr.entities.OperationLog.create({
        operation_type: 'normalization_backfill_completed',
        entity_name:    'SourceEntity',
        status:         'success',
        metadata: {
          dry_run: false,
          series_backfilled:       seriesBackfilled,
          series_already_complete: seriesAlreadyComplete,
          series_skipped:          seriesSkipped,
          tracks_backfilled:       tracksBackfilled,
          tracks_already_complete: tracksAlreadyComplete,
          tracks_skipped:          tracksSkipped,
          warnings_count:          warnings.length,
        },
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      dry_run,
      // When dry_run: how many would be updated
      series_to_backfill:      dry_run ? seriesNeedingBackfill.length : undefined,
      tracks_to_backfill:      dry_run ? tracksNeedingBackfill.length : undefined,
      series_already_complete: seriesAlreadyComplete,
      tracks_already_complete: tracksAlreadyComplete,
      series_skipped:          seriesSkipped,
      tracks_skipped:          tracksSkipped,
      // When actual run: how many were updated
      series_backfilled:       dry_run ? undefined : seriesBackfilled,
      tracks_backfilled:       dry_run ? undefined : tracksBackfilled,
      skipped:                 seriesSkipped + tracksSkipped,
      warnings,
      ...(dry_run && {
        preview_series: seriesNeedingBackfill.slice(0, 10).map(r => ({ id: r.id, name: r.name, will_add: Object.keys(r.patch) })),
        preview_tracks: tracksNeedingBackfill.slice(0, 10).map(r => ({ id: r.id, name: r.name, will_add: Object.keys(r.patch) })),
      }),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});