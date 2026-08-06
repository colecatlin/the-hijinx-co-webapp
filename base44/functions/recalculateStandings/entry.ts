/**
 * recalculateStandings — Phase 6 Authoritative Standings Orchestrator.
 *
 * Migrates championship Standings from the legacy Driver-centered model to
 * the approved person-centered relationship chain:
 *
 *   PersonIdentity → RacerProfile → SeasonParticipation → Entry → Results → Standings
 *
 * Standings now use SeasonParticipation as the authoritative championship
 * competitor relationship. driver_id remains for temporary compatibility.
 *
 * Resolution chain (entry-first):
 *   Results.entry_id → Entry.participation_id → SeasonParticipation
 *   SeasonParticipation.series_id must match requested series
 *   SeasonParticipation.season_year must match requested season
 *
 * Modern logical key:
 *   series_id + season_year + series_class_id + participation_id
 *   (+ points_config_id when multiple configs can coexist)
 *
 * Input:
 *   { series_id, season_year or season, series_class_id?, points_config_id?,
 *     event_id?, dry_run?, comparison_mode?, source_path?,
 *     overwrite_historical?, include_archived?, compatibility_mode?,
 *     test_fail_after_step? }
 *
 * Output (Phase 6 partial-failure contract):
 *   { success, resolution_status, cleanup_required, failed_step, errors,
 *     warnings, context, calculated_rows, created_records, updated_records,
 *     reused_records, records_created_before_failure,
 *     records_modified_before_failure, excluded_results, review_items,
 *     comparison_summary? }
 *
 * Admin or series/event collaborator only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { ensureRaceCoreId } from '../../shared/racecoreId.ts';

// ── Tie-breaker sorting (preserved from Phase 5) ─────────────────────────────
function sortStandingsWithTieBreakers(rows, tieBreakerOrder) {
  const order = Array.isArray(tieBreakerOrder) && tieBreakerOrder.length
    ? tieBreakerOrder
    : ['wins', 'seconds', 'thirds', 'best_finishes', 'latest_finish'];

  const safeNum = (v) => (typeof v === 'number' ? v : 0);
  const safeArr = (v) => (Array.isArray(v) ? v : []);

  const compareBestFinishes = (a, b) => {
    const aa = safeArr(a.best_finishes);
    const bb = safeArr(b.best_finishes);
    const len = Math.max(aa.length, bb.length);
    for (let i = 0; i < len; i++) {
      const av = aa[i] ?? 9999;
      const bv = bb[i] ?? 9999;
      if (av !== bv) return av - bv;
    }
    return 0;
  };

  const comparators = {
    wins: (a, b) => safeNum(b.wins) - safeNum(a.wins),
    seconds: (a, b) => safeNum(b.seconds) - safeNum(a.seconds),
    thirds: (a, b) => safeNum(b.thirds) - safeNum(a.thirds),
    best_finishes: (a, b) => compareBestFinishes(a, b),
    most_starts: (a, b) => safeNum(b.starts) - safeNum(a.starts),
    most_entries: (a, b) => safeNum(b.starts) - safeNum(a.starts),
    latest_finish: (a, b) => {
      const av = typeof a.latest_finish === 'number' ? a.latest_finish : 9999;
      const bv = typeof b.latest_finish === 'number' ? b.latest_finish : 9999;
      return av - bv;
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const pts = safeNum(b.points_total) - safeNum(a.points_total);
    if (pts !== 0) return pts;
    for (const key of order) {
      const cmp = comparators[key];
      if (!cmp) continue;
      const v = cmp(a, b);
      if (v !== 0) return v;
    }
    const an = `${a.last_name || ''}${a.first_name || ''}`.toLowerCase();
    const bn = `${b.last_name || ''}${b.first_name || ''}`.toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });

  return sorted.map((r, idx) => ({ ...r, rank: idx + 1 }));
}

// ── Authorization helper ─────────────────────────────────────────────────────
async function isSeriesOrEventCollaborator(base44, userId, seriesId, eventId) {
  const collabs = await base44.asServiceRole.entities.EntityCollaborator
    .filter({ user_id: userId }).catch(() => []);
  const allowed = new Set(['owner', 'editor']);
  return collabs.some(c =>
    allowed.has(c.role) && (
      (c.entity_type === 'Series' && seriesId && c.entity_id === seriesId) ||
      (c.entity_type === 'Event' && eventId && c.entity_id === eventId)
    )
  );
}

// ── Normalize season year to 4-digit string ──────────────────────────────────
function normalizeSeasonYear(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}$/.test(s)) return s;
  const n = parseInt(s, 10);
  if (!isNaN(n) && n >= 1900 && n <= 9999) return String(n);
  return null;
}

// ── Build modern logical key ──────────────────────────────────────────────────
function buildStandingKey(seriesId, seasonYear, seriesClassId, participationId, pointsConfigId) {
  const parts = [
    'standing',
    seriesId,
    seasonYear,
    seriesClassId || 'overall',
    participationId
  ];
  if (pointsConfigId) parts.push(pointsConfigId);
  return parts.join(':');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      const body = await req.json().catch(() => ({}));
      const allowed = await isSeriesOrEventCollaborator(base44, user.id, body.series_id, body.event_id || null);
      if (!allowed) {
        return Response.json({ error: 'Forbidden: Admin or series/event collaborator required' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const {
      series_id,
      series_class_id,
      event_id,
      points_config_id,
      dry_run = false,
      comparison_mode = false,
      source_path = 'unknown',
      overwrite_historical = false,
      include_archived = false,
      compatibility_mode = false,
      test_fail_after_step = null,
    } = body;

    // Accept season or season_year for backwards compat
    const season_year = normalizeSeasonYear(body.season_year || body.season);

    // ── Validate required fields ──────────────────────────────────────────
    if (!series_id) {
      return Response.json({
        success: false, resolution_status: 'blocked', cleanup_required: false,
        failed_step: 'validation', errors: [{ code: 'missing_series_id', message: 'series_id is required' }],
        warnings: [], context: {}, calculated_rows: [], created_records: { standings_ids: [] },
        updated_records: { standings_ids: [] }, reused_records: { standings_ids: [] },
        records_created_before_failure: { standings_ids: [] },
        records_modified_before_failure: { standings_ids: [] },
        excluded_results: [], review_items: []
      }, { status: 400 });
    }

    if (!season_year) {
      return Response.json({
        success: false, resolution_status: 'blocked', cleanup_required: false,
        failed_step: 'validation', errors: [{ code: 'missing_season_year', message: 'season_year is required (4-digit year)' }],
        warnings: [], context: { series_id }, calculated_rows: [], created_records: { standings_ids: [] },
        updated_records: { standings_ids: [] }, reused_records: { standings_ids: [] },
        records_created_before_failure: { standings_ids: [] },
        records_modified_before_failure: { standings_ids: [] },
        excluded_results: [], review_items: []
      }, { status: 400 });
    }

    // ── Test failure injection (admin-only, phase6_test only) ─────────────
    const isTestFail = test_fail_after_step && user.role === 'admin' && source_path.startsWith('phase6_test');

    const context = { series_id, season_year, series_class_id: series_class_id || null, points_config_id: points_config_id || null };
    const excluded_results = [];
    const review_items = [];
    const errors = [];
    const warnings = [];

    // ── Load Series ────────────────────────────────────────────────────────
    let seriesRecord = null;
    try {
      const sList = await base44.asServiceRole.entities.Series.filter({ id: series_id });
      seriesRecord = sList?.[0];
    } catch (e) { /* non-blocking */ }
    if (!seriesRecord) {
      return Response.json({
        success: false, resolution_status: 'blocked', cleanup_required: false,
        failed_step: 'series_lookup', errors: [{ code: 'series_not_found', message: 'Series not found: ' + series_id }],
        warnings, context, calculated_rows: [], created_records: { standings_ids: [] },
        updated_records: { standings_ids: [] }, reused_records: { standings_ids: [] },
        records_created_before_failure: { standings_ids: [] },
        records_modified_before_failure: { standings_ids: [] },
        excluded_results, review_items
      }, { status: 404 });
    }

    // ── Governance module check ──────────────────────────────────────────
    let governanceEnabled = true;
    if (seriesRecord && Array.isArray(seriesRecord.enabled_modules)) {
      governanceEnabled = seriesRecord.enabled_modules.includes('governance');
    }

    // ── Resolve PointsConfig ──────────────────────────────────────────────
    let pointsConfig = null;
    if (points_config_id) {
      const cfgList = await base44.asServiceRole.entities.PointsConfig.filter({ id: points_config_id }).catch(() => []);
      pointsConfig = cfgList?.[0];
    }
    if (!pointsConfig) {
      const configRes = await base44.functions.invoke('resolvePointsConfig', {
        series_id, series_class_id, season: season_year, event_id
      });
      pointsConfig = configRes.data?.pointsConfig;
    }
    if (!pointsConfig) {
      const errMsg = 'No PointsConfig found for this series/season/class';
      return Response.json({
        success: false, resolution_status: 'blocked', cleanup_required: false,
        failed_step: 'points_config', errors: [{ code: 'no_points_config', message: errMsg }],
        warnings, context, calculated_rows: [], created_records: { standings_ids: [] },
        updated_records: { standings_ids: [] }, reused_records: { standings_ids: [] },
        records_created_before_failure: { standings_ids: [] },
        records_modified_before_failure: { standings_ids: [] },
        excluded_results, review_items
      }, { status: 404 });
    }

    // ── Load Events for this series+season ────────────────────────────────
    const events = await base44.asServiceRole.entities.Event.filter({
      series_id, season: season_year
    }).catch(() => []);

    if (events.length === 0) {
      return Response.json({
        success: true, resolution_status: 'completed', cleanup_required: false,
        failed_step: null, errors: [], warnings, context, calculated_rows: [],
        created_records: { standings_ids: [] }, updated_records: { standings_ids: [] },
        reused_records: { standings_ids: [] },
        records_created_before_failure: { standings_ids: [] },
        records_modified_before_failure: { standings_ids: [] },
        excluded_results, review_items
      });
    }

    const eventIds = events.map(e => e.id);
    const eventMap = {};
    events.forEach(e => { eventMap[e.id] = e; });

    // ── Load sessions to identify held ones (governance-aware) ────────────
    let heldSessionIds = new Set();
    if (governanceEnabled) {
      try {
        for (const evtId of eventIds) {
          const evtSessions = await base44.asServiceRole.entities.Session.filter({ event_id: evtId });
          for (const s of evtSessions) {
            if (s.standings_hold === true) heldSessionIds.add(s.id);
          }
        }
      } catch (_) { /* non-blocking */ }
    }

    // ── Load all Results for these events ─────────────────────────────────
    let allResults = [];
    for (const eventId of eventIds) {
      const results = await base44.asServiceRole.entities.Results.filter({
        event_id: eventId, series_id
      }).catch(() => []);
      allResults = allResults.concat(results);
    }

    // ── Filter Results (preserve existing logic) ──────────────────────────
    const applicableSessionTypes = pointsConfig.applies_to_session_types || ['Final', 'Feature'];
    const filteredResults = allResults.filter(r => {
      if (!r.position || r.position <= 0) return false;
      if (r.is_archived && !include_archived) return false;
      if (r.session_id && heldSessionIds.has(r.session_id)) return false;
      if (!applicableSessionTypes.includes(r.session_type)) return false;
      return true;
    });

    // ── Load Entries for these events (for Entry→Participation resolution) ──
    const entryMap = {};
    for (const eventId of eventIds) {
      const entries = await base44.asServiceRole.entities.Entry.filter({
        event_id: eventId
      }).catch(() => []);
      for (const e of entries) {
        entryMap[e.id] = e;
      }
    }

    // ── Load SeasonParticipations for this series+season ──────────────────
    const allParticipations = await base44.asServiceRole.entities.SeasonParticipation
      .filter({ series_id }).catch(() => []);
    const participationMap = {};
    for (const p of allParticipations) {
      participationMap[p.id] = p;
    }

    // ── Load EventClasses for class resolution ────────────────────────────
    const allEventClasses = [];
    for (const evtId of eventIds) {
      const evtClasses = await base44.asServiceRole.entities.EventClass
        .filter({ event_id: evtId }).catch(() => []);
      allEventClasses.push(...evtClasses);
    }
    const eventClassMap = {};
    for (const ec of allEventClasses) {
      eventClassMap[ec.id] = ec;
    }

    // ── Load SeriesClasses for this series ────────────────────────────────
    const seriesClasses = await base44.asServiceRole.entities.SeriesClass
      .filter({ series_id }).catch(() => []);
    const seriesClassMap = {};
    for (const sc of seriesClasses) {
      seriesClassMap[sc.id] = sc;
    }

    // ── Load Drivers for name fields and legacy compatibility ─────────────
    const allDrivers = await base44.asServiceRole.entities.Driver.list().catch(() => []);
    const driverMap = {};
    allDrivers.forEach(d => { driverMap[d.id] = d; });

    // ── Resolve each Result through Entry → Participation ─────────────────
    // Build per-participation raw event results
    const participationEvents = {};  // key: participationId + ':' + classId → array of event results
    const legacyDriverEvents = {};   // key: driverId → array (for comparison mode)
    const resultResolutionMap = {};  // resultId → { participation_id, driver_id, series_class_id, method }

    for (const result of filteredResults) {
      let participationId = null;
      let driverId = result.driver_id;
      let resolvedClassId = result.series_class_id || null;
      let resolutionMethod = 'none';

      // Path 1: Result has entry_id → resolve Entry → participation_id
      if (result.entry_id && entryMap[result.entry_id]) {
        const entry = entryMap[result.entry_id];
        participationId = entry.participation_id;
        driverId = entry.driver_id || result.driver_id;
        // Prefer Entry's event_class_id for class resolution
        if (entry.event_class_id && eventClassMap[entry.event_class_id]) {
          const ec = eventClassMap[entry.event_class_id];
          if (ec.series_class_id) resolvedClassId = ec.series_class_id;
        }
        resolutionMethod = 'entry_id';
      }
      // Path 2: Compatibility — resolve via driver_id → Entry lookup
      else if (compatibility_mode && result.driver_id) {
        // Find Entries for this driver in this event
        const eventEntries = Object.values(entryMap).filter(e =>
          e.event_id === result.event_id && e.driver_id === result.driver_id
        );
        if (eventEntries.length === 1) {
          participationId = eventEntries[0].participation_id;
          if (eventEntries[0].event_class_id && eventClassMap[eventEntries[0].event_class_id]) {
            const ec = eventClassMap[eventEntries[0].event_class_id];
            if (ec.series_class_id) resolvedClassId = ec.series_class_id;
          }
          resolutionMethod = 'compatibility_driver_id';
        } else if (eventEntries.length > 1) {
          // Ambiguous — exclude and review
          excluded_results.push({
            result_id: result.id,
            reason: 'entry_ambiguous',
            message: 'Multiple Entries found for driver in event — cannot resolve participation',
            candidate_entry_ids: eventEntries.map(e => e.id)
          });
          review_items.push({
            type: 'ambiguous_entry',
            result_id: result.id,
            driver_id: result.driver_id,
            event_id: result.event_id,
            candidate_entry_ids: eventEntries.map(e => e.id)
          });
          continue;
        } else {
          // No entry found — exclude
          excluded_results.push({
            result_id: result.id,
            reason: 'no_entry_found',
            message: 'No Entry found for driver in event — cannot resolve participation'
          });
          continue;
        }
      } else if (!result.entry_id) {
        // No entry_id and not in compatibility mode — exclude
        excluded_results.push({
          result_id: result.id,
          reason: 'missing_entry_id',
          message: 'Result has no entry_id — cannot resolve through modern chain (use compatibility_mode to attempt driver_id fallback)'
        });
        continue;
      } else if (result.entry_id && !entryMap[result.entry_id]) {
        // entry_id provided but Entry not found
        excluded_results.push({
          result_id: result.id,
          reason: 'entry_not_found',
          message: 'Entry not found: ' + result.entry_id
        });
        continue;
      }

      if (!participationId) {
        excluded_results.push({
          result_id: result.id,
          reason: 'no_participation_id',
          message: 'Entry has no participation_id — cannot group under modern chain'
        });
        continue;
      }

      // ── Validate Participation ────────────────────────────────────────
      const participation = participationMap[participationId];
      if (!participation) {
        excluded_results.push({
          result_id: result.id,
          reason: 'participation_not_found',
          message: 'SeasonParticipation not found: ' + participationId
        });
        continue;
      }

      // Validate participation series
      if (participation.series_id !== series_id) {
        excluded_results.push({
          result_id: result.id,
          reason: 'standings_participation_series_mismatch',
          message: `Participation series ${participation.series_id} does not match standings series ${series_id}`
        });
        continue;
      }

      // Validate participation season
      const participationSeason = normalizeSeasonYear(participation.season_year);
      if (participationSeason !== season_year) {
        excluded_results.push({
          result_id: result.id,
          reason: 'standings_participation_season_mismatch',
          message: `Participation season ${participation.season_year} does not match standings season ${season_year}`
        });
        continue;
      }

      // ── Class filtering ────────────────────────────────────────────────
      // If series_class_id is specified, only include results matching that class
      if (series_class_id && resolvedClassId !== series_class_id) {
        excluded_results.push({
          result_id: result.id,
          reason: 'class_mismatch',
          message: `Result class ${resolvedClassId} does not match requested class ${series_class_id}`
        });
        continue;
      }

      // ── Validate SeriesClass belongs to this Series ───────────────────
      if (resolvedClassId && seriesClassMap[resolvedClassId]) {
        const sc = seriesClassMap[resolvedClassId];
        if (sc.series_id !== series_id) {
          excluded_results.push({
            result_id: result.id,
            reason: 'class_series_mismatch',
            message: `SeriesClass ${resolvedClassId} belongs to series ${sc.series_id}, not ${series_id}`
          });
          continue;
        }
      }

      // ── Add to participation grouping ──────────────────────────────────
      const groupKey = participationId + ':' + (resolvedClassId || 'overall');
      if (!participationEvents[groupKey]) participationEvents[groupKey] = [];
      participationEvents[groupKey].push({
        event_id: result.event_id,
        event_date: eventMap[result.event_id]?.event_date,
        position: result.position,
        points: pointsConfig.points_by_position[result.position - 1] || 0,
        participation_id: participationId,
        driver_id: driverId,
        series_class_id: resolvedClassId
      });

      // Track resolution for audit
      resultResolutionMap[result.id] = {
        participation_id: participationId,
        driver_id: driverId,
        series_class_id: resolvedClassId,
        method: resolutionMethod
      };

      // Also build legacy driver-based grouping for comparison mode
      if (comparison_mode && driverId) {
        const legacyKey = driverId + ':' + (resolvedClassId || 'overall');
        if (!legacyDriverEvents[legacyKey]) legacyDriverEvents[legacyKey] = [];
        legacyDriverEvents[legacyKey].push({
          event_id: result.event_id,
          event_date: eventMap[result.event_id]?.event_date,
          position: result.position,
          points: pointsConfig.points_by_position[result.position - 1] || 0,
          driver_id: driverId,
          series_class_id: resolvedClassId
        });
      }
    }

    // ── Apply drop rounds (preserved from existing logic) ─────────────────
    const dropRoundsEnabled = pointsConfig.drop_rounds?.enabled && pointsConfig.drop_rounds?.count > 0;
    const dropCount = dropRoundsEnabled ? pointsConfig.drop_rounds.count : 0;
    let droppedRoundsCount = 0;

    if (dropRoundsEnabled) {
      for (const groupKey in participationEvents) {
        const evts = participationEvents[groupKey];
        if (evts.length > dropCount) {
          evts.sort((a, b) => a.points - b.points);
          const toDropCount = Math.min(dropCount, evts.length);
          participationEvents[groupKey] = evts.slice(toDropCount);
          droppedRoundsCount += toDropCount;
        }
      }
      if (comparison_mode) {
        for (const legacyKey in legacyDriverEvents) {
          const evts = legacyDriverEvents[legacyKey];
          if (evts.length > dropCount) {
            evts.sort((a, b) => a.points - b.points);
            const toDropCount = Math.min(dropCount, evts.length);
            legacyDriverEvents[legacyKey] = evts.slice(toDropCount);
          }
        }
      }
    }

    // ── Aggregate per participation ───────────────────────────────────────
    const modernStandings = {};

    for (const groupKey in participationEvents) {
      const evts = participationEvents[groupKey];
      if (evts.length === 0) continue;

      const participationId = evts[0].participation_id;
      const driverId = evts[0].driver_id;
      const classId = evts[0].series_class_id || null;

      let total = 0, wins = 0, seconds = 0, thirds = 0;
      const finishes = [];
      let latestFinish = null;

      for (const evt of evts) {
        total += evt.points;
        if (evt.position === 1) wins++;
        else if (evt.position === 2) seconds++;
        else if (evt.position === 3) thirds++;
        finishes.push(evt.position);
        latestFinish = evt.position;
      }

      finishes.sort((a, b) => a - b);

      const standingKey = buildStandingKey(series_id, season_year, classId, participationId, pointsConfig.id);
      const driver = driverId ? driverMap[driverId] : null;

      modernStandings[groupKey] = {
        participation_id: participationId,
        driver_id: driverId || null,
        series_id,
        season_year,
        series_class_id: classId,
        points_total: total,
        rank: 0,
        wins, seconds, thirds,
        best_finishes: finishes,
        starts: evts.length,
        latest_finish: latestFinish,
        rounds_counted: evts.length,
        points_breakdown: evts.map(e => ({
          event_id: e.event_id,
          event_date: e.event_date,
          points: e.points,
          finish_position: e.position
        })),
        last_calculated: new Date().toISOString(),
        calculation_source: 'RaceCore',
        points_config_id: pointsConfig.id,
        podiums: (wins + seconds + thirds),
        top5: finishes.filter(f => f <= 5).length,
        top10: finishes.filter(f => f <= 10).length,
        standing_identity_key: standingKey,
        normalized_standing_key: standingKey,
        first_name: driver?.first_name || '',
        last_name: driver?.last_name || ''
      };
    }

    // ── Sort with tie-breakers ────────────────────────────────────────────
    let standingsArray = Object.values(modernStandings);
    standingsArray = sortStandingsWithTieBreakers(standingsArray, pointsConfig.tie_breaker_order);

    // ── Build calculated_rows for response ────────────────────────────────
    const calculated_rows = standingsArray.map(s => ({
      participation_id: s.participation_id,
      driver_id: s.driver_id,
      series_class_id: s.series_class_id,
      points_total: s.points_total,
      rank: s.rank,
      wins: s.wins,
      seconds: s.seconds,
      thirds: s.thirds,
      podiums: s.podiums,
      top5: s.top5,
      top10: s.top10,
      starts: s.starts,
      best_finishes: s.best_finishes,
      latest_finish: s.latest_finish,
      rounds_counted: s.rounds_counted,
      standing_identity_key: s.standing_identity_key
    }));

    // ── Comparison mode: calculate legacy driver-based standings ─────────
    let comparison_summary = null;
    if (comparison_mode) {
      const legacyStandings = {};
      for (const legacyKey in legacyDriverEvents) {
        const evts = legacyDriverEvents[legacyKey];
        if (evts.length === 0) continue;

        const driverId = evts[0].driver_id;
        const classId = evts[0].series_class_id || null;

        let total = 0, wins = 0, seconds = 0, thirds = 0;
        const finishes = [];
        for (const evt of evts) {
          total += evt.points;
          if (evt.position === 1) wins++;
          else if (evt.position === 2) seconds++;
          else if (evt.position === 3) thirds++;
          finishes.push(evt.position);
        }
        finishes.sort((a, b) => a - b);

        legacyStandings[legacyKey] = {
          driver_id: driverId,
          series_class_id: classId,
          points_total: total, wins, seconds, thirds,
          podiums: wins + seconds + thirds,
          top5: finishes.filter(f => f <= 5).length,
          top10: finishes.filter(f => f <= 10).length,
          starts: evts.length,
          best_finishes: finishes,
          latest_finish: evts[evts.length - 1]?.position || null
        };
      }

      const legacyArray = sortStandingsWithTieBreakers(
        Object.values(legacyStandings).map(s => ({
          ...s,
          first_name: driverMap[s.driver_id]?.first_name || '',
          last_name: driverMap[s.driver_id]?.last_name || ''
        })),
        pointsConfig.tie_breaker_order
      );

      // Compare modern vs legacy
      const exact_matches = [];
      const mismatches = [];
      const legacy_only = [];
      const modern_only = [];

      // Build lookup maps
      const modernByDriver = {};
      for (const s of standingsArray) {
        if (s.driver_id) {
          const key = s.driver_id + ':' + (s.series_class_id || 'overall');
          modernByDriver[key] = s;
        }
      }

      for (const ls of legacyArray) {
        const key = ls.driver_id + ':' + (ls.series_class_id || 'overall');
        const ms = modernByDriver[key];
        if (ms) {
          if (ms.points_total === ls.points_total &&
              ms.wins === ls.wins &&
              ms.podiums === ls.podiums &&
              ms.starts === ls.starts) {
            exact_matches.push({ driver_id: ls.driver_id, series_class_id: ls.series_class_id, points: ls.points_total });
          } else {
            mismatches.push({
              driver_id: ls.driver_id,
              series_class_id: ls.series_class_id,
              modern: { points: ms.points_total, wins: ms.wins, podiums: ms.podiums, starts: ms.starts, rank: ms.rank },
              legacy: { points: ls.points_total, wins: ls.wins, podiums: ls.podiums, starts: ls.starts, rank: ls.rank },
              explanation: ms.participation_id ? 'Participation grouping may include/exclude results differently' : 'No modern participation mapping'
            });
          }
        } else {
          legacy_only.push({ driver_id: ls.driver_id, series_class_id: ls.series_class_id, points: ls.points_total });
        }
      }

      for (const ms of standingsArray) {
        if (ms.driver_id) {
          const key = ms.driver_id + ':' + (ms.series_class_id || 'overall');
          if (!legacyStandings[key]) {
            modern_only.push({ participation_id: ms.participation_id, driver_id: ms.driver_id, series_class_id: ms.series_class_id, points: ms.points_total });
          }
        }
      }

      comparison_summary = { exact_matches, mismatches, legacy_only, modern_only };
    }

    // ── Dry run: return without writing ──────────────────────────────────
    if (dry_run) {
      return Response.json({
        success: true, resolution_status: 'completed', cleanup_required: false,
        failed_step: null, errors, warnings, context, calculated_rows,
        created_records: { standings_ids: [] }, updated_records: { standings_ids: [] },
        reused_records: { standings_ids: [] },
        records_created_before_failure: { standings_ids: [] },
        records_modified_before_failure: { standings_ids: [] },
        excluded_results, review_items, dry_run: true,
        comparison_summary
      });
    }

    // ── Commit mode ───────────────────────────────────────────────────────
    const createdIds = [];
    const updatedIds = [];
    const reusedIds = [];
    const createdBeforeFailure = [];
    const modifiedBeforeFailure = [];
    let cleanup_required = false;
    let failed_step = null;

    // Load existing Standings for this series+season
    const existingStandings = await base44.asServiceRole.entities.Standings.filter({
      series_id, season_year
    }).catch(() => []);

    // Protect historical/manual standings
    const PROTECTED_SOURCES = new Set(['historical_import', 'manual', 'partial']);
    const PROTECTED_STATUSES = new Set(['historical_verified', 'manual', 'partial', 'under_review']);
    let historicalPreserved = 0;

    // Build lookup of existing computed standings by normalized_standing_key
    const existingByKey = {};
    const existingByComposite = {};
    for (const s of existingStandings) {
      if (!series_class_id || s.series_class_id === series_class_id) {
        const isHistorical = PROTECTED_SOURCES.has(s.calculation_source) || PROTECTED_STATUSES.has(s.record_status);
        if (isHistorical && !overwrite_historical) {
          historicalPreserved++;
          continue;
        }
        if (s.normalized_standing_key) existingByKey[s.normalized_standing_key] = s;
        const compKey = `${s.series_id}:${s.season_year}:${s.series_class_id || 'overall'}:${s.participation_id || s.driver_id}`;
        if (!existingByComposite[compKey]) existingByComposite[compKey] = [];
        existingByComposite[compKey].push(s);
      }
    }

    if (historicalPreserved > 0) {
      warnings.push({ code: 'historical_preserved', message: `Preserved ${historicalPreserved} historical/manual standings — pass overwrite_historical=true to replace` });
    }

    // Delete old computed standings that won't be updated
    const modernKeys = new Set(standingsArray.map(s => s.normalized_standing_key));
    for (const s of existingStandings) {
      if (!series_class_id || s.series_class_id === series_class_id) {
        const isHistorical = PROTECTED_SOURCES.has(s.calculation_source) || PROTECTED_STATUSES.has(s.record_status);
        if (isHistorical && !overwrite_historical) continue;
        if (!modernKeys.has(s.normalized_standing_key) && !s.participation_id) {
          // Old driver-based computed standing with no participation — delete
          await base44.asServiceRole.entities.Standings.delete(s.id).catch(() => {});
          modifiedBeforeFailure.push(s.id);
        }
      }
    }

    // ── Upsert each standing row ──────────────────────────────────────────
    for (const standing of standingsArray) {
      // Test failure injection
      if (isTestFail && test_fail_after_step === 'after_first_write' && createdIds.length + updatedIds.length >= 1) {
        failed_step = 'test_injected_failure';
        cleanup_required = true;
        errors.push({ code: 'test_injected_failure', message: 'Test failure injected after first standing write' });
        break;
      }

      const { first_name, last_name, ...standingData } = standing;
      let existing = null;
      let matchMethod = 'none';

      // 1. Match by normalized_standing_key
      if (standing.normalized_standing_key && existingByKey[standing.normalized_standing_key]) {
        existing = existingByKey[standing.normalized_standing_key];
        matchMethod = 'normalized_standing_key';
      }

      // 2. Fallback: composite key (series + season + class + participation)
      if (!existing && standing.participation_id) {
        const compKey = `${series_id}:${season_year}:${standing.series_class_id || 'overall'}:${standing.participation_id}`;
        const matches = existingByComposite[compKey];
        if (matches?.length === 1) {
          existing = matches[0];
          matchMethod = 'composite_participation';
        } else if (matches?.length > 1) {
          review_items.push({
            type: 'duplicate_standings',
            participation_id: standing.participation_id,
            series_class_id: standing.series_class_id,
            existing_ids: matches.map(m => m.id)
          });
          warnings.push({
            code: 'duplicate_standings',
            message: `Multiple Standings found for participation ${standing.participation_id} — review required`
          });
          continue;
        }
      }

      let record;
      if (existing) {
        // Update existing — preserve racecore_id
        const updateData = { ...standingData };
        delete updateData.racecore_id; // Never overwrite existing racecore_id
        record = await base44.asServiceRole.entities.Standings.update(existing.id, updateData);
        updatedIds.push(record.id);
        modifiedBeforeFailure.push(record.id);
      } else {
        // Create new
        record = await base44.asServiceRole.entities.Standings.create(standingData);
        createdIds.push(record.id);
        createdBeforeFailure.push(record.id);
      }
    }

    // ── Assign STND RaceCore IDs to new standings ─────────────────────────
    if (failed_step === null) {
      for (const standingId of createdIds) {
        try {
          const idResult = await ensureRaceCoreId(base44, 'Standings', standingId);
          if (!idResult.success) {
            if (idResult.duplicate_detected) {
              errors.push({
                code: 'stnd_duplicate_detected',
                message: `Duplicate STND ID detected for Standings ${standingId}: ${idResult.racecore_id}`,
                conflicting_ids: idResult.conflicting_entity_ids
              });
              cleanup_required = true;
              failed_step = 'stnd_assignment';
              break;
            } else {
              warnings.push({
                code: 'stnd_assignment_failed',
                message: `STND ID assignment failed for Standings ${standingId}: ${idResult.error}`
              });
            }
          }
        } catch (e) {
          warnings.push({
            code: 'stnd_assignment_failed',
            message: `STND ID assignment error for Standings ${standingId}: ${e.message}`
          });
        }
      }
    }

    // ── Log operation ──────────────────────────────────────────────────────
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'standings_recalculated',
      status: failed_step ? 'failed' : 'success',
      entity_type: 'Standings',
      details: {
        series_id, season_year, series_class_id, event_id,
        points_config_id: pointsConfig.id,
        standingsCount: standingsArray.length,
        resultsProcessed: filteredResults.length,
        resultsExcluded: excluded_results.length,
        dropped_rounds_count: droppedRoundsCount,
        governance_enabled: governanceEnabled,
        held_sessions_skipped: heldSessionIds.size,
        dry_run: false,
        comparison_mode,
        source_path,
        failed_step
      }
    }).catch(() => {});

    // ── AuditLog ───────────────────────────────────────────────────────────
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        entity_type: 'Standings',
        entity_id: series_id,
        entity_name: `Standings recalculation — ${series_id} ${season_year}`,
        action: 'updated',
        performed_by: user.id,
        performed_by_name: user.full_name || user.email || user.id,
        timestamp: new Date().toISOString(),
        before_data: { series_id, season_year, series_class_id, prior_standings_count: existingStandings.length },
        after_data: {
          series_id, season_year, series_class_id,
          standings_count: standingsArray.length,
          results_processed: filteredResults.length,
          results_excluded: excluded_results.length,
          dropped_rounds: droppedRoundsCount,
          created: createdIds.length, updated: updatedIds.length,
          failed_step, cleanup_required
        },
        event_id: event_id || null,
        notes: `recalculateStandings Phase 6 — ${standingsArray.length} standings, ${createdIds.length} created, ${updatedIds.length} updated, ${excluded_results.length} excluded`,
      });
    } catch (_) {}

    return Response.json({
      success: failed_step === null,
      resolution_status: failed_step ? 'partial' : 'completed',
      cleanup_required,
      failed_step,
      errors, warnings, context, calculated_rows,
      created_records: { standings_ids: createdIds },
      updated_records: { standings_ids: updatedIds },
      reused_records: { standings_ids: reusedIds },
      records_created_before_failure: { standings_ids: createdBeforeFailure },
      records_modified_before_failure: { standings_ids: modifiedBeforeFailure },
      excluded_results, review_items,
      comparison_summary,
      pointsConfig: { id: pointsConfig.id, name: pointsConfig.name },
      standingsCount: standingsArray.length,
      resultsProcessed: filteredResults.length,
      resultsExcluded: excluded_results.length,
      droppedRoundsCount,
      overwrite_historical,
      governance_enabled: governanceEnabled,
      held_sessions_skipped: heldSessionIds.size,
      standings: standingsArray
    });

  } catch (error) {
    return Response.json({
      success: false, resolution_status: 'blocked', cleanup_required: false,
      failed_step: 'exception', errors: [{ code: 'exception', message: error.message }],
      warnings: [], context: {}, calculated_rows: [], created_records: { standings_ids: [] },
      updated_records: { standings_ids: [] }, reused_records: { standings_ids: [] },
      records_created_before_failure: { standings_ids: [] },
      records_modified_before_failure: { standings_ids: [] },
      excluded_results: [], review_items: []
    }, { status: 500 });
  }
});