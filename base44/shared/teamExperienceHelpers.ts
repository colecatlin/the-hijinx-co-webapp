/**
 * teamExperienceHelpers.ts
 *
 * Phase 11 — Shared helpers for Team experience computation and integrity
 * auditing. Extracted to prevent logic duplication between getTeamExperience
 * and auditTeamExperience.
 *
 * All functions are pure/read-only — no writes, no repairs.
 */

export interface TeamContext {
  team: any;
  entries: any[];
  teamEntries: any[];
  teamResults: any[];
  teamStandings: any[];
  driverPrograms: any[];
  teamDriverPrograms: any[];
  entrySponsors: any[];
  driverMedia: any[];
  outletStories: any[];
  allDrivers: any[];
  allRacerProfiles: any[];
  allVehicles: any[];
  allSeries: any[];
  allClasses: any[];
  allEvents: any[];
  allTracks: any[];
  allSessions: any[];
  allTeams: any[];
  driverMap: Map<string, any>;
  racerProfileMap: Map<string, any>;
  vehicleMap: Map<string, any>;
  seriesMap: Map<string, any>;
  classMap: Map<string, any>;
  eventMap: Map<string, any>;
  trackMap: Map<string, any>;
  sessionMap: Map<string, any>;
}

/**
 * Resolve a Team by slug or ID.
 */
export async function resolveTeam(base44: any, slug?: string, team_id?: string): Promise<any | null> {
  if (slug) {
    const list = await base44.asServiceRole.entities.Team.filter({ slug }).catch(() => []);
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  }
  if (team_id) {
    return await base44.asServiceRole.entities.Team.get(team_id).catch(() => null);
  }
  return null;
}

/**
 * Load all data needed for Team experience computation.
 * Returns a fully-resolved context object with lookup maps.
 */
export async function loadTeamContext(base44: any, team: any): Promise<TeamContext> {
  const teamId = team.id;

  const [
    entries, results, standings, driverPrograms, entrySponsors,
    allDrivers, allRacerProfiles, allVehicles, allSeries, allClasses,
    allEvents, allTracks, allSessions, allTeams, driverMedia, outletStories,
  ] = await Promise.all([
    base44.asServiceRole.entities.Entry.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Results.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Standings.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.DriverProgram.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.EntrySponsor.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Driver.list().catch(() => []),
    base44.asServiceRole.entities.RacerProfile.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Vehicle.list().catch(() => []),
    base44.asServiceRole.entities.Series.list().catch(() => []),
    base44.asServiceRole.entities.SeriesClass.list().catch(() => []),
    base44.asServiceRole.entities.Event.list().catch(() => []),
    base44.asServiceRole.entities.Track.list().catch(() => []),
    base44.asServiceRole.entities.Session.list().catch(() => []),
    base44.asServiceRole.entities.Team.list().catch(() => []),
    base44.asServiceRole.entities.DriverMedia.list('-created_date', 200).catch(() => []),
    base44.asServiceRole.entities.OutletStory.list('-published_date', 200).catch(() => []),
  ]);

  // Filter to this team's entries
  const teamEntries = (entries as any[]).filter((e: any) => e.team_id === teamId);
  const entryIds = new Set(teamEntries.map((e: any) => e.id));

  // Results for this team (via entry_id or team_id)
  const teamResults = (results as any[]).filter((r: any) =>
    (r.entry_id && entryIds.has(r.entry_id)) || r.team_id === teamId
  );

  // Standings for drivers on this team (via driver programs)
  const teamDriverPrograms = (driverPrograms as any[]).filter((dp: any) => dp.team_id === teamId);
  const teamDriverIds = new Set(teamDriverPrograms.map((dp: any) => dp.driver_id));
  const teamStandings = (standings as any[]).filter((s: any) =>
    teamDriverIds.has(s.driver_id)
  );

  // Entry sponsors for this team's entries
  const teamEntrySponsors = (entrySponsors as any[]).filter((es: any) =>
    entryIds.has(es.entry_id)
  );

  // Build lookup maps
  const driverMap = new Map<string, any>();
  (allDrivers as any[]).forEach((d: any) => driverMap.set(d.id, d));
  const racerProfileMap = new Map<string, any>();
  (allRacerProfiles as any[]).forEach((rp: any) => {
    racerProfileMap.set(rp.id, rp);
    if (rp.legacy_driver_id) racerProfileMap.set(rp.legacy_driver_id, rp);
  });
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
  (allSessions as any[]).forEach((s: any) => sessionMap.set(s.id, s));

  return {
    team,
    entries: entries as any[],
    teamEntries,
    teamResults,
    teamStandings,
    driverPrograms: driverPrograms as any[],
    teamDriverPrograms,
    entrySponsors: teamEntrySponsors,
    driverMedia: driverMedia as any[],
    outletStories: outletStories as any[],
    allDrivers: allDrivers as any[],
    allRacerProfiles: allRacerProfiles as any[],
    allVehicles: allVehicles as any[],
    allSeries: allSeries as any[],
    allClasses: allClasses as any[],
    allEvents: allEvents as any[],
    allTracks: allTracks as any[],
    allSessions: allSessions as any[],
    allTeams: allTeams as any[],
    driverMap,
    racerProfileMap,
    vehicleMap,
    seriesMap,
    classMap,
    eventMap,
    trackMap,
    sessionMap,
  };
}