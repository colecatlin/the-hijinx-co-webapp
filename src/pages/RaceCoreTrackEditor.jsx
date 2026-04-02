import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import { createPageUrl } from '@/components/utils';
import { toast } from 'sonner';
import { useEntityEditPermission } from '@/components/access/entityEditPermission';
import AdminOverridePanel from '@/components/management/AdminOverridePanel';
import TrackCoreDetailsSection from '@/components/management/TrackManagement/TrackCoreDetailsSection';
import TrackSeriesSection from '@/components/management/TrackManagement/TrackSeriesSection';

export default function RaceCoreTrackEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', id],
    queryFn: () => base44.entities.Track.get(id),
    enabled: !isNew && !!id,
  });

  const { canEditManagement } = useEntityEditPermission('Track', isNew ? null : id, track);

  if (!isNew && isLoading) {
    return (
      <ManagementLayout currentPage="RaceCoreTrackEditor">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage="RaceCoreTrackEditor">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('ManageTracks'))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Race Core / Tracks</p>
            <h1 className="text-4xl font-black mb-1">{track?.name || 'New Track'}</h1>
            <p className="text-gray-500 text-sm">{isNew ? 'Create a new track' : 'Manage all track data'}</p>
          </div>
        </div>

        <Tabs defaultValue="core" className="mt-6">
          <TabsList>
            <TabsTrigger value="core">Core Details</TabsTrigger>
            {!isNew && <TabsTrigger value="series">Series</TabsTrigger>}
            {!isNew && isAdmin && <TabsTrigger value="override">⚙ Override</TabsTrigger>}
          </TabsList>

          <TabsContent value="core" className="mt-6">
            <TrackCoreDetailsSection
              trackId={isNew ? 'new' : id}
              isReadOnly={!isNew && !canEditManagement}
            />
          </TabsContent>
          {!isNew && (
            <TabsContent value="series" className="mt-6">
              <TrackSeriesSection trackId={id} trackName={track?.name} />
            </TabsContent>
          )}
          {!isNew && isAdmin && (
            <TabsContent value="override" className="mt-6">
              <AdminOverridePanel
                entityType="Track"
                entityId={id}
                entityRecord={track}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['track', id] })}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ManagementLayout>
  );
}