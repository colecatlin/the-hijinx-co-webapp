import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { buildProfileUrl } from '@/components/utils/routingContract';
import { format } from 'date-fns';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MapPin, Calendar } from 'lucide-react';

export default function EventResults() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const all = await base44.entities.Event.list();
      return all.find(e => e.id === eventId);
    },
    enabled: !!eventId,
  });

  // Fetch related entities for links
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
    enabled: !!event?.track_id,
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    enabled: !!event?.series_id,
  });

  const track = tracks.find(t => t.id === event?.track_id);
  const seriesItem = series.find(s => s.id === event?.series_id);

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-5xl mx-auto px-6 py-20">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-5 w-1/2 mb-8" />
          <div className="space-y-2">{[...Array(10)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        </div>
      </PageShell>
    );
  }

  if (!event) {
    return (
      <PageShell>
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-gray-400">Event not found.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <Link to={createPageUrl('ResultsHome')} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-8 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Results
        </Link>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight">{event.name}</h1>
        <div className="flex flex-wrap items-center gap-4 mt-3 mb-8">
          {event.series_name && <span className="font-mono text-xs text-gray-400">{event.series_name}</span>}
          {event.track_name && (
            <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" /> {event.track_name}</span>
          )}
          {event.event_date && <span className="flex items-center gap-1 text-xs text-gray-400"><Calendar className="w-3 h-3" /> {format(new Date(event.event_date), 'MMMM d, yyyy')}</span>}
        </div>

        {event.results?.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200">
            <table className="w-full min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Pos</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Team</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Laps</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Pts</th>
                </tr>
              </thead>
              <tbody>
                {event.results.sort((a, b) => (a.position || 0) - (b.position || 0)).map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-bold tabular-nums">{r.position}</td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {r.driver_id ? (
                        <Link to={r.driver_slug ? buildProfileUrl('Driver', r.driver_slug) : '#'} className="hover:underline">{r.driver_name}</Link>
                      ) : r.driver_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.team_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.class_name}</td>
                    <td className="px-4 py-3 text-xs tabular-nums">{r.laps}</td>
                    <td className="px-4 py-3 text-xs font-mono tabular-nums">{r.time}</td>
                    <td className="px-4 py-3 text-xs font-bold tabular-nums">{r.points_earned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No detailed results available for this event.</p>
        )}

        {event.description && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}