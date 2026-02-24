import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';

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

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('event_date', 500),
  });

  const { data: seriesMap = {} } = useQuery({
    queryKey: ['seriesData'],
    queryFn: async () => {
      const allSeries = await base44.entities.Series.list();
      return Object.fromEntries(allSeries.map(s => [s.name, s]));
    },
  });

  const filteredEvents = events
    .filter(event => {
      const matchesSearch = event.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeries = seriesFilter === 'all' || event.series === seriesFilter;
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      return matchesSearch && matchesSeries && matchesStatus;
    })
    .sort((a, b) => {
      // Completed events go to the bottom
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      if (a.status === 'cancelled' && b.status !== 'cancelled') return 1;
      if (a.status !== 'cancelled' && b.status === 'cancelled') return -1;
      // Then sort by event_date ascending (soonest first)
      return new Date(a.event_date || '9999-12-31') - new Date(b.event_date || '9999-12-31');
    });

  const uniqueSeries = [...new Set(events.map(e => e.series).filter(Boolean))];

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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
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
                    event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
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

        {!isLoading && filteredEvents.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No events found
          </div>
        )}
      </div>
    </PageShell>
  );
}