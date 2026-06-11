/**
 * R9CR — useEventWorkspaceData
 * SINGLE SOURCE OF TRUTH for all event-level data in the workspace.
 * This hook is called ONCE in EventWorkspaceShell and the data is distributed
 * via context. NO panel should call its own event-level queries.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

export function useEventWorkspaceData(eventId, seriesId, season) {
  const queryClient = useQueryClient();

  const { data: entries = [], refetch: refetchEntries } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

  const { data: results = [], refetch: refetchResults } = useQuery({
    queryKey: ['results', eventId],
    queryFn: () => eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

  const { data: incidents = [], refetch: refetchIncidents } = useQuery({
    queryKey: ['incidents', eventId],
    queryFn: () => eventId ? base44.entities.Incident.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

  const { data: penalties = [], refetch: refetchPenalties } = useQuery({
    queryKey: ['penalties', eventId],
    queryFn: () => eventId ? base44.entities.Penalty.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

  const { data: protests = [], refetch: refetchProtests } = useQuery({
    queryKey: ['protests', eventId],
    queryFn: () => eventId ? base44.entities.Protest.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

  const { data: officials = [], refetch: refetchOfficials } = useQuery({
    queryKey: ['officials', eventId],
    queryFn: () => eventId ? base44.entities.EventOfficial.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

  const { data: standings = [], refetch: refetchStandings } = useQuery({
    queryKey: ['standings', seriesId, season],
    queryFn: () =>
      seriesId && season
        ? base44.entities.Standings.filter({ series_id: seriesId, season_year: season })
        : Promise.resolve([]),
    enabled: !!seriesId && !!season, ...DQ,
  });

  const { data: techInspections = [], refetch: refetchTechInspections } = useQuery({
    queryKey: ['techInspections', eventId],
    queryFn: () => eventId ? base44.entities.TechInspectionRecord.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

  const { data: gridLineups = [], refetch: refetchGridLineups } = useQuery({
    queryKey: ['grid_lineups', eventId],
    queryFn: () => eventId ? base44.entities.GridLineup.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['operationLogs', eventId],
    queryFn: () =>
      eventId
        ? base44.entities.OperationLog.filter({ event_id: eventId }, '-created_date', 30)
        : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

  // Shared driver lookup — one fetch, used by checkin + tech + entries
  const { data: drivers = [] } = useQuery({
    queryKey: ['workspace_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 120_000,
  });

  // Shared class lookup — EventClass + SeriesClass
  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => eventId ? base44.entities.EventClass.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, staleTime: 120_000,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => seriesId ? base44.entities.SeriesClass.filter({ series_id: seriesId }) : Promise.resolve([]),
    enabled: !!seriesId, staleTime: 120_000,
  });

  const refetchAll = useCallback(() => {
    const keys = [
      ['entries', eventId],
      ['sessions', eventId],
      ['results', eventId],
      ['incidents', eventId],
      ['penalties', eventId],
      ['protests', eventId],
      ['officials', eventId],
      ['techInspections', eventId],
      ['standings', seriesId, season],
    ];
    keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
  }, [eventId, seriesId, season, queryClient]);

  return {
    entries,
    sessions,
    results,
    incidents,
    penalties,
    protests,
    officials,
    standings,
    techInspections,
    gridLineups,
    operationLogs,
    drivers,
    eventClasses,
    seriesClasses,
    refetchAll,
    refetchEntries,
    refetchResults,
    refetchSessions,
    refetchIncidents,
    refetchOfficials,
    refetchTechInspections,
    refetchGridLineups,
  };
}