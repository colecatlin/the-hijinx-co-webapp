/**
 * Announcer Console
 * Read-only view for announcers: Live Now, Next Up, Finished sessions with driver spotlight.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, Mic, Trophy, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const DQ = applyDefaultQueryOptions();

const SESSION_TYPE_ORDER = { Practice: 0, Qualifying: 1, Heat: 2, LCQ: 3, Final: 4 };

export default function AnnouncerConsole({
  selectedEvent,
  selectedTrack,
  dashboardContext,
}) {
  const eventId = selectedEvent?.id;
  const [classFilter, setClassFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [announcerPackOpen, setAnnouncerPackOpen] = useState(false);
  const [announcerPackSession, setAnnouncerPackSession] = useState(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: sessions = [] } = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: REG_QK.results(eventId),
    queryFn: () => (eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: entries = [] } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => (eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: REG_QK.driverPrograms(eventId),
    queryFn: () => (eventId ? base44.entities.DriverProgram.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && entries.length === 0,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['announcerConsole_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['announcerConsole_teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 200),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['announcerConsole_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const classMap = useMemo(() => Object.fromEntries(seriesClasses.map((c) => [c.id, c])), [seriesClasses]);

  const getClassName = (classId, fallback) => {
    if (classMap[classId]) return classMap[classId].class_name;
    return fallback || 'Unknown Class';
  };

  // Get unique classes
  const uniqueClasses = useMemo(() => {
    const classes = {};
    sessions.forEach((s) => {
      if (s.series_class_id && !classes[s.series_class_id]) {
        classes[s.series_class_id] = getClassName(s.series_class_id, s.class_name);
      }
    });
    return classes;
  }, [sessions, classMap]);

  // Results for session
  const resultsBySession = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      if (!map[r.session_id]) map[r.session_id] = [];
      map[r.session_id].push(r);
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => (a.position || 999) - (b.position || 999));
    });
    return map;
  }, [results]);

  // Live Now sessions
  const liveNow = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => {
      // Check if status is in_progress or Live
      if (s.status === 'in_progress' || s.status === 'Live') return true;
      
      // Fallback: treat Provisional as live if within 60 minutes
      if (s.status === 'Provisional' && s.scheduled_time) {
        const sessionTime = new Date(s.scheduled_time);
        const diff = sessionTime.getTime() - now.getTime();
        if (diff >= 0 && diff <= 60 * 60 * 1000) return true;
      }
      return false;
    }).filter((s) => classFilter === 'all' || s.series_class_id === classFilter || s.class_name === classFilter);
  }, [sessions, classFilter]);

  // Next Up sessions
  const nextUp = useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s) => {
        if (liveNow.some((l) => l.id === s.id)) return false;
        if (s.scheduled_time) {
          const sessionTime = new Date(s.scheduled_time);
          return sessionTime.getTime() >= now.getTime();
        }
        return false;
      })
      .sort((a, b) => {
        if (a.scheduled_time && b.scheduled_time) {
          return new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime();
        }
        return (a.session_order || 0) - (b.session_order || 0);
      })
      .filter((s) => classFilter === 'all' || s.series_class_id === classFilter || s.class_name === classFilter)
      .slice(0, 5);
  }, [sessions, liveNow, classFilter]);

  // Finished sessions
  const finished = useMemo(() => {
    return sessions
      .filter((s) => ['completed', 'Official', 'Locked'].includes(s.status))
      .sort((a, b) => {
        const aTime = a.scheduled_time ? new Date(a.scheduled_time).getTime() : 0;
        const bTime = b.scheduled_time ? new Date(b.scheduled_time).getTime() : 0;
        return bTime - aTime;
      })
      .filter((s) => classFilter === 'all' || s.series_class_id === classFilter || s.class_name === classFilter)
      .slice(0, 5);
  }, [sessions, classFilter]);

  // Driver Spotlight: top 10 by results, fallback to alphabetical from entries/programs
  const driverSpotlight = useMemo(() => {
    const driverPoints = {};

    results.forEach((r) => {
      if (!driverPoints[r.driver_id]) driverPoints[r.driver_id] = { points: 0, bestFinish: null, count: 0 };
      if (r.position) {
        driverPoints[r.driver_id].points += (50 - (r.position - 1));
        if (!driverPoints[r.driver_id].bestFinish || r.position < driverPoints[r.driver_id].bestFinish) {
          driverPoints[r.driver_id].bestFinish = r.position;
        }
      }
      driverPoints[r.driver_id].count++;
    });

    let drivers_list = Object.keys(driverPoints)
      .map((driverId) => ({
        driver_id: driverId,
        ...driverPoints[driverId],
      }))
      .sort((a, b) => b.points - a.points);

    if (drivers_list.length < 10) {
      const entryDriverIds = entries.map((e) => e.driver_id);
      const dpDriverIds = driverPrograms.map((dp) => dp.driver_id);
      const allDriverIds = new Set([...entryDriverIds, ...dpDriverIds]);

      const existing = new Set(drivers_list.map((d) => d.driver_id));
      const additional = Array.from(allDriverIds)
        .filter((id) => !existing.has(id))
        .slice(0, 10 - drivers_list.length)
        .map((driverId) => ({
          driver_id: driverId,
          points: 0,
          bestFinish: null,
          count: 0,
        }));

      drivers_list = [...drivers_list, ...additional];
    }

    return drivers_list.slice(0, 10);
  }, [results, entries, driverPrograms]);

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <Mic className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Announcer Console</p>
          <p className="text-gray-400 text-sm">Select an event to view announcements.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header Bar ────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 mb-3">
            <Mic className="w-5 h-5 text-purple-400" /> {selectedEvent.name}
          </CardTitle>
          {selectedTrack && (
            <p className="text-xs text-gray-400">{selectedTrack.name}</p>
          )}
          <p className="text-xs text-gray-500">
            {selectedEvent.event_date}
            {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date ? ` – ${selectedEvent.end_date}` : ''}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-44 bg-[#262626] border-gray-700 text-white">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700 text-white">
                <SelectItem value="all" className="text-white">All Classes</SelectItem>
                {Object.entries(uniqueClasses).map(([classId, className]) => (
                  <SelectItem key={classId} value={classId} className="text-white">
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger className="w-44 bg-[#262626] border-gray-700 text-white">
                <SelectValue placeholder="All Sessions" />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700 text-white">
                <SelectItem value="all" className="text-white">All Sessions</SelectItem>
                {sessions
                  .sort((a, b) => {
                    const typeOrder = (SESSION_TYPE_ORDER[a.session_type] ?? 99) - (SESSION_TYPE_ORDER[b.session_type] ?? 99);
                    return typeOrder !== 0 ? typeOrder : (a.session_number || 0) - (b.session_number || 0);
                  })
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-white">
                      {s.session_type}
                      {s.session_number ? ` ${s.session_number}` : ''}
                      {s.name && s.name !== `${s.session_type}` ? ` — ${s.name}` : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search driver name or car #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#262626] border-gray-700 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Main Content with Spotlight Rail ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Live Now, Next Up, Finished */}
        <div className="lg:col-span-3 space-y-6">
          {/* Live Now */}
          <Card className="bg-[#171717] border-gray-800 border-red-800/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Now ({liveNow.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveNow.length === 0 ? (
                <p className="text-gray-500 text-xs py-4">No live sessions</p>
              ) : (
                liveNow.map((session) => (
                  <div key={session.id} className="bg-[#262626] rounded-lg p-4 border border-gray-700 space-y-2">
                    <div>
                      <p className="text-white font-semibold">
                        {session.session_type}
                        {session.session_number ? ` ${session.session_number}` : ''}
                      </p>
                      <p className="text-gray-400 text-xs">{getClassName(session.series_class_id, session.class_name)}</p>
                      {session.scheduled_time && (
                        <p className="text-gray-500 text-xs">
                          {new Date(session.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>

                    {resultsBySession[session.id] && resultsBySession[session.id].length > 0 ? (
                      <div className="bg-[#1a1a1a] rounded p-2 text-xs space-y-1">
                        <p className="text-gray-400 font-mono">Top 3:</p>
                        {resultsBySession[session.id].slice(0, 3).map((r, idx) => {
                          const driver = driverMap[r.driver_id];
                          return (
                            <div key={idx} className="flex gap-2 text-gray-300">
                              <span className="font-bold w-4">P{r.position}</span>
                              <span className="flex-1">#{r.car_number || '—'} {driver ? `${driver.first_name} ${driver.last_name}` : 'Driver'}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs italic">No results yet</p>
                    )}

                    <Button
                      size="sm"
                      onClick={() => {
                        setAnnouncerPackSession(session);
                        setAnnouncerPackOpen(true);
                      }}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-7"
                    >
                      Open Announcer Pack
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Next Up */}
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" /> Next Up ({nextUp.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nextUp.length === 0 ? (
                <p className="text-gray-500 text-xs py-4">No upcoming sessions</p>
              ) : (
                nextUp.map((session) => (
                  <div key={session.id} className="bg-[#262626] rounded p-3 border border-gray-700 flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">
                        {session.session_type}
                        {session.session_number ? ` ${session.session_number}` : ''}
                      </p>
                      <p className="text-gray-400 text-xs">{getClassName(session.series_class_id, session.class_name)}</p>
                      {session.scheduled_time ? (
                        <p className="text-gray-500 text-xs">
                          {new Date(session.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      ) : (
                        <p className="text-gray-500 text-xs">Time TBD</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 mt-1" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Finished */}
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-green-400" /> Finished ({finished.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {finished.length === 0 ? (
                <p className="text-gray-500 text-xs py-4">No finished sessions</p>
              ) : (
                finished.map((session) => (
                  <div key={session.id} className="bg-[#262626] rounded p-3 border border-gray-700 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-semibold text-sm">
                          {session.session_type}
                          {session.session_number ? ` ${session.session_number}` : ''}
                        </p>
                        <p className="text-gray-400 text-xs">{getClassName(session.series_class_id, session.class_name)}</p>
                      </div>
                      <Badge className="bg-green-900/40 text-green-300 text-xs">
                        {session.status || 'Completed'}
                      </Badge>
                    </div>

                    {resultsBySession[session.id] && resultsBySession[session.id].length > 0 && (
                      <div className="bg-[#1a1a1a] rounded p-2 text-xs space-y-1">
                        <p className="text-gray-400 font-mono">Winner:</p>
                        {(() => {
                          const winner = resultsBySession[session.id][0];
                          const driver = driverMap[winner.driver_id];
                          return (
                            <div className="flex gap-2 text-yellow-300">
                              <span className="font-bold">🏆</span>
                              <span>#{winner.car_number || '—'} {driver ? `${driver.first_name} ${driver.last_name}` : 'Driver'}</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <Link
                      to={createPageUrl(`EventResults?eventId=${eventId}&sessionId=${session.id}`)}
                      className="block text-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                    >
                      View Results
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Driver Spotlight */}
        <div>
          <Card className="bg-[#171717] border-gray-800 sticky top-24">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" /> Driver Spotlight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {driverSpotlight.length === 0 ? (
                <p className="text-gray-500 text-xs py-4">No driver data yet</p>
              ) : (
                driverSpotlight.map((entry, idx) => {
                  const driver = driverMap[entry.driver_id];
                  const dbEntry = entries.find((e) => e.driver_id === entry.driver_id);
                  const dbProgram = driverPrograms.find((dp) => dp.driver_id === entry.driver_id);
                  const carNum = dbEntry?.car_number || dbProgram?.car_number || driver?.primary_number || '—';
                  const team = teamMap[dbEntry?.team_id] || teamMap[dbProgram?.team_id];

                  return (
                    <div key={entry.driver_id} className="bg-[#262626] rounded p-2 border border-gray-700 text-xs space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-yellow-400 w-4">{idx + 1}.</span>
                        <div className="flex-1">
                          <p className="text-white font-semibold">
                            #{carNum}
                          </p>
                          <p className="text-gray-400">
                            {driver ? `${driver.first_name} ${driver.last_name}` : 'Driver'}
                          </p>
                          {team && <p className="text-gray-500">{team.name}</p>}
                        </div>
                      </div>
                      {entry.bestFinish && (
                        <p className="text-gray-400 text-xs">
                          Best: P{entry.bestFinish} • Pts: {entry.points}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Announcer Pack Dialog ──────────────────────────────────────────– */}
      <Dialog open={announcerPackOpen} onOpenChange={setAnnouncerPackOpen}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Announcer Pack</DialogTitle>
            {announcerPackSession && (
              <DialogDescription className="text-gray-400 mt-2">
                {announcerPackSession.session_type}
                {announcerPackSession.session_number ? ` ${announcerPackSession.session_number}` : ''} •{' '}
                {getClassName(announcerPackSession.series_class_id, announcerPackSession.class_name)}
              </DialogDescription>
            )}
          </DialogHeader>

          {announcerPackSession && (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* Event Summary */}
              <div className="bg-[#1a1a1a] rounded p-3 border border-gray-700 space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Event Summary</p>
                <div className="space-y-1 text-sm text-gray-300">
                  <p><span className="text-gray-500">Event:</span> {selectedEvent.name}</p>
                  <p><span className="text-gray-500">Date:</span> {selectedEvent.event_date}</p>
                  {selectedTrack && <p><span className="text-gray-500">Track:</span> {selectedTrack.name}</p>}
                  <p><span className="text-gray-500">Status:</span> {selectedEvent.status || 'Upcoming'}</p>
                </div>
              </div>

              {/* Session Summary */}
              <div className="bg-[#1a1a1a] rounded p-3 border border-gray-700 space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Session Summary</p>
                <div className="space-y-1 text-sm text-gray-300">
                  <p><span className="text-gray-500">Type:</span> {announcerPackSession.session_type}</p>
                  <p><span className="text-gray-500">Class:</span> {getClassName(announcerPackSession.series_class_id, announcerPackSession.class_name)}</p>
                  {announcerPackSession.scheduled_time && (
                    <p><span className="text-gray-500">Scheduled:</span> {new Date(announcerPackSession.scheduled_time).toLocaleString()}</p>
                  )}
                  {announcerPackSession.laps && (
                    <p><span className="text-gray-500">Laps:</span> {announcerPackSession.laps}</p>
                  )}
                  <p><span className="text-gray-500">Status:</span> {announcerPackSession.status || 'Draft'}</p>
                </div>
              </div>

              {/* Top Storylines */}
              <div className="bg-[#1a1a1a] rounded p-3 border border-gray-700 space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Key Storylines</p>
                <div className="space-y-2 text-sm text-gray-300">
                  {(() => {
                    const sessionResults = resultsBySession[announcerPackSession.id] || [];
                    const storylines = [];

                    if (sessionResults.length > 0) {
                      const winner = sessionResults[0];
                      const driver = driverMap[winner.driver_id];
                      if (driver) {
                        storylines.push(`🏆 Winner: ${driver.first_name} ${driver.last_name} (#${winner.car_number || '—'})`);
                      }
                    }

                    if (sessionResults.length >= 3) {
                      const podium = sessionResults.slice(0, 3);
                      storylines.push(`🎯 Podium finishers: ${podium.length} drivers`);
                    }

                    if (results.length === 0) {
                      storylines.push('📊 Not enough data yet. Check back when results are posted.');
                    }

                    return storylines.length > 0 ? (
                      storylines.map((story, idx) => (
                        <p key={idx} className="text-gray-300">{story}</p>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">Not enough data yet</p>
                    );
                  })()}
                </div>
              </div>

              {/* Full Results Preview */}
              {resultsBySession[announcerPackSession.id] && resultsBySession[announcerPackSession.id].length > 0 && (
                <div className="bg-[#1a1a1a] rounded p-3 border border-gray-700 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Results ({resultsBySession[announcerPackSession.id].length})</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left text-gray-500 px-1 py-1">Pos</th>
                          <th className="text-left text-gray-500 px-1 py-1">Car</th>
                          <th className="text-left text-gray-500 px-1 py-1">Driver</th>
                          <th className="text-left text-gray-500 px-1 py-1">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultsBySession[announcerPackSession.id].slice(0, 10).map((r) => {
                          const driver = driverMap[r.driver_id];
                          return (
                            <tr key={r.id} className="border-b border-gray-800">
                              <td className="px-1 py-1 font-bold text-white">{r.position || '—'}</td>
                              <td className="px-1 py-1 text-gray-300">#{r.car_number || '—'}</td>
                              <td className="px-1 py-1 text-gray-300">{driver ? `${driver.first_name} ${driver.last_name}` : 'Driver'}</td>
                              <td className="px-1 py-1 text-gray-400">{r.status || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}