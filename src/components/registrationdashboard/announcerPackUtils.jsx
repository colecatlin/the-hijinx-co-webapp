/**
 * Announcer Pack Utilities
 * Helper functions for generating announcer briefings and storylines.
 */

export function formatDriverName(driver) {
  if (!driver) return 'Unknown';
  return `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
}

export function formatDateTime(value) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    return date.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return value;
  }
}

export function buildClassOptionsFromSessions(sessions, seriesClasses) {
  const classMap = {};
  const classIds = new Set();

  seriesClasses.forEach((sc) => {
    classMap[sc.id] = sc.class_name;
  });

  sessions.forEach((s) => {
    if (s.series_class_id) {
      classIds.add(s.series_class_id);
    } else if (s.class_name) {
      classIds.add(s.class_name);
    }
  });

  return Array.from(classIds).map((id) => ({
    id,
    name: classMap[id] || id,
  }));
}

export function computeStorylines({ drivers, results, sessions, track, driverMap, classMap }) {
  const lines = [];

  if (!results || results.length === 0) return lines;

  // 1. Consistency watch - drivers with most finishes in multiple sessions
  const driverSessionFinishes = {};
  results.forEach((r) => {
    if (r.driver_id) {
      if (!driverSessionFinishes[r.driver_id]) driverSessionFinishes[r.driver_id] = new Set();
      driverSessionFinishes[r.driver_id].add(r.session_id);
    }
  });

  const consistencyDriver = Object.entries(driverSessionFinishes)
    .sort((a, b) => b[1].size - a[1].size)[0];
  if (consistencyDriver && driverMap[consistencyDriver[0]]) {
    const driver = driverMap[consistencyDriver[0]];
    lines.push(`Consistency Watch: ${formatDriverName(driver)} — raced in ${consistencyDriver[1].size} sessions`);
  }

  // 2. First timer - drivers with Novice status
  const noviceDrivers = Object.values(driverMap).filter((d) => d.career_status === 'Novice');
  if (noviceDrivers.length > 0) {
    lines.push(`First Timers: ${noviceDrivers.length} novice drivers competing`);
  }

  // 3. Manufacturer battle - count by manufacturer in results
  const manufacturerCounts = {};
  results.forEach((r) => {
    const driver = driverMap[r.driver_id];
    if (driver && driver.manufacturer) {
      manufacturerCounts[driver.manufacturer] = (manufacturerCounts[driver.manufacturer] || 0) + 1;
    }
  });

  const topMfg = Object.entries(manufacturerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  if (topMfg.length > 0) {
    lines.push(`Manufacturer Battle: ${topMfg.map((m) => `${m[0]} (${m[1]})`).join(' vs ')}`);
  }

  // 4. Local hero - drivers from track location
  if (track && track.state) {
    const localDrivers = Object.values(driverMap).filter(
      (d) => d.hometown_state === track.state || d.racing_base_state === track.state
    );
    if (localDrivers.length > 0) {
      lines.push(`Local Heroes: ${localDrivers.length} drivers racing at home`);
    }
  }

  // 5. Comeback - driver with DNF then top 5 finish
  const driverResults = {};
  results.forEach((r) => {
    if (r.driver_id) {
      if (!driverResults[r.driver_id]) driverResults[r.driver_id] = [];
      driverResults[r.driver_id].push(r);
    }
  });

  Object.entries(driverResults).forEach(([driverId, driverRes]) => {
    driverRes.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    for (let i = 0; i < driverRes.length - 1; i++) {
      const isDNF = driverRes[i].dnf || driverRes[i].position === null || driverRes[i].position > 50;
      const isTopFive = driverRes[i + 1].position && driverRes[i + 1].position <= 5;
      if (isDNF && isTopFive) {
        const driver = driverMap[driverId];
        if (driver) {
          lines.push(`Comeback Kid: ${formatDriverName(driver)} bounced back after early troubles`);
        }
        break;
      }
    }
  });

  // 6. Win streak
  const driverWins = {};
  results.forEach((r) => {
    if (r.driver_id && r.position === 1) {
      driverWins[r.driver_id] = (driverWins[r.driver_id] || 0) + 1;
    }
  });

  const topWinner = Object.entries(driverWins)
    .sort((a, b) => b[1] - a[1])[0];
  if (topWinner) {
    const driver = driverMap[topWinner[0]];
    if (driver) {
      lines.push(`Victory Lane: ${formatDriverName(driver)} — ${topWinner[1]} wins`);
    }
  }

  return lines;
}

export function buildAnnouncerPackText({
  selectedEvent,
  selectedTrack,
  selectedSession,
  classFilter,
  drivers,
  topResults,
  gridDrivers,
  storylines,
}) {
  const lines = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('ANNOUNCER PACK');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Event snapshot
  lines.push('EVENT SNAPSHOT');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`Event: ${selectedEvent?.name || 'TBD'}`);
  lines.push(`Track: ${selectedTrack?.name || 'TBD'}`);
  if (selectedEvent?.event_date) {
    lines.push(`Date: ${new Date(selectedEvent.event_date).toLocaleDateString()}`);
  }
  lines.push(`Status: ${selectedEvent?.status || 'upcoming'}`);
  lines.push('');

  // Session snapshot
  if (selectedSession) {
    lines.push('SESSION SNAPSHOT');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push(`Session: ${selectedSession.name}`);
    lines.push(`Type: ${selectedSession.session_type}`);
    if (selectedSession.scheduled_time) {
      lines.push(`Scheduled: ${formatDateTime(selectedSession.scheduled_time)}`);
    }
    lines.push(`Status: ${selectedSession.status || 'Draft'}${selectedSession.locked ? ' (LOCKED)' : ''}`);
    lines.push('');
  }

  // Top 3 preview
  if (topResults && topResults.length > 0) {
    lines.push('TOP 3 PREVIEW');
    lines.push('───────────────────────────────────────────────────────────────');
    topResults.slice(0, 3).forEach((r, idx) => {
      const driver = drivers[r.driver_id];
      const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
      const carNum = r.car_number || driver?.primary_number || '—';
      lines.push(`${idx + 1}. ${driverName} #${carNum}`);
    });
    lines.push('');
  }

  // Starting grid
  if (gridDrivers && gridDrivers.length > 0) {
    lines.push('STARTING GRID');
    lines.push('───────────────────────────────────────────────────────────────');
    gridDrivers.slice(0, 15).forEach((item, idx) => {
      const driver = drivers[item.driver_id];
      const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
      const carNum = item.car_number || driver?.primary_number || '—';
      const team = item.team_name || '—';
      lines.push(`${String(idx + 1).padEnd(2)} | #${String(carNum).padEnd(3)} | ${driverName.padEnd(25)} | ${team}`);
    });
    lines.push('');
  }

  // Storylines
  if (storylines && storylines.length > 0) {
    lines.push('STORYLINES');
    lines.push('───────────────────────────────────────────────────────────────');
    storylines.forEach((line) => {
      lines.push(`• ${line}`);
    });
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`Generated: ${new Date().toLocaleString()}`);

  return lines.join('\n');
}