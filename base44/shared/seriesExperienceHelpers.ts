/**
 * seriesExperienceHelpers.ts
 *
 * Phase 14 — Shared helpers for Series experience computation and integrity
 * auditing. Extracted to prevent logic duplication between getSeriesExperience
 * and auditSeriesExperience.
 *
 * All functions are pure/read-only — no writes, no repairs.
 */

export interface SeriesContext {
  series: any;
  classes: any[];
  events: any[];
  tracks: any[];
  sessions: any[];
  results: any[];
  standings: any[];
  entries: any[];
  seasonParticipations: any[];
  racerProfiles: any[];
  teams: any[];
  vehicles: any[];
  driverCareerStats: any[];
  outletStories: any[];
  entrySponsors: any[];
  driverSponsors: any[];
  allDrivers: any[];
  driverMap: Map<string, any>;
  racerProfileMap: Map<string, any>;
  racerProfileByPersonMap: Map<string, any>;
  teamMap: Map<string, any>;
  vehicleMap: Map<string, any>;
  classMap: Map<string, any>;
  eventMap: Map<string, any>;
  trackMap: Map<string, any>;
  sessionMap: Map<string, any>;
  participationMap: Map<string, any>;
  participationByRacerMap: Map<string, any[]>;
  resultsByEvent: Map<string, any[]>;
  resultsBySession: Map<string, any[]>;
  entriesByEvent: Map<string, any[]>;
  eventsBySeason: Map<string, any[]>;
  standingsBySeasonClass: Map<string, any[]>;
}

/**
 * Resolve a Series by slug, canonical_slug, or id.
 */
export async function resolveSeries(base44: any, slug?: string, series_id?: string): Promise<any | null> {
  if (slug) {
    let list = await base44.asServiceRole.entities.Series.filter({ slug }).catch(() => []);
    if (Array.isArray(list) && list.length > 0) return list[0];
    list = await base44.asServiceRole.entities.Series.filter({ canonical_slug: slug }).catch(() => []);
    if (Array.isArray(list) && list.length > 0) return list[0];
    return null;
  }
  if (series_id) {
    return await base44.asServiceRole.entities.Series.get(series_id).catch(() => null);
  }
  return null;
}

/**
 * Check if a Series is publicly visible.
 * Uses visibility_status ('live') and is_archived flag.
 */
export function isSeriesPublic(series: any): boolean {
  if (!series) return false;
  if (series.is_archived) return false;
  return series.visibility_status === 'live';
}

/**
 * Check if an Event is publicly visible.
 */
export function isEventPublic(event: any): boolean {
  if (!event) return false;
  if (event.is_archived) return false;
  return ['Published', 'Live', 'Completed'].includes(event.status);
}

/**
 * Load all data needed for Series experience computation.
 */
