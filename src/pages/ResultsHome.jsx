import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flag, ChevronRight, Trophy, Medal, Calendar } from 'lucide-react';

export default function ResultsHome() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: allEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['results-all-events'],
    queryFn: () => base44.entities.Event.list('-event_date', 500),
  });

  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['results-all'],
    queryFn: () => base44.entities.Results.list('-position', 500),
    enabled: allEvents.length > 0,
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: () => base44.entities.Driver.list(),
    enabled: allResults.length > 0,
  });

  const isLoading = eventsLoading || resultsLoading || driversLoading;

  const today = new Date().toISOString().split('T')[0];

  const finishedEvents = useMemo(() =>
    allEvents.filter(e => e.event_date && e.event_date <= today),
    [allEvents, today]
  );

  const upcomingEvents = useMemo(() =>
    allEvents.filter(e => e.event_date && e.event_date > today).sort((a, b) =>
      a.event_date.localeCompare(b.event_date)
    ),
    [allEvents, today]
  );

  const podiumByEvent = useMemo(() => {
    const map = {};
    for (const event of finishedEvents) {
      const finalResults = allResults
        .filter(r => r.event_id === event.id && r.position && r.session_type === 'Final')
        .sort((a, b) => a.position - b.position);

      const fallback = allResults
        .filter(r => r.event_id === event.id && r.position)
        .sort((a, b) => a.position - b.position);

      const topResults = (finalResults.length > 0 ? finalResults : fallback).slice(0, 3);

      map[event.id] = topResults.map(r => {
        const driver = drivers.find(d => d.id === r.driver_id);
        return {
          position: r.position,
          number: driver?.primary_number || null,
          name: driver ? `${driver.first_name} ${driver.last_name}` : (r.team_name || '—'),
        };
      });
    }
    return map;
  }, [finishedEvents, allResults, drivers]);

  const filterEvents = (events) => {
    if (!searchTerm) return events;
    const term = searchTerm.toLowerCase();
    return events.filter(e => {
      if (e.name?.toLowerCase().includes(term)) return true;
      if (e.series?.toLowerCase().includes(term)) return true;
      const podium = podiumByEvent[e.id] || [];
      return podium.some(p => p.name?.toLowerCase().includes(term));
    });
  };

  const positionIcon = (pos) => {
    if (pos === 1) return <Trophy className="w-3.5 h-3.5 text-yellow-500" />;
    if (pos === 2) return <Medal className="w-3.5 h-3.5 text-gray-400" />;
    if (pos === 3) return <Medal className="w-3.5 h-3.5 text-amber-600" />;
    return null;
  };

  const EventRow = ({ event, showLink = false }) => {
    const podium = podiumByEvent[event.id] || [];
    const dateStr = event.event_date ? format(new Date(event.event_date + 'T00:00:00'), 'MM/dd/yy') : null;

    return (
      <div className="flex items-stretch border border-gray-100 hover:border-gray-300 transition-colors group">
        {dateStr && (
          <div className="flex-shrink-0 flex items-center justify-center bg-[#0A0A0A] text-white font-mono text-sm font-bold px-4 min-w-[72px]">
            {dateStr}
          </div>
        )}
        <div className="flex-1 px-5 py-4">
          <h3 className="font-bold text-sm text-[#0A0A0A] mb-2">{event.name}</h3>
          {event.series && (
            <p className="text-xs text-gray-400 mb-1">{event.series}</p>
          )}
          {podium.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {podium.map((p) => (
                <div key={p.position} className="flex items-center gap-1.5">
                  {positionIcon(p.position)}
                  <span className="text-xs text-gray-700 font-medium">
                    {p.number ? `#${p.number} ` : ''}{p.name}
                  </span>
                </div>
              ))}
            </div>
          ) : showLink ? null : (
            <span className="text-xs text-gray-400">No finisher data available</span>
          )}
        </div>
        {showLink && (
          <Link
            to={createPageUrl('EventResults') + `?id=${event.id}`}
            className="flex-shrink-0 flex items-center justify-center px-4 border-l border-gray-100 group-hover:border-gray-300 hover:bg-[#0A0A0A] hover:text-white transition-colors"
            title="View full results"
          >
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-inherit transition-colors" />
          </Link>
        )}
      </div>
    );
  };

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <SectionHeader label="Motorsports" title="Results" subtitle="Race results and event data." />

        <div className="mb-8">
          <input
            type="text"
            placeholder="Search by event, series, or driver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-b-2 border-gray-200 focus:border-[#0A0A0A] bg-transparent py-2 text-sm outline-none placeholder:text-gray-300"
          />
        </div>

        <Tabs defaultValue="finished">
          <TabsList className="mb-8 bg-transparent border-b border-gray-200 rounded-none w-full justify-start gap-0 h-auto p-0">
            <TabsTrigger
              value="finished"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#0A0A0A] data-[state=active]:bg-transparent data-[state=active]:text-[#0A0A0A] text-gray-400 px-4 pb-3 text-sm font-medium"
            >
              Finished
            </TabsTrigger>
            <TabsTrigger
              value="upcoming"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#0A0A0A] data-[state=active]:bg-transparent data-[state=active]:text-[#0A0A0A] text-gray-400 px-4 pb-3 text-sm font-medium"
            >
              Upcoming
            </TabsTrigger>
          </TabsList>

          <TabsContent value="finished">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : filterEvents(finishedEvents).length === 0 ? (
              <EmptyState icon={Flag} title="No results yet" message="Completed event results will appear here." />
            ) : (
              <div className="space-y-3">
                        {filterEvents(finishedEvents).map((event) => (
                          <div key={event.id} onClick={() => {}} className="cursor-pointer">
                            <EventRow event={event} showLink={true} />
                          </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {eventsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : filterEvents(upcomingEvents).length === 0 ? (
              <EmptyState icon={Calendar} title="No upcoming events" message="Scheduled events will appear here." />
            ) : (
              <div className="space-y-3">
                {filterEvents(upcomingEvents).map((event) => (
                  <EventRow key={event.id} event={event} showLink={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}