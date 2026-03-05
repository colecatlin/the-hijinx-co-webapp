import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { resolveMediaAuthority } from './mediaAccess';
import MediaRequestsPanel from './MediaRequestsPanel';
import MediaCredentialsPanel from './MediaCredentialsPanel';

export default function MediaConsole({
  dashboardContext,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  currentUser,
  isAdmin,
  invalidateAfterOperation,
}) {
  // Load collaborators for authority check
  const { data: eventCollaborators = [] } = useQuery({
    queryKey: ['eventCollaborators_media', selectedEvent?.id],
    queryFn: () => base44.entities.EntityCollaborator.filter({ entity_type: 'Event', entity_id: selectedEvent.id }),
    enabled: !!selectedEvent?.id,
  });
  const { data: trackCollaborators = [] } = useQuery({
    queryKey: ['trackCollaborators_media', selectedEvent?.track_id],
    queryFn: () => base44.entities.EntityCollaborator.filter({ entity_type: 'Track', entity_id: selectedEvent.track_id }),
    enabled: !!selectedEvent?.track_id,
  });
  const { data: seriesCollaborators = [] } = useQuery({
    queryKey: ['seriesCollaborators_media', selectedEvent?.series_id],
    queryFn: () => base44.entities.EntityCollaborator.filter({ entity_type: 'Series', entity_id: selectedEvent.series_id }),
    enabled: !!selectedEvent?.series_id,
  });

  const allCollaborators = useMemo(
    () => [...eventCollaborators, ...trackCollaborators, ...seriesCollaborators],
    [eventCollaborators, trackCollaborators, seriesCollaborators]
  );

  const { hasAuthority, issuerOptions } = useMemo(() =>
    resolveMediaAuthority({
      isAdmin,
      userId: currentUser?.id,
      selectedEvent,
      selectedTrack,
      selectedSeries,
      collaborators: allCollaborators,
    }),
    [isAdmin, currentUser?.id, selectedEvent, selectedTrack, selectedSeries, allCollaborators]
  );

  if (!selectedEvent) {
    return (
      <Card className="bg-[#1A1A1A] border-gray-800">
        <CardContent className="py-16 text-center">
          <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No event selected</p>
          <p className="text-gray-600 text-sm mt-1">Select an organization, season, and event to manage media operations.</p>
        </CardContent>
      </Card>
    );
  }

  const sharedProps = {
    dashboardContext,
    selectedEvent,
    selectedTrack,
    selectedSeries,
    currentUser,
    isAdmin,
    hasAuthority,
    issuerOptions,
    invalidateAfterOperation,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Event:</span>
        <span className="text-white font-medium">{selectedEvent.name}</span>
        {!hasAuthority && (
          <span className="ml-2 text-yellow-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Read-only (no credential authority)
          </span>
        )}
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="bg-[#171717] border border-gray-800 p-1 flex gap-1">
          <TabsTrigger value="requests" className="data-[state=active]:bg-blue-900 data-[state=active]:text-blue-100 text-gray-400 text-xs px-3 py-1.5">
            Requests
          </TabsTrigger>
          <TabsTrigger value="credentials" className="data-[state=active]:bg-blue-900 data-[state=active]:text-blue-100 text-gray-400 text-xs px-3 py-1.5">
            Credentials
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="requests">
            <MediaRequestsPanel {...sharedProps} />
          </TabsContent>
          <TabsContent value="credentials">
            <MediaCredentialsPanel {...sharedProps} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}