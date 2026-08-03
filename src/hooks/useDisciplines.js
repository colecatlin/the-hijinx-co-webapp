import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useDisciplines — shared hook that fetches the canonical Discipline records
 * (sorted by sort_order) and caches them app-wide via React Query.
 *
 * Returns:
 *   disciplines  — Array of active Discipline records (name, slug, color_code, …)
 *   disciplineNames — Array of just the name strings (for dropdowns / validation)
 *   isLoading    — boolean
 */
export function useDisciplines() {
  const { data: disciplines = [], isLoading } = useQuery({
    queryKey: ['disciplines', 'active', 'sort_order'],
    queryFn: () => base44.entities.Discipline.filter({ is_active: true }, 'sort_order', 100),
    staleTime: 5 * 60 * 1000,
  });

  const disciplineNames = disciplines.map((d) => d.name);

  return { disciplines, disciplineNames, isLoading };
}

export default useDisciplines;