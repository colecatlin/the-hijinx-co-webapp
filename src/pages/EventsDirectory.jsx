import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Calendar, Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import PageShell from '@/components/shared/PageShell';
import SectionHeader from '@/components/shared/SectionHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function EventsDirectory() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  const tracksMap = Object.fromEntries(tracks.map(t => [t.id, t]));
  const seriesMap = Object.fromEntries(series.map(s => [s.id, s]));

  const filteredEvents = events.filter(event => {
    const track = tracksMap[event.track_id];
    const matchesSearch = event.name.toLowerCase().includes(search.toLowerCase()) ||
      track?.name.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (!isAdmin) {
      matchesStatus = event.status === 'Upcoming' || event.status === 'Completed';
    } else if (statusFilter !== 'all') {
      matchesStatus = event.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <SectionHeader
          title="Events"
          subtitle="Upcoming and past racing events"
        />

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {isAdmin && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Upcoming">Upcoming</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {eventsLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No events found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map(event => {
              const track = tracksMap[event.track_id];
              const seriesData = seriesMap[event.series_id];
              return (
                <Link
                  key={event.id}
                  to={createPageUrl('EventDetail', { slug: event.slug })}
                  className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow flex items-start gap-4"
                >
                  <div className="flex-shrink-0">
                    <Calendar className="w-10 h-10 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
                        {event.name}
                      </h3>
                      <Badge variant={event.status === 'Upcoming' ? 'default' : 'outline'}>
                        {event.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {event.date_start && (
                        <p className="text-sm text-gray-600">
                          {format(new Date(event.date_start), 'MMM d, yyyy')}
                          {event.date_end && event.date_end !== event.date_start && 
                            ` - ${format(new Date(event.date_end), 'MMM d, yyyy')}`}
                        </p>
                      )}
                      {track && (
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {track.name}, {track.city}
                        </p>
                      )}
                      {seriesData && (
                        <p className="text-sm text-gray-500">{seriesData.name}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}