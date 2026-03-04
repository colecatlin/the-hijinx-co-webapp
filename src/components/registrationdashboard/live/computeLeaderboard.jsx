/**
 * Compute live leaderboard from session results snapshot.
 * 
 * Merges driver, entry, and result data to produce a sortable leaderboard
 * without mutating any source data.
 */

/**
 * @param {object} opts
 * @param {object} opts.session    - Session record
 * @param {Array}  opts.resultsList - Results records
 * @param {Array}  opts.entriesList - Entry records
 * @param {Array}  opts.drivers    - Driver records
 * @param {Array}  opts.teams      - Team records (optional)
 * @returns {Array} Sorted leaderboard rows
 */
export function computeLeaderboard({
  session = {},
  resultsList = [],
  entriesList = [],
  drivers = [],
  teams = [],
}) {
  // Build lookup maps (non-mutating snapshot)
  const driverMap = Object.fromEntries(drivers.map(d => [d.id, d]));
  const entryMap = Object.fromEntries(entriesList.map(e => [e.id, e]));
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));

  // Merge result data with driver/entry/team info
  const leaderboardRows = resultsList.map(result => {
    const driver = driverMap[result.driver_id] || {};
    const entry = result.entry_id ? entryMap[result.entry_id] : null;
    const team = result.team_id ? teamMap[result.team_id] : null;

    return {
      result_id: result.id,
      driver_id: result.driver_id,
      driver_name: `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Unknown',
      car_number: entry?.car_number || result.car_number || '—',
      team_name: team?.name || entry?.team_id || '—',
      laps_completed: result.laps_completed || 0,
      best_lap_time_ms: result.best_lap_time_ms || null,
      position: result.position || null,
      status: result.status || 'Unknown',
      points: result.points || 0,
    };
  });

  // Sort by: laps descending, best_lap_time ascending, car_number ascending
  const sorted = [...leaderboardRows].sort((a, b) => {
    // Primary: laps completed descending
    const lapsDiff = (b.laps_completed || 0) - (a.laps_completed || 0);
    if (lapsDiff !== 0) return lapsDiff;

    // Secondary: best lap time ascending (lower is better)
    const aTime = a.best_lap_time_ms ?? Infinity;
    const bTime = b.best_lap_time_ms ?? Infinity;
    const timeDiff = aTime - bTime;
    if (timeDiff !== 0) return timeDiff;

    // Fallback: car number ascending
    const aNum = parseInt(a.car_number) || 999;
    const bNum = parseInt(b.car_number) || 999;
    return aNum - bNum;
  });

  // Compute gaps and intervals
  const withGaps = sorted.map((row, idx) => {
    const leader = sorted[0];
    const prev = idx > 0 ? sorted[idx - 1] : null;

    let gap = null;
    let interval = null;

    // Gap from leader
    if (idx === 0) {
      gap = '—';
    } else {
      const lapGap = (leader.laps_completed || 0) - (row.laps_completed || 0);
      if (lapGap > 0) {
        gap = `${lapGap}L`;
      } else if (leader.best_lap_time_ms && row.best_lap_time_ms) {
        const timeGap = row.best_lap_time_ms - leader.best_lap_time_ms;
        gap = formatTime(timeGap);
      } else {
        gap = '—';
      }
    }

    // Interval from previous
    if (idx === 0) {
      interval = '—';
    } else if (prev) {
      const lapDiff = (prev.laps_completed || 0) - (row.laps_completed || 0);
      if (lapDiff > 0) {
        interval = `${lapDiff}L`;
      } else if (prev.best_lap_time_ms && row.best_lap_time_ms) {
        const timeDiff = row.best_lap_time_ms - prev.best_lap_time_ms;
        interval = formatTime(timeDiff);
      } else {
        interval = '—';
      }
    }

    return {
      ...row,
      position_computed: idx + 1,
      gap,
      interval,
    };
  });

  return withGaps;
}

/**
 * Format milliseconds as MM:SS.mmm
 */
function formatTime(ms) {
  if (ms == null || ms === Infinity) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(Math.floor(millis / 10)).padStart(2, '0')}`;
}

/**
 * Map result status to display label
 */
export function getStatusLabel(status) {
  const statusMap = {
    'Running': 'Running',
    'DNF': 'DNF',
    'DNS': 'DNS',
    'DSQ': 'DSQ',
    'Pit': 'Pit',
  };
  return statusMap[status] || 'Unknown';
}

/**
 * Map result status to badge color
 */
export function getStatusColor(status) {
  switch (status) {
    case 'Running': return 'bg-green-500/20 text-green-400';
    case 'DNF': return 'bg-orange-500/20 text-orange-400';
    case 'DSQ': return 'bg-red-500/20 text-red-400';
    case 'DNS': return 'bg-red-500/20 text-red-400';
    case 'Pit': return 'bg-yellow-500/20 text-yellow-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}