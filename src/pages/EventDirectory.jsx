import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Calendar, ChevronRight, Trophy, Medal, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

function DaysUntilBadge({ eventDate, status }) {
  if (!eventDate || status === 'completed' || status === 'cancelled') return null;
  const days = differenceInCalendarDays(parseISO(eventDate), new Date());
  if (days < 0) return null;
  if (days === 0) return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Today</span>;
  if (status === 'in_progress') return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">In Progress</span>;
  return <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">In {days}d</span>;
}

export default function EventDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('upcoming');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-event_date', 500),
  });

  const { data: seriesMap = {} } = useQuery({
    queryKey: ['seriesData'],
    queryFn: async () => {
      const allSeries = await base44.entities.Series.list();
      return Object.fromEntries(allSeries.map(s => [s.name, s]));
    },
  });

  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['results-all'],
    queryFn: () => base44.entities.Results.list('-position', 500),
    enabled: events.length > 0,
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: () => base44.entities.Driver.list(),
    enabled: allResults.length > 0,
  });

  const today = new Date().toISOString().split('T')[0];

  const upcomingEvents = useMemo(() =>
    events.filter(e => e.event_date && e.event_date > today),
    [events, today]
  );

  const completedEvents = useMemo(() =>
    events.filter(e => e.event_date && e.event_date <= today),
    [events, today]
  );

  const podiumByEvent = useMemo(() => {
    const map = {};
    for (const event of completedEvents) {
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
  }, [completedEvents, allResults, drivers]);

  const filteredUpcomingEvents = upcomingEvents
    .filter(event => {
      const matchesSearch = event.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeries = seriesFilter === 'all' || event.series === seriesFilter;
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      return matchesSearch && matchesSeries && matchesStatus;
    });

  const filteredCompletedEvents = completedEvents.filter(event => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    if (event.name?.toLowerCase().includes(term)) return true;
    if (event.series?.toLowerCase().includes(term)) return true;
    const podium = podiumByEvent[event.id] || [];
    return podium.some(p => p.name?.toLowerCase().includes(term));
  });

  const uniqueSeries = [...new Set(events.map(e => e.series).filter(Boolean))];

  const positionIcon = (pos) => {
    if (pos === 1) return <Trophy className="w-3.5 h-3.5 text-yellow-500" />;
    if (pos === 2) return <Medal className="w-3.5 h-3.5 text-gray-400" />;
    if (pos === 3) return <Medal className="w-3.5 h-3.5 text-amber-600" />;
    return null;
  };

  const EventResultRow = ({ event }) => {
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
          ) : (
            <span className="text-xs text-gray-400">No finisher data available</span>
          )}
        </div>
        <Link
          to={createPageUrl('EventResults') + `?id=${event.id}`}
          className="flex-shrink-0 flex items-center justify-center px-4 border-l border-gray-100 group-hover:border-gray-300 hover:bg-[#0A0A0A] hover:text-white transition-colors"
          title="View full results"
        >
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-inherit transition-colors" />
        </Link>
      </div>
    );
  };

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black mb-2">Events</h1>
          <p className="text-gray-600">Browse racing events and schedules</p>
        </div>

        <div className="flex gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={seriesFilter} onValueChange={setSeriesFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Series" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Series</SelectItem>
              {uniqueSeries.map(series => (
                <SelectItem key={series} value={series}>{series}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeTab === 'upcoming' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-transparent border-b border-gray-200 rounded-none w-full justify-start gap-0 h-auto p-0">
            <TabsTrigger
              value="upcoming"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#232323] data-[state=active]:bg-transparent data-[state=active]:text-[#232323] text-gray-400 px-4 pb-3 text-sm font-medium"
            >
              Upcoming
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#232323] data-[state=active]:bg-transparent data-[state=active]:text-[#232323] text-gray-400 px-4 pb-3 text-sm font-medium"
            >
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUpcomingEvents.map(event => (
                  <Link 
                    key={event.id} 
                    to={`${createPageUrl('EventProfile')}?id=${event.id}`}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-bold text-lg leading-tight">{event.name}</h3>
                      <span className={`shrink-0 ml-2 px-2 py-1 text-xs rounded ${
                        event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                        event.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Calendar className="w-4 h-4" />
                        {event.event_date ? format(new Date(event.event_date), 'MMM d, yyyy') : 'TBA'}
                        {event.round_number && seriesMap[event.series]?.uses_rounds && <span className="text-gray-400">· Rd {event.round_number}</span>}
                        <DaysUntilBadge eventDate={event.event_date} status={event.status} />
                      </div>
                      {event.series && (
                        <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">{event.series}</div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!isLoading && filteredUpcomingEvents.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No upcoming events found
              </div>
            )}
          </TabsContent>

          <TabsContent value="results">
            {isLoading || resultsLoading || driversLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : filteredCompletedEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-2">
                <Flag className="w-8 h-8 text-gray-300" />
                No completed events yet
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCompletedEvents.map(event => (
                  <EventResultRow key={event.id} event={event} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}