export async function loadSeriesContext(base44: any, series: any): Promise<SeriesContext> {
  const seriesId = series.id;

  const [
    classesResult, eventsResult, tracksResult, sessionsResult,
    resultsResult, standingsResult, entriesResult, seasonParticipationsResult,
    racerProfilesResult, teamsResult, vehiclesResult, driverCareerStatsResult,
    outletStoriesResult, entrySponsorsResult, driverSponsorsResult,
    allDriversResult,
  ] = await Promise.all([
    base44.asServiceRole.entities.SeriesClass.filter({ series_id: seriesId }).catch(() => []),
    base44.asServiceRole.entities.Event.filter({ series_id: seriesId }).catch(() => []),
    base44.asServiceRole.entities.Track.list().catch(() => []),
    base44.asServiceRole.entities.Session.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Results.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Standings.filter({ series_id: seriesId }).catch(() => []),
    base44.asServiceRole.entities.Entry.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.SeasonParticipation.filter({ series_id: seriesId }).catch(() => []),
    base44.asServiceRole.entities.RacerProfile.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Team.list().catch(() => []),
    base44.asServiceRole.entities.Vehicle.list().catch(() => []),
    base44.asServiceRole.entities.DriverCareerStats.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.OutletStory.list('-published_date', 200).catch(() => []),
    base44.asServiceRole.entities.EntrySponsor.list('-created_date', 200).catch(() => []),
    base44.asServiceRole.entities.DriverSponsor.list('-created_date', 200).catch(() => []),
    base44.asServiceRole.entities.Driver.list().catch(() => []),
  ]);

  const classes = classesResult as any[];
  const events = (eventsResult as any[]).filter((e: any) => !e.is_archived);
  const tracks = tracksResult as any[];
  const sessions = sessionsResult as any[];
  const results = resultsResult as any[];
  const standings = standingsResult as any[];
  const entries = (entriesResult as any[]).filter((e: any) => !e.is_archived);
  const seasonParticipations = seasonParticipationsResult as any[];
  const racerProfiles = racerProfilesResult as any[];
  const teams = teamsResult as any[];
  const vehicles = vehiclesResult as any[];
  const driverCareerStats = driverCareerStatsResult as any[];
  const outletStories = (outletStoriesResult as any[]).filter((s: any) => s.status === 'published');
  const entrySponsors = entrySponsorsResult as any[];
  const driverSponsors = driverSponsorsResult as any[];
  const allDrivers = allDriversResult as any[];

  // Build lookup maps
  const driverMap = new Map<string, any>();
  (allDrivers as any[]).forEach((d: any) => driverMap.set(d.id, d));

  const racerProfileMap = new Map<string, any>();
  const racerProfileByPersonMap = new Map<string, any>();
  (racerProfiles as any[]).forEach((rp: any) => {
    racerProfileMap.set(rp.id, rp);
    if (rp.legacy_driver_id) racerProfileMap.set(rp.legacy_driver_id, rp);
    if (rp.person_identity_id) racerProfileByPersonMap.set(rp.person_identity_id, rp);
  });

  const teamMap = new Map<string, any>();
  (teams as any[]).forEach((t: any) => teamMap.set(t.id, t));

  const vehicleMap = new Map<string, any>();
  (vehicles as any[]).forEach((v: any) => vehicleMap.set(v.id, v));

  const classMap = new Map<string, any>();
  (classes as any[]).forEach((c: any) => classMap.set(c.id, c));

  const eventMap = new Map<string, any>();
  (events as any[]).forEach((e: any) => eventMap.set(e.id, e));

  const trackMap = new Map<string, any>();
  (tracks as any[]).forEach((t: any) => trackMap.set(t.id, t));

  const sessionMap = new Map<string, any>();
  (sessions as any[]).forEach((s: any) => sessionMap.set(s.id, s));

  const participationMap = new Map<string, any>();
  const participationByRacerMap = new Map<string, any[]>();
  (seasonParticipations as any[]).forEach((p: any) => {
    participationMap.set(p.id, p);
    const rid = p.racer_profile_id;
    if (rid) {
      if (!participationByRacerMap.has(rid)) participationByRacerMap.set(rid, []);
      participationByRacerMap.get(rid)!.push(p);
    }
  });

  // Index results by event and session
  const resultsByEvent = new Map<string, any[]>();
  const resultsBySession = new Map<string, any[]>();
  (results as any[]).forEach((r: any) => {
    if (r.event_id) {
      if (!resultsByEvent.has(r.event_id)) resultsByEvent.set(r.event_id, []);
      resultsByEvent.get(r.event_id)!.push(r);
    }
    if (r.session_id) {
      if (!resultsBySession.has(r.session_id)) resultsBySession.set(r.session_id, []);
      resultsBySession.get(r.session_id)!.push(r);
    }
  });

  // Index entries by event
  const entriesByEvent = new Map<string, any[]>();
  (entries as any[]).forEach((e: any) => {
    if (e.event_id) {
      if (!entriesByEvent.has(e.event_id)) entriesByEvent.set(e.event_id, []);
      entriesByEvent.get(e.event_id)!.push(e);
    }
  });

  // Index events by season
  const eventsBySeason = new Map<string, any[]>();
  (events as any[]).forEach((e: any) => {
    const season = e.season || (e.event_date ? e.event_date.substring(0, 4) : null);
    if (season) {
      if (!eventsBySeason.has(season)) eventsBySeason.set(season, []);
      eventsBySeason.get(season)!.push(e);
    }
  });

  // Index standings by season+class
  const standingsBySeasonClass = new Map<string, any[]>();
  (standings as any[]).forEach((s: any) => {
    const key = `${s.season_year || ''}:${s.series_class_id || ''}`;
    if (!standingsBySeasonClass.has(key)) standingsBySeasonClass.set(key, []);
    standingsBySeasonClass.get(key)!.push(s);
  });

  return {
    series, classes, events, tracks, sessions, results, standings, entries,
    seasonParticipations, racerProfiles, teams, vehicles, driverCareerStats,
    outletStories, entrySponsors, driverSponsors, allDrivers,
    driverMap, racerProfileMap, racerProfileByPersonMap,
    teamMap, vehicleMap, classMap, eventMap, trackMap, sessionMap,
    participationMap, participationByRacerMap,
    resultsByEvent, resultsBySession, entriesByEvent, eventsBySeason, standingsBySeasonClass,
  };
}

