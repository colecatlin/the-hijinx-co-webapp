// Entries by Class
export function generateEntriesExport(
  eventId,
  className,
  entries,
  driverPrograms,
  drivers,
  events,
  seriesClasses
) {
  const event = events.find((e) => e.id === eventId);
  const data = [];

  if (entries.length > 0) {
    const filtered = entries.filter((e) => {
      if (e.event_id !== eventId) return false;
      if (className && e.class_name !== className) return false;
      return true;
    });

    filtered.forEach((entry) => {
      const driver = drivers.find((d) => d.id === entry.driver_id);
      data.push({
        event_id: entry.event_id,
        event_name: event?.name || '',
        event_date: event?.event_date || '',
        class_name: entry.class_name || '',
        car_number: entry.car_number || '',
        driver_id: entry.driver_id,
        driver_first_name: driver?.first_name || '',
        driver_last_name: driver?.last_name || '',
        team_id: entry.team_id || '',
        participation_status: entry.entry_status || '',
        notes: entry.notes || '',
      });
    });
  } else {
    const filtered = driverPrograms.filter((dp) => {
      const dpEvent = events.find((e) =>
        dp.car_number && e.id === eventId
      );
      if (!dpEvent) return false;
      if (className && dp.class_name !== className) return false;
      return true;
    });

    filtered.forEach((dp) => {
      const driver = drivers.find((d) => d.id === dp.driver_id);
      data.push({
        event_id: eventId,
        event_name: event?.name || '',
        event_date: event?.event_date || '',
        class_name: dp.class_name || '',
        car_number: dp.car_number || '',
        driver_id: dp.driver_id,
        driver_first_name: driver?.first_name || '',
        driver_last_name: driver?.last_name || '',
        team_id: dp.team_id || '',
        participation_status: 'Registered',
        notes: '',
      });
    });
  }

  return data.length > 0 ? data : [];
}

// Session Results
export function generateSessionResultsExport(
  eventId,
  sessionId,
  results,
  drivers,
  events,
  sessions,
  seriesClasses
) {
  const event = events.find((e) => e.id === eventId);
  const session = sessions.find((s) => s.id === sessionId);

  const filtered = results.filter((r) => {
    if (r.event_id !== eventId) return false;
    if (r.session_id !== sessionId) return false;
    return true;
  });

  return filtered.map((result) => {
    const driver = drivers.find((d) => d.id === result.driver_id);
    return {
      event_id: result.event_id,
      event_name: event?.name || '',
      session_id: result.session_id,
      session_type: session?.session_type || result.session_type || '',
      class_name: result.series_class_id || '',
      driver_id: result.driver_id,
      driver_first_name: driver?.first_name || '',
      driver_last_name: driver?.last_name || '',
      car_number: '', // Not available in Results entity
      position: result.position || '',
      status: result.status || '',
      laps_completed: result.laps_completed || '',
      best_lap_time: result.best_lap_time_ms || '',
      points: result.points || '',
      notes: result.notes || '',
    };
  });
}

