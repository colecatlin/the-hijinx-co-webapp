import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Hook to fetch all data needed for Entry management.
 * Fetches entries, drivers, teams, and series classes.
 * 
 * @param {object} options
 * @param {string} options.selectedEventId - Event ID to filter entries
 * @param {string} options.seriesId - Series ID to filter classes
 * @param {boolean} options.enabled - Whether queries should run
 * @returns {object} entries, drivers, teams, classes, isLoading, refetchAll
 */
export function useEntriesData({ selectedEventId, seriesId, enabled = true }) {
  // Check if Entry entity exists
  const { data: entrySchema, isError: entryError } = useQuery({
    queryKey: ['entitySchema', 'Entry'],
    queryFn: async () => {
      try {
        return await base44.entities.Entry.schema();
      } catch (err) {
        // Entity doesn't exist
        throw new Error('Entry entity not available');
      }
    },
    enabled: enabled && !!selectedEventId,
    retry: false,
    ...DQ,
  });

  // Fetch entries for this event
  const { data: entries = [], isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
    queryKey: ['entries', selectedEventId],
    queryFn: () => base44.entities.Entry.filter({ event_id: selectedEventId }),
    enabled: enabled && !!selectedEventId && !entryError,
    ...DQ,
  });

  // Fetch all drivers
  const { data: drivers = [], isLoading: driversLoading, refetch: refetchDrivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('first_name', 500),
    enabled: enabled && !entryError,
    ...DQ,
  });

  // Fetch all teams
  const { data: teams = [], isLoading: teamsLoading, refetch: refetchTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name', 200),
    enabled: enabled && !entryError,
    ...DQ,
  });

  // Fetch series classes for this series
  const { data: classes = [], isLoading: classesLoading, refetch: refetchClasses } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => (seriesId
      ? base44.entities.SeriesClass.filter({ series_id: seriesId })
      : Promise.resolve([])),
    enabled: enabled && !!seriesId && !entryError,
    ...DQ,
  });

  const isLoading = entriesLoading || driversLoading || teamsLoading || classesLoading;

  const refetchAll = async () => {
    await Promise.all([refetchEntries(), refetchDrivers(), refetchTeams(), refetchClasses()]);
  };

  return {
    entries,
    drivers,
    teams,
    classes,
    isLoading,
    refetchAll,
    entryEntityError: entryError ? 'Entry entity is not enabled yet. Ask admin to enable entities/Entry.json.' : null,
  };
}