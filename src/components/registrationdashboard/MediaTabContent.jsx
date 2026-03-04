import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MediaRequestsManager from './MediaRequestsManager';
import IssuedCredentialsManager from './IssuedCredentialsManager';
import MediaPoliciesManager from './MediaPoliciesManager';
import MediaEmptyState from './MediaEmptyState';

export default function MediaTabContent({
  dashboardContext,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardPermissions,
  invalidateAfterOperation,
  onOpenEventBuilder,
}) {
  const [subTab, setSubTab] = useState('requests');

  // Safety guards
  if (!dashboardContext.orgId || !dashboardContext.orgType) {
    return <MediaEmptyState state="no_org" />;
  }

  // If Requests view and no event, show guidance
  if (subTab === 'requests' && !selectedEvent) {
    return (
      <>
        <div className="mb-6">
          <MediaEmptyState
            state="no_event"
            onAction={onOpenEventBuilder}
          />
        </div>
        <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
          <TabsList className="bg-[#171717] border border-gray-800">
            <TabsTrigger value="requests" className="text-gray-400 px-4 py-2">Requests</TabsTrigger>
            <TabsTrigger value="credentials" className="text-gray-400 px-4 py-2">Credentials</TabsTrigger>
            <TabsTrigger value="policies" className="text-gray-400 px-4 py-2">Policies</TabsTrigger>
          </TabsList>
        </Tabs>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
        <TabsList className="bg-[#171717] border border-gray-800">
          <TabsTrigger value="requests" className="text-gray-400 px-4 py-2">Requests</TabsTrigger>
          <TabsTrigger value="credentials" className="text-gray-400 px-4 py-2">Credentials</TabsTrigger>
          <TabsTrigger value="policies" className="text-gray-400 px-4 py-2">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-6">
          {selectedEvent ? (
            <MediaRequestsManager
              dashboardContext={dashboardContext}
              selectedEvent={selectedEvent}
              selectedTrack={selectedTrack}
              selectedSeries={selectedSeries}
              dashboardPermissions={dashboardPermissions}
              invalidateAfterOperation={invalidateAfterOperation}
            />
          ) : (
            <MediaEmptyState
              state="no_event"
              onAction={onOpenEventBuilder}
            />
          )}
        </TabsContent>

        <TabsContent value="credentials" className="mt-6">
          <IssuedCredentialsManager
            dashboardContext={dashboardContext}
            selectedEvent={selectedEvent}
            selectedTrack={selectedTrack}
            selectedSeries={selectedSeries}
            dashboardPermissions={dashboardPermissions}
            invalidateAfterOperation={invalidateAfterOperation}
          />
        </TabsContent>

        <TabsContent value="policies" className="mt-6">
          <MediaPoliciesManager
            dashboardContext={dashboardContext}
            selectedEvent={selectedEvent}
            selectedTrack={selectedTrack}
            selectedSeries={selectedSeries}
            dashboardPermissions={dashboardPermissions}
            invalidateAfterOperation={invalidateAfterOperation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}