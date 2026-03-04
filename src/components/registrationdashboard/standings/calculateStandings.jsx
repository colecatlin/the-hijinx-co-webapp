/**
 * Standings calculation with idempotent ledger using OperationLog.
 *
 * Key concepts:
 * - standings_applied: ledger record marking when points were applied for a session
 * - driver_deltas: per-driver changes (points, wins, podiums) stored in the ledger
 * - Revert: subtract deltas from Standings records, mark ledger as "reverted"
 * - Recompute: check for prior application, revert if found, then apply fresh
 *
 * Never throws — all errors are caught and logged to console.
 */

const DEFAULT_POINTS_TABLE = {
  1: 25, 2: 20, 3: 16, 4: 13, 5: 11, 6: 10,
  7: 9,  8: 8,  9: 7,  10: 6, 11: 5, 12: 4,
  13: 3, 14: 2, 15: 1,
};

const EXCLUDED_STATUSES = new Set(['DNS', 'DSQ', 'DNP']);

/**
 * Check if standings have already been applied for this session.
 * Returns the ledger record if found, null otherwise.
 */
async function findStandingsAppliedLedger(base44, eventId, sessionId, seriesClassId) {
  const ledgers = await base44.entities.OperationLog.filter({
    operation_type: 'standings_applied',
  }).catch(() => []);

  return ledgers.find(
    (log) =>
      log.metadata?.event_id === eventId &&
      log.metadata?.session_id === sessionId &&
      log.metadata?.series_class_id === seriesClassId &&
      log.status !== 'reverted'
  ) || null;
}

/**
 * Guard: check if standings were already applied for this session.
 * Returns { skipped: true, reason: "already_applied" } if found.
 */
async function guardAgainstDoubleCount(base44, session, event) {
  const ledger = await findStandingsAppliedLedger(
    base44,
    event.id,
    session.id,
    session.series_class_id
  );
  if (ledger) {
    return { skipped: true, reason: 'already_applied', ledger };
  }
  return { skipped: false };
}

/**
 * Load PointsConfig for the series/class/season, fallback to DEFAULT_POINTS_TABLE.
 */
async function loadPointsTable(base44, seriesId, seriesClassId, seasonYear) {
  let pointsTable = { ...DEFAULT_POINTS_TABLE };

  if (seriesId && seriesClassId) {
    const configs = await base44.entities.PointsConfig.filter({
      series_id: seriesId,
      series_class_id: seriesClassId,
      season_year: seasonYear,
    }).catch(() => []);

    if (configs.length > 0) {
      const cfg = configs[0];
      if (cfg.points_json) {
        try { pointsTable = JSON.parse(cfg.points_json); } catch (_) {}
      } else {
        const overrides = {};
        for (let i = 1; i <= 20; i++) {
          const v = cfg[`pos_${i}`];
          if (v !== undefined && v !== null) overrides[i] = Number(v);
        }
        if (Object.keys(overrides).length > 0) pointsTable = overrides;
      }
    }
  }

  return pointsTable;
}

/**
 * Calculate deltas for each driver based on results and points table.
 * Returns { driverPointsMap, driverIds }.
 */
function calculateDriverDeltas(resultsList, pointsTable, seriesClassId) {
  const validResults = resultsList
    .filter((r) => r.driver_id && !EXCLUDED_STATUSES.has(r.status))
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  const driverPointsMap = {};

  validResults.forEach((result) => {
    const pos = Number(result.position) || 0;
    const points = pointsTable[pos] ?? 0;
    const wins = pos === 1 ? 1 : 0;
    const podiums = pos >= 1 && pos <= 3 ? 1 : 0;

    driverPointsMap[result.driver_id] = {
      driver_id: result.driver_id,
      series_class_id: seriesClassId || result.series_class_id,
      points_delta: points,
      wins_delta: wins,
      podiums_delta: podiums,
    };
  });

  return { driverPointsMap, driverIds: Object.keys(driverPointsMap) };
}

/**
 * Apply deltas to Standings records.
 */
