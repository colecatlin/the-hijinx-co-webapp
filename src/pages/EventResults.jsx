import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();
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
    queryKey: QueryKeys.auth.status(),
    queryFn: () => base44.auth.isAuthenticated(),
    ...DQ,
  });

  const { data: user } = useQuery({
    queryKey: QueryKeys.auth.me(),
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
    ...DQ,
  });

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: QueryKeys.events.byId(eventId),
    queryFn: () => base44.entities.Event.get(eventId),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: track } = useQuery({
    queryKey: QueryKeys.tracks.byId(event?.track_id),
    queryFn: () => base44.entities.Track.get(event.track_id),
    enabled: !!event?.track_id,
    ...DQ,
  });

  const { data: series } = useQuery({
    queryKey: QueryKeys.series.byId(event?.series_id),
    queryFn: () => base44.entities.Series.get(event.series_id),
    enabled: !!event?.series_id,
    ...DQ,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: QueryKeys.sessions.listByEvent(eventId),
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: QueryKeys.results.listByEvent(eventId),
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: QueryKeys.series.classes(event?.series_id),
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: event.series_id, active: true }),
    enabled: !!event?.series_id,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
    enabled: results.length > 0,
    ...DQ,
  });

  const { data: programs = [] } = useQuery({
    queryKey: QueryKeys.driverPrograms.list(),
    queryFn: () => base44.entities.DriverProgram.list(),
    enabled: results.length > 0,
    ...DQ,
  });

  const isAdmin = user?.role === 'admin';

  // Build lookup maps
  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const programMap = useMemo(() => new Map(programs.map(p => [p.id, p])), [programs]);
  const classMap = useMemo(() => new Map(seriesClasses.map(c => [c.id, c])), [seriesClasses]);

  // Status normalization
  const normalizeStatus = (status) => {
    if (!status) return 'scheduled';
    const lower = status.toLowerCase();
    if (['draft'].includes(lower)) return 'draft';
    if (['provisional'].includes(lower)) return 'provisional';
    if (['official', 'completed'].includes(lower)) return 'official';
    if (['locked'].includes(lower)) return 'locked';
    if (['scheduled', 'in_progress'].includes(lower)) return 'scheduled';
    if (['cancelled'].includes(lower)) return 'cancelled';
    return 'scheduled';
  };

  // Session type ordering
  const SESSION_TYPE_ORDER = ['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final'];
  
  // Sort sessions by type order, then scheduled_time, then name
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aTypeIndex = SESSION_TYPE_ORDER.indexOf(a.session_type || '');
      const bTypeIndex = SESSION_TYPE_ORDER.indexOf(b.session_type || '');
      const aTypeOrder = aTypeIndex >= 0 ? aTypeIndex : SESSION_TYPE_ORDER.length;
      const bTypeOrder = bTypeIndex >= 0 ? bTypeIndex : SESSION_TYPE_ORDER.length;
      
      if (aTypeOrder !== bTypeOrder) return aTypeOrder - bTypeOrder;
      
      if (a.scheduled_time && b.scheduled_time) {
        return new Date(a.scheduled_time) - new Date(b.scheduled_time);
      }
      if (a.scheduled_time) return -1;
      if (b.scheduled_time) return 1;
      
      if (a.name && b.name) return a.name.localeCompare(b.name);
      return 0;
    });
  }, [sessions]);

  // Group sessions by class, then by session type
  const groupedSessions = useMemo(() => {
    const hasClassIds = sessions.some(s => s.series_class_id);
    
    if (!hasClassIds) {
      // Only group by session type
      const grouped = {};
      SESSION_TYPE_ORDER.forEach(type => {
        grouped[type] = sortedSessions.filter(s => s.session_type === type);
      });
      return Object.entries(grouped)
        .filter(([_, sesh]) => sesh.length > 0)
        .map(([type, sesh]) => ({ label: type, sessions: sesh }));
    }
    
    // Group by class, then session type
    const byClass = {};
    sortedSessions.forEach(s => {
      const classKey = s.series_class_id || 'unassigned';
      if (!byClass[classKey]) byClass[classKey] = [];
      byClass[classKey].push(s);
    });
    
    return Object.entries(byClass).map(([classId, classSessions]) => {
      const classObj = seriesClasses.find(c => c.id === classId);
      const className = classObj?.class_name || (classId === 'unassigned' ? 'Unassigned Class' : 'Unknown Class');
      
      const byType = {};
      SESSION_TYPE_ORDER.forEach(type => {
        byType[type] = classSessions.filter(s => s.session_type === type);
      });
      
      return {
        label: className,
        subGroups: Object.entries(byType)
          .filter(([_, sesh]) => sesh.length > 0)
          .map(([type, sesh]) => ({ label: type, sessions: sesh }))
      };
    });
  }, [sortedSessions, seriesClasses]);

  // Results count by session
  const resultCountBySession = useMemo(() => {
    const counts = {};
    results.forEach(r => {
      if (r.session_id) {
        counts[r.session_id] = (counts[r.session_id] || 0) + 1;
      }
    });
    return counts;
  }, [results]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const official = sessions.filter(s => s.status === 'Official').length;
    const locked = sessions.filter(s => s.status === 'Locked').length;
    return {
      totalSessions: sessions.length,
      official,
      locked,
      totalResults: results.length
    };
  }, [sessions, results]);

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
          <Link to={createPageUrl('EventDirectory')} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Events
          </Link>
          <p className="text-gray-500">Event not found.</p>
        </div>
      </PageShell>
    );
  }

  const displayName = event.season ? `${event.season} ${event.name}` : event.name;
  const orgType = event.series_id ? 'series' : 'track';
  const orgId = event.series_id || event.track_id;
  const racedayUrl = `${createPageUrl('RegistrationDashboard')}?orgType=${orgType}&orgId=${orgId}&seasonYear=${event.season}&eventId=${eventId}&tab=results`;

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div className="flex-1">
            <Link to={`${createPageUrl('EventProfile')}?id=${eventId}`} className="inline-flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-[#0A0A0A] mb-4 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to Event Profile
            </Link>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">{displayName}</h1>
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              {track && <span className="text-sm text-gray-600">{track.name}</span>}
              {series && <span className="text-sm text-gray-600">{series.name}</span>}
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

        {/* Summary Strip */}
        {sortedSessions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#0A0A0A]">{summaryStats.totalSessions}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Total Sessions</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#0A0A0A]">{summaryStats.official}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Official</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#0A0A0A]">{summaryStats.locked}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Locked</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#0A0A0A]">{summaryStats.totalResults}</div>
              <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Results Rows</div>
            </div>
          </div>
        )}

        {/* Sessions Grouped View */}
        {sortedSessions.length > 0 ? (
          <div className="space-y-6">
            {groupedSessions.map((group, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Group Header */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-[#0A0A0A]">{group.label}</h2>
                </div>

                {/* Sessions */}
                <div className="divide-y divide-gray-100">
                  {group.subGroups ? (
                    // Class grouping: render subgroups (session types)
                    group.subGroups.map((subGroup, subIdx) => (
                      <div key={subIdx}>
                        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                          <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">{subGroup.label}</h3>
                        </div>
                        {subGroup.sessions.map(session => {
                          const resultCount = resultCountBySession[session.id] || 0;
                          const displayName = session.name || `${session.session_type}${session.session_number ? ` #${session.session_number}` : ''}`;
                          const statusGroup = normalizeStatus(session.status);
                          
                          return (
                            <div key={session.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-[#0A0A0A] mb-1">{displayName}</div>
                                <div className="flex items-center gap-3">
                                  <Badge className={`${
                                    statusGroup === 'official' ? 'bg-green-100 text-green-700' :
                                    statusGroup === 'provisional' ? 'bg-orange-100 text-orange-700' :
                                    statusGroup === 'locked' ? 'bg-blue-100 text-blue-700' :
                                    statusGroup === 'draft' ? 'bg-gray-100 text-gray-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {session.status}
                                  </Badge>
                                  {session.scheduled_time && (
                                    <span className="text-xs text-gray-500">{format(parseISO(session.scheduled_time), 'HH:mm')}</span>
                                  )}
                                  <span className={`text-xs ${resultCount > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
                                    Results: {resultCount > 0 ? resultCount : 'No results yet'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                <Link to={`${createPageUrl('SessionProfile')}?id=${session.id}`}>
                                  <Button variant="ghost" size="sm" className="text-xs h-7">Open</Button>
                                </Link>
                                {isAuthenticated && isAdmin && (
                                  <Link to={`${racedayUrl}&sessionId=${session.id}`}>
                                    <Button variant="ghost" size="sm" className="text-xs h-7">Edit</Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    // Session type grouping only
                    group.sessions.map(session => {
                      const resultCount = resultCountBySession[session.id] || 0;
                      const displayName = session.name || `${session.session_type}${session.session_number ? ` #${session.session_number}` : ''}`;
                      const statusGroup = normalizeStatus(session.status);
                      
                      return (
                        <div key={session.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-[#0A0A0A] mb-1">{displayName}</div>
                            <div className="flex items-center gap-3">
                              <Badge className={`${
                                statusGroup === 'official' ? 'bg-green-100 text-green-700' :
                                statusGroup === 'provisional' ? 'bg-orange-100 text-orange-700' :
                                statusGroup === 'locked' ? 'bg-blue-100 text-blue-700' :
                                statusGroup === 'draft' ? 'bg-gray-100 text-gray-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {session.status}
                              </Badge>
                              {session.scheduled_time && (
                                <span className="text-xs text-gray-500">{format(parseISO(session.scheduled_time), 'HH:mm')}</span>
                              )}
                              <span className={`text-xs ${resultCount > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
                                Results: {resultCount > 0 ? resultCount : 'No results yet'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                            <Link to={`${createPageUrl('SessionProfile')}?id=${session.id}`}>
                              <Button variant="ghost" size="sm" className="text-xs h-7">Open</Button>
                            </Link>
                            {isAuthenticated && isAdmin && (
                              <Link to={`${racedayUrl}&sessionId=${session.id}`}>
                                <Button variant="ghost" size="sm" className="text-xs h-7">Edit</Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <AlertCircle className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No sessions found for this event yet.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}