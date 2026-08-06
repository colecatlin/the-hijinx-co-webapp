/**
 * publicRacerProfileApi.jsx
 *
 * Phase 7 — Shared public RacerProfile query and compatibility helpers.
 *
 * The authoritative public racer entity is now RacerProfile (backed by
 * PersonIdentity). Driver remains as a temporary legacy compatibility
 * entity. All public reads resolve through RacerProfile.
 *
 * Lookup priority for public racer pages:
 *   1. RacerProfile.slug                  → /racers/:slug
 *   2. RacerProfile.legacy_driver_id      → compatibility from Driver slug/id
 *   3. Driver.canonical_slug / Driver.id  → legacy redirect to /racers/:slug
 *
 * Visibility rules:
 *   - visibility === 'live'   → public
 *   - is_archived === true    → excluded from public
 *   - visibility === 'draft'  → admin preview only
 */

import { base44 } from '@/api/base44Client';
import { sortSeriesClassesByHierarchy } from '@/lib/classHierarchy';

const safe = (promise, fallback) => promise.catch(() => fallback);

/**
 * Check if a RacerProfile is publicly visible.
 * Excludes draft and archived profiles.
 */
export function isRacerProfilePublic(rp) {
  if (!rp) return false;
  if (rp.is_archived) return false;
  if (rp.visibility !== 'live') return false;
  return true;
}

/**
 * Resolve a RacerProfile by slug.
 * Returns null if not found or not public (unless admin).
 */
export async function resolveRacerProfileBySlug(slug, { allowDraft = false } = {}) {
  if (!slug) return null;
  const list = await safe(base44.entities.RacerProfile.filter({ slug }), []);
  const rp = Array.isArray(list) && list.length > 0 ? list[0] : null;
  if (!rp) return null;
  if (!allowDraft && !isRacerProfilePublic(rp)) return null;
  return rp;
}

/**
 * Resolve a RacerProfile by legacy Driver ID.
 * Used for compatibility redirects from /drivers/:slug → /racers/:slug.
 */
export async function resolveRacerProfileByLegacyDriverId(driverId, { allowDraft = false } = {}) {
  if (!driverId) return null;
  const list = await safe(base44.entities.RacerProfile.filter({ legacy_driver_id: driverId }), []);
  const rp = Array.isArray(list) && list.length > 0 ? list[0] : null;
  if (!rp) return null;
  if (!allowDraft && !isRacerProfilePublic(rp)) return null;
  return rp;
}

/**
 * Resolve a RacerProfile by person_identity_id.
 */
export async function resolveRacerProfileByIdentityId(identityId, { allowDraft = false } = {}) {
  if (!identityId) return null;
  const list = await safe(base44.entities.RacerProfile.filter({ person_identity_id: identityId }), []);
  const rp = Array.isArray(list) && list.length > 0 ? list[0] : null;
  if (!rp) return null;
  if (!allowDraft && !isRacerProfilePublic(rp)) return null;
  return rp;
}

/**
 * List all public RacerProfiles.
 * Excludes draft and archived.
 */
export async function listPublicRacerProfiles(limit = 500) {
  const all = await safe(base44.entities.RacerProfile.list('-created_date', limit), []);
  return (Array.isArray(all) ? all : []).filter(isRacerProfilePublic);
}

/**
 * Fetch all data needed for a public RacerProfile page.
 *
 * Resolves through the modern chain:
 *   RacerProfile → PersonIdentity → SeasonParticipation → Entry → Results → Standings
 *
 * @param {{ slug?: string, legacyDriverId?: string, identityId?: string, allowDraft?: boolean }}
 */
