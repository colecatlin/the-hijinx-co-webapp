import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Fetch the active PointsConfig for a given series.
 * 
 * @param {string} seriesId - Series ID
 * @returns {object} { pointsConfig, isLoading, isError }
 */
export function usePointsConfigForSeries(seriesId) {
  const { data: allConfigs = [], isLoading, isError } = useQuery({
    queryKey: ['pointsConfig', seriesId],
    queryFn: () => base44.entities.PointsConfig.filter({ series_id: seriesId }),
    enabled: !!seriesId,
    ...DQ,
  });

  // Return the first active config, or the most recent one
  const pointsConfig = allConfigs.find(c => c.status === 'active') || allConfigs[0] || null;

  return { pointsConfig, isLoading, isError };
}

export default usePointsConfigForSeries;