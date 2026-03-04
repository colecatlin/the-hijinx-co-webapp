import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { CalendarDays, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

function statusColor(status) {
  switch (status) {
    case 'Live': return 'bg-green-500/20 text-green-400';
    case 'Published': return 'bg-blue-500/20 text-blue-400';
    case 'Completed': case 'completed': return 'bg-gray-500/20 text-gray-400';
    case 'Draft': return 'bg-yellow-500/20 text-yellow-400';
    case 'Cancelled': case 'cancelled': return 'bg-red-500/20 text-red-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

export default function MyEventsPanel({ user, eventCollabs }) {
  const eventColabIds = eventCollabs.map(c => c.entity_id);

  // Load all events and filter client-side to those the user created or has via collaborator
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['myEvents', user.id, eventColabIds.join(',')],
    queryFn: async () => {
      const [createdEvents, allEvents] = await Promise.all([
        base44.entities.Event.filter({ created_by: user.email }),
        eventColabIds.length > 0 ? base44.entities.Event.list('-event_date', 200) : Promise.resolve([]),
      ]);
      const colabEvents = allEvents.filter(e => eventColabIds.includes(e.id));
      const seen = new Set();
      const merged = [];
      for (const e of [...createdEvents, ...colabEvents]) {
        if (!seen.has(e.id)) { seen.add(e.id); merged.push(e); }
      }
      return merged.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
    },
    staleTime: 30000,
  });

  return (
    <div className="bg-[#171717] border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-orange-400" />
        <h2 className="text-sm font-semibold text-white">My Events</h2>
        <span className="ml-auto text-xs text-gray-500">{events.length}</span>
      </div>

      {isLoading ? (
        <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-800/50 rounded animate-pulse" />)}</div>
      ) : events.length === 0 ? (
        <div className="px-5 py-10 text-center text-gray-500 text-sm">No events found for your account.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-900/50 border-b border-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Event</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Date</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Series</th>
                <th className="px-4 py-2 text-left text-gray-400 font-medium">Status</th>
                <th className="px-4 py-2 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-2.5 text-white font-medium">{event.name}</td>
                  <td className="px-4 py-2.5 text-gray-400">
                    {event.event_date ? format(new Date(event.event_date), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{event.series_name || '—'}</td>
                  <td className="px-4 py-2.5">
                    <Badge className={`text-xs ${statusColor(event.status)}`}>{event.status || 'Draft'}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={createPageUrl(`RegistrationDashboard?event_id=${event.id}`)}
                        className="p-1 text-gray-400 hover:text-orange-400 transition-colors"
                        title="Open in Race Core"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}