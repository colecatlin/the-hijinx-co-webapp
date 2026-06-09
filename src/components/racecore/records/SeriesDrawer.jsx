import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEntityEditPermission } from '@/components/access/entityEditPermission';
import RecordDrawerShell from './RecordDrawerShell';
import ProfileCompletenessIndicator from '@/components/system/ProfileCompletenessIndicator';

import SeriesCoreDetailsSection      from '@/components/management/SeriesManagement/SeriesCoreDetailsSection';
import SeriesFormatSection           from '@/components/management/SeriesManagement/SeriesFormatSection';
import SeriesClassesSection          from '@/components/management/SeriesManagement/SeriesClassesSection';
import SeriesEventsSection           from '@/components/management/SeriesManagement/SeriesEventsSection';
import SeriesMediaSection            from '@/components/management/SeriesManagement/SeriesMediaSection';
import SeriesGovernanceSection       from '@/components/management/SeriesManagement/SeriesGovernanceSection';
import SeriesTracksSection           from '@/components/management/SeriesManagement/SeriesTracksSection';
import SeriesDriversSection          from '@/components/management/SeriesManagement/SeriesDriversSection';
import SeriesTeamsSection            from '@/components/management/SeriesManagement/SeriesTeamsSection';
import SeriesStandingsSyncSection    from '@/components/management/SeriesManagement/SeriesStandingsSyncSection';
import SeriesModulesSection          from '@/components/management/SeriesManagement/SeriesModulesSection';
import AdminOverridePanel            from '@/components/management/AdminOverridePanel';

/**
 * SeriesDrawer — slide-over editor for Series records.
 *
 * Props:
 *   seriesId      — string | 'new' | null
 *   open          — boolean
 *   onOpenChange  — (open: boolean) => void
 *   onSaveSuccess — () => void
 */
export default function SeriesDrawer({ seriesId, open, onOpenChange, onSaveSuccess }) {
  const queryClient = useQueryClient();
  const isNew = seriesId === 'new';

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: series, isLoading } = useQuery({
    queryKey: ['series', seriesId],
    queryFn: () => base44.entities.Series.get(seriesId),
    enabled: !!seriesId && !isNew && open,
  });

  const { canEditManagement } = useEntityEditPermission('Series', isNew ? null : seriesId, series);

  const handleSaveSuccess = (newSeriesId) => {
    queryClient.invalidateQueries({ queryKey: ['series'] });
    if (newSeriesId && isNew) {
      onSaveSuccess && onSaveSuccess(newSeriesId);
      onOpenChange(false);
    } else {
      queryClient.invalidateQueries({ queryKey: ['series', seriesId] });
      onSaveSuccess && onSaveSuccess();
    }
  };

  // Navigation helpers required by SeriesDriversSection
  const handleNavigateToDriver = () => {};
  const handleNavigateToTeam   = () => {};

  const tabs = [
    {
      value: 'core',
      label: 'Core',
      content: (
        <SeriesCoreDetailsSection
          seriesId={isNew ? 'new' : seriesId}
          isReadOnly={!isNew && !canEditManagement}
          onSaveSuccess={handleSaveSuccess}
        />
      ),
    },
    {
      value: 'format',
      label: 'Format',
      hidden: isNew,
      content: <SeriesFormatSection seriesId={seriesId} />,
    },
    {
      value: 'classes',
      label: 'Classes',
      hidden: isNew,
      content: <SeriesClassesSection seriesId={seriesId} userRole="admin" />,
    },
    {
      value: 'calendar',
      label: 'Calendar',
      hidden: isNew,
      content: <SeriesEventsSection seriesId={seriesId} series={series} />,
    },
    {
      value: 'media',
      label: 'Media',
      hidden: isNew,
      content: <SeriesMediaSection seriesId={seriesId} />,
    },
    {
      value: 'governance',
      label: 'Governance',
      hidden: isNew,
      content: <SeriesGovernanceSection seriesId={seriesId} />,
    },
    {
      value: 'teams',
      label: 'Teams',
      hidden: isNew,
      content: <SeriesTeamsSection seriesId={seriesId} seriesName={series?.name} />,
    },
    {
      value: 'drivers',
      label: 'Drivers',
      hidden: isNew,
      content: (
        <SeriesDriversSection
          seriesId={seriesId}
          seriesName={series?.name}
          onNavigateToDriver={handleNavigateToDriver}
          onNavigateToTeam={handleNavigateToTeam}
        />
      ),
    },
    {
      value: 'tracks',
      label: 'Tracks',
      hidden: isNew,
      content: <SeriesTracksSection seriesId={seriesId} seriesName={series?.name} />,
    },
    {
      value: 'standings',
      label: 'Standings',
      hidden: isNew,
      content: <SeriesStandingsSyncSection seriesId={seriesId} />,
    },
    {
      value: 'modules',
      label: '⚙ Modules',
      hidden: isNew || !isAdmin,
      content: <SeriesModulesSection seriesId={seriesId} />,
    },
    {
      value: 'override',
      label: '⚙ Override',
      hidden: isNew || !isAdmin,
      content: (
        <AdminOverridePanel
          entityType="Series"
          entityId={seriesId}
          entityRecord={series}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['series', seriesId] })}
        />
      ),
    },
  ];

  const headerActions = !isNew && series ? (
    <ProfileCompletenessIndicator entityType="Series" record={series} />
  ) : null;

  return (
    <RecordDrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={series?.name || (isNew ? 'New Series' : '…')}
      subtitle={
        isNew
          ? 'Create a new series'
          : series
            ? [series.sanctioning_body, series.geographic_scope].filter(Boolean).join(' · ') || undefined
            : undefined
      }
      isLoading={!isNew && isLoading}
      width="full"
      tabs={tabs}
      actions={headerActions}
    />
  );
}