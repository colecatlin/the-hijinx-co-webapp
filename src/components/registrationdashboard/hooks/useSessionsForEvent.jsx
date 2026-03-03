import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Fetch all sessions for a given event, sorted by session_order then scheduled_time.
 * 
 * @param {string} eventId - Event ID to query
 * @returns {object} { sessions, isLoading, isError }
 */
export function useSessionsForEvent(eventId) {
  const { data: allSessions = [], isLoading, isError } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  // Sort by session_order then scheduled_time
  const sessions = [...allSessions].sort((a, b) => {
    const orderA = a.session_order ?? 0;
    const orderB = b.session_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    if (a.scheduled_time && b.scheduled_time) {
      return new Date(a.scheduled_time) - new Date(b.scheduled_time);
    }
    return 0;
  });

  return { sessions, isLoading, isError };
}

export default useSessionsForEvent;