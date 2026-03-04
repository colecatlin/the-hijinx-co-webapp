import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Fetch all entries for a given event and compute summary counts.
 * Accepts either positional `useEntries(eventId)` or object `useEntries({ eventId })`.
 *
 * @returns {object} { entries, allEntries, counts, isLoading, isError, refetch }
 */
export function useEntries(arg) {
  // Support both `useEntries(eventId)` and `useEntries({ eventId })`
  const eventId = typeof arg === 'object' && arg !== null ? arg.eventId : arg;

  const { data: entries = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const counts = useMemo(() => {
    const total = entries.length;

    const byStatus = {};
    const byPayment = {};
    const byClass = {};

    entries.forEach((e) => {
      // By entry_status
      const status = e.entry_status || 'Registered';
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(e);

      // By payment_status
      const payment = e.payment_status || 'Unpaid';
      byPayment[payment] = (byPayment[payment] || 0) + 1;

      // By event_class_id (preferred) or fallback 'unassigned'
      const classKey = e.event_class_id || 'unassigned';
      if (!byClass[classKey]) byClass[classKey] = [];
      byClass[classKey].push(e);
    });

    // Flatten byStatus to counts
    const byStatusCounts = Object.fromEntries(
      Object.entries(byStatus).map(([k, v]) => [k, v.length])
    );

    const teched = entries.filter((e) => e.tech_status === 'Passed').length;
    const notTeched = total - teched;

    return { total, byStatus: byStatusCounts, byPayment, byClass, teched, notTeched };
  }, [entries]);

  return { entries, allEntries: entries, counts, isLoading, isError, refetch };
}

export default useEntries;