/**
 * eventExperienceHelpers.ts
 *
 * Phase 13 — Shared helpers for Event experience computation and integrity
 * auditing. Extracted to prevent logic duplication between getEventExperience
 * and auditEventExperience.
 *
 * All functions are pure/read-only — no writes, no repairs.
 */

export interface EventContext {
  event: any;
  track: any | null;
  series: any | null;
  sessions: any[];
  eventClasses: any[];
  eventDays: any[];
  entries: any[];
  results: any[];
  standings: any[];
  allDrivers: any[];
  allRacerProfiles: any[];
  allTeams: any[];
  allVehicles: any[];
  allSeries: any[];
  allClasses: any[];
  allEvents: any[];
  allTracks: any[];
  outletStories: any[];
  entrySponsors: any[];
  driverMap: Map<string, any>;
  racerProfileMap: Map<string, any>;
  teamMap: Map<string, any>;
  vehicleMap: Map<string, any>;
  seriesMap: Map<string, any>;
  classMap: Map<string, any>;
  eventMap: Map<string, any>;
  trackMap: Map<string, any>;
  sessionMap: Map<string, any>;
  eventClassMap: Map<string, any>;
  eventDayMap: Map<string, any>;
  resultsBySession: Map<string, any[]>;
  resultsByEntry: Map<string, any>;
  entriesByClass: Map<string, any[]>;
  sessionsByClass: Map<string, any[]>;
  sessionsByDay: Map<string, any[]>;
}

/**
 * Resolve an Event by slug, canonical_slug, or id.
 * Checks slug first, then canonical_slug, then id.
 */
export async function resolveEvent(base44: any, slug?: string, event_id?: string): Promise<any | null> {
  if (slug) {
    // Try slug field first
    let list = await base44.asServiceRole.entities.Event.filter({ slug }).catch(() => []);
    if (Array.isArray(list) && list.length > 0) return list[0];
    // Fall back to canonical_slug
    list = await base44.asServiceRole.entities.Event.filter({ canonical_slug: slug }).catch(() => []);
    if (Array.isArray(list) && list.length > 0) return list[0];
    return null;
  }
  if (event_id) {
    return await base44.asServiceRole.entities.Event.get(event_id).catch(() => null);
  }
  return null;
}

/**
 * Load all data needed for Event experience computation.
 * Returns a fully-resolved context object with lookup maps.
 */
