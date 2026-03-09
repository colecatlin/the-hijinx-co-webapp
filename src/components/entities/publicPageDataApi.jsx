/**
 * publicPageDataApi.js
 *
 * Page-level data loaders for public motorsports profile pages.
 * Each function fetches and returns all data needed for a profile page.
 * Centralizes the "resolve primary + load related data" pattern.
 *
 * All functions are safe: they never throw, and return null / [] for missing data.
 */

import { base44 } from '@/api/base44Client';
import { resolveEntityByRouteParam, resolveLinkedEntityById } from './publicEntityResolver';

/** Wraps a promise so it never rejects – returns fallback instead */
const safe = (promise, fallback) => promise.catch(() => fallback);

// ---------------------------------------------------------------------------
// Driver Profile
// ---------------------------------------------------------------------------

/**
 * Fetch all data needed for a Driver profile page.
 *
 * @param {{ id?: string, slug?: string, first?: string, last?: string }}
 * @returns {Promise<{
 *   driver: object|null,
 *   team: object|null,
 *   media: object|null,
 *   programs: object[],
 *   entries: object[],
 *   results: object[],
 *   sessions: object[],
 *   series: object[],
 *   classes: object[]
 * }>}
 */
export async function getDriverProfileData({ id, slug, first, last }) {
  const driver = await resolveEntityByRouteParam({
    entityType: 'Driver',
    id,
    slug,
    first,
    last,
  });
  if (!driver) return { driver: null };

  const [
    teamResult,
    mediaResult,
    programsResult,
    entriesResult,
    resultsResult,
    sessionsResult,
    seriesResult,
    classesResult,
  ] = await Promise.allSettled([
    driver.team_id
      ? resolveLinkedEntityById({ entityType: 'Team', entityId: driver.team_id })
      : Promise.resolve(null),
    base44.entities.DriverMedia.filter({ driver_id: driver.id })
      .then(r => (Array.isArray(r) && r.length > 0 ? r[0] : null))
      .catch(() => null),
    safe(base44.entities.DriverProgram.filter({ driver_id: driver.id }), []),
    safe(base44.entities.Entry.filter({ driver_id: driver.id }), []),
    safe(base44.entities.Results.filter({ driver_id: driver.id }), []),
    safe(base44.entities.Session.list(), []),
    safe(base44.entities.Series.list(), []),
    safe(base44.entities.SeriesClass.list(), []),
  ]);

  return {
    driver,
    team:     teamResult.status    === 'fulfilled' ? teamResult.value    : null,
    media:    mediaResult.status   === 'fulfilled' ? mediaResult.value   : null,
    programs: programsResult.status === 'fulfilled' ? programsResult.value : [],
    entries:  entriesResult.status  === 'fulfilled' ? entriesResult.value  : [],
    results:  resultsResult.status  === 'fulfilled' ? resultsResult.value  : [],
    sessions: sessionsResult.status === 'fulfilled' ? sessionsResult.value : [],
    series:   seriesResult.status   === 'fulfilled' ? seriesResult.value   : [],
    classes:  classesResult.status  === 'fulfilled' ? classesResult.value  : [],
  };
}

// ---------------------------------------------------------------------------
// Team Profile
// ---------------------------------------------------------------------------

/**
 * Fetch all data needed for a Team profile page.
 *
 * @param {{ id?: string, slug?: string }}
 * @returns {Promise<{
 *   team: object|null,
 *   roster_drivers: object[],
 *   programs: object[],
 *   entries: object[],
 *   results: object[],
 *   events: object[],
 *   tracks: object[]
 * }>}
 */
