import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Trophy, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Renders race-by-race results for a given filter (driver_id, event_id, or track via events)
export default function ResultsPanel({ driverId, eventId, seriesName, className: classFilter }) {
  const { data: results = [], isLoading: loadingResults } = useQuery({
    queryKey: ['results-panel', driverId, eventId, seriesName],
    queryFn: () => {
      if (driverId) return base44.entities.Results.filter({ driver_id: driverId });
      if (eventId) return base44.entities.Results.filter({ event_id: eventId });
      return [];
    },
    enabled: !!(driverId || eventId),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events-panel'],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-panel'],
    queryFn: () => base44.entities.Driver.list(),
    enabled: !!eventId, // only need for event view
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ['series-panel'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ['classes-panel'],
    queryFn: () => base44.entities.SeriesClass.list(),
  });

  const { data: allPrograms = [] } = useQuery({
    queryKey: ['programs-panel', driverId],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: driverId }),
    enabled: !!driverId,
  });

  // Standings for championship view
  const { data: standings = [], isLoading: loadingStandings } = useQuery({
    queryKey: ['standings-panel', driverId, seriesName],
    queryFn: () => {
      if (driverId) return base44.entities.Standings.filter({ driver_id: driverId });
      if (seriesName) return base44.entities.Standings.filter({ series_name: seriesName });
      return [];
    },
    enabled: !!(driverId || seriesName),
  });

  const getEventName = (eventId) => events.find(e => e.id === eventId)?.name || 'Unknown Event';
  const getDriverName = (dId) => {
    const d = drivers.find(d => d.id === dId);
    return d ? `${d.first_name} ${d.last_name}` : 'Unknown Driver';
  };
  const getDriverSlug = (dId) => drivers.find(d => d.id === dId)?.slug || null;
  const getSeriesName = (sId) => allSeries.find(s => s.id === sId)?.name || '—';
  const getClassName = (cId) => allClasses.find(c => c.id === cId)?.class_name || '—';
  const getProgramLink = (programId) => programId ? `${createPageUrl('DriverProgramProfile')}?programId=${programId}` : null;

  const positionBadgeColor = (pos) => {
    if (pos === 1) return 'bg-yellow-100 text-yellow-800';
    if (pos === 2) return 'bg-gray-200 text-gray-800';
    if (pos === 3) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-700';
  };

  const filteredResults = classFilter
    ? results.filter(r => r.series_class_id === classFilter)
    : results;

  const finals = filteredResults.filter(r => r.session_type === 'Final' || !r.session_type);
  const allSessions = filteredResults;

  return (
    <Tabs defaultValue="race-results">
      <TabsList className="mb-4">
        <TabsTrigger value="race-results" className="flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5" /> Race Results
        </TabsTrigger>
        <TabsTrigger value="standings" className="flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5" /> Championship Standings
        </TabsTrigger>
      </TabsList>

      {/* Race Results Tab */}
      <TabsContent value="race-results">
        {loadingResults ? (
          <p className="text-sm text-gray-500">Loading results...</p>
        ) : allSessions.length === 0 ? (
          <p className="text-gray-500 text-sm">No race results available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Pos</th>
                  {eventId && <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Driver</th>}
                  {driverId && <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Event</th>}
                  <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Session</th>
                  <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Class</th>
                  <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Series</th>
                  <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Points</th>
                  <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {allSessions.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${positionBadgeColor(r.position)}`}>
                        {r.position ? `P${r.position}` : '—'}
                      </span>
                    </td>
                    {eventId && (
                      <td className="py-2 px-3 font-medium">
                        <Link to={`${createPageUrl('DriverProfile')}?first=${''}&last=${''}`} className="hover:underline">
                          {getDriverName(r.driver_id)}
                        </Link>
                      </td>
                    )}
                    {driverId && (
                      <td className="py-2 px-3 font-medium">
                        <Link to={`${createPageUrl('EventProfile')}?id=${r.event_id}`} className="hover:underline text-[#232323]">
                          {getEventName(r.event_id)}
                        </Link>
                      </td>
                    )}
                    <td className="py-2 px-3 text-gray-600 text-xs">{r.session_type || 'Final'}</td>
                    <td className="py-2 px-3 text-gray-600 text-xs">{r.class || '—'}</td>
                    <td className="py-2 px-3 text-gray-600 text-xs">{r.series || '—'}</td>
                    <td className="py-2 px-3 font-bold tabular-nums">{r.points ?? '—'}</td>
                    <td className="py-2 px-3 text-xs text-gray-500">{r.status_text || 'Running'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      {/* Championship Standings Tab */}
      <TabsContent value="standings">
        {loadingStandings ? (
          <p className="text-sm text-gray-500">Loading standings...</p>
        ) : standings.length === 0 ? (
          <p className="text-gray-500 text-sm">No championship standings data available.</p>
        ) : (
          <div className="space-y-6">
            {/* Group by series + class */}
            {Object.entries(
              standings.reduce((acc, s) => {
                const key = `${s.series_name} — ${s.class_name} (${s.season_year})`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(s);
                return acc;
              }, {})
            ).map(([groupKey, entries]) => (
              <div key={groupKey}>
                <h3 className="text-sm font-bold text-[#232323] mb-3">{groupKey}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Pos</th>
                        <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Driver</th>
                        <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Bib</th>
                        <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Pts</th>
                        <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Wins</th>
                        <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Podiums</th>
                        <th className="text-left py-2 px-3 text-[10px] font-mono tracking-wider text-gray-400 uppercase">Starts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.sort((a, b) => (a.position || 999) - (b.position || 999)).map(entry => (
                        <tr
                          key={entry.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${driverId && entry.driver_id === driverId ? 'bg-yellow-50' : ''}`}
                        >
                          <td className="py-2 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${positionBadgeColor(entry.position)}`}>
                              {entry.position ? `P${entry.position}` : '—'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium">
                            {entry.driver_id ? (
                              <Link to={`${createPageUrl('DriverProfile')}?first=${entry.first_name?.toLowerCase()}&last=${entry.last_name?.toLowerCase()}`} className="hover:underline">
                                {entry.first_name} {entry.last_name}
                              </Link>
                            ) : (
                              `${entry.first_name} ${entry.last_name}`
                            )}
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-500 font-mono">{entry.bib_number || '—'}</td>
                          <td className="py-2 px-3 font-bold tabular-nums">{entry.total_points ?? '—'}</td>
                          <td className="py-2 px-3 tabular-nums">{entry.wins ?? 0}</td>
                          <td className="py-2 px-3 tabular-nums">{entry.podiums ?? 0}</td>
                          <td className="py-2 px-3 tabular-nums">{entry.events_counted ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}