import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// --- inline normalization helpers (no local imports) ---
function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function buildEntitySlug(value) { return normalizeName(value).replace(/\s+/g, '-'); }
function buildCanonicalKey({ entity_type, name, external_uid, parent_context }) {
  const type = (entity_type || '').toLowerCase();
  if (external_uid) return `${type}:${external_uid}`;
  const norm = normalizeName(name);
  if (parent_context) return `${type}:${norm}:${parent_context}`;
  return `${type}:${norm}`;
}

// Maps NASCAR series_id to our series names
const SERIES_NAMES = {
  1: 'NASCAR Cup Series',
  2: "NASCAR O'Reilly Auto Parts Series",
  3: 'NASCAR Craftsman Truck Series',
};

// Safe upsert helper — returns { record, action }
async function upsertByFilters(model, matchFilters, createPayload, updatePatch) {
  for (const filter of matchFilters) {
    if (Object.values(filter).every(v => v)) {
      const results = await model.filter(filter);
      if (results && results.length > 0) {
        const existing = results[0];
        if (updatePatch && Object.keys(updatePatch).length > 0) {
          const updated = await model.update(existing.id, { ...updatePatch, sync_last_seen_at: new Date().toISOString() });
          return { record: updated, action: 'updated' };
        }
        return { record: existing, action: 'found' };
      }
    }
  }
  const record = await model.create({ ...createPayload, sync_last_seen_at: new Date().toISOString() });
  return { record, action: 'created' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      series_ids  = [1, 2, 3],
      season_year = 2026,
      dry_run     = false,
    } = body;

    const log   = [];
    const stats = { tracks_created: 0, tracks_updated: 0, tracks_skipped: 0, series_created: 0, series_found: 0, events_created: 0, events_updated: 0, events_skipped: 0 };

    for (const seriesId of series_ids) {
      const seriesName = SERIES_NAMES[seriesId];
      if (!seriesName) { log.push(`Unknown series_id: ${seriesId}`); continue; }

      const url = `https://cf.nascar.com/cacher/${season_year}/${seriesId}/schedule-feed.json`;
      log.push(`Fetching: ${url}`);

      const res = await fetch(url);
      if (!res.ok) { log.push(`  ERROR: ${res.status}`); continue; }

      const schedule = await res.json();

      // Deduplicate: race sessions only (run_type=3)
      const races = schedule
        .filter(e => e.run_type === 3)
        .reduce((acc, e) => {
          if (!acc.find(r => r.race_id === e.race_id)) acc.push(e);
          return acc;
        }, []);

      log.push(`  Found ${races.length} races for ${seriesName}`);

      // ---- STEP 1: Upsert each unique track using canonical key ----
      const uniqueTracks = [...new Map(races.map(r => [r.track_id, r])).values()];
      const trackIdMap = {};  // nascar track_id -> db track record

      for (const r of uniqueTracks) {
        const tName = (r.track_name || '').trim();
        if (!tName) continue;

        const normN    = normalizeName(tName);
        const cKey     = buildCanonicalKey({ entity_type: 'track', name: tName, external_uid: r.track_id ? `nascar-track-${r.track_id}` : null });
        const extUid   = r.track_id ? `nascar-track-${r.track_id}` : null;

        if (dry_run) {
          const existing = await base44.asServiceRole.entities.Track.filter({ canonical_key: cKey });
          if (existing && existing.length > 0) {
            trackIdMap[r.track_id] = existing[0];
            log.push(`  Track exists: ${tName}`);
            stats.tracks_skipped++;
          } else {
            log.push(`  [DRY RUN] Would create track: ${tName}`);
            stats.tracks_created++;
          }
          continue;
        }

        const { record, action } = await upsertByFilters(
          base44.asServiceRole.entities.Track,
          [
            extUid ? { external_uid: extUid } : null,
            { canonical_key: cKey },
            { normalized_name: normN },
          ].filter(Boolean),
          {
            name: tName,
            status: 'Active',
            location_city: '',
            location_country: 'United States',
            external_uid: extUid,
            normalized_name: normN,
            canonical_slug: buildEntitySlug(tName),
            canonical_key: cKey,
            data_source: 'syncNascarSchedule',
          },
          {} // no forced update patch — preserve existing data
        );

        trackIdMap[r.track_id] = record;
        if (action === 'created') { stats.tracks_created++; log.push(`  Created track: ${tName}`); }
        else if (action === 'updated') { stats.tracks_updated++; log.push(`  Updated track: ${tName}`); }
        else { stats.tracks_skipped++; log.push(`  Track exists: ${tName}`); }
      }

      // ---- STEP 2: Upsert Series using canonical key ----
      const seriesNormN = normalizeName(seriesName);
      const seriesCKey  = buildCanonicalKey({ entity_type: 'series', name: seriesName });

      let dbSeries = null;

      if (!dry_run) {
        const { record, action } = await upsertByFilters(
          base44.asServiceRole.entities.Series,
          [
            { canonical_key: seriesCKey },
            { normalized_name: seriesNormN },
          ],
          {
            name: seriesName,
            full_name: seriesName,
            discipline: 'Stock Car',
            sanctioning_body: 'NASCAR',
            status: 'Active',
            season_year: season_year.toString(),
            normalized_name: seriesNormN,
            canonical_slug: buildEntitySlug(seriesName),
            canonical_key: seriesCKey,
            data_source: 'syncNascarSchedule',
          },
          {} // no forced update patch
        );
        dbSeries = record;
        if (action === 'created') { stats.series_created++; log.push(`  Created series: ${seriesName}`); }
        else { stats.series_found++; log.push(`  Found series: ${seriesName} (id: ${record.id})`); }
      } else {
        log.push(`  [DRY RUN] Would upsert series: ${seriesName}`);
      }

      // ---- STEP 3: Upsert each Event using external_uid + canonical key ----
      for (const race of races) {
        const raceName = (race.race_name || '').trim();
        const raceDate = race.start_time ? race.start_time.split('T')[0] : null;
        if (!raceName || !raceDate) { stats.events_skipped++; continue; }

        const trackRecord = trackIdMap[race.track_id] || null;
        const isPast      = raceDate < new Date().toISOString().split('T')[0];
        const extUid      = race.race_id ? `nascar-race-${seriesId}-${race.race_id}` : null;
        const parentCtx   = `${raceDate}${trackRecord ? ':' + trackRecord.id : ''}${dbSeries ? ':' + dbSeries.id : ''}`;
        const cKey        = buildCanonicalKey({ entity_type: 'event', name: raceName, external_uid: extUid, parent_context: parentCtx });
        const normN       = normalizeName(raceName);

        const eventPayload = {
          name: raceName,
          series_name: seriesName,
          series_id: dbSeries?.id || null,
          season: season_year.toString(),
          event_date: raceDate,
          status: isPast ? 'Completed' : 'Draft',
          track_id: trackRecord?.id || null,
          round_number: race.race_id || null,
          external_uid: extUid,
          normalized_name: normN,
          canonical_slug: buildEntitySlug(raceName),
          canonical_key: cKey,
          normalized_event_key: cKey,
          data_source: 'syncNascarSchedule',
        };

        if (dry_run) {
          if (extUid) {
            const existing = await base44.asServiceRole.entities.Event.filter({ external_uid: extUid });
            if (existing && existing.length > 0) { log.push(`  Event exists (uid): ${raceName} (${raceDate})`); stats.events_updated++; }
            else { log.push(`  [DRY RUN] Would create event: ${raceName} (${raceDate})`); stats.events_created++; }
          } else {
            log.push(`  [DRY RUN] Would upsert event: ${raceName} (${raceDate})`); stats.events_created++;
          }
          continue;
        }

        const { action } = await upsertByFilters(
          base44.asServiceRole.entities.Event,
          [
            extUid ? { external_uid: extUid } : null,
            { canonical_key: cKey },
          ].filter(Boolean),
          eventPayload,
          { track_id: trackRecord?.id, status: eventPayload.status, series_id: dbSeries?.id || null }
        );

        if (action === 'created') { stats.events_created++; log.push(`  Created event: ${raceName} (${raceDate})`); }
        else { stats.events_updated++; log.push(`  Updated event: ${raceName} (${raceDate})`); }
      }
    }

    return Response.json({ success: true, dry_run, season: season_year, stats, log });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});