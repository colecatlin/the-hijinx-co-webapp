/**
 * R9BS Sprint 4 — Patched to skip sessions with standings_hold === true.
 * Held sessions are excluded from the results aggregation.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Inlined from standingsTieBreakers.js — local imports are not supported in Deno functions
function sortStandingsWithTieBreakers(rows, tieBreakerOrder) {
  const order = Array.isArray(tieBreakerOrder) && tieBreakerOrder.length
    ? tieBreakerOrder
    : ["wins", "seconds", "thirds", "best_finishes", "latest_finish"];

  const safeNum = (v) => (typeof v === "number" ? v : 0);
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
      const av = typeof a.latest_finish === "number" ? a.latest_finish : 9999;
      const bv = typeof b.latest_finish === "number" ? b.latest_finish : 9999;
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
    const an = `${a.last_name || ""}${a.first_name || ""}`.toLowerCase();
    const bn = `${b.last_name || ""}${b.first_name || ""}`.toLowerCase();
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });

  return sorted.map((r, idx) => ({ ...r, rank: idx + 1 }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { series_id, season, series_class_id, event_id, overwrite_historical = false } = await req.json();

    if (!series_id) {
      return Response.json({ ok: false, error: 'Missing series_id' }, { status: 400 });
    }

    // R9BX: Determine if Governance module is enabled for this series.
    // If enabled_modules is missing, default to governance ON (backward compat).
    let governanceEnabled = true;
    try {
      const seriesList = await base44.asServiceRole.entities.Series.filter({ id: series_id });
      const seriesRecord = seriesList?.[0];
      if (seriesRecord && Array.isArray(seriesRecord.enabled_modules)) {
        governanceEnabled = seriesRecord.enabled_modules.includes('governance');
      }
      // If enabled_modules is missing/null → default true (no behavior change)
    } catch (_) { /* non-blocking — default to governance enabled */ }

    // Resolve the correct PointsConfig
    const configRes = await base44.functions.invoke('resolvePointsConfig', {
      series_id,
      series_class_id,
      season,
      event_id
    });

    const pointsConfig = configRes.data?.pointsConfig;
    if (!pointsConfig) {
      const errMsg = configRes.data?.error || 'No PointsConfig found for this series/season/class';
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'standings_recalculated',
        status: 'failed',
        error_message: errMsg,
        entity_type: 'Standings',
        details: { series_id, season, series_class_id, event_id, reason: 'no_points_config_found' }
      });
      return Response.json({ ok: false, error: errMsg }, { status: 404 });
    }

    // Load all events for this series and season
    const events = await base44.asServiceRole.entities.Event.filter({
      series_id,
      season
    });

    if (events.length === 0) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'standings_recalculated',
        status: 'success',
        entity_type: 'Standings',
        details: { series_id, season, series_class_id, standingsCount: 0 }
      });
      return Response.json({ ok: true, standingsCount: 0, message: 'No events found for this series/season' });
    }

    const eventIds = events.map(e => e.id);
    const eventMap = {};
    events.forEach(e => { eventMap[e.id] = e; });

    // R9BX: Load sessions to identify held ones.
    // standings_hold is only respected when the Governance module is enabled.
    // When Governance is disabled, heldSessionIds stays empty — all sessions count.
    let heldSessionIds = new Set();
    if (governanceEnabled) {
      try {
        for (const evtId of eventIds) {
          const evtSessions = await base44.asServiceRole.entities.Session.filter({ event_id: evtId });
          for (const s of evtSessions) {
            if (s.standings_hold === true) {
              heldSessionIds.add(s.id);
              console.log(`[recalculateStandings] Skipping held session: ${s.id} (${s.name})`);
            }
          }
        }
      } catch (_) { /* non-blocking */ }
    } else {
      console.log('[recalculateStandings] Governance disabled — standings_hold ignored, all sessions counted');
    }

    // Load all results for these events
    let allResults = [];
    for (const eventId of eventIds) {
      const results = await base44.asServiceRole.entities.Results.filter({
        event_id: eventId,
        series_id
      });
      allResults = allResults.concat(results);
    }

    // R9DC Phase 3: Default includes Feature (mapped to Final in Results) so Feature sessions score.
    // Callers can override via pointsConfig.applies_to_session_types.
    const applicableSessionTypes = pointsConfig.applies_to_session_types || ['Final', 'Feature'];
    const filteredResults = allResults.filter(r => {
      if (!r.position || r.position <= 0) return false;
      if (series_class_id && r.series_class_id !== series_class_id) return false;
      if (r.session_id && heldSessionIds.has(r.session_id)) return false; // skip held sessions
      return applicableSessionTypes.includes(r.session_type);
    });

    // Build per-driver raw event results for drop rounds
    const driverEvents = {};
    for (const result of filteredResults) {
      const driverId = result.driver_id;
      if (!driverId) continue;
      if (!driverEvents[driverId]) driverEvents[driverId] = [];
      driverEvents[driverId].push({
        event_id: result.event_id,
        event_date: eventMap[result.event_id]?.event_date,
        position: result.position,
        points: pointsConfig.points_by_position[result.position - 1] || 0
      });
    }

    // Apply drop rounds
    const dropRoundsEnabled = pointsConfig.drop_rounds?.enabled && pointsConfig.drop_rounds?.count > 0;
    const dropCount = dropRoundsEnabled ? pointsConfig.drop_rounds.count : 0;
    let droppedRoundsCount = 0;

    if (dropRoundsEnabled) {
      for (const driverId in driverEvents) {
        const events = driverEvents[driverId];
        if (events.length > dropCount) {
          events.sort((a, b) => a.points - b.points);
          const toDropCount = Math.min(dropCount, events.length);
          driverEvents[driverId] = events.slice(toDropCount);
          droppedRoundsCount = toDropCount;
        }
      }
    }

    // Aggregate points per driver with tie-breaker stats
    const driverStandings = {};

    for (const driverId in driverEvents) {
      const events = driverEvents[driverId];
      if (events.length === 0) continue;

      let total = 0;
      let wins = 0;
      let seconds = 0;
      let thirds = 0;
      const finishes = [];
      let latestFinish = null;

      for (let i = 0; i < events.length; i++) {
        const evt = events[i];
        total += evt.points;

        if (evt.position === 1) wins++;
        else if (evt.position === 2) seconds++;
        else if (evt.position === 3) thirds++;

        finishes.push(evt.position);
        latestFinish = evt.position;
      }

      finishes.sort((a, b) => a - b);

      driverStandings[driverId] = {
        driver_id: driverId,
        series_id,
        season_year: season,
        series_class_id: series_class_id || null,
        points_total: total,
        rank: 0,
        wins,
        seconds,
        thirds,
        best_finishes: finishes,
        starts: events.length,
        latest_finish: latestFinish,
        rounds_counted: events.length,
        points_breakdown: events.map(e => ({
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
        top10: finishes.filter(f => f <= 10).length
      };
    }

    // Load drivers for name fields
    let allDrivers = [];
    try {
      allDrivers = await base44.asServiceRole.entities.Driver.list();
    } catch (err) {
      console.log('Could not load drivers:', err.message);
    }
    const driverMap = {};
    allDrivers.forEach(d => { driverMap[d.id] = d; });

    // Apply tie-breaker sorting
    let standingsArray = Object.values(driverStandings);
    standingsArray = standingsArray.map(s => ({
      ...s,
      first_name: driverMap[s.driver_id]?.first_name || '',
      last_name: driverMap[s.driver_id]?.last_name || ''
    }));

    standingsArray = sortStandingsWithTieBreakers(standingsArray, pointsConfig.tie_breaker_order);

    // Write standings records if entity exists
    // existingStandings hoisted for AuditLog before_data capture
    let existingStandings = [];
    try {
      existingStandings = await base44.asServiceRole.entities.Standings.filter({
        series_id,
        season_year: season
      });

      // R9EA Phase 6: Protect historical/manual standings from computed overwrite.
      // Only delete standings that were computed by RaceCore or have no source.
      // Historical/manual standings survive unless overwrite_historical=true is explicitly passed.
      const PROTECTED_SOURCES = new Set(['historical_import', 'manual', 'partial']);
      const PROTECTED_STATUSES = new Set(['historical_verified', 'manual', 'partial', 'under_review']);
      let historicalPreserved = 0;

      for (const standing of existingStandings || []) {
        if (!series_class_id || standing.series_class_id === series_class_id) {
          const isHistorical = PROTECTED_SOURCES.has(standing.calculation_source) || PROTECTED_STATUSES.has(standing.record_status);
          if (isHistorical && !overwrite_historical) {
            historicalPreserved++;
            console.log(`[recalculateStandings] Preserving historical standing ${standing.id} (source=${standing.calculation_source}, status=${standing.record_status})`);
            continue;
          }
          await base44.asServiceRole.entities.Standings.delete(standing.id);
        }
      }
      if (historicalPreserved > 0) {
        console.log(`[recalculateStandings] Preserved ${historicalPreserved} historical/manual standings — pass overwrite_historical=true to replace them`);

      }

      // Create new standings
      for (const standing of standingsArray) {
        const { first_name, last_name, ...data } = standing;
        await base44.asServiceRole.entities.Standings.create(data);
      }
    } catch (err) {
      console.log('Standings entity not available or error:', err.message);
    }

    // Log operation
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'standings_recalculated',
      status: 'success',
      entity_type: 'Standings',
      details: {
        series_id,
        season,
        series_class_id,
        event_id,
        points_config_id: pointsConfig.id,
        standingsCount: standingsArray.length,
        resultsProcessed: filteredResults.length,
        dropped_rounds_count: droppedRoundsCount,
        // R9BX: track skipped held sessions (only populated when governance enabled)
        governance_enabled: governanceEnabled,
        held_sessions_skipped: heldSessionIds.size,
        held_session_ids: [...heldSessionIds],
      }
    });

    // P1-2: Complete AuditLog attribution — before_data captures prior standings snapshot
    try {
      const base44SR = base44.asServiceRole;
      // Capture before state: count of prior standings for this series/season/class
      const priorCount = existingStandings
        ? existingStandings.filter(s => !series_class_id || s.series_class_id === series_class_id).length
        : 0;
      await base44SR.entities.AuditLog.create({
        entity_type: 'Standings',
        entity_id: series_id,
        entity_name: `Standings recalculation — ${series_id} ${season}`,
        action: 'updated',
        performed_by: user.id,
        performed_by_name: user.full_name || user.email || user.id,
        timestamp: new Date().toISOString(),
        before_data: {
          series_id, season, series_class_id,
          prior_standings_count: priorCount,
        },
        after_data: {
          series_id, season, series_class_id,
          standings_count: standingsArray.length,
          results_processed: filteredResults.length,
          dropped_rounds: droppedRoundsCount,
        },
        event_id: event_id || null,
        notes: `recalculateStandings — ${standingsArray.length} standings written, ${priorCount} prior deleted`,
      });
    } catch (_) {}

    return Response.json({
      ok: true,
      pointsConfig,
      standingsCount: standingsArray.length,
      resultsProcessed: filteredResults.length,
      droppedRoundsCount,
      overwrite_historical,
      standings: standingsArray
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});