async function applyDeltasToStandings(base44, driverPointsMap, seasonYear, seriesId) {
  const upsertOps = Object.entries(driverPointsMap).map(async ([driverId, delta]) => {
    const scId = delta.series_class_id;

    const existing = scId
      ? await base44.entities.Standings.filter({
          driver_id: driverId,
          series_class_id: scId,
          season_year: seasonYear,
        }).catch(() => [])
      : [];

    if (existing.length > 0) {
      const rec = existing[0];
      await base44.entities.Standings.update(rec.id, {
        points_total: Math.max(0, (rec.points_total || 0) + delta.points_delta),
        wins: Math.max(0, (rec.wins || 0) + delta.wins_delta),
        podiums: Math.max(0, (rec.podiums || 0) + delta.podiums_delta),
      });
    } else {
      await base44.entities.Standings.create({
        driver_id: driverId,
        series_class_id: scId || undefined,
        series_id: seriesId || undefined,
        season_year: seasonYear,
        points_total: Math.max(0, delta.points_delta),
        wins: Math.max(0, delta.wins_delta),
        podiums: Math.max(0, delta.podiums_delta),
        rank: null,
      });
    }
  });

  await Promise.all(upsertOps);
}

/**
 * Revert deltas from a ledger entry.
 */
async function revertDeltasFromLedger(base44, ledger, seasonYear) {
  if (!ledger?.metadata?.driver_deltas || !Array.isArray(ledger.metadata.driver_deltas)) {
    return;
  }

  const revertOps = ledger.metadata.driver_deltas.map(async (delta) => {
    const scId = delta.series_class_id;
    const existing = scId
      ? await base44.entities.Standings.filter({
          driver_id: delta.driver_id,
          series_class_id: scId,
          season_year: seasonYear,
        }).catch(() => [])
      : [];

    if (existing.length > 0) {
      const rec = existing[0];
      await base44.entities.Standings.update(rec.id, {
        points_total: Math.max(0, (rec.points_total || 0) - delta.points_delta),
        wins: Math.max(0, (rec.wins || 0) - delta.wins_delta),
        podiums: Math.max(0, (rec.podiums || 0) - delta.podiums_delta),
      });
    }
  });

  await Promise.all(revertOps);
}

/**
 * Recompute rank for a series_class + season.
 */
async function recomputeRank(base44, seriesClassId, seasonYear) {
  const allStandings = await base44.entities.Standings.filter({
    series_class_id: seriesClassId || undefined,
    season_year: seasonYear,
  }).catch(() => []);

  const ranked = [...allStandings].sort((a, b) => {
    const ptsDiff = (b.points_total || 0) - (a.points_total || 0);
    if (ptsDiff !== 0) return ptsDiff;
    return (b.wins || 0) - (a.wins || 0);
  });

  const rankOps = ranked.map((rec, idx) =>
    base44.entities.Standings.update(rec.id, { rank: idx + 1 }).catch(() => {})
  );

  await Promise.all(rankOps);
}

/**
 * @param {object} opts
 * @param {object} opts.session       - Session record (needs series_class_id, id, event_id)
 * @param {object} opts.event         - Event record (needs id, series_id, season)
 * @param {Array}  opts.resultsList   - Results records for this session
 * @param {object} opts.base44        - base44 SDK client
 * @param {function} [opts.onComplete] - Optional callback after completion
 */
export async function calculateStandingsForSession({ session, event, resultsList, base44, onComplete }) {
  try {
    if (!session?.id || !event?.id || !resultsList?.length) return;

    const seriesClassId = session.series_class_id;
    const seasonYear = event.season || String(new Date(event.event_date || Date.now()).getFullYear());
    const seriesId = event.series_id;

    // ── A) Guard: check if already applied ────────────────────────────────
    const guardResult = await guardAgainstDoubleCount(base44, session, event);
    if (guardResult.skipped) {
      console.log('[calculateStandingsForSession] Already applied for this session, skipping');
      if (onComplete) onComplete({ skipped: true, reason: guardResult.reason });
      return;
    }

    // ── B) Load points table ─────────────────────────────────────────────
    const pointsTable = await loadPointsTable(base44, seriesId, seriesClassId, seasonYear);

    // ── C) Calculate deltas ──────────────────────────────────────────────
    const { driverPointsMap, driverIds } = calculateDriverDeltas(resultsList, pointsTable, seriesClassId);

    if (driverIds.length === 0) return;

    // ── D) Apply deltas to Standings ─────────────────────────────────────
    await applyDeltasToStandings(base44, driverPointsMap, seasonYear, seriesId);

    // ── E) Recompute rank ────────────────────────────────────────────────
    await recomputeRank(base44, seriesClassId, seasonYear);

    // ── F) Write standings_applied ledger with deltas ────────────────────
    const driverDeltasForLog = driverIds.map((driverId) => ({
      driver_id: driverId,
      points_delta: driverPointsMap[driverId].points_delta,
      wins_delta: driverPointsMap[driverId].wins_delta,
      podiums_delta: driverPointsMap[driverId].podiums_delta,
      series_class_id: driverPointsMap[driverId].series_class_id,
    }));

    await base44.entities.OperationLog.create({
      operation_type: 'standings_applied',
      status: 'success',
      entity_name: 'Standings',
      event_id: event.id,
      message: `Standings applied from Final session "${session.name}" (${driverIds.length} drivers)`,
      metadata: {
        event_id: event.id,
        session_id: session.id,
        series_class_id: seriesClassId,
        season_year: seasonYear,
        drivers_updated: driverIds.length,
        points_table: pointsTable,
        driver_deltas: driverDeltasForLog,
      },
    }).catch(() => {});

    if (onComplete) onComplete({ driversUpdated: driverIds.length, skipped: false });

  } catch (err) {
    console.error('[calculateStandingsForSession] Failed:', err);
  }
}

