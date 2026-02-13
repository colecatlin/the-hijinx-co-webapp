import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapPin, Trophy, DollarSign, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EventOverview({ event }) {
  const { data: series } = useQuery({
    queryKey: ['series', event.series_id],
    queryFn: async () => {
      const s = await base44.entities.Series.filter({ id: event.series_id });
      return s[0];
    }
  });

  const { data: track } = useQuery({
    queryKey: ['track', event.track_id],
    queryFn: async () => {
      const t = await base44.entities.Track.filter({ id: event.track_id });
      return t[0];
    }
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', event.series_id],
    queryFn: () => base44.entities.Class.filter({ series_id: event.series_id, status: 'Published' })
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Event Details</h2>
        
        <div className="space-y-4">
          {series && (
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Series</p>
                <p className="font-semibold">{series.name}</p>
              </div>
            </div>
          )}

          {track && (
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Venue</p>
                <p className="font-semibold">{track.name}</p>
                <p className="text-sm text-gray-600">
                  {track.location_city}, {track.location_state}
                </p>
              </div>
            </div>
          )}

          {event.purse_total && (
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Prize Purse</p>
                <p className="font-semibold">${event.purse_total.toLocaleString()}</p>
              </div>
            </div>
          )}

          {classes.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Classes</p>
              <div className="flex flex-wrap gap-2">
                {classes.map(c => (
                  <span key={c.id} className="px-3 py-1 bg-gray-100 text-sm rounded">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {event.event_url && (
              <a href={event.event_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Event Website
                </Button>
              </a>
            )}
            {event.ticket_url && (
              <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                <Button className="gap-2">
                  Buy Tickets
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}