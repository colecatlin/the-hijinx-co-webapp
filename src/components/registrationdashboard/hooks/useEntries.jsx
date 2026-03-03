import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Fetch all entries for a given event.
 * 
 * @param {string} eventId - Event ID to query
 * @returns {object} { entries, isLoading, isError, refetch }
 */
export function useEntries(eventId) {
  const { data: entries = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  return { entries, isLoading, isError, refetch };
}

export default useEntries;