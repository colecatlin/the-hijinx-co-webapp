import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Fetch Standings records for a given series and season, optionally filtered by class.
 * 
 * @param {string} seriesId - Series ID
 * @param {string} season - Season year
 * @param {string} seriesClassId - Optional SeriesClass ID for filtering
 * @returns {object} { standings, isLoading, isError }
 */
export function useStandingsForSeriesSeason(seriesId, season, seriesClassId) {
  const { data: standings = [], isLoading, isError } = useQuery({
    queryKey: ['standings', seriesId, season, seriesClassId || 'all'],
    queryFn: async () => {
      if (!seriesId || !season) return [];
      
      const filter = {
        series_id: seriesId,
        season_year: season,
      };
      
      // Note: Standings entity uses season_year, not season
      const allStandings = await base44.entities.Standings.filter(filter);
      
      // Filter by class if provided
      if (seriesClassId) {
        return allStandings.filter(s => s.series_class_id === seriesClassId);
      }
      
      return allStandings;
    },
    enabled: !!seriesId && !!season,
    ...DQ,
  });

  return { standings, isLoading, isError };
}

export default useStandingsForSeriesSeason;