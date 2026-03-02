/**
 * REG_QK — Registration Dashboard query key factory.
 *
 * All keys are stable arrays with only scalar values (no objects inside).
 * These keys are used by useDashboardQueries and invalidationHelper.
 */
export const REG_QK = {
  me: ()                              => ['reg', 'me'],
  orgTrack: (orgId)                   => ['reg', 'org', 'track', orgId ?? null],
  orgSeries: (orgId)                  => ['reg', 'org', 'series', orgId ?? null],
  eventsForTrack: (orgId, season)     => ['reg', 'events', 'track', orgId ?? null, season ?? null],
  eventsForSeries: (orgId, season)    => ['reg', 'events', 'series', orgId ?? null, season ?? null],
  event: (eventId)                    => ['reg', 'event', eventId ?? null],
  track: (trackId)                    => ['reg', 'track', trackId ?? null],
  series: (seriesId)                  => ['reg', 'series', seriesId ?? null],
  sessions: (eventId)                 => ['reg', 'sessions', eventId ?? null],
  results: (eventId)                  => ['reg', 'results', eventId ?? null],
  driverPrograms: (eventId)           => ['reg', 'driverPrograms', eventId ?? null],
  entries: (eventId)                  => ['reg', 'entries', eventId ?? null],
  standings: (seriesId, season)       => ['reg', 'standings', seriesId ?? null, season ?? null],
  operationLogs: (eventId)            => ['reg', 'operationLogs', eventId ?? null],
  integrations: (orgType, orgId)      => ['reg', 'integrations', orgType ?? null, orgId ?? null],
  exports: (eventId)                  => ['reg', 'exports', eventId ?? null],
};