export async function getTeamProfileData({ id, slug }) {
  const team = await resolveEntityByRouteParam({ entityType: 'Team', id, slug });
  if (!team) return { team: null };

  const [
    programsResult,
    directDriversResult,
    entriesResult,
    resultsResult,
    eventsResult,
    tracksResult,
  ] = await Promise.allSettled([
    safe(base44.entities.DriverProgram.filter({ team_id: team.id }), []),
    safe(base44.entities.Driver.filter({ team_id: team.id }), []),
    safe(base44.entities.Entry.filter({ team_id: team.id }), []),
    safe(base44.entities.Results.filter({ team_id: team.id }), []),
    safe(base44.entities.Event.list(), []),
    safe(base44.entities.Track.list(), []),
  ]);

  const programs = programsResult.status === 'fulfilled' ? programsResult.value : [];
  const directDrivers = directDriversResult.status === 'fulfilled' ? directDriversResult.value : [];

  // Build deduped roster: direct team_id assignment + program-linked drivers
  const directIds = new Set(directDrivers.map(d => d.id));
  const programDriverIds = [...new Set(programs.map(p => p.driver_id).filter(Boolean))];
  const missingIds = programDriverIds.filter(pid => !directIds.has(pid));

  let programDrivers = [];
  if (missingIds.length > 0) {
    const settled = await Promise.allSettled(
      missingIds.map(mid => base44.entities.Driver.get(mid).catch(() => null))
    );
    programDrivers = settled
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);
  }

  const rosterMap = new Map();
  [...directDrivers, ...programDrivers].forEach(d => {
    if (d?.id) rosterMap.set(d.id, d);
  });

  return {
    team,
    roster_drivers: [...rosterMap.values()],
    programs,
    entries: entriesResult.status === 'fulfilled' ? entriesResult.value : [],
    results: resultsResult.status === 'fulfilled' ? resultsResult.value : [],
    events:  eventsResult.status  === 'fulfilled' ? eventsResult.value  : [],
    tracks:  tracksResult.status  === 'fulfilled' ? tracksResult.value  : [],
  };
}

// ---------------------------------------------------------------------------
// Track Profile
// ---------------------------------------------------------------------------

/**
 * Fetch all data needed for a Track profile page.
 *
 * @param {{ id?: string, slug?: string }}
 * @returns {Promise<{
 *   track: object|null,
 *   events: object[],
 *   disciplines: object[],
 *   track_events: object[],
 *   series_links: object[],
 *   media: object|null,
 *   performance: object|null,
 *   operations: object|null,
 *   community: object|null
 * }>}
 */
export async function getTrackProfileData({ id, slug }) {
  const track = await resolveEntityByRouteParam({ entityType: 'Track', id, slug });
  if (!track) return { track: null };

  const [
    allEventsResult,
    disciplinesResult,
    trackEventsResult,
    seriesLinksResult,
    mediaResult,
    performanceResult,
    operationsResult,
    communityResult,
  ] = await Promise.allSettled([
    safe(base44.entities.Event.list(), []),
    safe(base44.entities.TrackToDiscipline.filter({ track_id: track.id }), []),
    safe(base44.entities.TrackEvent.filter({ track_id: track.id }), []),
    safe(base44.entities.TrackSeries.filter({ track_id: track.id }), []),
    base44.entities.TrackMedia.filter({ track_id: track.id })
      .then(r => (Array.isArray(r) && r.length > 0 ? r[0] : null))
      .catch(() => null),
    base44.entities.TrackPerformance.filter({ track_id: track.id })
      .then(r => (Array.isArray(r) && r.length > 0 ? r[0] : null))
      .catch(() => null),
    base44.entities.TrackOperations.filter({ track_id: track.id })
      .then(r => (Array.isArray(r) && r.length > 0 ? r[0] : null))
      .catch(() => null),
    base44.entities.TrackCommunity.filter({ track_id: track.id })
      .then(r => (Array.isArray(r) && r.length > 0 ? r[0] : null))
      .catch(() => null),
  ]);

  return {
    track,
    events:       allEventsResult.status   === 'fulfilled' ? allEventsResult.value   : [],
    disciplines:  disciplinesResult.status  === 'fulfilled' ? disciplinesResult.value  : [],
    track_events: trackEventsResult.status  === 'fulfilled' ? trackEventsResult.value  : [],
    series_links: seriesLinksResult.status  === 'fulfilled' ? seriesLinksResult.value  : [],
    media:        mediaResult.status        === 'fulfilled' ? mediaResult.value        : null,
    performance:  performanceResult.status  === 'fulfilled' ? performanceResult.value  : null,
    operations:   operationsResult.status   === 'fulfilled' ? operationsResult.value   : null,
    community:    communityResult.status    === 'fulfilled' ? communityResult.value    : null,
  };
}

// ---------------------------------------------------------------------------
// Series Detail
// ---------------------------------------------------------------------------

/**
 * Fetch all data needed for a Series detail page.
 *
 * IMPORTANT: Events are matched by series_id, NOT by series name string.
 * A name-based fallback is used only when zero series_id matches exist,
 * and a console.warn is emitted to flag records that need backfilling.
 *
 * @param {{ id?: string, slug?: string }}
 * @returns {Promise<{
 *   series: object|null,
 *   classes: object[],
 *   events: object[],
 *   tracks: object[],
 *   sessions: object[],
 *   results: object[],
 *   standings: object[]
 * }>}
 */