export async function loadEventContext(base44: any, event: any): Promise<EventContext> {
  const eventId = event.id;

  const [
    trackResult, seriesResult, sessionsResult, eventClassesResult,
    eventDaysResult, entriesResult, resultsResult, standingsResult,
    allDrivers, allRacerProfiles, allTeams, allVehicles,
    allSeries, allClasses, allEvents, allTracks,
    outletStories, entrySponsors,
  ] = await Promise.all([
    event.track_id
      ? base44.asServiceRole.entities.Track.get(event.track_id).catch(() => null)
      : Promise.resolve(null),
    event.series_id
      ? base44.asServiceRole.entities.Series.get(event.series_id).catch(() => null)
      : Promise.resolve(null),
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

  const track = trackResult;
  const series = seriesResult;
  const sessions = sessionsResult as any[];
  const eventClasses = eventClassesResult as any[];
  const eventDays = eventDaysResult as any[];
  const entries = entriesResult as any[];
  const results = resultsResult as any[];
  const standings = (standingsResult as any[]).filter((s: any) =>
    !event.series_id || !event.season || (s.series_id === event.series_id && s.season_year === event.season)
  );

  // Build lookup maps
  const driverMap = new Map<string, any>();
  (allDrivers as any[]).forEach((d: any) => driverMap.set(d.id, d));
  const racerProfileMap = new Map<string, any>();
  (allRacerProfiles as any[]).forEach((rp: any) => {
    racerProfileMap.set(rp.id, rp);
    if (rp.legacy_driver_id) racerProfileMap.set(rp.legacy_driver_id, rp);
  });
  const teamMap = new Map<string, any>();
  (allTeams as any[]).forEach((t: any) => teamMap.set(t.id, t));
  const vehicleMap = new Map<string, any>();
  (allVehicles as any[]).forEach((v: any) => vehicleMap.set(v.id, v));
  const seriesMap = new Map<string, any>();
  (allSeries as any[]).forEach((s: any) => seriesMap.set(s.id, s));
  const classMap = new Map<string, any>();
  (allClasses as any[]).forEach((c: any) => classMap.set(c.id, c));
  const eventMap = new Map<string, any>();
  (allEvents as any[]).forEach((e: any) => eventMap.set(e.id, e));
  const trackMap = new Map<string, any>();
  (allTracks as any[]).forEach((t: any) => trackMap.set(t.id, t));
  const sessionMap = new Map<string, any>();
  sessions.forEach((s: any) => sessionMap.set(s.id, s));
  const eventClassMap = new Map<string, any>();
  eventClasses.forEach((c: any) => eventClassMap.set(c.id, c));
  const eventDayMap = new Map<string, any>();
  eventDays.forEach((d: any) => eventDayMap.set(d.id, d));

  // Index results by session and entry
  const resultsBySession = new Map<string, any[]>();
  const resultsByEntry = new Map<string, any>();
  results.forEach((r: any) => {
    if (r.session_id) {
      if (!resultsBySession.has(r.session_id)) resultsBySession.set(r.session_id, []);
      resultsBySession.get(r.session_id)!.push(r);
    }
    if (r.entry_id) resultsByEntry.set(r.entry_id, r);
  });

  // Index entries by class
  const entriesByClass = new Map<string, any[]>();
  entries.forEach((e: any) => {
    const cid = e.event_class_id;
    if (cid) {
      if (!entriesByClass.has(cid)) entriesByClass.set(cid, []);
      entriesByClass.get(cid)!.push(e);
    }
  });

  // Index sessions by class and day
  const sessionsByClass = new Map<string, any[]>();
  const sessionsByDay = new Map<string, any[]>();
  sessions.forEach((s: any) => {
    const cid = s.event_class_id;
    if (cid) {
      if (!sessionsByClass.has(cid)) sessionsByClass.set(cid, []);
      sessionsByClass.get(cid)!.push(s);
    }
    const did = s.event_day_id;
    if (did) {
      if (!sessionsByDay.has(did)) sessionsByDay.set(did, []);
      sessionsByDay.get(did)!.push(s);
    }
  });

  return {
    event, track, series, sessions, eventClasses, eventDays,
    entries, results, standings,
    allDrivers: allDrivers as any[], allRacerProfiles: allRacerProfiles as any[],
    allTeams: allTeams as any[], allVehicles: allVehicles as any[],
    allSeries: allSeries as any[], allClasses: allClasses as any[],
    allEvents: allEvents as any[], allTracks: allTracks as any[],
    outletStories: outletStories as any[], entrySponsors: entrySponsors as any[],
    driverMap, racerProfileMap, teamMap, vehicleMap,
    seriesMap, classMap, eventMap, trackMap,
    sessionMap, eventClassMap, eventDayMap,
    resultsBySession, resultsByEntry, entriesByClass, sessionsByClass, sessionsByDay,
  };
}

/**
 * Resolve a racer identity from an entry's driver_id.
 * Uses RacerProfile (authoritative) with Driver as compatibility fallback.
 */
export function resolveRacerFromEntry(ctx: EventContext, entry: any): {
  racer_profile_id: string | null;
  display_name: string;
  slug: string | null;
  profile_url: string | null;
  profile_image_url: string | null;
  hometown_city: string | null;
  hometown_state: string | null;
  primary_discipline: string | null;
} {
  const driverId = entry?.driver_id;
  if (!driverId) return { racer_profile_id: null, display_name: 'Unknown', slug: null, profile_url: null, profile_image_url: null, hometown_city: null, hometown_state: null, primary_discipline: null };
  const rp = ctx.racerProfileMap.get(driverId);
  const driver = ctx.driverMap.get(driverId);
  const displayName = rp?.display_name || (driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown');
  const slug = rp?.slug || driver?.canonical_slug || driver?.slug || null;
  return {
    racer_profile_id: rp?.id || null,
    display_name: displayName,
    slug,
    profile_url: slug ? `/racers/${slug}` : null,
    profile_image_url: rp?.profile_image_url || driver?.profile_image_url || null,
    hometown_city: rp?.hometown_city || driver?.hometown_city || null,
    hometown_state: rp?.hometown_state || driver?.hometown_state || null,
    primary_discipline: rp?.primary_discipline || driver?.primary_discipline || null,
  };
}

/**
 * Resolve a team from an entry's team_id.
 */
export function resolveTeamFromEntry(ctx: EventContext, entry: any): {
  team_id: string | null;
  name: string | null;
  slug: string | null;
  logo_url: string | null;
  profile_url: string | null;
} | null {
  const teamId = entry?.team_id;
  if (!teamId) return null;
  const team = ctx.teamMap.get(teamId);
  if (!team) return { team_id: teamId, name: null, slug: null, logo_url: null, profile_url: null };
  return {
    team_id: teamId,
    name: team.name,
    slug: team.slug || team.canonical_slug || null,
    logo_url: team.logo_url || null,
    profile_url: team.slug ? `/teams/${team.slug}` : (team.canonical_slug ? `/teams/${team.canonical_slug}` : null),
  };
}

/**
 * Resolve a vehicle from an entry's vehicle_id.
 */
export function resolveVehicleFromEntry(ctx: EventContext, entry: any): {
  vehicle_id: string | null;
  nickname: string | null;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  profile_image_url: string | null;
  profile_url: string | null;
} | null {
  const vehicleId = entry?.vehicle_id;
  if (!vehicleId) return null;
  const vehicle = ctx.vehicleMap.get(vehicleId);
  if (!vehicle) return { vehicle_id: vehicleId, nickname: null, manufacturer: null, model: null, year: null, profile_image_url: null, profile_url: null };
  const slug = vehicle.slug || null;
  return {
    vehicle_id: vehicleId,
    nickname: vehicle.nickname || null,
    manufacturer: vehicle.manufacturer || null,
    model: vehicle.model || null,
    year: vehicle.year || null,
    profile_image_url: vehicle.profile_image_url || null,
    profile_url: slug ? `/vehicles/${slug}` : null,
  };
}

/**
 * Resolve an EventClass from an entry's event_class_id.
 */
export function resolveClassFromEntry(ctx: EventContext, entry: any): {
  event_class_id: string | null;
  class_name: string | null;
  series_class_id: string | null;
} | null {
  const ecId = entry?.event_class_id;
  if (!ecId) return null;
  const ec = ctx.eventClassMap.get(ecId);
  return {
    event_class_id: ecId,
    class_name: ec?.class_name || null,
    series_class_id: ec?.series_class_id || null,
  };
}

/**
 * Check if an Event is publicly visible.
 * Uses the same logic as publishHelpers.isEventPublic.
 */
export function isEventPublic(event: any): boolean {
  if (!event) return false;
  if (event.is_archived) return false;
  if (event.publish_ready === false) return false;
  return ['Published', 'Live', 'Completed'].includes(event.status);
}