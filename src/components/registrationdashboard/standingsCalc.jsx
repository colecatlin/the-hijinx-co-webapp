/**
 * Client-side standings calculation utility.
 * Pure functions — no side effects.
 */

export const DEFAULT_POINTS_TABLE = {
  1: 50, 2: 45, 3: 42, 4: 40, 5: 38, 6: 36, 7: 34, 8: 32, 9: 30, 10: 28,
  11: 26, 12: 24, 13: 22, 14: 20, 15: 18, 16: 16, 17: 14, 18: 12, 19: 10, 20: 8,
};
export const DEFAULT_DNF_POINTS = 2;
export const DEFAULT_DNS_POINTS = 0;
export const DEFAULT_DSQ_POINTS = 0;
export const DEFAULT_21PLUS_POINTS = 5;

/**
 * Build a points-lookup map from an editable table array [{position, points}, ...]
 */
export function buildPointsMap(table) {
  const map = { ...DEFAULT_POINTS_TABLE };
  if (Array.isArray(table)) {
    table.forEach(({ position, points }) => {
      if (position != null) map[position] = points ?? 0;
    });
  }
  return map;
}

/**
 * Get points for a result row.
 */
export function getResultPoints(result, pointsMap) {
  const s = (result.status || 'Running').toUpperCase();
  if (s === 'DNF') return DEFAULT_DNF_POINTS;
  if (s === 'DNS') return DEFAULT_DNS_POINTS;
  if (s === 'DSQ') return DEFAULT_DSQ_POINTS;
  const pos = parseInt(result.position);
  if (!pos || pos < 1) return 0;
  if (pointsMap[pos] != null) return pointsMap[pos];
  return DEFAULT_21PLUS_POINTS;
}

/**
 * Calculate standings from arrays of results and sessions.
 *
 * @param {object[]} results      - Results rows
 * @param {object[]} sessions     - Sessions (used to validate eligibility)
 * @param {object[]} drivers      - Driver records
 * @param {string}   classId      - series_class_id to filter, or '' for all
 * @param {object}   opts
 * @param {boolean}  opts.includeNonFinals   default false
 * @param {boolean}  opts.includeProvisional default false
 * @param {number[]} opts.pointsTable        array [{position, points}]
 * @returns {object[]} sorted standings rows
 */
export function calculateStandings(results, sessions, drivers, classId, opts = {}) {
  const {
    includeNonFinals = false,
    includeProvisional = false,
    pointsTableRows = [],
  } = opts;

  const pointsMap = buildPointsMap(pointsTableRows);

  // Build session eligibility set
  const eligibleStatuses = new Set(['Official', 'Locked']);
  if (includeProvisional) eligibleStatuses.add('Provisional');
  const eligibleSessionIds = new Set(
    sessions
      .filter((s) => {
        if (!eligibleStatuses.has(s.status)) return false;
        if (!includeNonFinals && s.session_type !== 'Final') return false;
        return true;
      })
      .map((s) => s.id)
  );

  // Filter results
  const eligible = results.filter((r) => {
    if (!eligibleSessionIds.has(r.session_id)) return false;
    if (classId && r.series_class_id !== classId) return false;
    return true;
  });

  // Aggregate by driver
  const byDriver = {};
  eligible.forEach((r) => {
    const dId = r.driver_id;
    if (!dId) return;
    if (!byDriver[dId]) {
      byDriver[dId] = {
        driver_id: dId,
        total_points: 0,
        events_counted: 0,
        wins: 0,
        podiums: 0,
        top5s: 0,
        finishes: [], // [{position, session_date}]
        round_points: {},
      };
    }
    const pts = getResultPoints(r, pointsMap);
    const agg = byDriver[dId];
    agg.total_points += pts;
    agg.events_counted += 1;
    const pos = parseInt(r.position);
    if (!isNaN(pos) && pos >= 1) {
      if (pos === 1) agg.wins += 1;
      if (pos <= 3) agg.podiums += 1;
      if (pos <= 5) agg.top5s += 1;
      agg.finishes.push({ position: pos, session_id: r.session_id });
    }
    if (r.session_id) {
      agg.round_points[r.session_id] = (agg.round_points[r.session_id] || 0) + pts;
    }
  });

  const driversMap = Object.fromEntries(drivers.map((d) => [d.id, d]));

  // Sort and rank
  const rows = Object.values(byDriver).sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.podiums !== a.podiums) return b.podiums - a.podiums;
    if (b.top5s !== a.top5s) return b.top5s - a.top5s;
    // Best last finish
    const lastA = a.finishes[a.finishes.length - 1]?.position ?? 999;
    const lastB = b.finishes[b.finishes.length - 1]?.position ?? 999;
    return lastA - lastB;
  });

  return rows.map((row, idx) => {
    const driver = driversMap[row.driver_id];
    return {
      rank: idx + 1,
      driver_id: row.driver_id,
      driver_name: driver ? `${driver.first_name} ${driver.last_name}` : row.driver_id,
      car_number: driver?.primary_number || '',
      total_points: row.total_points,
      events_counted: row.events_counted,
      wins: row.wins,
      podiums: row.podiums,
      top5s: row.top5s,
      round_points: row.round_points,
      tie_breaker_note: row.wins > 0 ? `${row.wins}W/${row.podiums}P` : row.podiums > 0 ? `${row.podiums}P` : '',
    };
  });
}