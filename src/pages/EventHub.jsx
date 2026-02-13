import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EventOverview from '@/components/events/EventOverview';
import EventSchedule from '@/components/events/EventSchedule';
import EventEntries from '@/components/events/EventEntries';
import EventResults from '@/components/events/EventResults';
import EventTiming from '@/components/events/EventTiming';
import { Calendar } from 'lucide-react';

export default function EventHub() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');
  const defaultTab = urlParams.get('tab') || 'overview';

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', slug],
    queryFn: async () => {
      const events = await base44.entities.Event.filter({ slug, status: 'Published' });
      return events[0];
    },
    enabled: !!slug
  });

  if (isLoading) {
    return (
      <PageShell className="bg-[#FFF8F5]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!event) {
    return (
      <PageShell className="bg-[#FFF8F5]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-2xl font-bold">Event not found</h1>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">{event.name}</h1>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-5 h-5" />
            <span>{new Date(event.start_date).toLocaleDateString()}</span>
            {event.end_date && event.end_date !== event.start_date && (
              <span>- {new Date(event.end_date).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="entries">Entries</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <EventOverview event={event} />
          </TabsContent>

          <TabsContent value="schedule">
            <EventSchedule eventId={event.id} />
          </TabsContent>

          <TabsContent value="entries">
            <EventEntries eventId={event.id} />
          </TabsContent>

          <TabsContent value="results">
            <EventResults eventId={event.id} />
          </TabsContent>

          <TabsContent value="timing">
            <EventTiming eventId={event.id} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}