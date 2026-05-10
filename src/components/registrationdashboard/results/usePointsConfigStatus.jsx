import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

/**
 * Lightweight PointsConfig visibility check.
 * Returns: { config, status, label, isLoading }
 * status: 'class-specific' | 'series-wide' | 'missing'
 * Does NOT modify config resolution logic.
 */
export function usePointsConfigStatus({ seriesId, season, seriesClassId }) {
  const { data: allConfigs = [], isLoading } = useQuery({
    queryKey: ['pointsConfigs', seriesId],
    queryFn: () => seriesId
      ? base44.entities.PointsConfig.filter({ series_id: seriesId, status: 'active' })
      : Promise.resolve([]),
    enabled: !!seriesId,
    ...DQ,
  });

  const result = useMemo(() => {
    if (!seriesId) return { config: null, status: 'missing', label: 'No series linked' };

    const seasonStr = String(season || '');

    // Try class-specific first
    const classConfig = allConfigs.find(c =>
      c.series_class_id === seriesClassId &&
      (!seasonStr || String(c.season || '') === seasonStr)
    );
    if (classConfig) {
      return { config: classConfig, status: 'class-specific', label: classConfig.name };
    }

    // Try series-wide (no class)
    const seriesConfig = allConfigs.find(c =>
      !c.series_class_id &&
      (!seasonStr || String(c.season || '') === seasonStr)
    );
    if (seriesConfig) {
      return { config: seriesConfig, status: 'series-wide', label: seriesConfig.name };
    }

    // Try is_default fallback
    const defaultConfig = allConfigs.find(c => c.is_default);
    if (defaultConfig) {
      return { config: defaultConfig, status: 'series-wide', label: `${defaultConfig.name} (default)` };
    }

    return { config: null, status: 'missing', label: 'No PointsConfig found' };
  }, [allConfigs, seriesId, season, seriesClassId]);

  return { ...result, isLoading };
}