import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Fetch all TechInspections for a given Event.
 * 
 * @param {string} eventId - Event ID to query
 * @returns {object} { inspections, isLoading, isError, refetch, getByEntry }
 */
export function useTechInspections(eventId) {
  const { data: inspections = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['techInspections', eventId],
    queryFn: () => base44.entities.TechInspection.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  // Helper to get inspection by entry_id
  const getByEntry = (entryId) => inspections.find(i => i.entry_id === entryId) || null;

  return { inspections, isLoading, isError, refetch, getByEntry };
}

export default useTechInspections;