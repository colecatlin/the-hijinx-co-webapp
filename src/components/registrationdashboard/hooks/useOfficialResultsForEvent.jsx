import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Fetch all Results from Official or Locked sessions for a given event.
 * 
 * @param {string} eventId - Event ID
 * @returns {object} { officialResults, isLoading, isError }
 */
export function useOfficialResultsForEvent(eventId) {
  const { data: officialResults = [], isLoading, isError } = useQuery({
    queryKey: ['officialResults', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      // Fetch sessions for the event
      const sessions = await base44.entities.Session.filter({ event_id: eventId });
      
      // Filter to official/locked only
      const officialSessions = sessions.filter(s => s.status === 'Official' || s.status === 'Locked');
      
      if (officialSessions.length === 0) return [];
      
      // Fetch results for those sessions
      const allResults = await Promise.all(
        officialSessions.map(s => base44.entities.Results.filter({ session_id: s.id }))
      );
      
      return allResults.flat();
    },
    enabled: !!eventId,
    ...DQ,
  });

  return { officialResults, isLoading, isError };
}

export default useOfficialResultsForEvent;