/**
 * Recompute standings for a Final session (idempotent).
 * If already applied, reverts prior deltas first, then applies fresh.
 *
 * @param {object} opts
 * @param {object} opts.session       - Session record
 * @param {object} opts.event         - Event record
 * @param {Array}  opts.resultsList   - Current results
 * @param {object} opts.base44        - base44 SDK client
 * @param {function} [opts.onComplete] - Optional callback
 */
export async function recomputeStandingsForFinalSession({ session, event, resultsList, base44, onComplete }) {
  try {
    if (!session?.id || !event?.id || !resultsList) return;

    const seriesClassId = session.series_class_id;
    const seasonYear = event.season || String(new Date(event.event_date || Date.now()).getFullYear());
    const seriesId = event.series_id;

    // ── A) Check if standings were already applied ──────────────────────
    const priorLedger = await findStandingsAppliedLedger(
      base44,
      event.id,
      session.id,
      seriesClassId
    );

    // ── B) Revert prior deltas if they exist ─────────────────────────────
    if (priorLedger) {
      await revertDeltasFromLedger(base44, priorLedger, seasonYear);

      // Mark the old ledger as reverted
      await base44.entities.OperationLog.update(priorLedger.id, {
        status: 'reverted',
        metadata: {
          ...priorLedger.metadata,
          reverted_at: new Date().toISOString(),
        },
      }).catch(() => {});
    }

    // ── C) Load points table ─────────────────────────────────────────────
    const pointsTable = await loadPointsTable(base44, seriesId, seriesClassId, seasonYear);

    // ── D) Calculate fresh deltas ────────────────────────────────────────
    const { driverPointsMap, driverIds } = calculateDriverDeltas(resultsList, pointsTable, seriesClassId);

    if (driverIds.length === 0) {
      if (onComplete) onComplete({ driversUpdated: 0, reverted: !!priorLedger });
      return;
    }

    // ── E) Apply fresh deltas ────────────────────────────────────────────
    await applyDeltasToStandings(base44, driverPointsMap, seasonYear, seriesId);

    // ── F) Recompute rank ────────────────────────────────────────────────
    await recomputeRank(base44, seriesClassId, seasonYear);

    // ── G) Write new standings_applied ledger ───────────────────────────
    const driverDeltasForLog = driverIds.map((driverId) => ({
      driver_id: driverId,
      points_delta: driverPointsMap[driverId].points_delta,
      wins_delta: driverPointsMap[driverId].wins_delta,
      podiums_delta: driverPointsMap[driverId].podiums_delta,
      series_class_id: driverPointsMap[driverId].series_class_id,
    }));

    await base44.entities.OperationLog.create({
      operation_type: 'standings_applied',
      status: 'success',
      entity_name: 'Standings',
      event_id: event.id,
      message: `Standings recomputed from Final session "${session.name}" (${driverIds.length} drivers, reverted prior: ${!!priorLedger})`,
      metadata: {
        event_id: event.id,
        session_id: session.id,
        series_class_id: seriesClassId,
        season_year: seasonYear,
        drivers_updated: driverIds.length,
        points_table: pointsTable,
        driver_deltas: driverDeltasForLog,
        prior_ledger_id: priorLedger?.id || null,
      },
    }).catch(() => {});

    if (onComplete) {
      onComplete({
        driversUpdated: driverIds.length,
        reverted: !!priorLedger,
      });
    }

  } catch (err) {
    console.error('[recomputeStandingsForFinalSession] Failed:', err);
  }
}