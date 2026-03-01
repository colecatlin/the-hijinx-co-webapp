import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowLeft, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format, parseISO } from 'date-fns';

export default function SessionProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => base44.entities.Session.list().then(sessions => sessions.find(s => s.id === sessionId)),
    enabled: !!sessionId,
  });

  const { data: event } = useQuery({
    queryKey: ['event', session?.event_id],
    queryFn: () => session?.event_id ? base44.entities.Event.list().then(events => events.find(e => e.id === session.event_id)) : null,
    enabled: !!session?.event_id,
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

  const { data: results = [] } = useQuery({
    queryKey: ['sessionResults', sessionId],
    queryFn: () => base44.entities.Results.filter({ session_id: sessionId }),
    enabled: !!sessionId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-session'],
    queryFn: () => base44.entities.Driver.list(),
    enabled: results.length > 0,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-session'],
    queryFn: () => base44.entities.DriverProgram.list(),
    enabled: results.length > 0,
  });

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  // Build lookup maps
  const driversById = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const programsById = useMemo(() => new Map(programs.map(p => [p.id, p])), [programs]);

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['sessionSeriesClasses', session?.series_class_id],
    queryFn: () => session?.series_class_id ? base44.entities.SeriesClass.list().then(classes => classes.filter(c => c.id === session.series_class_id)) : [],
    enabled: !!session?.series_class_id,
  });

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      if ((a.position || Infinity) === (b.position || Infinity)) return 0;
      return (a.position || Infinity) - (b.position || Infinity);
    });
  }, [results]);

  const getCarNumber = (result) => {
    if (result.program_id && programsById.has(result.program_id)) {
      return programsById.get(result.program_id).car_number;
    }
    const driver = driversById.get(result.driver_id);
    return driver?.primary_number || '';
  };

  // Results integrity stats
  const resultsIntegrity = useMemo(() => {
    const totalRows = results.length;
    const withPosition = results.filter(r => r.position != null).length;
    const missingDriver = results.filter(r => !driversById.has(r.driver_id)).length;
    return { totalRows, withPosition, missingDriver };
  }, [results, driversById]);

  // Get class name
  const className = useMemo(() => {
    if (session?.series_class_id && seriesClasses.length > 0) {
      return seriesClasses[0]?.class_name || null;
    }
    return session?.class_name || null;
  }, [session, seriesClasses]);

  if (sessionLoading) {
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

  if (!session) {
    return (
      <PageShell>
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <p className="text-gray-500 mb-4">Session not found.</p>
          <Link to={createPageUrl('EventDirectory')}>
            <Button>Back to Events</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  const sessionName = session.name || `${session.session_type}${session.session_number ? ` #${session.session_number}` : ''}`;
  const racedayUrl = event ? `${createPageUrl('RegistrationDashboard')}?orgType=${event.series_id ? 'series' : 'track'}&orgId=${event.series_id || event.track_id}&seasonYear=${event.season}&eventId=${event.id}&tab=results&sessionId=${sessionId}` : '';

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex-1">
            {event && (
              <Link to={`${createPageUrl('EventResults')}?id=${event.id}`} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-3 transition-colors">
                <ArrowLeft className="w-3 h-3" /> Back to Event Results
              </Link>
            )}
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">{sessionName}</h1>
            
            {/* Context Row */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4">
              {event && (
                <Link to={`${createPageUrl('EventProfile')}?id=${event.id}`} className="text-sm font-medium text-[#0A0A0A] hover:underline">
                  {event.name}
                </Link>
              )}
              {track && (
                <Link to={`${createPageUrl('TrackProfile')}?slug=${track.slug}`} className="text-sm text-gray-600 hover:text-[#0A0A0A]">
                  {track.name}
                </Link>
              )}
              {series && (
                <Link to={`${createPageUrl('SeriesDetail')}?id=${series.id}`} className="text-sm text-gray-600 hover:text-[#0A0A0A]">
                  {series.name}
                </Link>
              )}
            </div>

            {/* Session Summary Block */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Session Type</div>
                  <div className="text-lg font-semibold text-[#0A0A0A] mb-4">{session.session_type}</div>
                  
                  {session.laps && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Laps</div>
                      <div className="text-lg font-semibold text-[#0A0A0A]">{session.laps}</div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Status</div>
                  <Badge className={`${
                    session.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                    session.status === 'Provisional' ? 'bg-orange-100 text-orange-800' :
                    session.status === 'Official' ? 'bg-green-100 text-green-800' :
                    session.status === 'Locked' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`} className="mb-4">
                    {session.status}
                  </Badge>
                  
                  {session.scheduled_time && (
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{format(parseISO(session.scheduled_time), 'HH:mm')}</span>
                    </div>
                  )}
                  
                  {className && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Class</div>
                      <div className="text-sm font-medium text-[#0A0A0A]">{className}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col gap-2">
            {event && (
              <Link to={`${createPageUrl('EventProfile')}?id=${event.id}`}>
                <Button variant="outline" size="sm">Back to Event</Button>
              </Link>
            )}
            {isAuthenticated && (
              <Link to={racedayUrl}>
                <Button variant={user?.role === 'admin' ? 'default' : 'outline'} size="sm">Manage Session</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Status Banner */}
        {session && (
          <div className="mb-6">
            {session.status === 'Draft' && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
                <AlertCircle className="w-4 h-4 text-gray-600" />
                <p className="text-sm text-gray-600">Draft session results, not official</p>
              </div>
            )}
            {session.status === 'Provisional' && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-orange-50 border border-orange-200">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-orange-700">Provisional results, subject to change</p>
              </div>
            )}
            {session.status === 'Official' && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm text-green-700 font-medium">Official results</p>
              </div>
            )}
            {session.status === 'Locked' && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700 font-medium">Locked results, final</p>
              </div>
            )}
          </div>
        )}

        {/* Admin Control Strip */}
        {isAuthenticated && sortedResults.length > 0 && (
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-4 py-3 bg-white border border-gray-200 rounded-lg">
            <div className="text-sm font-medium text-gray-600">Session Management</div>
            <div className="flex items-center gap-2">
              {event && (
                <Link to={`${createPageUrl('RegistrationDashboard')}?orgType=${event.series_id ? 'series' : 'track'}&orgId=${event.series_id || event.track_id}&seasonYear=${event.season}&eventId=${event.id}&tab=results&sessionId=${sessionId}`}>
                  <Button variant={user?.role === 'admin' ? 'default' : 'outline'} size="sm" className="text-xs">
                    Open in RaceDay Engine
                  </Button>
                </Link>
              )}
              {event && (
                <Link to={`${createPageUrl('RegistrationDashboard')}?orgType=${event.series_id ? 'series' : 'track'}&orgId=${event.series_id || event.track_id}&seasonYear=${event.season}&eventId=${event.id}&tab=pointsAndStandings`}>
                  <Button variant={user?.role === 'admin' ? 'default' : 'outline'} size="sm" className="text-xs">
                    Standings Console
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Results Integrity Indicator */}
        {sortedResults.length > 0 && (
          <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-900 uppercase tracking-wide">Results Data</p>
              <p className="text-sm text-blue-800 mt-1">Results rows: {resultsIntegrity.totalRows}</p>
              {resultsIntegrity.missingDriver > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <p className="text-xs text-orange-700">{resultsIntegrity.missingDriver} result{resultsIntegrity.missingDriver !== 1 ? 's' : ''} missing driver reference</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Table */}
        {sortedResults.length > 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Time</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((result) => {
                    const driver = driversById.get(result.driver_id);
                    const isNotRunning = ['DNF', 'DNS', 'DSQ', 'DNP'].includes(result.status);
                    const hasMissingDriver = !driver;
                    return (
                      <tr
                        key={result.id}
                        className={`border-b border-gray-100 transition-colors ${
                          isNotRunning ? 'bg-red-50 opacity-75' : hasMissingDriver ? 'bg-yellow-50' : 'hover:bg-gray-50'
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
                            <div className="flex items-center gap-1 text-gray-400">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              <span className="text-xs">Unknown driver</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{result.status || 'Running'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{result.laps_completed ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {result.best_lap_time_ms ? `${(result.best_lap_time_ms / 1000).toFixed(2)}s` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {result.total_time_ms ? `${(result.total_time_ms / 1000).toFixed(2)}s` : '—'}
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
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">No results posted for this session yet.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}