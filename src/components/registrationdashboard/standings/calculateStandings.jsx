/**
 * calculateStandingsForSession
 *
 * Called automatically when a Final session transitions to Official.
 * Calculates points, upserts Standings records, recomputes rank,
 * and writes an OperationLog entry.
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
 * @param {object} opts
 * @param {object} opts.session       - Session record (needs series_class_id, id)
 * @param {object} opts.event         - Event record (needs id, series_id, season)
 * @param {Array}  opts.resultsList   - Results records for this session
 * @param {object} opts.base44        - base44 SDK client
 * @param {function} [opts.onComplete] - Optional callback after completion
 */
export async function calculateStandingsForSession({ session, event, resultsList, base44, onComplete }) {
  try {
    if (!session?.id || !event?.id || !resultsList?.length) return;

    const seriesClassId = session.series_class_id;
    const seasonYear    = event.season || String(new Date(event.event_date || Date.now()).getFullYear());
    const seriesId      = event.series_id;

    // ── A) Load PointsConfig ─────────────────────────────────────────────────
    let pointsTable = { ...DEFAULT_POINTS_TABLE };

    if (seriesId && seriesClassId) {
      const configs = await base44.entities.PointsConfig.filter({
        series_id: seriesId,
        series_class_id: seriesClassId,
        season_year: seasonYear,
      }).catch(() => []);

      if (configs.length > 0) {
        const cfg = configs[0];
        // PointsConfig stores points as individual position fields: pos_1, pos_2 … pos_15
        // OR as a JSON string in a `points_json` field.
        // Try JSON first, then positional fields.
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

    // ── B) Sort results by position, exclude DNS/DSQ/DNP ───────────────────
    const validResults = resultsList
      .filter(r => r.driver_id && !EXCLUDED_STATUSES.has(r.status))
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

    if (validResults.length === 0) return;

    // ── C) Build driverPointsMap ────────────────────────────────────────────
    const driverPointsMap = {};

    validResults.forEach(result => {
      const pos    = Number(result.position) || 0;
      const points = pointsTable[pos] ?? 0;
      const wins   = pos === 1 ? 1 : 0;
      const podiums = pos >= 1 && pos <= 3 ? 1 : 0;

      driverPointsMap[result.driver_id] = {
        driver_id:              result.driver_id,
        series_class_id:        seriesClassId || result.series_class_id,
        season_year:            seasonYear,
        points_total_increment: points,
        wins_increment:         wins,
        podiums_increment:      podiums,
      };
    });

    const driverIds = Object.keys(driverPointsMap);
    if (!driverIds.length) return;

    // ── D) Upsert each driver's Standings record ────────────────────────────
    const upsertOps = driverIds.map(async driverId => {
      const inc = driverPointsMap[driverId];
      const scId = inc.series_class_id;

      const existing = scId
        ? await base44.entities.Standings.filter({
            driver_id:       driverId,
            series_class_id: scId,
            season_year:     seasonYear,
          }).catch(() => [])
        : [];

      if (existing.length > 0) {
        const rec = existing[0];
        await base44.entities.Standings.update(rec.id, {
          points_total: (rec.points_total || 0) + inc.points_total_increment,
          wins:         (rec.wins || 0)         + inc.wins_increment,
          podiums:      (rec.podiums || 0)       + inc.podiums_increment,
        });
      } else {
        await base44.entities.Standings.create({
          driver_id:       driverId,
          series_class_id: scId || undefined,
          series_id:       seriesId || undefined,
          season_year:     seasonYear,
          points_total:    inc.points_total_increment,
          wins:            inc.wins_increment,
          podiums:         inc.podiums_increment,
          rank:            null,
        });
      }
    });

    await Promise.all(upsertOps);

    // ── E) Recompute rank for this series_class + season ───────────────────
    const allStandings = await base44.entities.Standings.filter({
      series_class_id: seriesClassId || undefined,
      season_year:     seasonYear,
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

    // ── F) Write OperationLog ───────────────────────────────────────────────
    await base44.entities.OperationLog.create({
      operation_type: 'standings_recalculated',
      status:         'success',
      entity_name:    'Standings',
      event_id:       event.id,
      message:        `Standings auto-calculated from Final session "${session.name}" (${driverIds.length} drivers updated)`,
      metadata: {
        event_id:        event.id,
        session_id:      session.id,
        series_class_id: seriesClassId,
        season_year:     seasonYear,
        drivers_updated: driverIds.length,
        points_table:    pointsTable,
      },
    }).catch(() => {});

    if (onComplete) onComplete({ driversUpdated: driverIds.length });

  } catch (err) {
    console.error('[calculateStandingsForSession] Failed:', err);
    // Non-blocking — do not rethrow
  }
}