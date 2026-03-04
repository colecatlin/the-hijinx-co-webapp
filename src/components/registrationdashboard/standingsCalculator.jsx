/**
 * Standings Calculator
 * Calculate standings from results using points config
 */

/**
 * Calculate standings from results
 * @param {Object} params
 * @param {Array} params.results - Result records
 * @param {Array} params.sessions - Session records
 * @param {Array} params.drivers - Driver records
 * @param {Array} params.pointsConfig - Points configuration
 * @param {string} params.season - Season year
 * @param {string} params.seriesId - Series ID
 * @returns {Object} Standings with calculated ranks
 */
export function calculateStandings({
  results = [],
  sessions = [],
  drivers = [],
  pointsConfig = [],
  season = '',
  seriesId = '',
}) {
  // Filter sessions that count (Finals by default)
  const countingSessions = sessions.filter((s) => s.session_type === 'Final');
  const countingSessionIds = new Set(countingSessions.map((s) => s.id));

  // Filter results from counting sessions only
  const countingResults = results.filter(
    (r) => !r.session_id || countingSessionIds.has(r.session_id)
  );

  // Build points lookup: position -> points
  const pointsMap = new Map();
  pointsConfig.forEach((config) => {
    if (config.position !== null && config.position !== undefined) {
      pointsMap.set(config.position, config.points || 0);
    }
  });

  // Driver lookup
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  // Group by class and driver
  const standingsMap = new Map();

  countingResults.forEach((result) => {
    const classId = result.series_class_id;
    const driverId = result.driver_id;

    if (!classId || !driverId) return;

    const key = `${classId}:${driverId}`;

    if (!standingsMap.has(key)) {
      standingsMap.set(key, {
        series_id: seriesId,
        season,
        series_class_id: classId,
        driver_id: driverId,
        total_points: 0,
        wins: 0,
        podiums: 0,
        top5: 0,
        top10: 0,
        starts: 0,
        dnf_count: 0,
      });
    }

    const standing = standingsMap.get(key);

    // Award points
    const position = result.position;
    const points = pointsMap.has(position) ? pointsMap.get(position) : 0;
    standing.total_points += points;

    // Count starts
    standing.starts += 1;

    // Count wins
    if (position === 1) {
      standing.wins += 1;
    }

    // Count podiums
    if (position <= 3) {
      standing.podiums += 1;
    }

    // Count top5
    if (position <= 5) {
      standing.top5 += 1;
    }

    // Count top10
    if (position <= 10) {
      standing.top10 += 1;
    }

    // Count DNF
    if (result.status === 'DNF') {
      standing.dnf_count += 1;
    }
  });

  // Convert to array and rank by class
  const standingsArray = Array.from(standingsMap.values());

  // Group by class and rank within each class
  const standingsByClass = new Map();
  standingsArray.forEach((s) => {
    const classKey = s.series_class_id;
    if (!standingsByClass.has(classKey)) {
      standingsByClass.set(classKey, []);
    }
    standingsByClass.get(classKey).push(s);
  });

  // Rank within each class
  const finalStandings = [];
  standingsByClass.forEach((classStandings) => {
    classStandings.sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points;
      }
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      return b.podiums - a.podiums;
    });

    classStandings.forEach((s, idx) => {
      s.rank = idx + 1;
      finalStandings.push(s);
    });
  });

  return { standings: finalStandings };
}