// Full Weekend Summary
export function generateWeekendSummaryExport(
  eventId,
  entries,
  driverPrograms,
  sessions,
  results,
  drivers,
  events,
  seriesClasses
) {
  const event = events.find((e) => e.id === eventId);
  const eventSessions = sessions.filter((s) => s.event_id === eventId);
  const eventResults = results.filter((r) => r.event_id === eventId);

  const data = [];

  // Event info
  data.push({
    event_id: 'EVENT_SUMMARY',
    event_name: event?.name || '',
    event_date: event?.event_date || '',
    class_name: 'Event Information',
    car_number: '',
    driver_id: '',
    driver_first_name: '',
    driver_last_name: '',
    team_id: '',
    participation_status: '',
    notes: `Date: ${event?.event_date}, Track: ${event?.series_name || ''}`,
  });

  // Entry counts by class
  const entriesByClass = {};
  if (entries.length > 0) {
    entries.forEach((e) => {
      if (e.event_id === eventId) {
        entriesByClass[e.class_name] = (entriesByClass[e.class_name] || 0) + 1;
      }
    });
  } else {
    driverPrograms.forEach((dp) => {
      entriesByClass[dp.class_name] = (entriesByClass[dp.class_name] || 0) + 1;
    });
  }

  data.push({
    event_id: 'ENTRIES_SUMMARY',
    event_name: '',
    event_date: '',
    class_name: 'Entry Counts',
    car_number: '',
    driver_id: '',
    driver_first_name: '',
    driver_last_name: '',
    team_id: '',
    participation_status: '',
    notes: Object.entries(entriesByClass)
      .map(([cls, count]) => `${cls}: ${count}`)
      .join('; '),
  });

  // Sessions list
  eventSessions.forEach((session) => {
    const sessionResults = eventResults.filter(
      (r) => r.session_id === session.id
    );
    const topThree = sessionResults
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .slice(0, 3);

    const winners = topThree
      .map((r) => {
        const driver = drivers.find((d) => d.id === r.driver_id);
        return `${r.position}. ${driver?.first_name} ${driver?.last_name}`;
      })
      .join('; ');

    data.push({
      event_id: `SESSION_${session.id}`,
      event_name: '',
      event_date: '',
      class_name: session.name,
      car_number: session.session_type,
      driver_id: '',
      driver_first_name: '',
      driver_last_name: '',
      team_id: '',
      participation_status: session.status || '',
      notes: winners || 'No results',
    });
  });

  return data;
}

// Season Standings
export function generateStandingsExport(
  seriesId,
  seasonYear,
  className,
  standings,
  drivers,
  series
) {
  const serie = series.find((s) => s.id === seriesId);

  const filtered = standings.filter((s) => {
    if (s.series_id !== seriesId) return false;
    if (s.season_year !== parseInt(seasonYear)) return false;
    if (s.class_name !== className) return false;
    return true;
  });

  return filtered.map((standing, idx) => {
    const driver = drivers.find((d) => d.id === standing.driver_id);
    return {
      series_id: standing.series_id,
      series_name: serie?.name || '',
      season_year: standing.season_year,
      class_name: standing.class_name,
      position: idx + 1,
      driver_id: standing.driver_id,
      first_name: driver?.first_name || standing.driver_name?.split(' ')[0] || '',
      last_name: driver?.last_name || standing.driver_name?.split(' ')[1] || '',
      total_points: standing.total_points || 0,
      events_counted: standing.events_counted || 0,
      wins: standing.wins || 0,
      podiums: standing.podiums || 0,
      bonus_points: standing.bonus_points || 0,
      last_calculated: standing.last_calculated || '',
    };
  });
}

// Points Ledger
export function generatePointsLedgerExport(
  seriesId,
  seasonYear,
  className,
  results,
  drivers,
  events,
  series
) {
  const serie = series.find((s) => s.id === seriesId);
  const data = [];
  const year = parseInt(seasonYear);

  // Group results by driver and event
  const resultsByDriverEvent = {};
  results.forEach((r) => {
    if (r.series_id !== seriesId) return;
    const eventYear = new Date(r.created_date).getFullYear();
    if (eventYear !== year) return;

    const key = `${r.driver_id}_${r.event_id}`;
    if (!resultsByDriverEvent[key]) {
      resultsByDriverEvent[key] = [];
    }
    resultsByDriverEvent[key].push(r);
  });

  // Generate rows
  Object.entries(resultsByDriverEvent).forEach(([key, driverEventResults]) => {
    const [driverId, eventId] = key.split('_');
    const driver = drivers.find((d) => d.id === driverId);
    const event = events.find((e) => e.id === eventId);

    driverEventResults.forEach((result) => {
      data.push({
        series_id: seriesId,
        season_year: year,
        class_name: className,
        event_id: eventId,
        event_date: event?.event_date || '',
        driver_id: driverId,
        driver_name: `${driver?.first_name || ''} ${driver?.last_name || ''}`.trim(),
        session_type: result.session_type || '',
        position: result.position || '',
        points: result.points || '',
        bonus_flags: '',
        notes: result.notes || '',
      });
    });
  });

  return data;
}