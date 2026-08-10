/**
 * getEventExperience
 * Phase 13 — Read-only function that computes the complete public Event
 * race-weekend experience. Returns one structured payload containing all
 * data needed for the definitive public Event profile.
 *
 * Read-only — never creates or modifies Event state.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildSponsorshipsForTarget, normalizeEntrySponsorLegacy } from '../../shared/sponsorshipReadHelpers.ts';

async function resolveEvent(base44, slug, event_id) {
  if (slug) {
    let list = await base44.asServiceRole.entities.Event.filter({ slug }).catch(() => []);
    if (Array.isArray(list) && list.length > 0) return list[0];
    list = await base44.asServiceRole.entities.Event.filter({ canonical_slug: slug }).catch(() => []);
    if (Array.isArray(list) && list.length > 0) return list[0];
    return null;
  }
  if (event_id) return await base44.asServiceRole.entities.Event.get(event_id).catch(() => null);
  return null;
}

function isEventPublic(event) {
  if (!event) return false;
  if (event.is_archived) return false;
  if (event.publish_ready === false) return false;
  return ['Published', 'Live', 'Completed'].includes(event.status);
}

async function loadEventContext(base44, event) {
  const eventId = event.id;
  const [
    trackResult, seriesResult, sessionsResult, eventClassesResult,
    eventDaysResult, entriesResult, resultsResult, standingsResult,
    allDrivers, allRacerProfiles, allTeams, allVehicles,
    allSeries, allClasses, allEvents, allTracks,
    outletStories, entrySponsors,
  ] = await Promise.all([
    event.track_id ? base44.asServiceRole.entities.Track.get(event.track_id).catch(() => null) : Promise.resolve(null),
    event.series_id ? base44.asServiceRole.entities.Series.get(event.series_id).catch(() => null) : Promise.resolve(null),
    base44.asServiceRole.entities.Session.filter({ event_id: eventId }).catch(() => []),
    base44.asServiceRole.entities.EventClass.filter({ event_id: eventId }).catch(() => []),
    base44.asServiceRole.entities.EventDay.filter({ event_id: eventId }).catch(() => []),
    base44.asServiceRole.entities.Entry.filter({ event_id: eventId }).catch(() => []),
    base44.asServiceRole.entities.Results.filter({ event_id: eventId }).catch(() => []),
    event.series_id && event.season
      ? base44.asServiceRole.entities.Standings.filter({ series_id: event.series_id, season_year: event.season }).catch(() => [])
      : base44.asServiceRole.entities.Standings.list('-created_date', 200).catch(() => []),
    base44.asServiceRole.entities.Driver.list().catch(() => []),
    base44.asServiceRole.entities.RacerProfile.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Team.list().catch(() => []),
    base44.asServiceRole.entities.Vehicle.list().catch(() => []),
    base44.asServiceRole.entities.Series.list().catch(() => []),
    base44.asServiceRole.entities.SeriesClass.list().catch(() => []),
    base44.asServiceRole.entities.Event.list().catch(() => []),
    base44.asServiceRole.entities.Track.list().catch(() => []),
    base44.asServiceRole.entities.OutletStory.list('-published_date', 200).catch(() => []),
    base44.asServiceRole.entities.EntrySponsor.list('-created_date', 200).catch(() => []),
  ]);

  const sessions = sessionsResult;
  const eventClasses = eventClassesResult;
  const eventDays = eventDaysResult;
  const entries = entriesResult;
  const results = resultsResult;
  const standings = (standingsResult).filter(s =>
    !event.series_id || !event.season || (s.series_id === event.series_id && s.season_year === event.season)
  );

  const driverMap = new Map(); allDrivers.forEach(d => driverMap.set(d.id, d));
  const racerProfileMap = new Map(); allRacerProfiles.forEach(rp => { racerProfileMap.set(rp.id, rp); if (rp.legacy_driver_id) racerProfileMap.set(rp.legacy_driver_id, rp); });
  const teamMap = new Map(); allTeams.forEach(t => teamMap.set(t.id, t));
  const vehicleMap = new Map(); allVehicles.forEach(v => vehicleMap.set(v.id, v));
  const seriesMap = new Map(); allSeries.forEach(s => seriesMap.set(s.id, s));
  const classMap = new Map(); allClasses.forEach(c => classMap.set(c.id, c));
  const eventMap = new Map(); allEvents.forEach(e => eventMap.set(e.id, e));
  const trackMap = new Map(); allTracks.forEach(t => trackMap.set(t.id, t));
  const sessionMap = new Map(); sessions.forEach(s => sessionMap.set(s.id, s));
  const eventClassMap = new Map(); eventClasses.forEach(c => eventClassMap.set(c.id, c));
  const eventDayMap = new Map(); eventDays.forEach(d => eventDayMap.set(d.id, d));

  const resultsBySession = new Map();
  const resultsByEntry = new Map();
  results.forEach(r => {
    if (r.session_id) { if (!resultsBySession.has(r.session_id)) resultsBySession.set(r.session_id, []); resultsBySession.get(r.session_id).push(r); }
    if (r.entry_id) resultsByEntry.set(r.entry_id, r);
  });

  const entriesByClass = new Map();
  entries.forEach(e => { const cid = e.event_class_id; if (cid) { if (!entriesByClass.has(cid)) entriesByClass.set(cid, []); entriesByClass.get(cid).push(e); } });

  const sessionsByClass = new Map();
  const sessionsByDay = new Map();
  sessions.forEach(s => {
    const cid = s.event_class_id; if (cid) { if (!sessionsByClass.has(cid)) sessionsByClass.set(cid, []); sessionsByClass.get(cid).push(s); }
    const did = s.event_day_id; if (did) { if (!sessionsByDay.has(did)) sessionsByDay.set(did, []); sessionsByDay.get(did).push(s); }
  });

  return {
    event, track: trackResult, series: seriesResult, sessions, eventClasses, eventDays,
    entries, results, standings, outletStories, entrySponsors,
    driverMap, racerProfileMap, teamMap, vehicleMap, seriesMap, classMap,
    eventMap, trackMap, sessionMap, eventClassMap, eventDayMap,
    resultsBySession, resultsByEntry, entriesByClass, sessionsByClass, sessionsByDay,
  };
}

function resolveRacer(ctx, entry) {
  const did = entry?.driver_id; if (!did) return null;
  const rp = ctx.racerProfileMap.get(did); const driver = ctx.driverMap.get(did);
  const name = rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown');
  const slug = rp?.slug || driver?.canonical_slug || driver?.slug || null;
  return { racer_profile_id: rp?.id || null, display_name: name, slug, profile_url: slug ? `/racers/${slug}` : null, profile_image_url: rp?.profile_image_url || driver?.profile_image_url || null, hometown_city: rp?.hometown_city || driver?.hometown_city || null, hometown_state: rp?.hometown_state || driver?.hometown_state || null };
}

function resolveTeam(ctx, entry) {
  const tid = entry?.team_id; if (!tid) return null;
  const team = ctx.teamMap.get(tid); if (!team) return { team_id: tid, name: null, slug: null, logo_url: null, profile_url: null };
  const slug = team.slug || team.canonical_slug || null;
  return { team_id: tid, name: team.name, slug, logo_url: team.logo_url || null, profile_url: slug ? `/teams/${slug}` : null };
}

function resolveVehicle(ctx, entry) {
  const vid = entry?.vehicle_id; if (!vid) return null;
  const vehicle = ctx.vehicleMap.get(vid); if (!vehicle) return { vehicle_id: vid, nickname: null, manufacturer: null, model: null, year: null, profile_image_url: null, profile_url: null };
  const slug = vehicle.slug || null;
  return { vehicle_id: vid, nickname: vehicle.nickname || null, manufacturer: vehicle.manufacturer || null, model: vehicle.model || null, year: vehicle.year || null, profile_image_url: vehicle.profile_image_url || null, profile_url: slug ? `/vehicles/${slug}` : null };
}

function buildPublicFields(event, track, series) {
  return {
    id: event.id, name: event.name, slug: event.slug || event.canonical_slug || null,
    description: event.description || null, event_date: event.event_date || null, end_date: event.end_date || null,
    season: event.season || null, round_number: event.round_number || null,
    status: event.status || 'Draft', public_status: event.public_status || 'draft',
    series_id: event.series_id || null, series_name: event.series_name || series?.name || null,
    track_id: event.track_id || null, track_name: track?.name || null,
    event_logo_url: event.event_logo_url || null, event_cover_image_url: event.event_cover_image_url || null,
    event_media_gallery: event.event_media_gallery || [], event_promo_video_url: event.event_promo_video_url || null,
    ticket_url: event.ticket_url || null, broadcast_url: event.broadcast_url || null,
    registration_url: event.registration_url || null, event_notes: event.event_notes || null,
    spectator_info: event.spectator_info || null, weather_info: event.weather_info || null,
    location_note: event.location_note || null, published_date: event.published_date || null,
    created_date: event.created_date || null,
  };
}

function buildSchedule(ctx) {
  const { sessions, eventDays, sessionsByDay, eventDayMap, eventClassMap, classMap } = ctx;
  const days = eventDays.length > 0 ? eventDays.sort((a, b) => (a.sort_order || a.day_number || 0) - (b.sort_order || b.day_number || 0)) : [];
  const dayEntries = days.map(day => {
    const daySessions = sessionsByDay.get(day.id) || [];
    return {
      day_id: day.id, day_number: day.day_number, label: day.label, date: day.date,
      round_number: day.round_number || null, round_label: day.round_label || null,
      status: day.status || 'Planned',
      sessions: daySessions.sort((a, b) => (a.run_order || 0) - (b.run_order || 0)).map(s => buildSessionSummary(ctx, s)),
    };
  });
  // If no EventDay records, group sessions by date
  if (days.length === 0 && sessions.length > 0) {
    const byDate = new Map();
    sessions.forEach(s => {
      const date = s.scheduled_time ? s.scheduled_time.split('T')[0] : (s.created_date ? s.created_date.split('T')[0] : 'TBA');
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(s);
    });
    return Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, sess]) => ({
      day_id: null, day_number: null, label: date === 'TBA' ? 'TBA' : date, date,
      round_number: null, round_label: null, status: 'Planned',
      sessions: sess.sort((a, b) => (a.run_order || 0) - (b.run_order || 0)).map(s => buildSessionSummary(ctx, s)),
    }));
  }
  return dayEntries;
}

function buildSessionSummary(ctx, session) {
  const ec = session.event_class_id ? ctx.eventClassMap.get(session.event_class_id) : null;
  const sc = session.series_class_id ? ctx.classMap.get(session.series_class_id) : null;
  const sessionResults = ctx.resultsBySession.get(session.id) || [];
  const validResults = sessionResults.filter(r => r.position && r.position > 0).sort((a, b) => a.position - b.position);
  const winner = validResults.length > 0 ? buildResultEntry(ctx, validResults[0]) : null;
  const topFinishers = validResults.slice(0, 3).map(r => buildResultEntry(ctx, r));
  const fastestLap = sessionResults.reduce((min, r) => (r.best_lap_time_ms && (!min || r.best_lap_time_ms < min.best_lap_time_ms)) ? r : min, null);
  return {
    session_id: session.id, name: session.name, session_type: session.session_type,
    session_number: session.session_number || null, status: session.status || 'Draft',
    scheduled_time: session.scheduled_time || null, duration_minutes: session.duration_minutes || null,
    laps: session.laps || null, run_order: session.run_order || 0,
    class_name: ec?.class_name || sc?.class_name || null, event_class_id: session.event_class_id || null,
    series_class_id: session.series_class_id || null,
    entry_count: ctx.entriesByClass.get(session.event_class_id)?.length || sessionResults.length || 0,
    results_count: sessionResults.length, winner, top_finishers: topFinishers,
    fastest_lap_ms: fastestLap?.best_lap_time_ms || null, fastest_lap_racer: fastestLap ? resolveRacer(ctx, ctx.entries.find(e => e.id === fastestLap.entry_id) || { driver_id: fastestLap.driver_id }) : null,
    points_enabled: session.points_enabled || false, points_type: session.points_type || 'none',
    locked: session.locked || false, completed_at: session.completed_at || null,
  };
}

function buildResultEntry(ctx, result) {
  const entry = ctx.entries.find(e => e.id === result.entry_id) || ctx.entries.find(e => e.driver_id === result.driver_id) || { driver_id: result.driver_id };
  const racer = resolveRacer(ctx, entry);
  const team = resolveTeam(ctx, entry);
  const vehicle = resolveVehicle(ctx, entry);
  return {
    result_id: result.id, position: result.position, status: result.status || 'Running',
    laps_completed: result.laps_completed || null, best_lap_time_ms: result.best_lap_time_ms || null,
    points: result.points || null, racer, team, vehicle, car_number: entry?.car_number || null,
  };
}

function buildClasses(ctx) {
  const { eventClasses, entriesByClass, sessionsByClass, classMap, resultsBySession, sessionMap } = ctx;
  return eventClasses.sort((a, b) => (a.class_order || 0) - (b.class_order || 0)).map(ec => {
    const classEntries = entriesByClass.get(ec.id) || [];
    const classSessions = sessionsByClass.get(ec.id) || [];
    const sc = ec.series_class_id ? classMap.get(ec.series_class_id) : null;
    // Top qualifier from qualifying sessions
    const qualSessions = classSessions.filter(s => s.session_type === 'Qualifying');
    let topQualifier = null;
    if (qualSessions.length > 0) {
      const qualResults = (ctx.resultsBySession.get(qualSessions[0].id) || []).filter(r => r.position && r.position > 0).sort((a, b) => a.position - b.position);
      if (qualResults.length > 0) topQualifier = buildResultEntry(ctx, qualResults[0]);
    }
    // Feature results
    const featureSessions = classSessions.filter(s => ['Feature', 'Final'].includes(s.session_type));
    let featureResults = [];
    if (featureSessions.length > 0) {
      featureResults = (ctx.resultsBySession.get(featureSessions[0].id) || []).filter(r => r.position && r.position > 0).sort((a, b) => a.position - b.position).slice(0, 10).map(r => buildResultEntry(ctx, r));
    }
    return {
      event_class_id: ec.id, class_name: ec.class_name, series_class_id: ec.series_class_id || null,
      series_class_name: sc?.class_name || null, vehicle_type: sc?.vehicle_type || null,
      competition_level: sc?.competition_level || null, max_entries: ec.max_entries || null,
      class_status: ec.class_status || 'Open', class_order: ec.class_order || 0,
      entry_count: classEntries.length, session_count: classSessions.length,
      top_qualifier: topQualifier, feature_results: featureResults,
    };
  });
}

function buildEntries(ctx) {
  const { entries } = ctx;
  return entries.filter(e => !e.is_archived && e.entry_status !== 'Withdrawn').map(entry => {
    const racer = resolveRacer(ctx, entry);
    const team = resolveTeam(ctx, entry);
    const vehicle = resolveVehicle(ctx, entry);
    const ec = entry.event_class_id ? ctx.eventClassMap.get(entry.event_class_id) : null;
    const result = entry.id ? ctx.resultsByEntry.get(entry.id) : null;
    return {
      entry_id: entry.id, car_number: entry.car_number || null,
      entry_status: entry.entry_status || 'Registered',
      racer, team, vehicle,
      class_name: ec?.class_name || null, event_class_id: entry.event_class_id || null,
      best_result_position: result?.position || null, best_result_status: result?.status || null,
      best_lap_time_ms: result?.best_lap_time_ms || null, points: result?.points || null,
    };
  });
}

function buildRacers(ctx) {
  const seen = new Map();
  ctx.entries.filter(e => !e.is_archived && e.entry_status !== 'Withdrawn').forEach(entry => {
    const did = entry.driver_id; if (!did || seen.has(did)) return;
    const racer = resolveRacer(ctx, entry);
    const team = resolveTeam(ctx, entry);
    const vehicle = resolveVehicle(ctx, entry);
    const ec = entry.event_class_id ? ctx.eventClassMap.get(entry.event_class_id) : null;
    const result = entry.id ? ctx.resultsByEntry.get(entry.id) : null;
    seen.set(did, {
      ...racer, car_number: entry.car_number || null, team, vehicle,
      class_name: ec?.class_name || null, event_class_id: entry.event_class_id || null,
      best_result_position: result?.position || null, best_result_status: result?.status || null,
      best_lap_time_ms: result?.best_lap_time_ms || null, points: result?.points || null,
    });
  });
  return Array.from(seen.values());
}

function buildTeams(ctx) {
  const seen = new Map();
  ctx.entries.filter(e => !e.is_archived && e.entry_status !== 'Withdrawn').forEach(entry => {
    const tid = entry.team_id; if (!tid || seen.has(tid)) return;
    const team = ctx.teamMap.get(tid); if (!team) return;
    const teamEntries = ctx.entries.filter(e => e.team_id === tid && !e.is_archived && e.entry_status !== 'Withdrawn');
    const driverIds = [...new Set(teamEntries.map(e => e.driver_id).filter(Boolean))];
    const vehicleIds = [...new Set(teamEntries.map(e => e.vehicle_id).filter(Boolean))];
    const classIds = [...new Set(teamEntries.map(e => e.event_class_id).filter(Boolean))];
    seen.set(tid, {
      team_id: tid, name: team.name, slug: team.slug || team.canonical_slug || null,
      logo_url: team.logo_url || null, profile_url: team.slug ? `/teams/${team.slug}` : (team.canonical_slug ? `/teams/${team.canonical_slug}` : null),
      entry_count: teamEntries.length, driver_count: driverIds.length, vehicle_count: vehicleIds.length,
      class_names: classIds.map(cid => ctx.eventClassMap.get(cid)?.class_name).filter(Boolean),
    });
  });
  return Array.from(seen.values());
}

function buildVehicles(ctx) {
  const seen = new Map();
  ctx.entries.filter(e => !e.is_archived && e.entry_status !== 'Withdrawn').forEach(entry => {
    const vid = entry.vehicle_id; if (!vid || seen.has(vid)) return;
    const vehicle = ctx.vehicleMap.get(vid); if (!vehicle) return;
    const racer = resolveRacer(ctx, entry);
    const team = resolveTeam(ctx, entry);
    const ec = entry.event_class_id ? ctx.eventClassMap.get(entry.event_class_id) : null;
    seen.set(vid, {
      vehicle_id: vid, nickname: vehicle.nickname || null, manufacturer: vehicle.manufacturer || null,
      model: vehicle.model || null, year: vehicle.year || null,
      profile_image_url: vehicle.profile_image_url || null,
      profile_url: vehicle.slug ? `/vehicles/${vehicle.slug}` : null,
      car_number: entry.car_number || null, racer, team,
      class_name: ec?.class_name || null,
    });
  });
  return Array.from(seen.values());
}

function buildSessions(ctx) {
  return ctx.sessions.sort((a, b) => (a.run_order || 0) - (b.run_order || 0)).map(s => {
    const sessionResults = (ctx.resultsBySession.get(s.id) || []).filter(r => r.position && r.position > 0).sort((a, b) => a.position - b.position);
    const ec = s.event_class_id ? ctx.eventClassMap.get(s.event_class_id) : null;
    const sc = s.series_class_id ? ctx.classMap.get(s.series_class_id) : null;
    return {
      session_id: s.id, name: s.name, session_type: s.session_type,
      session_number: s.session_number || null, status: s.status || 'Draft',
      scheduled_time: s.scheduled_time || null, duration_minutes: s.duration_minutes || null,
      laps: s.laps || null, class_name: ec?.class_name || sc?.class_name || null,
      event_class_id: s.event_class_id || null, series_class_id: s.series_class_id || null,
      entry_count: ctx.entriesByClass.get(s.event_class_id)?.length || sessionResults.length || 0,
      results_count: sessionResults.length,
      results: sessionResults.slice(0, 20).map(r => buildResultEntry(ctx, r)),
      winner: sessionResults.length > 0 ? buildResultEntry(ctx, sessionResults[0]) : null,
      fastest_lap_ms: sessionResults.reduce((min, r) => (r.best_lap_time_ms && (!min || r.best_lap_time_ms < min)) ? r.best_lap_time_ms : min, null),
      points_enabled: s.points_enabled || false, points_type: s.points_type || 'none',
      locked: s.locked || false, completed_at: s.completed_at || null,
    };
  });
}

function buildQualifying(ctx) {
  const qualSessions = ctx.sessions.filter(s => s.session_type === 'Qualifying');
  return qualSessions.map(qs => {
    const ec = qs.event_class_id ? ctx.eventClassMap.get(qs.event_class_id) : null;
    const qualResults = (ctx.resultsBySession.get(qs.id) || []).filter(r => r.position && r.position > 0).sort((a, b) => a.position - b.position);
    const fastestTime = qualResults.reduce((min, r) => (r.best_lap_time_ms && (!min || r.best_lap_time_ms < min)) ? r.best_lap_time_ms : min, null);
    return {
      session_id: qs.id, class_name: ec?.class_name || null,
      results: qualResults.map((r, idx) => {
        const re = buildResultEntry(ctx, r);
        return { ...re, gap_to_leader_ms: idx === 0 ? 0 : (fastestTime && r.best_lap_time_ms ? r.best_lap_time_ms - fastestTime : null) };
      }),
    };
  });
}

function buildHeatFeatureResults(ctx) {
  const raceSessions = ctx.sessions.filter(s => ['Heat', 'LCQ', 'Feature', 'Final'].includes(s.session_type));
  return raceSessions.map(rs => {
    const ec = rs.event_class_id ? ctx.eventClassMap.get(rs.event_class_id) : null;
    const raceResults = (ctx.resultsBySession.get(rs.id) || []).filter(r => r.position && r.position > 0).sort((a, b) => a.position - b.position);
    return {
      session_id: rs.id, name: rs.name, session_type: rs.session_type,
      class_name: ec?.class_name || null, status: rs.status || 'Draft',
      scheduled_time: rs.scheduled_time || null,
      results: raceResults.slice(0, 20).map(r => buildResultEntry(ctx, r)),
    };
  });
}

function buildStandingsImpact(ctx) {
  const { standings, seriesMap, classMap, driverMap, racerProfileMap } = ctx;
  if (standings.length === 0) return { available: false, leaders: [], full_standings: [] };
  const sorted = [...standings].sort((a, b) => (a.position || 999) - (b.position || 999));
  const leaders = sorted.slice(0, 10).map(s => {
    const driver = driverMap.get(s.driver_id); const rp = racerProfileMap.get(s.driver_id);
    const sc = s.series_class_id ? classMap.get(s.series_class_id) : null;
    return {
      standings_id: s.id, position: s.position, points_total: s.points_total || 0,
      wins: s.wins || 0, podiums: s.podiums || 0, starts: s.starts || 0,
      racer_name: rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'),
      racer_slug: rp?.slug || driver?.canonical_slug || driver?.slug || null,
      racer_url: rp?.slug ? `/racers/${rp.slug}` : (driver?.canonical_slug ? `/racers/${driver.canonical_slug}` : null),
      class_name: sc?.class_name || null,
    };
  });
  return { available: true, leaders, full_standings_count: sorted.length };
}

function buildTimeline(ctx) {
  const { event, sessions, results, eventMap, trackMap, seriesMap, outletStories, eventDays } = ctx;
  const events = [];
  // Event publication
  if (event.published_date) events.push({ type: 'publication', date: event.published_date, title: 'Event Published', description: `${event.name} was published`, priority: 80 });
  if (event.created_date) events.push({ type: 'creation', date: event.created_date, title: 'Event Created', description: `${event.name} was created`, priority: 50 });
  // Session milestones
  sessions.forEach(s => {
    if (s.completed_at) events.push({ type: 'session_completed', date: s.completed_at, title: `${s.name} Completed`, description: `${s.session_type} session "${s.name}" completed`, metadata: { session_id: s.id, session_type: s.session_type }, priority: 60 });
    if (s.live_started_at) events.push({ type: 'session_live', date: s.live_started_at, title: `${s.name} Live`, description: `${s.session_type} session "${s.name}" went live`, metadata: { session_id: s.id }, priority: 55 });
  });
  // Race winners
  results.filter(r => r.position === 1).forEach(r => {
    const s = ctx.sessionMap.get(r.session_id); const re = buildResultEntry(ctx, r);
    events.push({ type: 'race_winner', date: s?.completed_at || r.created_date || event.event_date, title: `Winner: ${re.racer?.display_name || 'Unknown'}`, description: `Won ${s?.name || 'session'}${re.team?.name ? ` driving for ${re.team.name}` : ''}`, metadata: { session_id: r.session_id, racer: re.racer }, priority: 90 });
  });
  // Published stories
  outletStories.filter(story => story.status === 'published' && story.event_id === event.id).forEach(story => {
    events.push({ type: 'media', date: story.published_date || story.created_date, title: story.title, description: story.subtitle || `Story published`, metadata: { story_slug: story.slug, story_id: story.id }, priority: 40 });
  });
  events.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  return events.slice(0, 100);
}

function buildStatistics(ctx) {
  const { entries, sessions, results, eventClasses, teams, vehicles } = ctx;
  const activeEntries = entries.filter(e => !e.is_archived && e.entry_status !== 'Withdrawn');
  const validResults = results.filter(r => r.position && r.position > 0);
  const racerIds = new Set(activeEntries.map(e => e.driver_id).filter(Boolean));
  const teamIds = new Set(activeEntries.map(e => e.team_id).filter(Boolean));
  const vehicleIds = new Set(activeEntries.map(e => e.vehicle_id).filter(Boolean));
  const positions = validResults.map(r => r.position);
  const fastestLaps = validResults.filter(r => r.best_lap_time_ms).map(r => r.best_lap_time_ms);
  const winsByRacer = {}; validResults.filter(r => r.position === 1).forEach(r => { const k = r.driver_id; winsByRacer[k] = (winsByRacer[k] || 0) + 1; });
  const winsByTeam = {}; validResults.filter(r => r.position === 1).forEach(r => { const entry = ctx.entries.find(e => e.id === r.entry_id); const tid = entry?.team_id || r.team_id; if (tid) winsByTeam[tid] = (winsByTeam[tid] || 0) + 1; });
  return {
    total_entries: activeEntries.length, total_racers: racerIds.size, total_teams: teamIds.size,
    total_vehicles: vehicleIds.size, total_classes: eventClasses.length, total_sessions: sessions.length,
    total_results: validResults.length, total_laps: validResults.reduce((sum, r) => sum + (r.laps_completed || 0), 0),
    wins: positions.filter(p => p === 1).length, podiums: positions.filter(p => p <= 3).length,
    fastest_laps_count: fastestLaps.length, fastest_lap_ms: fastestLaps.length > 0 ? Math.min(...fastestLaps) : null,
    avg_field_size: eventClasses.length > 0 ? Math.round(activeEntries.length / eventClasses.length * 10) / 10 : 0,
    largest_class_entry_count: eventClasses.length > 0 ? Math.max(...eventClasses.map(ec => (ctx.entriesByClass.get(ec.id) || []).length)) : 0,
    manufacturer_wins: Object.entries(winsByTeam).map(([tid, wins]) => ({ team_id: tid, team_name: ctx.teamMap.get(tid)?.name || 'Unknown', wins })).sort((a, b) => b.wins - a.wins),
    session_status_breakdown: sessions.reduce((acc, s) => { const st = s.status || 'Draft'; acc[st] = (acc[st] || 0) + 1; return acc; }, {}),
  };
}

function buildVenueInfo(ctx) {
  const { track } = ctx;
  if (!track) return null;
  return {
    track_id: track.id, name: track.name, slug: track.slug || track.canonical_slug || null,
    profile_url: track.slug ? `/TrackProfile?slug=${track.slug}` : (track.canonical_slug ? `/TrackProfile?slug=${track.canonical_slug}` : `/TrackProfile?id=${track.id}`),
    location_city: track.location_city || null, location_state: track.location_state || null,
    location_country: track.location_country || null, track_type: track.track_type || null,
    surface_type: track.surface_type || null, length: track.length || null, banking: track.banking || null,
    description: track.description || null, logo_url: track.logo_url || null,
    image_url: track.image_url || null, website_url: track.website_url || null,
    latitude: track.latitude || null, longitude: track.longitude || null,
  };
}

function buildSponsors(ctx) {
  const { entrySponsors, entries } = ctx;
  const sponsors = {};
  entrySponsors.forEach(es => {
    const sid = es.sponsor_id || es.sponsor_name; if (!sid) return;
    const name = es.sponsor_name || es.sponsor_id;
    if (!sponsors[sid]) sponsors[sid] = { sponsor_id: sid, sponsor_name: name, logo_url: es.sponsor_logo_url || null, sponsor_url: es.sponsor_url || null, tier: es.tier || null, is_primary: es.is_primary || false, entries_count: 0 };
    sponsors[sid].entries_count++;
  });
  return { current_sponsors: Object.values(sponsors).sort((a, b) => b.entries_count - a.entries_count), total_sponsors: Object.keys(sponsors).length };
}

function buildMedia(ctx) {
  const { event, outletStories } = ctx;
  const eventStories = outletStories.filter(story => story.status === 'published' && story.event_id === event.id).slice(0, 20);
  return {
    outlet_stories: eventStories.map(s => ({ id: s.id, slug: s.slug, title: s.title, subtitle: s.subtitle, primary_category: s.primary_category, published_date: s.published_date, cover_image_url: s.cover_image_url, author: s.author })),
    gallery_count: (event.event_media_gallery || []).length,
    gallery_urls: event.event_media_gallery || [],
    promo_video_url: event.event_promo_video_url || null,
  };
}

function buildHistory(ctx) {
  const { event, allEvents, trackMap, seriesMap, results, driverMap, racerProfileMap } = ctx;
  if (!event.series_id && !event.track_id) return { available: false, past_editions: [] };
  const pastEvents = (ctx.allEvents || []).filter(e =>
    e.id !== event.id && !e.is_archived &&
    ((event.series_id && e.series_id === event.series_id) || (event.track_id && e.track_id === event.track_id)) &&
    e.event_date && e.event_date < event.event_date
  ).sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  const pastEditions = pastEvents.slice(0, 10).map(pe => {
    const track = trackMap.get(pe.track_id); const series = seriesMap.get(pe.series_id);
    return { event_id: pe.id, name: pe.name, event_date: pe.event_date, season: pe.season, track_name: track?.name || null, series_name: series?.name || pe.series_name || null, slug: pe.slug || pe.canonical_slug || null, profile_url: pe.slug ? `/events/${pe.slug}` : (pe.canonical_slug ? `/events/${pe.canonical_slug}` : `/EventProfile?id=${pe.id}`) };
  });
  return { available: pastEditions.length > 0, past_editions: pastEditions };
}

function buildSEO(event, track, series, stats) {
  const title = event.season ? `${event.season} ${event.name} — Event Profile | HIJINX` : `${event.name} — Event Profile | HIJINX`;
  const locationParts = [track?.name, track?.location_city, track?.location_state].filter(Boolean);
  const description = event.description || `${event.name}${series?.name ? ` — ${series.name}` : ''}${locationParts.length > 0 ? ` at ${locationParts.join(', ')}` : ''}${event.event_date ? ` on ${event.event_date}` : ''}. ${stats.total_entries} entries, ${stats.total_classes} classes, ${stats.total_sessions} sessions.`;
  const image = event.event_cover_image_url || event.event_logo_url || track?.image_url || null;
  const url = (event.slug || event.canonical_slug) ? `/events/${event.slug || event.canonical_slug}` : null;
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'SportsEvent',
    name: event.name, startDate: event.event_date || undefined, endDate: event.end_date || undefined,
    description, eventStatus: event.status === 'Completed' ? 'https://schema.org/EventCompleted' : 'https://schema.org/EventScheduled',
  };
  if (image) structuredData.image = image;
  if (url) structuredData.url = `https://hijinxco.com${url}`;
  if (track) structuredData.location = { '@type': 'Place', name: track.name, address: { '@type': 'PostalAddress', addressLocality: track.location_city || undefined, addressRegion: track.location_state || undefined, addressCountry: track.location_country || undefined } };
  if (series) structuredData.organizer = { '@type': 'Organization', name: series.name };
  if (event.ticket_url) structuredData.offers = { '@type': 'Offer', url: event.ticket_url, availability: 'https://schema.org/InStock' };
  if (event.broadcast_url) structuredData.broadcastUrl = event.broadcast_url;
  return {
    title, description, image, url, og_type: 'website', twitter_card: 'summary_large_image',
    og_title: title, og_description: description, og_image: image,
    twitter_title: title, twitter_description: description, twitter_image: image,
    structured_data: structuredData,
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { slug, event_id, allow_draft = false } = body;
    if (!slug && !event_id) return Response.json({ error: 'slug or event_id is required' }, { status: 400 });

    const event = await resolveEvent(base44, slug, event_id);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (!isEventPublic(event) && !allow_draft) return Response.json({ error: 'Event not found' }, { status: 404 });

    const ctx = await loadEventContext(base44, event);
    const publicFields = buildPublicFields(event, ctx.track, ctx.series);
    const schedule = buildSchedule(ctx);
    const classes = buildClasses(ctx);
    const entries = buildEntries(ctx);
    const racers = buildRacers(ctx);
    const teams = buildTeams(ctx);
    const vehicles = buildVehicles(ctx);
    const sessions = buildSessions(ctx);
    const qualifying = buildQualifying(ctx);
    const heatFeatureResults = buildHeatFeatureResults(ctx);
    const standingsImpact = buildStandingsImpact(ctx);
    const timeline = buildTimeline(ctx);
    const statistics = buildStatistics(ctx);
    const venueInfo = buildVenueInfo(ctx);
    const sponsors = buildSponsors(ctx);
    const media = buildMedia(ctx);
    const history = buildHistory(ctx);
    const seo = buildSEO(event, ctx.track, ctx.series, statistics);

    // Phase 17B: Unified sponsorship read (modern Sponsorship + legacy EntrySponsor fallback)
    const legacyEntrySponsors = ctx.entrySponsors.map(es => normalizeEntrySponsorLegacy(es));
    const sponsorshipResult = await buildSponsorshipsForTarget(base44, 'Event', event.id, {
      legacySponsors: legacyEntrySponsors,
    });

    return Response.json({
      event: publicFields, series: ctx.series ? { id: ctx.series.id, name: ctx.series.name, slug: ctx.series.slug || ctx.series.canonical_slug || null, discipline: ctx.series.discipline || null, profile_url: ctx.series.slug ? `/series/${ctx.series.slug}` : (ctx.series.canonical_slug ? `/series/${ctx.series.canonical_slug}` : null) } : null,
      track: venueInfo, schedule, classes, entries, racers, teams, vehicles, sessions,
      qualifying, heat_feature_results: heatFeatureResults, standings_impact: standingsImpact,
      timeline, statistics, sponsors, media, history, spectator_info: event.spectator_info || null,
      sponsorships: sponsorshipResult.sponsorships,
      sponsorship_counts: { modern: sponsorshipResult.modern_count, legacy: sponsorshipResult.legacy_count, deduped: sponsorshipResult.deduped_count },
      seo,
    });
  } catch (err) {
    console.error('[getEventExperience] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}