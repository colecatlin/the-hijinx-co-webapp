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

  tracks: {
    list: (filters)   => ['tracks', norm(filters)],
    byId: (trackId)   => ['selectedTrack', trackId],
  },

  series: {
    list: (filters)   => ['series', norm(filters)],
    byId: (seriesId)  => ['selectedSeries', seriesId],
    classes: (seriesId) => ['seriesClasses', seriesId],
  },

  events: {
    /**
     * filters: { trackId, seriesId, seasonYear, status }
     * Passing no filters returns the "all events" list key.
     */
    list: (filters)   => ['events', norm(filters)],
    byId: (eventId)   => ['selectedEvent', eventId],
  },

  sessions: {
    listByEvent: (eventId)   => ['sessions', eventId],
    byId: (sessionId)        => ['session', sessionId],
  },

  results: {
    listByEvent: (eventId)   => ['results', eventId],
    listBySession: (sessionId) => ['results', 'session', sessionId],
    listByDriver: (driverId) => ['results', 'driver', driverId],
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

  operationLog: {
    recent: (limit)   => ['operationLogs', limit ?? 'default'],
  },
};