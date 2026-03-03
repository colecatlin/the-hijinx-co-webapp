import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Fetch TechTemplate for a given SeriesClass.
 * 
 * @param {string} classId - SeriesClass ID to query
 * @returns {object} { template, isLoading, isError, refetch }
 */
export function useTechTemplate(classId) {
  const { data: templates = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['techTemplates', classId],
    queryFn: () => base44.entities.TechTemplate.filter({ series_class_id: classId }),
    enabled: !!classId,
    ...DQ,
  });

  // Return first template or null
  const template = templates.length > 0 ? templates[0] : null;

  return { template, isLoading, isError, refetch };
}

export default useTechTemplate;