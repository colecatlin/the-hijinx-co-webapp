/**
 * announcerPackHelpers.js
 * Pure helpers for the AnnouncerPack visual cheat sheet.
 */

const SESSION_TYPE_ORDER = ['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final'];

/**
 * Format milliseconds lap time → M:SS.mmm
 */
export function fmtLapMs(ms) {
  if (!ms && ms !== 0) return '—';
  const total = Number(ms);
  if (isNaN(total) || total <= 0) return '—';
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

/**
 * Given all results for an event and a list of sessions,
 * returns a map: { [driver_id]: { position, best_lap_time_ms, session_name, session_type } }
 * Prioritizes Final session, then highest session_type_order, then most recent session_order.
 */
export function buildBestResultPerDriver(allResults, sessions) {
  // Build a map of session metadata
  const sessionMeta = {};
  sessions.forEach((s) => {
    sessionMeta[s.id] = s;
  });

  // Score sessions: Final = 100, LCQ = 80, Heat = 60, Qualifying = 40, Practice = 20
  function sessionScore(session) {
    if (!session) return 0;
    const typeIdx = SESSION_TYPE_ORDER.indexOf(session.session_type);
    return (typeIdx + 1) * 20 + (session.session_order ?? 0);
  }

  const bestByDriver = {};

  allResults.forEach((r) => {
    if (!r.driver_id) return;
    const session = sessionMeta[r.session_id];
    const score = sessionScore(session);
    const existing = bestByDriver[r.driver_id];

    if (!existing || score > existing._score) {
      bestByDriver[r.driver_id] = {
        position: r.position ?? null,
        best_lap_time_ms: r.best_lap_time_ms ?? null,
        session_name: session?.name ?? '',
        session_type: session?.session_type ?? '',
        _score: score,
      };
    }
  });

  return bestByDriver;
}

/**
 * Compute recent performance (last 5 results) for a driver
 */
export function getRecentPerformance(driverId, allResults, sessions, seriesId, seasonYear) {
  const sessionMeta = {};
  sessions.forEach((s) => {
    sessionMeta[s.id] = s;
  });

  // Filter results for this driver in selected series/season (if available)
  let driverResults = allResults.filter((r) => r.driver_id === driverId);
  if (seriesId) {
    driverResults = driverResults.filter((r) => r.series_id === seriesId);
  }
  if (seasonYear) {
    driverResults = driverResults.filter((r) => r.season === seasonYear);
  }

  // Sort by created_date descending and take last 5
  driverResults = driverResults.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);

  if (driverResults.length === 0) {
    return { finishes: [], bestFinish: null, avgFinish: null, podiums: 0 };
  }

  const finishes = driverResults.map((r) => r.position).filter((p) => p != null);
  const bestFinish = finishes.length > 0 ? Math.min(...finishes) : null;
  const avgFinish = finishes.length > 0 ? (finishes.reduce((a, b) => a + b, 0) / finishes.length).toFixed(1) : null;
  const podiums = finishes.filter((p) => p <= 3).length;

  return { finishes, bestFinish, avgFinish, podiums };
}

/**
 * Generate CSV string for announcer pack entries.
 */
export function buildAnnouncerCSV(classes, entriesByClass, driverMap, teamMap, standingsMap, bestResultMap, performanceMap = {}) {
  const headers = [
    'Class', 'Car #', 'Driver Name', 'Team', 'Hometown', 'Discipline',
    'Standing Rank', 'Standing Points', 'Best Lap', 'Last Finish', 'Best Finish', 'Avg Finish', 'Podiums'
  ];
  const rows = [headers.join(',')];

  classes.forEach((cls) => {
    const entries = entriesByClass[cls.id] || [];
    entries.forEach((entry) => {
      const driver = driverMap[entry.driver_id];
      const team = teamMap[entry.team_id];
      const standing = standingsMap[entry.driver_id];
      const result = bestResultMap[entry.driver_id];
      const perf = performanceMap[entry.driver_id] || {};
      const row = [
        cls.class_name,
        entry.car_number || '',
        driver ? `${driver.first_name} ${driver.last_name}`.trim() : '',
        team?.name || '',
        driver ? [driver.hometown_city, driver.hometown_state].filter(Boolean).join(', ') : '',
        driver?.primary_discipline || '',
        standing?.rank ?? '',
        standing?.points ?? '',
        fmtLapMs(result?.best_lap_time_ms),
        result?.position ?? '',
        perf.bestFinish ?? '',
        perf.avgFinish ?? '',
        perf.podiums ?? '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
      rows.push(row);
    });
  });

  return rows.join('\n');
}