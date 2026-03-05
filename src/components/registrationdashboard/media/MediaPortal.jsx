import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import MediaRequestsPanel from './MediaRequestsPanel';
import MediaCredentialsPanel from './MediaCredentialsPanel';
import MediaPoliciesPanel from './MediaPoliciesPanel';
import MediaWaiversPanel from './MediaWaiversPanel';
import MediaDeliverablesPanel from './MediaDeliverablesPanel';
import MediaUploadsPanel from './MediaUploadsPanel';
import MediaReviewPublishPanel from './MediaReviewPublishPanel';

export default function MediaPortal({
  dashboardContext,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardPermissions,
  currentUser,
  isAdmin,
  invalidateAfterOperation,
}) {
  const [subTab, setSubTab] = useState('requests');

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
    currentUser,
    isAdmin,
    invalidateAfterOperation,
  };

  const SUB_TABS = [
    { key: 'requests',         label: 'Requests' },
    { key: 'credentials',      label: 'Credentials' },
    { key: 'policies',         label: 'Policies' },
    { key: 'waivers',          label: 'Waivers' },
    { key: 'deliverables',     label: 'Deliverables' },
    { key: 'uploads',          label: 'Uploads' },
    { key: 'review_publish',   label: 'Review & Publish' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wide">Event:</span>
        <span className="text-xs text-white font-medium">{selectedEvent.name}</span>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
        <TabsList className="bg-[#171717] border border-gray-800 p-1 h-auto flex flex-wrap gap-1">
          {SUB_TABS.map(t => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="data-[state=active]:bg-blue-900 data-[state=active]:text-blue-100 text-gray-400 px-3 py-1.5 text-xs"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="requests">
            <MediaRequestsPanel {...sharedProps} />
          </TabsContent>
          <TabsContent value="credentials">
            <MediaCredentialsPanel {...sharedProps} />
          </TabsContent>
          <TabsContent value="policies">
            <MediaPoliciesPanel dashboardContext={dashboardContext} invalidateAfterOperation={invalidateAfterOperation} />
          </TabsContent>
          <TabsContent value="waivers">
            <MediaWaiversPanel dashboardContext={dashboardContext} selectedEvent={selectedEvent} invalidateAfterOperation={invalidateAfterOperation} />
          </TabsContent>
          <TabsContent value="deliverables">
            <MediaDeliverablesPanel dashboardContext={dashboardContext} selectedEvent={selectedEvent} invalidateAfterOperation={invalidateAfterOperation} />
          </TabsContent>
          <TabsContent value="uploads">
            <MediaUploadsPanel {...sharedProps} />
          </TabsContent>
          <TabsContent value="review_publish">
            <MediaReviewPublishPanel {...sharedProps} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}