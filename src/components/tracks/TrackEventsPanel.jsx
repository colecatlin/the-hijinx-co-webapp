import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TrackEventsPanel({ upcomingEvents = [], pastEvents = [] }) {
  const [activeSection, setActiveSection] = useState(upcomingEvents.length > 0 ? 'upcoming' : 'past');

  const EventCard = ({ event }) => (
    <div className="border border-gray-200 p-4 hover:border-[#232323] transition-colors">
      <div className="flex items-start gap-4">
        <div className="min-w-[52px] text-center bg-[#232323] text-white p-2 flex-shrink-0">
          <div className="text-[10px] font-mono uppercase">{format(parseISO(event.event_date), 'MMM')}</div>
          <div className="text-2xl font-black leading-none">{format(parseISO(event.event_date), 'd')}</div>
          <div className="text-[9px] font-mono opacity-70">{format(parseISO(event.event_date), 'yyyy')}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[#232323] mb-1 truncate">{event.name}</div>
          {event.series_name && (
            <div className="text-sm text-gray-500 mb-2">{event.series_name}</div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {event.status && (
              <Badge variant="outline" className="text-xs">{event.status}</Badge>
            )}
            {event.end_date && event.end_date !== event.event_date && (
              <Badge variant="outline" className="text-xs text-gray-400">
                thru {format(parseISO(event.end_date), 'MMM d')}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        {[
          { key: 'upcoming', label: `Upcoming (${upcomingEvents.length})` },
          { key: 'past', label: `Past (${pastEvents.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`pb-3 text-sm font-semibold transition-colors ${
              activeSection === key
                ? 'text-[#232323] border-b-2 border-[#232323] -mb-px'
                : 'text-gray-400 hover:text-[#232323]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'upcoming' && (
        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">No upcoming events scheduled.</p>
            </div>
          ) : (
            upcomingEvents.map(event => <EventCard key={event.id} event={event} />)
          )}
        </div>
      )}

      {activeSection === 'past' && (
        <div className="space-y-3">
          {pastEvents.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">No past events found.</p>
            </div>
          ) : (
            pastEvents.slice(0, 20).map(event => <EventCard key={event.id} event={event} />)
          )}
        </div>
      )}
    </div>
  );
}