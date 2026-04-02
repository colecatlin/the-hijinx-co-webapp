import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import ProfileCompletenessIndicator from '@/components/system/ProfileCompletenessIndicator';
import ProfileHandoffBanner from '@/components/system/ProfileHandoffBanner';
import ManagementLayout from '@/components/management/ManagementLayout';
import { createPageUrl } from '@/components/utils';
import EventBuilderForm from '@/components/management/EventBuilder/EventBuilderForm';

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
    navigate('/race-core/events/' + newEventId);
  };

  return (
    <ManagementLayout currentPage="RaceCoreEventEditor">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('RegistrationDashboard'))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Race Core / Events</p>
            <h1 className="text-4xl font-black mb-1">{isNew ? 'New Event' : 'Edit Event'}</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-gray-500 text-sm">
                {isNew ? 'Create a new event' : 'Edit event details — for full operations, use the Registration Dashboard'}
              </p>
              {!isNew && event && <ProfileCompletenessIndicator entityType="Event" record={event} />}
            </div>
          </div>
          {!isNew && (
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('RegistrationDashboard') + `?eventId=${id}`)}
            >
              Open Full Dashboard →
            </Button>
          )}
        </div>

        {!isNew && event && <ProfileHandoffBanner entityType="Event" entityId={id} record={event} />}

        <EventBuilderForm
          selectedEventId={isNew ? null : id}
          onEventCreated={handleEventCreated}
          isAdmin={isAdmin}
          canEditEventCore={true}
        />
      </div>
    </ManagementLayout>
  );
}