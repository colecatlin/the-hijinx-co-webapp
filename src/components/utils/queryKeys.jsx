/**
 * Centralized, stable React Query key factory for Index46.
 *
 * Rules:
 * - All functions return ARRAYS, never strings.
 * - Filter objects are normalized (sorted keys) so the same filters always
 *   produce identical keys regardless of insertion order.
 * - If filters is undefined the key is still stable.
 */

/** Normalize a filters object to sorted-key form so key identity is stable. */
function norm(filters) {
  if (!filters || typeof filters !== 'object') return {};
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

export const QueryKeys = {
  auth: {
    me: ()            => ['currentUser'],
    status: ()        => ['isAuthenticated'],
  },

  drivers: {
    list: (filters)   => ['drivers', norm(filters)],
    byId: (driverId)  => ['driver', driverId],
    bySlug: (slug)    => ['driver', 'slug', slug],
  },

  teams: {
    list: (filters)   => ['teams', norm(filters)],
    byId: (teamId)    => ['team', teamId],
    bySlug: (slug)    => ['team', 'slug', slug],
  },

  tracks: {
    list: (filters)   => ['tracks', norm(filters)],
    byId: (trackId)   => ['selectedTrack', trackId],
    bySlug: (slug)    => ['track', 'slug', slug],
  },

  series: {
    list: (filters)   => ['series', norm(filters)],
    byId: (seriesId)  => ['selectedSeries', seriesId],
    bySlug: (slug)    => ['series', 'slug', slug],
    classes: (seriesId) => ['seriesClasses', seriesId],
  },

  events: {
    /**
     * filters: { trackId, seriesId, seasonYear, status }
     * Passing no filters returns the "all events" list key.
     */
    list: (filters)   => ['events', norm(filters)],
    byId: (eventId)   => ['selectedEvent', eventId],
    bySlug: (slug)    => ['event', 'slug', slug],
  },

  sessions: {
    listByEvent: (eventId)   => ['sessions', eventId],
    byId: (sessionId)        => ['session', sessionId],
  },

  results: {
    listByEvent: (eventId)     => ['results', eventId],
    listBySession: (sessionId) => ['results', 'session', sessionId],
    listByDriver: (driverId)   => ['results', 'driver', driverId],
  },

  driverPrograms: {
    /**
     * filters: { eventId, driverId, seriesId, classId }
     */
    list: (filters)   => ['driverPrograms', norm(filters)],
  },

  standings: {
    bySeriesSeason: (seriesId, seasonYear) =>
      ['standings', seriesId, seasonYear],
    byEvent: (eventId) => ['standings', 'event', eventId],
  },

  entries: {
    listByEvent: (eventId) => ['entries', eventId ?? null],
  },

  operationLog: {
    recent: (limit)   => ['operationLogs', limit ?? 'default'],
  },

  /**
   * Managed collaborations / resolved entities for a user.
   * Matches the ['resolvedEntities', userId] key used across Profile,
   * MyDashboard, and RaceCoreAccessTab so they all share the same cache entry.
   */
  managedCollaborations: {
    byUser: (userId) => ['resolvedEntities', userId ?? null],
  },

  /** Per-user profile sub-queries */
  profile: {
    invitations:   (email)  => ['myInvitations',   email ?? null],
    operationLogs: (email)  => ['myOperationLogs',  email ?? null],
  },

  /** Single homepage data fetch (backend function) */
  homepageData: () => ['homepageData'],

  /** Media assets keyed by target entity */
  mediaAssets: {
    byTarget: (targetType, targetEntityId) =>
      ['mediaAssets', targetType ?? null, targetEntityId ?? null],
  },

  /**
   * Full page-level profile loader keys.
   * These match the queryKeys used inside each profile page so that navigating
   * back to the same profile reuses the cached payload.
   */
  profiles: {
    driver: (slug, first, last) =>
      ['driverProfileData', slug ?? null, first ?? null, last ?? null],
    team:   (slug) => ['teamProfileData',   slug ?? null],
    track:  (slug) => ['trackProfileData',  slug ?? null],
    series: (slug) => ['seriesDetailData',  slug ?? null],
    event:  (slug) => ['eventProfileData',  slug ?? null],
  },
};