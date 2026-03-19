/**
 * runSourceIntegrityAudit.js  (admin only)
 *
 * Audits all five source entity types for:
 *  1. duplicate_groups   — by external_uid, canonical_key, normalized_name
 *  2. missing_normalization — records missing normalized_name / canonical_slug / canonical_key
 *  3. broken_routing     — records missing slug (Driver, Team, Track, Series)
 *  4. broken_required_links — Driver→team_id/series_id, Event→track_id/series_id referencing
 *                             IDs that don't exist in the DB
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(v) {
  if (!v) return '';
  return v.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function displayName(et, r) {
  if (et === 'driver') return `${r.first_name || ''} ${r.last_name || ''}`.trim();
  return r.name || r.full_name || r.title || '';
}
function mini(r) { return { id: r.id, name: r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim() }; }

async function scanEntity(sr, entity_type, allIds = {}) {
  const MODEL = { driver: 'Driver', team: 'Team', track: 'Track', series: 'Series', event: 'Event' };
  const modelName = MODEL[entity_type];
  const records = await sr.entities[modelName].list('-created_date', 2000);

  // ── 1. Duplicates ──────────────────────────────────────────────────────────
  const byUID = new Map(), byKey = new Map(), byNorm = new Map();
  for (const r of records) {
    if (r.external_uid) { const a = byUID.get(r.external_uid) || []; a.push(r); byUID.set(r.external_uid, a); }
    if (r.canonical_key) { const a = byKey.get(r.canonical_key) || []; a.push(r); byKey.set(r.canonical_key, a); }
    const dn = r.normalized_name || normalizeName(displayName(entity_type, r));
    if (dn) { const a = byNorm.get(dn) || []; a.push(r); byNorm.set(dn, a); }
  }

  const duplicate_groups = [];
  const seen = new Set();
  for (const [key, g] of byUID) {
    if (g.length > 1) { duplicate_groups.push({ match_type: 'external_uid', key, count: g.length, records: g.slice(0,3).map(mini) }); g.forEach(r => seen.add(r.id)); }
  }
  for (const [key, g] of byKey) {
    if (g.length > 1 && g.some(r => !seen.has(r.id))) { duplicate_groups.push({ match_type: 'canonical_key', key, count: g.length, records: g.slice(0,3).map(mini) }); g.forEach(r => seen.add(r.id)); }
  }
  for (const [key, g] of byNorm) {
    if (g.length > 1 && g.filter(r => !seen.has(r.id)).length > 1) { duplicate_groups.push({ match_type: 'normalized_name', key, count: g.length, records: g.slice(0,3).map(mini) }); g.forEach(r => seen.add(r.id)); }
  }

  // ── 2. Missing normalization ───────────────────────────────────────────────
  const missing_normalization = records
    .filter(r => !r.normalized_name || !r.canonical_key)
    .slice(0, 50)
    .map(r => ({
      id: r.id,
      name: displayName(entity_type, r),
      missing: [
        !r.normalized_name  && 'normalized_name',
        !r.canonical_key    && 'canonical_key',
        !r.canonical_slug   && 'canonical_slug',
      ].filter(Boolean),
    }));

  // ── 3. Broken routing (missing slug) ──────────────────────────────────────
  const broken_routing = entity_type !== 'event'
    ? records.filter(r => !r.slug).slice(0, 50).map(r => ({ id: r.id, name: displayName(entity_type, r) }))
    : [];

  // ── 4. Broken required links ───────────────────────────────────────────────
  const broken_required_links = [];
  if (entity_type === 'driver') {
    const teamIds  = allIds.teams  || new Set();
    const seriesIds = allIds.series || new Set();
    for (const r of records) {
      const issues = [];
      if (r.team_id         && !teamIds.has(r.team_id))         issues.push(`team_id not found: ${r.team_id}`);
      if (r.primary_series_id && !seriesIds.has(r.primary_series_id)) issues.push(`primary_series_id not found: ${r.primary_series_id}`);
      if (issues.length) broken_required_links.push({ id: r.id, name: displayName(entity_type, r), issues });
    }
  }
  if (entity_type === 'event') {
    const trackIds  = allIds.tracks  || new Set();
    const seriesIds = allIds.series  || new Set();
    for (const r of records) {
      const issues = [];
      if (r.track_id  && !trackIds.has(r.track_id))   issues.push(`track_id not found: ${r.track_id}`);
      if (r.series_id && !seriesIds.has(r.series_id)) issues.push(`series_id not found: ${r.series_id}`);
      if (issues.length) broken_required_links.push({ id: r.id, name: displayName(entity_type, r), issues });
    }
  }

  return {
    entity_type,
    total_records: records.length,
    duplicate_groups,
    missing_normalization,
    broken_routing,
    broken_required_links,
    counts: {
      duplicates: duplicate_groups.length,
      missing_normalization: missing_normalization.length,
      broken_routing: broken_routing.length,
      broken_required_links: broken_required_links.length,
    },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole;

    // Pre-load ID sets for cross-entity link validation
    const [allTeams, allTracks, allSeries] = await Promise.all([
      sr.entities.Team.list('-created_date', 2000),
      sr.entities.Track.list('-created_date', 2000),
      sr.entities.Series.list('-created_date', 2000),
    ]);
    const allIds = {
      teams:  new Set(allTeams.map(t => t.id)),
      tracks: new Set(allTracks.map(t => t.id)),
      series: new Set(allSeries.map(s => s.id)),
    };

    const [drivers, teams, tracks, series, events] = await Promise.all([
      scanEntity(sr, 'driver', allIds),
      scanEntity(sr, 'team', allIds),
      scanEntity(sr, 'track', allIds),
      scanEntity(sr, 'series', allIds),
      scanEntity(sr, 'event', allIds),
    ]);

    const summary = {
      duplicate_count:            [drivers,teams,tracks,series,events].reduce((s,e) => s + e.counts.duplicates, 0),
      missing_normalization_count:[drivers,teams,tracks,series,events].reduce((s,e) => s + e.counts.missing_normalization, 0),
      broken_link_count:          [drivers,teams,tracks,series,events].reduce((s,e) => s + e.counts.broken_required_links, 0),
      broken_routing_count:       [drivers,teams,tracks,series,events].reduce((s,e) => s + e.counts.broken_routing, 0),
    };

    await sr.entities.OperationLog.create({
      operation_type: 'diagnostics_run',
      entity_name: 'Diagnostics',
      status: 'success',
      metadata: { audit: 'source_integrity', ...summary, audited_by: user.email },
    }).catch(() => {});

    return Response.json({ drivers, teams, tracks, series, events, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});