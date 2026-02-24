import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function SeriesEventsSection({ seriesId, series }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['seriesEventsManagement', seriesId],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list('event_date', 500);
      const names = [series?.name, series?.full_name].filter(Boolean).map(n => n.toLowerCase().trim());
      return allEvents.filter(e => e.series && names.includes(e.series.toLowerCase().trim()));
    },
    enabled: !!seriesId && !!series,
  });

  const statusColors = {
    upcoming: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-800',
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return format(parseISO(dateStr), 'MMM d, yyyy');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Calendar & Schedule
        </CardTitle>
        <p className="text-sm text-gray-500">
          Events are linked via the Event entity's "series" field matching this series name.
          {events.length > 0 && <span className="ml-1 font-medium text-gray-700">{events.length} events found.</span>}
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-gray-400 text-sm">Loading events...</p>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No events found for this series.</p>
            <p className="text-xs text-gray-400 mt-1">
              Events must have a "series" field matching "{series?.name}"{series?.full_name ? ` or "${series.full_name}"` : ''}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {event.round_number && (
                      <span className="text-xs font-mono text-gray-400">Rd. {event.round_number}</span>
                    )}
                    <p className="font-semibold text-sm">{event.name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(event.event_date)}
                      {event.end_date && event.end_date !== event.event_date && ` – ${formatDate(event.end_date)}`}
                    </span>
                    {event.location_note && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location_note}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={`ml-3 text-xs capitalize ${statusColors[event.status] || 'bg-gray-100 text-gray-700'}`}>
                  {event.status?.replace('_', ' ') || 'upcoming'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}