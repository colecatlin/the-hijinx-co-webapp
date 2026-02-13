import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Trophy, Calendar } from 'lucide-react';

export default function DriverTracksTab({ driverId }) {
  const [filters, setFilters] = useState({
    series: 'all',
    season: 'all',
    class: 'all'
  });

  const { data: results = [] } = useQuery({
    queryKey: ['driverResults', driverId],
    queryFn: () => base44.entities.Result.filter({ driver_id: driverId })
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['driverEntries', driverId],
    queryFn: () => base44.entities.EventEntry.filter({ driver_id: driverId, status: 'Published' })
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.filter({ status: 'Published' }),
    enabled: results.length > 0
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.filter({ status: 'Published' }),
    enabled: sessions.length > 0 || entries.length > 0
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.filter({ status: 'Published' }),
    enabled: events.length > 0
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.filter({ status: 'Published' }),
    enabled: events.length > 0
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => base44.entities.Class.filter({ status: 'Published' }),
    enabled: results.length > 0
  });

  // Build track participation data
  const trackParticipation = React.useMemo(() => {
    const participation = new Map();

    results.forEach(result => {
      const session = sessions.find(s => s.id === result.session_id);
      if (!session) return;
      const event = events.find(e => e.id === session.event_id);
      if (!event) return;
      const track = tracks.find(t => t.id === event.track_id);
      if (!track) return;

      const key = track.id;
      if (!participation.has(key)) {
        participation.set(key, {
          track,
          events: new Set(),
          results: [],
          bestFinish: result.position || 999,
          totalRaces: 0
        });
      }

      const data = participation.get(key);
      data.events.add(event.id);
      data.results.push({ result, event, session });
      if (result.position && result.position < data.bestFinish) {
        data.bestFinish = result.position;
      }
      data.totalRaces++;
    });

    return Array.from(participation.values());
  }, [results, sessions, events, tracks]);

  // Add upcoming entries
  const upcomingTracks = React.useMemo(() => {
    return entries
      .map(entry => {
        const event = events.find(e => e.id === entry.event_id);
        if (!event) return null;
        const track = tracks.find(t => t.id === event.track_id);
        if (!track) return null;
        return { entry, event, track };
      })
      .filter(Boolean)
      .filter(({ event }) => new Date(event.start_date) >= new Date());
  }, [entries, events, tracks]);

  // Apply filters
  const filteredData = trackParticipation.filter(item => {
    if (filters.series !== 'all') {
      const matchingSeries = item.results.some(r => {
        const event = events.find(e => e.id === r.event.id);
        return event?.series_id === filters.series;
      });
      if (!matchingSeries) return false;
    }
    if (filters.season !== 'all') {
      const matchingSeason = item.results.some(r => r.event.season_year === parseInt(filters.season));
      if (!matchingSeason) return false;
    }
    return true;
  });

  const uniqueSeries = [...new Set(events.map(e => e.series_id))];
  const uniqueSeasons = [...new Set(events.map(e => e.season_year))].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Select value={filters.series} onValueChange={(v) => setFilters(prev => ({ ...prev, series: v }))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Series" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Series</SelectItem>
            {uniqueSeries.map(seriesId => {
              const s = series.find(ser => ser.id === seriesId);
              return s ? <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem> : null;
            })}
          </SelectContent>
        </Select>

        <Select value={filters.season} onValueChange={(v) => setFilters(prev => ({ ...prev, season: v }))}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All Seasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Seasons</SelectItem>
            {uniqueSeasons.map(season => (
              <SelectItem key={season} value={season.toString()}>{season}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="ranked" className="w-full">
        <TabsList>
          <TabsTrigger value="ranked">Ranked Performance</TabsTrigger>
          <TabsTrigger value="grouped">By Series</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          {upcomingTracks.length > 0 && <TabsTrigger value="upcoming">Upcoming</TabsTrigger>}
        </TabsList>

        <TabsContent value="ranked" className="space-y-3">
          {filteredData
            .sort((a, b) => a.bestFinish - b.bestFinish)
            .map(item => (
              <div key={item.track.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{item.track.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{item.track.location_city}, {item.track.location_state}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#232323]">
                      {item.bestFinish === 999 ? '-' : `P${item.bestFinish}`}
                    </div>
                    <div className="text-sm text-gray-600">{item.totalRaces} races</div>
                  </div>
                </div>
              </div>
            ))}
        </TabsContent>

        <TabsContent value="grouped" className="space-y-6">
          {uniqueSeries.map(seriesId => {
            const s = series.find(ser => ser.id === seriesId);
            if (!s) return null;
            
            const seriesTracks = filteredData.filter(item =>
              item.results.some(r => events.find(e => e.id === r.event.id)?.series_id === seriesId)
            );

            if (seriesTracks.length === 0) return null;

            return (
              <div key={seriesId}>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  {s.name}
                </h3>
                <div className="space-y-2">
                  {seriesTracks.map(item => (
                    <div key={item.track.id} className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between">
                      <span>{item.track.name}</span>
                      <span className="font-semibold">
                        Best: {item.bestFinish === 999 ? '-' : `P${item.bestFinish}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          {uniqueSeasons.map(season => {
            const seasonTracks = filteredData.filter(item =>
              item.results.some(r => r.event.season_year === season)
            );

            if (seasonTracks.length === 0) return null;

            return (
              <div key={season}>
                <h3 className="text-lg font-bold mb-3">{season}</h3>
                <div className="space-y-2">
                  {seasonTracks.map(item => (
                    <div key={item.track.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="font-semibold">{item.track.name}</div>
                      <div className="text-sm text-gray-600">
                        {item.results.filter(r => r.event.season_year === season).length} races
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {upcomingTracks.length > 0 && (
          <TabsContent value="upcoming" className="space-y-3">
            {upcomingTracks.map(({ entry, event, track }) => (
              <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold">{track.name}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(event.start_date).toLocaleDateString()}</span>
                  </div>
                  <span>{event.name}</span>
                </div>
              </div>
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}