/**
 * Resolve a racer identity from a driver_id or participation_id.
 * Uses RacerProfile (authoritative) with Driver as compatibility fallback.
 */
export function resolveRacer(ctx: SeriesContext, driverId?: string, participationId?: string): {
  racer_profile_id: string | null;
  display_name: string;
  slug: string | null;
  profile_url: string | null;
  profile_image_url: string | null;
  hometown_city: string | null;
  hometown_state: string | null;
  primary_discipline: string | null;
} {
  if (!driverId && !participationId) {
    return { racer_profile_id: null, display_name: 'Unknown', slug: null, profile_url: null, profile_image_url: null, hometown_city: null, hometown_state: null, primary_discipline: null };
  }
  const rp = driverId ? ctx.racerProfileMap.get(driverId) : null;
  const driver = driverId ? ctx.driverMap.get(driverId) : null;
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
 * Resolve a team from a team_id.
 */
export function resolveTeam(ctx: SeriesContext, teamId?: string): {
  team_id: string | null;
  name: string | null;
  slug: string | null;
  logo_url: string | null;
  profile_url: string | null;
} | null {
  if (!teamId) return null;
  const team = ctx.teamMap.get(teamId);
  if (!team) return { team_id: teamId, name: null, slug: null, logo_url: null, profile_url: null };
  const slug = team.slug || team.canonical_slug || null;
  return {
    team_id: teamId,
    name: team.name,
    slug,
    logo_url: team.logo_url || null,
    profile_url: slug ? `/teams/${slug}` : null,
  };
}

/**
 * Resolve a vehicle from a vehicle_id.
 */
export function resolveVehicle(ctx: SeriesContext, vehicleId?: string): {
  vehicle_id: string | null;
  nickname: string | null;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  profile_image_url: string | null;
  profile_url: string | null;
} | null {
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
 * Resolve a class from a series_class_id.
 */
export function resolveClass(ctx: SeriesContext, classId?: string): {
  class_id: string | null;
  class_name: string | null;
  competition_level: number | null;
  vehicle_type: string | null;
} | null {
  if (!classId) return null;
  const cls = ctx.classMap.get(classId);
  return {
    class_id: classId,
    class_name: cls?.class_name || null,
    competition_level: cls?.competition_level || null,
    vehicle_type: cls?.vehicle_type || null,
  };
}

/**
 * Resolve a track from a track_id.
 */
export function resolveTrack(ctx: SeriesContext, trackId?: string): {
  track_id: string | null;
  name: string | null;
  slug: string | null;
  location_city: string | null;
  location_state: string | null;
  profile_url: string | null;
} | null {
  if (!trackId) return null;
  const track = ctx.trackMap.get(trackId);
  if (!track) return { track_id: trackId, name: null, slug: null, location_city: null, location_state: null, profile_url: null };
  const slug = track.slug || track.canonical_slug || null;
  return {
    track_id: trackId,
    name: track.name,
    slug,
    location_city: track.location_city || null,
    location_state: track.location_state || null,
    profile_url: slug ? `/TrackProfile?slug=${slug}` : `/TrackProfile?id=${trackId}`,
  };
}

/**
 * Get all season years from events and standings.
 */
export function getAllSeasonYears(ctx: SeriesContext): string[] {
  const years = new Set<string>();
  ctx.events.forEach((e: any) => {
    const season = e.season || (e.event_date ? e.event_date.substring(0, 4) : null);
    if (season) years.add(season);
  });
  ctx.standings.forEach((s: any) => {
    if (s.season_year) years.add(s.season_year);
  });
  if (ctx.series.season_year) years.add(ctx.series.season_year);
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

/**
 * Get the current season year.
 * Uses Series.season_year if set, otherwise the most recent year from events.
 */
export function getCurrentSeasonYear(ctx: SeriesContext): string | null {
  if (ctx.series.season_year) return ctx.series.season_year;
  const years = getAllSeasonYears(ctx);
  return years.length > 0 ? years[0] : null;
}