import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileCompletenessIndicator from '@/components/system/ProfileCompletenessIndicator';
import ProfileHandoffBanner from '@/components/system/ProfileHandoffBanner';
import ManagementLayout from '@/components/management/ManagementLayout';
import { createPageUrl } from '@/components/utils';
import EventBuilderForm from '@/components/management/EventBuilder/EventBuilderForm';
import SessionManager from '@/components/management/EventManagement/SessionManager';

export default function RaceCoreEventEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: () => base44.entities.Event.get(id),
    enabled: !isNew && !!id,
  });

  const handleEventCreated = (newEventId) => {
    navigate('/racecore/events/' + newEventId);
  };

  return (
    <ManagementLayout currentPage="RaceCoreEventEditor" embedded={true}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/racecore/records/events')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Deep Editor / Events</p>
            <h1 className="text-4xl font-black mb-1">{isNew ? 'New Event' : 'Event Deep Editor'}</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-500 text-sm">
                {isNew ? 'Create a new event' : 'Deep record editor — use this page for detailed event configuration. Use the Race Operations Hub for event planning, entries, sessions, results, and race day workflow.'}
              </p>
              {!isNew && event && <ProfileCompletenessIndicator entityType="Event" record={event} />}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/racecore')}
            className="gap-2 shrink-0"
          >
            ↗ Back to Race Operations Hub
          </Button>
        </div>

        {!isNew && event && <ProfileHandoffBanner entityType="Event" entityId={id} record={event} />}

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="details">Event Details</TabsTrigger>
            {!isNew && <TabsTrigger value="sessions">Sessions</TabsTrigger>}
          </TabsList>

          <TabsContent value="details">
            <EventBuilderForm
              selectedEventId={isNew ? null : id}
              onEventCreated={handleEventCreated}
              isAdmin={isAdmin}
              canEditEventCore={true}
            />
          </TabsContent>

          {!isNew && (
            <TabsContent value="sessions">
              <SessionManager eventId={id} eventName={event?.name} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ManagementLayout>
  );
}