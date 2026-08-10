/**
 * trackExperienceHelpers.ts
 *
 * Phase 15 — Shared helpers for Track experience computation and integrity
 * auditing. Extracted to prevent logic duplication between getTrackExperience
 * and auditTrackExperience.
 *
 * All functions are pure/read-only — no writes, no repairs.
 */

export interface TrackContext {
  track: any;
  events: any[];
  series: any[];
  seriesClasses: any[];
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
  allDrivers: any[];
  allTracks: any[];
  driverMap: Map<string, any>;
  racerProfileMap: Map<string, any>;
  racerProfileByPersonMap: Map<string, any>;
  teamMap: Map<string, any>;
  vehicleMap: Map<string, any>;
  seriesMap: Map<string, any>;
  classMap: Map<string, any>;
  eventMap: Map<string, any>;
  trackMap: Map<string, any>;
  sessionMap: Map<string, any>;
  participationMap: Map<string, any>;
  resultsByEvent: Map<string, any[]>;
  resultsBySession: Map<string, any[]>;
  entriesByEvent: Map<string, any[]>;
  eventsBySeason: Map<string, any[]>;
  standingsBySeasonClass: Map<string, any[]>;
}

/**
 * Resolve a Track by slug, canonical_slug, or id.
 * Checks slug first, then canonical_slug, then id.
 */
export async function resolveTrack(base44: any, slug?: string, track_id?: string): Promise<any | null> {
  if (slug) {
    let list = await base44.asServiceRole.entities.Track.filter({ slug }).catch(() => []);
    if (Array.isArray(list) && list.length > 0) return list[0];
    list = await base44.asServiceRole.entities.Track.filter({ canonical_slug: slug }).catch(() => []);
    if (Array.isArray(list) && list.length > 0) return list[0];
    return null;
  }
  if (track_id) {
    return await base44.asServiceRole.entities.Track.get(track_id).catch(() => null);
  }
  return null;
}

/**
 * Check if a Track is publicly visible.
 * Uses visibility_status ('live') and is_archived flag.
 */
