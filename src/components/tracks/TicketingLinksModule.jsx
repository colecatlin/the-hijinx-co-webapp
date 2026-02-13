import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ExternalLink, Ticket } from 'lucide-react';

export default function TicketingLinksModule({ track, trackId }) {
  const { data: nextEvent } = useQuery({
    queryKey: ['nextEvent', trackId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const events = await base44.entities.Event.filter({
        track_id: trackId,
        status: 'Published'
      });
      const upcoming = events
        .filter(e => e.start_date >= today)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      return upcoming[0];
    }
  });

  const ticketUrl = nextEvent?.ticket_url || track.ticket_url;
  const eventUrl = nextEvent?.event_url;
  const trackWebsite = track.website_url;

  if (!ticketUrl && !eventUrl && !trackWebsite) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Links & Tickets</h2>
      
      <div className="flex flex-wrap gap-3">
        {ticketUrl && (
          <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
            <Button className="gap-2">
              <Ticket className="w-4 h-4" />
              Buy Tickets
            </Button>
          </a>
        )}
        
        {eventUrl && (
          <a href={eventUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Event Info
            </Button>
          </a>
        )}
        
        {trackWebsite && (
          <a href={trackWebsite} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Track Website
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}