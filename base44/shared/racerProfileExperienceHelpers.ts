/**
 * racerProfileExperienceHelpers.ts
 *
 * Phase 10 — Shared helpers for RacerProfile experience computation
 * and integrity auditing. Extracted to prevent logic duplication between
 * getRacerProfileExperience and auditRacerProfileExperience.
 *
 * All functions are pure/read-only — no writes, no repairs.
 */

export interface RacerProfileContext {
  racerProfile: any;
  identity: any | null;
  identityId: string | null;
  legacyDriverId: string | null;
  participations: any[];
  participationIds: string[];
  entries: any[];
  racerEntries: any[];
  racerResults: any[];
  racerStandings: any[];
  driverPrograms: any[];
  driverMedia: any[];
  driverSponsors: any[];
  allSeries: any[];
  allClasses: any[];
  allEvents: any[];
  allTracks: any[];
  allSessions: any[];
  allTeams: any[];
  allVehicles: any[];
  outletStories: any[];
  seriesMap: Map<string, any>;
  classMap: Map<string, any>;
  eventMap: Map<string, any>;
  trackMap: Map<string, any>;
  sessionMap: Map<string, any>;
  teamMap: Map<string, any>;
  vehicleMap: Map<string, any>;
}

/**
 * Resolve a RacerProfile by slug or ID.
 */
export async function resolveRacerProfile(base44: any, slug?: string, racer_profile_id?: string): Promise<any | null> {
  if (slug) {
    const list = await base44.asServiceRole.entities.RacerProfile.filter({ slug }).catch(() => []);
    return Array.isArray(list) && list.length > 0 ? list[0] : null;
  }
  if (racer_profile_id) {
    return await base44.asServiceRole.entities.RacerProfile.get(racer_profile_id).catch(() => null);
  }
  return null;
}

/**
 * Load all data needed for RacerProfile experience computation.
 * Returns a fully-resolved context object with lookup maps.
 */
export async function loadRacerProfileContext(base44: any, racerProfile: any): Promise<RacerProfileContext> {
  const identityId = racerProfile.person_identity_id;
  const legacyDriverId = racerProfile.legacy_driver_id;

  const [
    identity, participations, entries, results, standings,
    allSeries, allClasses, allEvents, allTracks, allSessions, allTeams,
    allVehicles, driverPrograms, driverMedia, driverSponsors, outletStories,
  ] = await Promise.all([
    identityId ? base44.asServiceRole.entities.PersonIdentity.filter({ id: identityId }).catch(() => []) : Promise.resolve([]),
    base44.asServiceRole.entities.SeasonParticipation.filter({ racer_profile_id: racerProfile.id }).catch(() => []),
    base44.asServiceRole.entities.Entry.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Results.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Standings.list('-created_date', 500).catch(() => []),
    base44.asServiceRole.entities.Series.list().catch(() => []),
    base44.asServiceRole.entities.SeriesClass.list().catch(() => []),
    base44.asServiceRole.entities.Event.list().catch(() => []),
    base44.asServiceRole.entities.Track.list().catch(() => []),
    base44.asServiceRole.entities.Session.list().catch(() => []),
    base44.asServiceRole.entities.Team.list().catch(() => []),
    base44.asServiceRole.entities.Vehicle.list().catch(() => []),
    legacyDriverId ? base44.asServiceRole.entities.DriverProgram.filter({ driver_id: legacyDriverId }).catch(() => []) : Promise.resolve([]),
    legacyDriverId ? base44.asServiceRole.entities.DriverMedia.filter({ driver_id: legacyDriverId }).catch(() => []) : Promise.resolve([]),
    legacyDriverId ? base44.asServiceRole.entities.DriverSponsor.filter({ driver_id: legacyDriverId }).catch(() => []) : Promise.resolve([]),
    base44.asServiceRole.entities.OutletStory.list('-published_date', 200).catch(() => []),
  ]);

  const identityRecord = (identity as any[])?.[0] || null;
  const participationIds = (participations as any[]).map((p: any) => p.id);
  const driverId = legacyDriverId || null;

  // Filter entries to this racer's participations
  const racerEntries = (entries as any[]).filter((e: any) =>
    participationIds.includes(e.participation_id) || (driverId && e.driver_id === driverId)
  );

  const entryIds = new Set(racerEntries.map((e: any) => e.id));
  const racerResults = (results as any[]).filter((r: any) =>
    (r.entry_id && entryIds.has(r.entry_id)) || (driverId && r.driver_id === driverId)
  );

  const racerStandings = (standings as any[]).filter((s: any) =>
    participationIds.includes(s.participation_id) || (driverId && s.driver_id === driverId)
  );

  // Build lookup maps
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
  const teamMap = new Map<string, any>();
  (allTeams as any[]).forEach((t: any) => teamMap.set(t.id, t));
  const vehicleMap = new Map<string, any>();
  (allVehicles as any[]).forEach((v: any) => vehicleMap.set(v.id, v));

  return {
    racerProfile,
    identity: identityRecord,
    identityId,
    legacyDriverId,
    participations: participations as any[],
    participationIds,
    entries: entries as any[],
    racerEntries,
    racerResults,
    racerStandings,
    driverPrograms: driverPrograms as any[],
    driverMedia: driverMedia as any[],
    driverSponsors: driverSponsors as any[],
    allSeries: allSeries as any[],
    allClasses: allClasses as any[],
    allEvents: allEvents as any[],
    allTracks: allTracks as any[],
    allSessions: allSessions as any[],
    allTeams: allTeams as any[],
    allVehicles: allVehicles as any[],
    outletStories: outletStories as any[],
    seriesMap,
    classMap,
    eventMap,
    trackMap,
    sessionMap,
    teamMap,
    vehicleMap,
  };
}