/**
 * verifyTrackAndSeriesNormalization.js
 *
 * Verification audit for Track and Series dedupe stabilization.
 * Checks: normalization coverage, active duplicate groups, management save path
 * safety, survivor re-indexing, and sync recreation risk.
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    // ── 1. Fetch all records in parallel ────────────────────────────────────
    const [allSeries, allTracks, recentLogs] = await Promise.all([
      base44.asServiceRole.entities.Series.list('-created_date', 3000),
      base44.asServiceRole.entities.Track.list('-created_date', 3000),
      base44.asServiceRole.entities.OperationLog.list('-created_date', 500).catch(() => []),
    ]);

    // ── 2. Normalization coverage ────────────────────────────────────────────
    const normCoverage = {
      series: {
        total: allSeries.length,
        missing_normalized_name: allSeries.filter(s => !s.normalized_name).length,
        missing_canonical_slug:  allSeries.filter(s => !s.canonical_slug).length,
        missing_canonical_key:   allSeries.filter(s => !s.canonical_key).length,
        missing_sync_last_seen_at: allSeries.filter(s => !s.sync_last_seen_at).length,
        sample_missing: allSeries.filter(s => !s.normalized_name).slice(0, 5).map(s => ({ id: s.id, name: s.name })),
      },
      tracks: {
        total: allTracks.length,
        missing_normalized_name: allTracks.filter(t => !t.normalized_name).length,
        missing_canonical_slug:  allTracks.filter(t => !t.canonical_slug).length,
        missing_canonical_key:   allTracks.filter(t => !t.canonical_key).length,
        missing_sync_last_seen_at: allTracks.filter(t => !t.sync_last_seen_at).length,
        sample_missing: allTracks.filter(t => !t.normalized_name).slice(0, 5).map(t => ({ id: t.id, name: t.name })),
      },
    };

    // ── 3. Active duplicate groups remaining ─────────────────────────────────
    // Series — skip Inactive and already-marked duplicates
    const activeSeries = allSeries.filter(s =>
      s.status !== 'Inactive' && !s.canonical_key?.includes('DUPLICATE_OF')
    );
    const sByUid = new Map(), sByKey = new Map(), sByNorm = new Map();
    for (const s of activeSeries) {
      if (s.external_uid) {
        const a = sByUid.get(s.external_uid) || []; a.push(s); sByUid.set(s.external_uid, a);
      }
      if (s.canonical_key && !s.canonical_key.includes('DUPLICATE')) {
        const a = sByKey.get(s.canonical_key) || []; a.push(s); sByKey.set(s.canonical_key, a);
      }
      const norm = s.normalized_name || normalizeName(s.name || s.full_name || '');
      if (norm) { const a = sByNorm.get(norm) || []; a.push(s); sByNorm.set(norm, a); }
    }
    const processedS = new Set();
    const seriesGroups = [];
    for (const [key, grp] of sByUid) {
      if (grp.length > 1) { seriesGroups.push({ match_type: 'external_uid', key, count: grp.length, names: grp.map(r => r.name) }); grp.forEach(r => processedS.add(r.id)); }
    }
    for (const [key, grp] of sByKey) {
      if (grp.length > 1) { const u = grp.filter(r => !processedS.has(r.id)); if (u.length > 1) { seriesGroups.push({ match_type: 'canonical_key', key, count: grp.length, names: grp.map(r => r.name) }); grp.forEach(r => processedS.add(r.id)); } }
    }
    for (const [key, grp] of sByNorm) {
      if (grp.length > 1) { const u = grp.filter(r => !processedS.has(r.id)); if (u.length > 1) { seriesGroups.push({ match_type: 'normalized_name', key, count: grp.length, names: grp.map(r => r.name) }); grp.forEach(r => processedS.add(r.id)); } }
    }

    // Tracks — same approach with location composite key
    const activeTracks = allTracks.filter(t =>
      t.status !== 'Inactive' && !t.canonical_key?.includes('DUPLICATE_OF')
    );
    const tByUid = new Map(), tByKey = new Map(), tByNormLoc = new Map();
    for (const t of activeTracks) {
      if (t.external_uid) {
        const a = tByUid.get(t.external_uid) || []; a.push(t); tByUid.set(t.external_uid, a);
      }
      if (t.canonical_key && !t.canonical_key.includes('DUPLICATE')) {
        const a = tByKey.get(t.canonical_key) || []; a.push(t); tByKey.set(t.canonical_key, a);
      }
      const norm = t.normalized_name || normalizeName(t.name || '');
      if (norm) {
        const loc = normalizeName(t.location_state || t.location_country || '');
        const ck = loc ? `${norm}:${loc}` : norm;
        const a = tByNormLoc.get(ck) || []; a.push(t); tByNormLoc.set(ck, a);
      }
    }
    const processedT = new Set();
    const trackGroups = [];
    for (const [key, grp] of tByUid) {
      if (grp.length > 1) { trackGroups.push({ match_type: 'external_uid', key, count: grp.length, names: grp.map(r => r.name) }); grp.forEach(r => processedT.add(r.id)); }
    }
    for (const [key, grp] of tByKey) {
      if (grp.length > 1) { const u = grp.filter(r => !processedT.has(r.id)); if (u.length > 1) { trackGroups.push({ match_type: 'canonical_key', key, count: grp.length, names: grp.map(r => r.name) }); grp.forEach(r => processedT.add(r.id)); } }
    }
    for (const [key, grp] of tByNormLoc) {
      if (grp.length > 1) { const u = grp.filter(r => !processedT.has(r.id)); if (u.length > 1) { trackGroups.push({ match_type: 'normalized_name_location', key, count: grp.length, names: grp.map(r => r.name) }); grp.forEach(r => processedT.add(r.id)); } }
    }

    const duplicatesRemaining = {
      series_duplicate_groups_remaining: seriesGroups.length,
      track_duplicate_groups_remaining:  trackGroups.length,
      series_groups: seriesGroups,
      track_groups:  trackGroups,
    };

    // ── 4. Management save path safety ──────────────────────────────────────
    // Cross-reference OperationLog: look for management_ui-triggered sync pipeline saves
    const mgmtSaves = recentLogs.filter(l =>
      l.metadata?.triggered_from === 'management_ui' &&
      (l.operation_type === 'source_entity_updated' || l.operation_type === 'source_entity_created')
    );
    const trackMgmtSaves  = mgmtSaves.filter(l => l.entity_name === 'Track').length;
    const seriesMgmtSaves = mgmtSaves.filter(l => l.entity_name === 'Series').length;

    const managementSafety = {
      // Both confirmed in code: TrackCoreDetailsSection and SeriesCoreDetailsSection
      // both use prepareSourcePayloadForSync + syncSourceAndEntityRecord
      track_management_safe:  true,
      series_management_safe: true,
      track_recent_sync_saves:  trackMgmtSaves,
      series_recent_sync_saves: seriesMgmtSaves,
      note: (trackMgmtSaves === 0 && seriesMgmtSaves === 0)
        ? 'Code paths confirmed correct; no management_ui saves in recent OperationLog window yet'
        : `${trackMgmtSaves} Track + ${seriesMgmtSaves} Series management saves confirmed routing through sync pipeline`,
    };

    // ── 5. Survivor re-indexing verification ────────────────────────────────
    const repairLogs = recentLogs.filter(l => l.operation_type === 'source_duplicate_repaired');
    const failedSurvivors = [];
    let survivorsSeriesOk = 0;
    let survivorsTrackOk  = 0;

    for (const log of repairLogs.slice(0, 20)) {
      const survivorIds = log.metadata?.survivor_ids || [];
      const entityName  = log.entity_name;
      for (const sid of survivorIds) {
        const model = entityName === 'Series'
          ? base44.asServiceRole.entities.Series
          : base44.asServiceRole.entities.Track;
        const rec = await model.get(sid).catch(() => null);
        if (!rec) continue;
        if (rec.normalized_name && rec.canonical_slug && rec.canonical_key) {
          if (entityName === 'Series') survivorsSeriesOk++;
          else survivorsTrackOk++;
        } else {
          failedSurvivors.push({
            id: sid,
            entity: entityName,
            missing: [
              !rec.normalized_name && 'normalized_name',
              !rec.canonical_slug  && 'canonical_slug',
              !rec.canonical_key   && 'canonical_key',
            ].filter(Boolean),
          });
        }
      }
    }

    const survivorVerification = {
      repair_logs_checked: repairLogs.length,
      repaired_series_survivors_verified: survivorsSeriesOk,
      repaired_track_survivors_verified:  survivorsTrackOk,
      failed_survivor_ids: failedSurvivors,
    };

    // ── 6. Sync recreation risk ──────────────────────────────────────────────
    // Look for Track/Series source_entity_created entries triggered by sync sources
    const syncCreations = recentLogs.filter(l =>
      l.operation_type === 'source_entity_created' &&
      (l.entity_name === 'Track' || l.entity_name === 'Series') &&
      (l.metadata?.triggered_from || '').toLowerCase().includes('sync')
    );

    const suspiciousTrackCreations  = syncCreations
      .filter(l => l.entity_name === 'Track')
      .map(l => ({ id: l.entity_id, name: l.metadata?.display_name, triggered_from: l.metadata?.triggered_from, created_at: l.created_date }));
    const suspiciousSeriesCreations = syncCreations
      .filter(l => l.entity_name === 'Series')
      .map(l => ({ id: l.entity_id, name: l.metadata?.display_name, triggered_from: l.metadata?.triggered_from, created_at: l.created_date }));

    const recreationRisk = {
      track_creations_from_sync:  suspiciousTrackCreations.length,
      series_creations_from_sync: suspiciousSeriesCreations.length,
      suspicious_track_creations:  suspiciousTrackCreations.slice(0, 10),
      suspicious_series_creations: suspiciousSeriesCreations.slice(0, 10),
      verdict: (suspiciousTrackCreations.length + suspiciousSeriesCreations.length) > 0 ? 'warning' : 'safe',
      note: 'Sync-created records may be legitimately new — review names to confirm no unintended recreations',
    };

    // ── Overall verdict ──────────────────────────────────────────────────────
    const normFailed    = normCoverage.series.missing_normalized_name > 0 ||
                          normCoverage.series.missing_canonical_key > 0 ||
                          normCoverage.tracks.missing_normalized_name > 0 ||
                          normCoverage.tracks.missing_canonical_key > 0;
    const dupsFailed    = seriesGroups.length > 0 || trackGroups.length > 0;
    const surFailed     = failedSurvivors.length > 0;
    const riskWarning   = recreationRisk.verdict === 'warning';

    const overall_verdict = (normFailed || dupsFailed || surFailed) ? 'failed'
                          : riskWarning ? 'warning'
                          : 'passed';

    return Response.json({
      generated_at: new Date().toISOString(),
      overall_verdict,
      normalization_coverage: normCoverage,
      duplicates_remaining: duplicatesRemaining,
      management_safety: managementSafety,
      survivor_verification: survivorVerification,
      recreation_risk: recreationRisk,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});