export async function getSeriesDetailData({ id, slug }) {
  const series = await resolveEntityByRouteParam({ entityType: 'Series', id, slug });
  if (!series) return { series: null };

  const [
    classesResult,
    allEventsResult,
    tracksResult,
    sessionsResult,
    resultsResult,
    standingsResult,
  ] = await Promise.allSettled([
    safe(base44.entities.SeriesClass.filter({ series_id: series.id }), []),
    safe(base44.entities.Event.list(), []),
    safe(base44.entities.Track.list(), []),
    safe(base44.entities.Session.list(), []),
    safe(base44.entities.Results.list(), []),
    safe(base44.entities.Standings.list(), []),
  ]);

  const allEvents = allEventsResult.status === 'fulfilled' ? allEventsResult.value : [];

  // Primary match: series_id (reliable)
  let seriesEvents = allEvents.filter(e => e.series_id === series.id);

  // Fallback: name match when no series_id links exist yet
  if (seriesEvents.length === 0 && allEvents.length > 0) {
    const seriesNames = [series.name, series.full_name]
      .filter(Boolean)
      .map(n => n.toLowerCase().trim());
    const nameMatches = allEvents.filter(e => {
      if (!e.series) return false;
      const evSeries = e.series.toLowerCase().trim();
      return seriesNames.some(n => n === evSeries);
    });
    if (nameMatches.length > 0) {
      console.warn(
        `[publicPageDataApi] Series "${series.name}" (${series.id}): ` +
        `No events matched by series_id. Falling back to ${nameMatches.length} name-matched events. ` +
        `Consider backfilling event.series_id for these records.`
      );
      seriesEvents = nameMatches;
    }
  }

  return {
    series,
    classes:   classesResult.status   === 'fulfilled' ? classesResult.value   : [],
    events:    seriesEvents,
    tracks:    tracksResult.status    === 'fulfilled' ? tracksResult.value    : [],
    sessions:  sessionsResult.status  === 'fulfilled' ? sessionsResult.value  : [],
    results:   resultsResult.status   === 'fulfilled' ? resultsResult.value   : [],
    standings: standingsResult.status === 'fulfilled' ? standingsResult.value : [],
  };
}

// ---------------------------------------------------------------------------
// Event Profile
// ---------------------------------------------------------------------------

/**
 * Fetch all data needed for an Event profile page.
 * Supports resolution by id or slug.
 * Returns series as a single object (not array).
 *
 * @param {{ id?: string, slug?: string }}
 * @returns {Promise<{
 *   event: object|null,
 *   track: object|null,
 *   series: object|null,
 *   sessions: object[],
 *   classes: object[],
 *   results: object[],
 *   standings: object[]
 * }>}
 */
export async function getEventProfileData({ id, slug }) {
  const event = await resolveEntityByRouteParam({ entityType: 'Event', id, slug });
  if (!event) return { event: null };

  const [
    trackResult,
    seriesResult,
    sessionsResult,
    classesResult,
    resultsResult,
    standingsResult,
  ] = await Promise.allSettled([
    event.track_id
      ? resolveLinkedEntityById({ entityType: 'Track', entityId: event.track_id })
      : Promise.resolve(null),
    event.series_id
      ? resolveLinkedEntityById({ entityType: 'Series', entityId: event.series_id })
      : Promise.resolve(null),
    safe(base44.entities.Session.filter({ event_id: event.id }), []),
    event.series_id
      ? safe(base44.entities.SeriesClass.filter({ series_id: event.series_id, active: true }), [])
      : Promise.resolve([]),
    safe(base44.entities.Results.filter({ event_id: event.id }), []),
    safe(base44.entities.Standings.list(), []),
  ]);

  return {
    event,
    track:     trackResult.status     === 'fulfilled' ? trackResult.value     : null,
    series:    seriesResult.status    === 'fulfilled' ? seriesResult.value    : null,
    sessions:  sessionsResult.status  === 'fulfilled' ? sessionsResult.value  : [],
    classes:   classesResult.status   === 'fulfilled' ? classesResult.value   : [],
    results:   resultsResult.status   === 'fulfilled' ? resultsResult.value   : [],
    standings: standingsResult.status === 'fulfilled' ? standingsResult.value : [],
  };
}