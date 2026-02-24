import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, MapPin } from 'lucide-react';

export default function TrackSeriesSection({ trackId, trackName }) {
  // Load all events at this track
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['trackEvents', trackId],
    queryFn: () => base44.entities.Event.filter({ track_id: trackId }),
    enabled: !!trackId,
  });

  // Load all series for cross-reference
  const { data: allSeries = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list('name', 500),
  });

  const seriesMap = Object.fromEntries(allSeries.map(s => [s.name, s]));

  // Group events by series name
  const eventsBySeries = {};
  events.filter(e => e.series).forEach(ev => {
    if (!eventsBySeries[ev.series]) eventsBySeries[ev.series] = [];
    eventsBySeries[ev.series].push(ev);
  });

  const uniqueSeriesCount = Object.keys(eventsBySeries).length;
  const totalEvents = events.length;
  const upcomingEvents = events.filter(e => e.status === 'upcoming').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{uniqueSeriesCount}</div>
          <div className="text-sm text-gray-500 mt-1">Series</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{totalEvents}</div>
          <div className="text-sm text-gray-500 mt-1">Total Events</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-black">{upcomingEvents}</div>
          <div className="text-sm text-gray-500 mt-1">Upcoming</div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Series Racing Here
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-gray-500 py-4">Loading...</div>
          ) : uniqueSeriesCount === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No series events linked to this track yet.</p>
              <p className="text-xs mt-1 text-gray-400">Add events to a series from the Series editor's "Tracks" tab.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(eventsBySeries).map(([seriesName, seriesEvents]) => {
                const seriesData = seriesMap[seriesName];
                const upcoming = seriesEvents.filter(e => e.status === 'upcoming');
                const completed = seriesEvents.filter(e => e.status === 'completed');

                return (
                  <div key={seriesName} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Series header */}
                    <div className="bg-gray-50 px-4 py-3 flex items-center gap-3">
                      {seriesData?.logo_url && (
                        <img src={seriesData.logo_url} alt="" className="h-8 w-8 object-contain rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{seriesName}</div>
                        {seriesData && (
                          <div className="text-xs text-gray-500">
                            {seriesData.discipline && `${seriesData.discipline}`}
                            {seriesData.region && ` • ${seriesData.region}`}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        {upcoming.length > 0 && (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs border-0">
                            {upcoming.length} upcoming
                          </Badge>
                        )}
                        {completed.length > 0 && (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            {completed.length} past
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Events */}
                    <div className="divide-y divide-gray-100">
                      {seriesEvents
                        .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''))
                        .map(ev => (
                          <div key={ev.id} className="px-4 py-3 flex items-center gap-3">
                            {ev.round_number && (
                              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 min-w-[36px] text-center">
                                R{ev.round_number}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{ev.name}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {ev.event_date}
                                {ev.end_date && ev.end_date !== ev.event_date && ` – ${ev.end_date}`}
                              </div>
                            </div>
                            <StatusBadge status={ev.status} />
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    upcoming: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace('_', ' ') || 'upcoming'}
    </span>
  );
}