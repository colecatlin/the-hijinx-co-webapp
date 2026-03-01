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

  const displayName = event.season ? `${event.season} ${event.name}` : event.name;

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20">
        <Link to={createPageUrl('EventDirectory') + '?tab=results'} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-8 transition-colors">
          <ArrowLeft className="w-3 h-3" /> Results
        </Link>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight">{displayName}</h1>
        <div className="flex flex-wrap items-center gap-4 mt-3 mb-8">
          {event.series_name && <span className="font-mono text-xs text-gray-400">{event.series_name}</span>}
          {event.location_note && (
            <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" /> {event.location_note}</span>
          )}
          {event.event_date && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              {format(new Date(event.event_date), 'MMMM d, yyyy')}
              {event.end_date && event.end_date !== event.event_date && (
                <> – {format(new Date(event.end_date), 'MMMM d, yyyy')}</>
              )}
            </span>
          )}
        </div>

        {resultsLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : results.length > 0 ? (
          <div>
            {/* Session toggle for multi-session events */}
            {hasMultipleSessions && (
              <div className="flex flex-wrap gap-2 mb-5">
                {sessionTypes.map(type => {
                  const sessionStatus = getSessionStatus(type);
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveSession(type)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors flex items-center gap-2 ${
                        currentSession === type
                          ? 'bg-[#232323] text-white border-[#232323]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {type}
                      <span className="ml-1 text-[10px] opacity-60">
                        ({results.filter(r => (r.session_type || 'Final') === type).length})
                      </span>
                      {isAdmin && sessionStatus && (
                        <Badge variant="outline" className="ml-1 h-4 text-[9px] px-1 py-0">{sessionStatus}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {currentSession && (
              <div className="mb-4">
                {getSessionStatus(currentSession) === 'Provisional' && (
                  <div className="mb-3">
                    <Badge className="bg-orange-100 text-orange-800">Provisional Results</Badge>
                  </div>
                )}
                {getSessionStatus(currentSession) === 'Locked' && (
                  <div className="mb-3">
                    <Badge className="bg-gray-200 text-gray-700">Finalized</Badge>
                  </div>
                )}
              </div>
            )}
            <div className="overflow-x-auto border border-gray-200">
              <table className="w-full min-w-[500px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Pos</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Driver</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Class</th>
                    {!hasMultipleSessions && <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Session</th>}
                    <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Pts</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono tracking-wider text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...displayedResults].sort((a, b) => (a.position || 999) - (b.position || 999)).map((r, i) => (
                    <tr key={r.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-bold tabular-nums">
                        {r.position ? `P${r.position}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {getDriverSlug(r.driver_id) ? (
                          <Link to={`${createPageUrl('DriverProfile')}?slug=${getDriverSlug(r.driver_id)}`} className="hover:underline">
                            {getDriverName(r.driver_id)}
                          </Link>
                        ) : getDriverName(r.driver_id)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {r.series_class_id ? getClassName(r.series_class_id) : (r.class || '—')}
                      </td>
                      {!hasMultipleSessions && <td className="px-4 py-3 text-xs text-gray-500">{r.session_type || 'Final'}</td>}
                      <td className="px-4 py-3 text-xs font-bold tabular-nums">{r.points ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.status || 'Running'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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