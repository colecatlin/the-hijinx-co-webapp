import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Fetch drivers for lookup/picker, with optional search.
 * 
 * @param {string} searchTerm - Optional search term (name, number, numeric_id)
 * @returns {object} { drivers, isLoading }
 */
export function useDriversLookup(searchTerm = '') {
  const { data: allDrivers = [], isLoading } = useQuery({
    queryKey: ['driversLookup'],
    queryFn: () => base44.entities.Driver.list('first_name', 500),
    ...DQ,
  });

  // Client-side filter
  const drivers = searchTerm
    ? allDrivers.filter((d) => {
        const s = searchTerm.toLowerCase();
        const fullName = `${d.first_name} ${d.last_name}`.toLowerCase();
        const number = String(d.primary_number || '').toLowerCase();
        const numericId = String(d.numeric_id || '').toLowerCase();
        return fullName.includes(s) || number.includes(s) || numericId.includes(s);
      })
    : allDrivers;

  return { drivers, isLoading };
}

export default useDriversLookup;