export async function getRacerProfilePageData({ slug, legacyDriverId, identityId, allowDraft = false }) {
  let racerProfile = null;
  if (slug) {
    racerProfile = await resolveRacerProfileBySlug(slug, { allowDraft });
  } else if (legacyDriverId) {
    racerProfile = await resolveRacerProfileByLegacyDriverId(legacyDriverId, { allowDraft });
  } else if (identityId) {
    racerProfile = await resolveRacerProfileByIdentityId(identityId, { allowDraft });
  }
  if (!racerProfile) return { racerProfile: null };

  const identityIdResolved = racerProfile.person_identity_id;

  const [
    identityResult,
    participationsResult,
    entriesResult,
    resultsResult,
    standingsResult,
    careerStatsResult,
    driverMediaResult,
    programsResult,
    careerEntriesResult,
    sponsorsResult,
    allSeriesResult,
    allClassesResult,
    allEventsResult,
    allTracksResult,
    allSessionsResult,
    legacyDriverResult,
    allTeamsResult,
  ] = await Promise.allSettled([
    identityIdResolved
      ? safe(base44.entities.PersonIdentity.filter({ id: identityIdResolved }), [])
      : Promise.resolve([]),
    safe(base44.entities.SeasonParticipation.filter({ racer_profile_id: racerProfile.id }), []),
    safe(base44.entities.Entry.filter({ participation_id: null }), []), // placeholder — resolved below
    safe(base44.entities.Results.list('-created_date', 500), []),
    safe(base44.entities.Standings.list('-created_date', 500), []),
    identityIdResolved
      ? safe(base44.entities.DriverCareerStats.filter({ identity_id: identityIdResolved }), [])
      : Promise.resolve([]),
    safe(base44.entities.DriverMedia.filter({ driver_id: racerProfile.legacy_driver_id }), []),
    racerProfile.legacy_driver_id
      ? safe(base44.entities.DriverProgram.filter({ driver_id: racerProfile.legacy_driver_id }), [])
      : Promise.resolve([]),
    racerProfile.legacy_driver_id
      ? safe(base44.entities.DriverCareerEntry.filter({ driver_id: racerProfile.legacy_driver_id }), [])
      : Promise.resolve([]),
    racerProfile.legacy_driver_id
      ? safe(base44.entities.DriverSponsor.filter({ driver_id: racerProfile.legacy_driver_id }), [])
      : Promise.resolve([]),
    safe(base44.entities.Series.list(), []),
    safe(base44.entities.SeriesClass.list(), []),
    safe(base44.entities.Event.list(), []),
    safe(base44.entities.Track.list(), []),
    safe(base44.entities.Session.list(), []),
    racerProfile.legacy_driver_id
      ? safe(base44.entities.Driver.filter({ id: racerProfile.legacy_driver_id }), [])
      : Promise.resolve([]),
    safe(base44.entities.Team.list(), []),
  ]);

  const identity = identityResult.status === 'fulfilled' && identityResult.value?.[0]
    ? identityResult.value[0] : null;
  const participations = participationsResult.status === 'fulfilled' ? participationsResult.value : [];
  const allResults = resultsResult.status === 'fulfilled' ? resultsResult.value : [];
  const allStandings = standingsResult.status === 'fulfilled' ? standingsResult.value : [];
  const careerStatsList = careerStatsResult.status === 'fulfilled' ? careerStatsResult.value : [];
  const mediaList = driverMediaResult.status === 'fulfilled' ? driverMediaResult.value : [];
  const programs = programsResult.status === 'fulfilled' ? programsResult.value : [];
  const careerEntries = careerEntriesResult.status === 'fulfilled' ? careerEntriesResult.value : [];
  const sponsors = sponsorsResult.status === 'fulfilled' ? sponsorsResult.value : [];
  const allSeries = allSeriesResult.status === 'fulfilled' ? allSeriesResult.value : [];
  const allClasses = allClassesResult.status === 'fulfilled' ? allClassesResult.value : [];
  const allEvents = allEventsResult.status === 'fulfilled' ? allEventsResult.value : [];
  const allTracks = allTracksResult.status === 'fulfilled' ? allTracksResult.value : [];
  const allSessions = allSessionsResult.status === 'fulfilled' ? allSessionsResult.value : [];
  const legacyDriverList = legacyDriverResult.status === 'fulfilled' ? legacyDriverResult.value : [];
  const allTeams = allTeamsResult.status === 'fulfilled' ? allTeamsResult.value : [];

  const legacyDriver = legacyDriverList?.[0] || null;
  const media = mediaList?.[0] || null;
  const careerStats = careerStatsList?.[0] || null;

  // Resolve entries through SeasonParticipation IDs
  const participationIds = participations.map(p => p.id);
  let entries = [];
  if (participationIds.length > 0) {
    const entrySettled = await Promise.allSettled(
      participationIds.map(pid => base44.entities.Entry.filter({ participation_id: pid }).catch(() => []))
    );
    entries = entrySettled
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value || []);
  }
  // Fallback: if no participation-based entries, try legacy driver_id
  if (entries.length === 0 && legacyDriver) {
    entries = await safe(base44.entities.Entry.filter({ driver_id: legacyDriver.id }), []);
  }

  // Filter results to only those linked to this racer's entries
  const entryIds = new Set(entries.map(e => e.id));
  const driverId = legacyDriver?.id || racerProfile.legacy_driver_id || null;
  const results = allResults.filter(r =>
    (r.entry_id && entryIds.has(r.entry_id)) ||
    (driverId && r.driver_id === driverId)
  );

  // Filter standings to this racer's participations
  const standings = allStandings.filter(s =>
    participationIds.includes(s.participation_id) ||
    (driverId && s.driver_id === driverId)
  );

  return {
    racerProfile,
    identity,
    legacyDriver,
    media,
    careerStats,
    participations,
    entries,
    results,
    standings,
    programs,
    careerEntries,
    sponsors,
    series: allSeries,
    classes: sortSeriesClassesByHierarchy(allClasses),
    events: allEvents,
    tracks: allTracks,
    sessions: allSessions,
    teams: allTeams,
  };
}