import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEntityEditPermission } from '@/components/access/entityEditPermission';
import RecordDrawerShell from './RecordDrawerShell';
import ProfileCompletenessIndicator from '@/components/system/ProfileCompletenessIndicator';

import TrackCoreDetailsSection from '@/components/management/TrackManagement/TrackCoreDetailsSection';
import TrackSeriesSection      from '@/components/management/TrackManagement/TrackSeriesSection';
import AdminOverridePanel      from '@/components/management/AdminOverridePanel';

/**
 * TrackDrawer — slide-over editor for Track records.
 *
 * Props:
 *   trackId       — string | 'new' | null
 *   open          — boolean
 *   onOpenChange  — (open: boolean) => void
 *   onSaveSuccess — () => void
 */
export default function TrackDrawer({ trackId, open, onOpenChange, onSaveSuccess }) {
  const queryClient = useQueryClient();
  const isNew = trackId === 'new';

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', trackId],
    queryFn: () => base44.entities.Track.get(trackId),
    enabled: !!trackId && !isNew && open,
  });

  const { canEditManagement } = useEntityEditPermission('Track', isNew ? null : trackId, track);

  const handleSaveSuccess = (newTrackId) => {
    queryClient.invalidateQueries({ queryKey: ['tracks'] });
    if (newTrackId && isNew) {
      onSaveSuccess && onSaveSuccess(newTrackId);
      onOpenChange(false);
    } else {
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      onSaveSuccess && onSaveSuccess();
    }
  };

  const tabs = [
    {
      value: 'core',
      label: 'Core Details',
      content: (
        <TrackCoreDetailsSection
          trackId={isNew ? 'new' : trackId}
          isReadOnly={!isNew && !canEditManagement}
          onSaveSuccess={handleSaveSuccess}
        />
      ),
    },
    {
      value: 'series',
      label: 'Series',
      hidden: isNew,
      content: <TrackSeriesSection trackId={trackId} trackName={track?.name} />,
    },
    {
      value: 'override',
      label: '⚙ Override',
      hidden: isNew || !isAdmin,
      content: (
        <AdminOverridePanel
          entityType="Track"
          entityId={trackId}
          entityRecord={track}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['track', trackId] })}
        />
      ),
    },
  ];

  const headerActions = !isNew && track ? (
    <ProfileCompletenessIndicator entityType="Track" record={track} />
  ) : null;

  return (
    <RecordDrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={track?.name || (isNew ? 'New Track' : '…')}
      subtitle={
        isNew
          ? 'Create a new track'
          : track
            ? [track.location_city, track.location_state, track.location_country].filter(Boolean).join(', ') || undefined
            : undefined
      }
      isLoading={!isNew && isLoading}
      width="medium"
      tabs={tabs}
      actions={headerActions}
    />
  );
}