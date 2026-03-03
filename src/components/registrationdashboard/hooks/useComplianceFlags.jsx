import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Shared hook for fetching and managing ComplianceFlag data.
 * 
 * @param {string} eventId - Required: Event ID to filter flags
 * @param {string} status - Optional: 'open' or 'resolved', defaults to 'open'
 * @param {string} flagType - Optional: specific flag type to filter
 * @returns {object} { flags, isLoading, isError, counts, countsBySeverity, refetch }
 */
export function useComplianceFlags({
  eventId,
  status = 'open',
  flagType = undefined,
} = {}) {
  const queryClient = useQueryClient();

  // Build filter object
  const buildFilter = () => {
    const filter = { event_id: eventId };
    if (status) {
      filter.status = status;
    }
    if (flagType) {
      filter.flag_type = flagType;
    }
    return filter;
  };

  // Fetch flags
  const { data: flags = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['complianceFlags', eventId, status, flagType],
    queryFn: () => base44.entities.ComplianceFlag.filter(buildFilter()),
    enabled: !!eventId,
    ...DQ,
  });

  // Compute counts by flag_type
  const counts = {
    total: flags.length,
    byType: {
      'Missing Waiver': flags.filter(f => f.flag_type === 'Missing Waiver').length,
      'Expired License': flags.filter(f => f.flag_type === 'Expired License').length,
      'Duplicate Car Number': flags.filter(f => f.flag_type === 'Duplicate Car Number').length,
      'Missing Transponder': flags.filter(f => f.flag_type === 'Missing Transponder').length,
      'Other': flags.filter(f => f.flag_type === 'Other').length,
    },
  };

  // Compute counts by severity
  const countsBySeverity = {
    critical: flags.filter(f => f.severity === 'critical').length,
    warning: flags.filter(f => f.severity === 'warning').length,
    info: flags.filter(f => f.severity === 'info').length,
  };

  return {
    flags,
    isLoading,
    isError,
    counts,
    countsBySeverity,
    refetch,
  };
}

export default useComplianceFlags;