import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Fetch SeriesClass records for a given Series.
 * 
 * @param {string} seriesId - Series ID to query
 * @returns {object} { seriesClasses, isLoading }
 */
export function useSeriesClassesForOrg(seriesId) {
  const { data: allClasses = [], isLoading } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: seriesId }),
    enabled: !!seriesId,
    ...DQ,
  });

  return { seriesClasses: allClasses, isLoading };
}

export default useSeriesClassesForOrg;