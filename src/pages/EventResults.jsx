import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format, parseISO } from 'date-fns';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, MapPin, Calendar, AlertCircle } from 'lucide-react';

export default function EventResults() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [showProvisional, setShowProvisional] = useState(true);

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => base44.entities.Event.list().then(events => events.find(e => e.id === eventId)),
    enabled: !!eventId,
  });

  const { data: track } = useQuery({
    queryKey: ['track', event?.track_id],
    queryFn: () => event?.track_id ? base44.entities.Track.list().then(tracks => tracks.find(t => t.id === event.track_id)) : null,
    enabled: !!event?.track_id,
  });

  const { data: series } = useQuery({
    queryKey: ['series', event?.series_id],
    queryFn: () => event?.series_id ? base44.entities.Series.list().then(series => series.find(s => s.id === event.series_id)) : null,
    enabled: !!event?.series_id,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions-event', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results-event', eventId],
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['series-classes', event?.series_id],
    queryFn: () => event?.series_id ? base44.entities.SeriesClass.filter({ series_id: event.series_id, active: true }) : [],
    enabled: !!event?.series_id,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-results'],
    queryFn: () => base44.entities.Driver.list(),
    enabled: results.length > 0,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-results'],
    queryFn: () => base44.entities.DriverProgram.list(),
    enabled: results.length > 0,
  });

  const isAdmin = user?.role === 'admin';

  // Build lookup maps
  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const programMap = useMemo(() => new Map(programs.map(p => [p.id, p])), [programs]);
  const classMap = useMemo(() => new Map(seriesClasses.map(c => [c.id, c])), [seriesClasses]);

  // Sort sessions by scheduled_time
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (!a.scheduled_time && !b.scheduled_time) return 0;
      if (!a.scheduled_time) return 1;
      if (!b.scheduled_time) return -1;
      return new Date(a.scheduled_time) - new Date(b.scheduled_time);
    });
  }, [sessions]);

  // Default selected session: prefer Official/Locked, else most recent
  const defaultSession = useMemo(() => {
    const officialOrLocked = sortedSessions.find(s => ['Official', 'Locked'].includes(s.status));
    return officialOrLocked || sortedSessions[sortedSessions.length - 1] || null;
  }, [sortedSessions]);

  const activeSessionId = selectedSessionId || defaultSession?.id || null;
  const selectedSession = sessions.find(s => s.id === activeSessionId);

  // Filter results by selected session and class
  const filteredResults = useMemo(() => {
    let filtered = results.filter(r => r.session_id === activeSessionId);
    
    if (selectedClassId) {
      filtered = filtered.filter(r => r.series_class_id === selectedClassId);
    }

    // Apply provisional toggle
    if (!showProvisional && selectedSession) {
      if (!['Official', 'Locked'].includes(selectedSession.status)) {
        return [];
      }
    }

    return filtered.sort((a, b) => (a.position || 999) - (b.position || 999));
  }, [results, activeSessionId, selectedClassId, showProvisional, selectedSession]);

  // Get session label
  const getSessionLabel = (session) => {
    const parts = [session.session_type];
    if (session.session_number) parts.push(`#${session.session_number}`);
    if (session.name) parts.push(session.name);
    if (session.scheduled_time) parts.push(format(parseISO(session.scheduled_time), 'HH:mm'));
    return parts.join(', ');
  };

  // Get car number for result
  const getCarNumber = (result) => {
    if (result.program_id && programMap.has(result.program_id)) {
      return programMap.get(result.program_id).car_number;
    }
    const driver = driverMap.get(result.driver_id);
    return driver?.primary_number || '';
  };

  if (eventLoading) {
    return (
      <PageShell>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <Skeleton className="h-8 w-1/3 mb-4" />
          <Skeleton className="h-5 w-1/2 mb-12" />
          <div className="space-y-2">{[...Array(10)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        </div>
      </PageShell>
    );
  }

  if (!event) {
    return (
      <PageShell>
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <p className="text-gray-500">Event not found.</p>
        </div>
      </PageShell>
    );
  }

  const displayName = event.season ? `${event.season} ${event.name}` : event.name;
  const racedayUrl = `${createPageUrl('RegistrationDashboard')}?orgType=${event.series_id ? 'series' : 'track'}&orgId=${event.series_id || event.track_id}&seasonYear=${event.season}&eventId=${eventId}`;

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        {/* Results Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div className="flex-1">
            <Link to={`${createPageUrl('EventProfile')}?id=${eventId}`} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-4 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to Event
            </Link>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">{displayName}</h1>
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              {track && <span className="text-sm text-gray-600">{track.name}</span>}
              {event.event_date && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(parseISO(event.event_date), 'MMM d, yyyy')}
                  {event.end_date && event.end_date !== event.event_date && ` – ${format(parseISO(event.end_date), 'MMM d, yyyy')}`}
                </span>
              )}
              <Badge className={`${
                event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                event.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                event.status === 'completed' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {event.status}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {isAuthenticated && (
              <Link to={racedayUrl}>
                <Button variant={isAdmin ? 'default' : 'outline'} size="sm" className="w-full md:w-auto">
                  {isAdmin ? 'Manage Results' : 'Staff Console'}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Session Picker Bar */}
        {sortedSessions.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="text-xs font-medium text-gray-600 block mb-2">Select Session</label>
                <Select value={activeSessionId || ''} onValueChange={setSelectedSessionId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose session..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedSessions.map(session => (
                      <SelectItem key={session.id} value={session.id}>
                        {getSessionLabel(session)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {seriesClasses.length > 0 && (
                <div className="md:col-span-1">
                  <label className="text-xs font-medium text-gray-600 block mb-2">Filter by Class</label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>All classes</SelectItem>
                      {seriesClasses.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.class_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="md:col-span-1">
                <label className="text-xs font-medium text-gray-600 block mb-2">Options</label>
                <div className="flex items-center gap-3 h-9 px-3 border border-gray-300 rounded-md bg-white">
                  <input
                    type="checkbox"
                    id="provisional-toggle"
                    checked={showProvisional}
                    onChange={(e) => setShowProvisional(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="provisional-toggle" className="text-xs text-gray-600 cursor-pointer">
                    Show provisional
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center mb-6">
            <AlertCircle className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No sessions found for this event.</p>
          </div>
        )}

        {/* Session Status Banner */}
        {selectedSession && (
          <div className="mb-6">
            {selectedSession.status === 'Draft' && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
                <AlertCircle className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-600">Draft results, not public official yet</p>
              </div>
            )}
            {selectedSession.status === 'Provisional' && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-orange-50 border border-orange-200">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-orange-700">Provisional results, subject to review</p>
              </div>
            )}
            {selectedSession.status === 'Official' && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm text-green-700 font-medium">Official results</p>
              </div>
            )}
            {selectedSession.status === 'Locked' && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700 font-medium">Locked results, final</p>
              </div>
            )}
          </div>
        )}

        {/* Results Table */}
        {activeSessionId ? (
          <>
            {filteredResults.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Pos</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Car #</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Driver</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Laps</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Best Lap</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((result, idx) => {
                        const driver = driverMap.get(result.driver_id);
                        const isNotRunning = ['DNF', 'DNS', 'DSQ', 'DNP'].includes(result.status);
                        return (
                          <tr
                            key={result.id}
                            className={`border-b border-gray-100 hover:bg-gray-50 ${
                              isNotRunning ? 'bg-red-50' : !driver ? 'bg-yellow-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-bold">{result.position || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{getCarNumber(result) || '—'}</td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {driver ? (
                                <Link
                                  to={`${createPageUrl('DriverProfile')}?slug=${driver.slug}`}
                                  className="hover:underline text-[#0A0A0A]"
                                >
                                  {driver.first_name} {driver.last_name}
                                </Link>
                              ) : (
                                <span className="text-gray-400">Unknown Driver</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">{result.status || 'Running'}</td>
                            <td className="px-4 py-3 text-xs text-gray-600">{result.laps_completed ?? '—'}</td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {result.best_lap_time_ms ? `${(result.best_lap_time_ms / 1000).toFixed(2)}s` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold">{result.points ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center mb-6">
                <p className="text-sm text-gray-500">No results posted for this session yet.</p>
              </div>
            )}

            {/* Quick Links Row */}
            {isAuthenticated && filteredResults.length > 0 && (
              <div className="flex flex-col md:flex-row gap-2">
                <Link to={`${createPageUrl('SessionProfile')}?id=${selectedSession?.id}`}>
                  <Button variant="outline" size="sm">View Session Details</Button>
                </Link>
                <Link to={`${racedayUrl}&tab=results`}>
                  <Button variant="outline" size="sm">Jump to RaceDay Console</Button>
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">Select a session to view results.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}