export function isTrackPublic(track: any): boolean {
  if (!track) return false;
  if (track.is_archived) return false;
  return track.visibility_status === 'live';
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
 * Load all data needed for Track experience computation.
 */
export async function loadTrackContext(base44: any, track: any): Promise<TrackContext> {
  const trackId = track.id;

  const [
    eventsResult, allSeries, allClasses, sessionsResult,
    resultsResult, standingsResult, entriesResult,
    seasonParticipationsResult, racerProfilesResult, teamsResult,
    vehiclesResult, driverCareerStatsResult,
    outletStoriesResult, entrySponsorsResult,
    allDrivers, allTracks,
  ] = await Promise.all([
    base44.asServiceRole.entities.Event.filter({ track_id: trackId }).catch(() => []),
    base44.asServiceRole.entities.Series.list().catch(() => []),
    base44.asServiceRole.entities.SeriesClass.list().catch(() => []),
    base44.asServiceRole.entities.Session.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Results.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Standings.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Entry.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.SeasonParticipation.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.RacerProfile.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Team.list().catch(() => []),
    base44.asServiceRole.entities.Vehicle.list().catch(() => []),
    base44.asServiceRole.entities.DriverCareerStats.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.OutletStory.list('-published_date', 200).catch(() => []),
    base44.asServiceRole.entities.EntrySponsor.list('-created_date', 200).catch(() => []),
    base44.asServiceRole.entities.Driver.list().catch(() => []),
    base44.asServiceRole.entities.Track.list().catch(() => []),
  ]);

  const events = (eventsResult as any[]).filter((e: any) => !e.is_archived);
  const series = allSeries as any[];
  const classes = allClasses as any[];
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
  const allDriversList = allDrivers as any[];
  const allTracksList = allTracks as any[];

  // Build lookup maps
  const driverMap = new Map<string, any>();
  allDriversList.forEach((d: any) => driverMap.set(d.id, d));

  const racerProfileMap = new Map<string, any>();
  const racerProfileByPersonMap = new Map<string, any>();
  racerProfiles.forEach((rp: any) => {
    racerProfileMap.set(rp.id, rp);
    if (rp.legacy_driver_id) racerProfileMap.set(rp.legacy_driver_id, rp);
    if (rp.person_identity_id) racerProfileByPersonMap.set(rp.person_identity_id, rp);
  });

  const teamMap = new Map<string, any>();
  teams.forEach((t: any) => teamMap.set(t.id, t));

  const vehicleMap = new Map<string, any>();
  vehicles.forEach((v: any) => vehicleMap.set(v.id, v));

  const seriesMap = new Map<string, any>();
  series.forEach((s: any) => seriesMap.set(s.id, s));

  const classMap = new Map<string, any>();
  classes.forEach((c: any) => classMap.set(c.id, c));

  const eventMap = new Map<string, any>();
  events.forEach((e: any) => eventMap.set(e.id, e));

  const trackMap = new Map<string, any>();
  allTracksList.forEach((t: any) => trackMap.set(t.id, t));

  const sessionMap = new Map<string, any>();
  sessions.forEach((s: any) => sessionMap.set(s.id, s));

  const participationMap = new Map<string, any>();
  seasonParticipations.forEach((p: any) => participationMap.set(p.id, p));

  // Index results by event and session
  const resultsByEvent = new Map<string, any[]>();
  const resultsBySession = new Map<string, any[]>();
  results.forEach((r: any) => {
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
  entries.forEach((e: any) => {
    if (e.event_id) {
      if (!entriesByEvent.has(e.event_id)) entriesByEvent.set(e.event_id, []);
      entriesByEvent.get(e.event_id)!.push(e);
    }
  });

  // Index events by season
  const eventsBySeason = new Map<string, any[]>();
  events.forEach((e: any) => {
    const season = e.season || (e.event_date ? e.event_date.substring(0, 4) : null);
    if (season) {
      if (!eventsBySeason.has(season)) eventsBySeason.set(season, []);
      eventsBySeason.get(season)!.push(e);
    }
  });

  // Index standings by season+class
  const standingsBySeasonClass = new Map<string, any[]>();
  standings.forEach((s: any) => {
    const key = `${s.season_year || ''}:${s.series_class_id || ''}`;
    if (!standingsBySeasonClass.has(key)) standingsBySeasonClass.set(key, []);
    standingsBySeasonClass.get(key)!.push(s);
  });

  return {
    track, events, series, seriesClasses: classes, sessions, results, standings, entries,
    seasonParticipations, racerProfiles, teams, vehicles, driverCareerStats,
    outletStories, entrySponsors, allDrivers: allDriversList, allTracks: allTracksList,
    driverMap, racerProfileMap, racerProfileByPersonMap,
    teamMap, vehicleMap, seriesMap, classMap, eventMap, trackMap, sessionMap,
    participationMap,
    resultsByEvent, resultsBySession, entriesByEvent, eventsBySeason, standingsBySeasonClass,
  };
}

/**
 * Resolve a racer identity from a driver_id.
 * Uses RacerProfile (authoritative) with Driver as compatibility fallback.
 */
export function resolveRacer(ctx: TrackContext, driverId?: string): {
  racer_profile_id: string | null;
  display_name: string;
  slug: string | null;
  profile_url: string | null;
  profile_image_url: string | null;
  hometown_city: string | null;
  hometown_state: string | null;
  primary_discipline: string | null;
} {
  if (!driverId) {
    return { racer_profile_id: null, display_name: 'Unknown', slug: null, profile_url: null, profile_image_url: null, hometown_city: null, hometown_state: null, primary_discipline: null };
  }
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
 * Resolve a team from a team_id.
 */
export function resolveTeam(ctx: TrackContext, teamId?: string): {
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
export function resolveVehicle(ctx: TrackContext, vehicleId?: string): {
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
 * Resolve a series from a series_id.
 */
export function resolveSeries(ctx: TrackContext, seriesId?: string): {
  series_id: string | null;
  name: string | null;
  slug: string | null;
  logo_url: string | null;
  profile_url: string | null;
} | null {
  if (!seriesId) return null;
  const series = ctx.seriesMap.get(seriesId);
  if (!series) return { series_id: seriesId, name: null, slug: null, logo_url: null, profile_url: null };
  const slug = series.slug || series.canonical_slug || null;
  return {
    series_id: seriesId,
    name: series.name,
    slug,
    logo_url: series.logo_url || null,
    profile_url: slug ? `/series/${slug}` : null,
  };
}

/**
 * Get all season years from events at this track.
 */
export function getAllSeasonYears(ctx: TrackContext): string[] {
  const years = new Set<string>();
  ctx.events.forEach((e: any) => {
    const season = e.season || (e.event_date ? e.event_date.substring(0, 4) : null);
    if (season) years.add(season);
  });
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}