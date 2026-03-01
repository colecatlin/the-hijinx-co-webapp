import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import PageShell from '@/components/shared/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Calendar } from 'lucide-react';

const SESSION_ORDER = ['Practice', 'Qualifying', 'Heat 1', 'Heat 2', 'Heat 3', 'Heat 4', 'LCQ', 'Final'];

export default function EventResults() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const [activeSession, setActiveSession] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const all = await base44.entities.Event.list();
      return all.find(e => e.id === eventId);
    },
    enabled: !!eventId,
  });

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['results-event', eventId],
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions-event', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers-results'],
    queryFn: () => base44.entities.Driver.list(),
    enabled: results.length > 0,
  });

  const { data: allClasses = [] } = useQuery({
    queryKey: ['classes-results'],
    queryFn: () => base44.entities.SeriesClass.list(),
    enabled: results.length > 0,
  });

  const publicSessionStatuses = ['Provisional', 'Official', 'Locked'];
  const isAdmin = user?.role === 'admin';

  const visibleSessions = sessions.filter(s => 
    isAdmin || publicSessionStatuses.includes(s.status)
  );

  const sessionTypes = [...new Set(
    results
      .filter(r => visibleSessions.some(s => s.id === r.session_id) || !r.session_id)
      .map(r => r.session_type || 'Final')
  )].sort((a, b) => SESSION_ORDER.indexOf(a) - SESSION_ORDER.indexOf(b));

  const hasMultipleSessions = sessionTypes.length > 1;
  const currentSession = activeSession || sessionTypes[sessionTypes.length - 1] || null;

  const displayedResults = hasMultipleSessions
    ? results.filter(r => (r.session_type || 'Final') === currentSession)
    : results;

  const getSessionStatus = (sessionType) => {
    const session = sessions.find(s => s.session_type === sessionType && visibleSessions.includes(s));
    return session?.status;
  };

  const getDriverName = (dId) => {
    const d = drivers.find(d => d.id === dId);
    return d ? `${d.first_name} ${d.last_name}` : '—';
  };
  const getDriverSlug = (dId) => drivers.find(d => d.id === dId)?.slug || null;
  const getClassName = (cId) => allClasses.find(c => c.id === cId)?.class_name || '—';

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