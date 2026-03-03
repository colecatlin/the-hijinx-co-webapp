import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { REG_QK } from '../queryKeys';

const DQ = applyDefaultQueryOptions();

/**
 * Shared hook for fetching and managing Entry data.
 * 
 * @param {string} eventId - Required: Event ID to filter entries
 * @param {string} classId - Optional: Series Class ID to filter by class
 * @param {string} search - Optional: Search term (driver name, car number, transponder)
 * @param {object} statusFilters - Optional: { entry_status, payment_status, tech_status }
 * @returns {object} { entries, isLoading, isError, counts, groupedByClass, refetch }
 */
export function useEntries({
  eventId,
  classId = undefined,
  search = '',
  statusFilters = {},
} = {}) {
  const queryClient = useQueryClient();

  // Build filter object for base44.entities.Entry.filter()
  const buildFilter = () => {
    const filter = { event_id: eventId };
    if (classId && classId !== 'all' && classId !== 'unassigned') {
      filter.series_class_id = classId;
    }
    if (statusFilters.entry_status && statusFilters.entry_status !== 'all') {
      filter.entry_status = statusFilters.entry_status;
    }
    if (statusFilters.payment_status && statusFilters.payment_status !== 'all') {
      filter.payment_status = statusFilters.payment_status;
    }
    if (statusFilters.tech_status && statusFilters.tech_status !== 'all') {
      filter.tech_status = statusFilters.tech_status;
    }
    return filter;
  };

  // Fetch entries
  const { data: entries = [], isLoading, isError, refetch } = useQuery({
    queryKey: REG_QK.entries(eventId, classId),
    queryFn: () => base44.entities.Entry.filter(buildFilter()),
    enabled: !!eventId,
    ...DQ,
  });

  // Filter by search term (client-side, after fetch)
  const filteredEntries = search
    ? entries.filter((entry) => {
        const term = search.toLowerCase();
        return (
          (entry.car_number || '').toLowerCase().includes(term) ||
          (entry.transponder_id || '').toLowerCase().includes(term)
          // Note: Driver name search requires joining with Driver entity, done at component level
        );
      })
    : entries;

  // Compute counts
  const counts = {
    total: filteredEntries.length,
    byStatus: {
      Registered: filteredEntries.filter(e => e.entry_status === 'Registered').length,
      'Checked In': filteredEntries.filter(e => e.entry_status === 'Checked In').length,
      Teched: filteredEntries.filter(e => e.entry_status === 'Teched').length,
      Withdrawn: filteredEntries.filter(e => e.entry_status === 'Withdrawn').length,
    },
    byPayment: {
      Paid: filteredEntries.filter(e => e.payment_status === 'Paid').length,
      Unpaid: filteredEntries.filter(e => e.payment_status === 'Unpaid').length,
      Refunded: filteredEntries.filter(e => e.payment_status === 'Refunded').length,
    },
    byTech: {
      Passed: filteredEntries.filter(e => e.tech_status === 'Passed').length,
      'Not Inspected': filteredEntries.filter(e => e.tech_status === 'Not Inspected').length,
      Failed: filteredEntries.filter(e => e.tech_status === 'Failed').length,
      'Recheck Required': filteredEntries.filter(e => e.tech_status === 'Recheck Required').length,
    },
    teched: filteredEntries.filter(e => e.tech_status === 'Passed').length,
    notTeched: filteredEntries.filter(e => 
      e.tech_status !== 'Passed' && e.tech_status !== undefined
    ).length,
  };

  // Group by series_class_id
  const groupedByClass = filteredEntries.reduce((acc, entry) => {
    const cid = entry.series_class_id || 'unassigned';
    if (!acc[cid]) acc[cid] = [];
    acc[cid].push(entry);
    return acc;
  }, {});

  return {
    entries: filteredEntries,
    allEntries: entries,
    isLoading,
    isError,
    counts,
    groupedByClass,
    refetch,
  };
}

export default useEntries;