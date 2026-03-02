/**
 * useDashboardQueries
 * Shared data hook for the RegistrationDashboard.
 * All queries use REG_QK keys so invalidation is exact and consistent.
 */
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

const NOOP_QUERY = { data: null, isLoading: false, isError: false, isFetching: false };

/** Safely check if an entity type is available on the SDK */
function entityExists(name) {
  return !!(base44?.entities?.[name]);
}

export default function useDashboardQueries({ dashboardContext, selectedEvent, selectedTrack, selectedSeries }) {
  const eventId = selectedEvent?.id ?? null;
  const seriesId = dashboardContext?.orgType === 'series' ? dashboardContext?.orgId : (selectedEvent?.series_id ?? null);
  const seasonYear = dashboardContext?.season ?? null;

  // ── Sessions ────────────────────────────────────────────────────────────────
  const sessionsQuery = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  // ── Results ─────────────────────────────────────────────────────────────────
  const resultsQuery = useQuery({
    queryKey: REG_QK.results(eventId),
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  // ── Driver Programs ──────────────────────────────────────────────────────────
  const driverProgramsQuery = useQuery({
    queryKey: REG_QK.driverPrograms(eventId),
    queryFn: () => base44.entities.DriverProgram.filter({ event_id: eventId }),
    enabled: !!eventId && entityExists('DriverProgram'),
    ...DQ,
  });

  // ── Entries ──────────────────────────────────────────────────────────────────
  const entriesQueryReal = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId && entityExists('Entry'),
    ...DQ,
  });
  const entriesQuery = entityExists('Entry') ? entriesQueryReal : NOOP_QUERY;

  // ── Standings ────────────────────────────────────────────────────────────────
  const standingsQuery = useQuery({
    queryKey: REG_QK.standings(seriesId, seasonYear),
    queryFn: () => base44.entities.Standings.filter({ series_id: seriesId, season: seasonYear }),
    enabled: !!seriesId,
    ...DQ,
  });

  // ── Operation Logs ───────────────────────────────────────────────────────────
  const opLogsQueryReal = useQuery({
    queryKey: REG_QK.operationLogs(eventId),
    queryFn: async () => {
      if (eventId) {
        // Try event-scoped first; OperationLog may not have event_id so fall back to recent
        try {
          return await base44.asServiceRole.entities.OperationLog.filter({}, '-created_date', 25);
        } catch {
          return [];
        }
      }
      return [];
    },
    enabled: !!eventId && entityExists('OperationLog'),
    ...DQ,
  });
  const operationLogsQuery = entityExists('OperationLog') ? opLogsQueryReal : NOOP_QUERY;

  return {
    sessionsQuery,
    resultsQuery,
    driverProgramsQuery,
    entriesQuery,
    standingsQuery,
    operationLogsQuery,
    // Convenience derived values
    sessions: sessionsQuery.data ?? [],
    results: resultsQuery.data ?? [],
    driverPrograms: driverProgramsQuery.data ?? [],
    entries: entriesQuery.data ?? [],
    standings: standingsQuery.data ?? [],
    operationLogs: operationLogsQuery.data ?? [],
  };
}