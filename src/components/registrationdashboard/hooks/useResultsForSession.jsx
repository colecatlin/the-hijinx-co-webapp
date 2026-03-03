import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Fetch all results for a given session.
 * 
 * @param {string} eventId - Event ID
 * @param {string} sessionId - Session ID
 * @returns {object} { results, isLoading, isError }
 */
export function useResultsForSession(eventId, sessionId) {
  const { data: results = [], isLoading, isError } = useQuery({
    queryKey: ['results', eventId, sessionId],
    queryFn: () => {
      if (!sessionId) return [];
      return base44.entities.Results.filter({ event_id: eventId, session_id: sessionId });
    },
    enabled: !!eventId && !!sessionId,
    ...DQ,
  });

  return { results, isLoading, isError };
}

export default useResultsForSession;