/**
 * AnnouncerManager
 * Run sheet, quick results, and announcer notes for sessions and drivers.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { Copy, Check, Mic, ChevronRight, User, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

const SESSION_TYPE_ORDER = { Practice: 0, Qualifying: 1, Heat: 2, LCQ: 3, Final: 4 };

const statusColors = {
  Draft: 'bg-gray-700/60 text-gray-400',
  Provisional: 'bg-yellow-900/40 text-yellow-300',
  Official: 'bg-green-900/40 text-green-300',
  Locked: 'bg-blue-900/40 text-blue-300',
};

function CopyButton({ text, label = 'Copy', small = false }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };
  return (
    <Button onClick={handleCopy} variant="outline" size={small ? 'sm' : 'default'}
      className="border-gray-700 text-gray-300 hover:text-white">
      {copied ? <><Check className="w-3.5 h-3.5 mr-1 text-green-400" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" /> {label}</>}
    </Button>
  );
}

export default function AnnouncerManager({
  selectedEvent,
  selectedTrack,
  invalidateAfterOperation,
  dashboardContext,
}) {
  const eventId = selectedEvent?.id;
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [driverSearch, setDriverSearch] = useState('');
  const [spotlightDriver, setSpotlightDriver] = useState(null);
  const [sessionNote, setSessionNote] = useState('');
  const [spotlightNote, setSpotlightNote] = useState('');

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

  const { data: drivers = [] } = useQuery({
    queryKey: ['announcerManager_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['announcerManager_teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 200),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: REG_QK.operationLogs(eventId),
    queryFn: () => (eventId ? base44.entities.OperationLog.filter({ metadata: { event_id: eventId } }, '-created_date') : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const typeOrder = (SESSION_TYPE_ORDER[a.session_type] ?? 99) - (SESSION_TYPE_ORDER[b.session_type] ?? 99);
      if (typeOrder !== 0) return typeOrder;
      const numOrder = (a.session_number || 0) - (b.session_number || 0);
      if (numOrder !== 0) return numOrder;
      if (a.scheduled_time && b.scheduled_time) return new Date(a.scheduled_time) - new Date(b.scheduled_time);
      return (a.session_order || 0) - (b.session_order || 0);
    });
  }, [sessions]);

  const activeSession = activeSessionId ? sessions.find((s) => s.id === activeSessionId) : null;

  const sessionResults = useMemo(() => {
    if (!activeSessionId) return [];
    return results
      .filter((r) => r.session_id === activeSessionId)
      .sort((a, b) => (a.position || 999) - (b.position || 999));
  }, [results, activeSessionId]);

  const sessionNoteLog = useMemo(() => {
    if (!activeSessionId) return null;
    return operationLogs.find(
      (log) => log.operation_type === 'announcer_session_note' &&
               log.metadata?.session_id === activeSessionId &&
               log.metadata?.event_id === eventId
    );
  }, [operationLogs, activeSessionId, eventId]);

  const spotlightNoteLog = useMemo(() => {
    if (!activeSessionId || !spotlightDriver) return null;
    return operationLogs.find(
      (log) => log.operation_type === 'announcer_driver_note' &&
               log.metadata?.session_id === activeSessionId &&
               log.metadata?.driver_id === spotlightDriver.driver_id &&
               log.metadata?.event_id === eventId
    );
  }, [operationLogs, activeSessionId, spotlightDriver, eventId]);

  // Initialize notes from logs on active session change
  React.useEffect(() => {
    if (sessionNoteLog?.metadata?.note_text) {
      setSessionNote(sessionNoteLog.metadata.note_text);
    } else {
      setSessionNote('');
    }
  }, [sessionNoteLog]);

  React.useEffect(() => {
    if (spotlightNoteLog?.metadata?.note_text) {
      setSpotlightNote(spotlightNoteLog.metadata.note_text);
    } else {
      setSpotlightNote('');
    }
  }, [spotlightNoteLog]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSaveSessionNote = useCallback(async () => {
    if (!activeSessionId || !sessionNote.trim()) {
      toast.error('Please enter a note');
      return;
    }
    try {
      await base44.entities.OperationLog.create({
        operation_type: 'announcer_session_note',
        source_type: 'RaceCore',
        entity_name: 'Session',
        status: 'success',
        metadata: {
          event_id: eventId,
          session_id: activeSessionId,
          session_type: activeSession?.session_type,
          series_class_id: activeSession?.series_class_id,
          note_text: sessionNote,
          timestamp: new Date().toISOString(),
        },
      });
      invalidateAfterOperation('announcer_updated', { eventId });
      toast.success('Session note saved');
    } catch (err) {
      console.error('Failed to save session note:', err);
      toast.error('Failed to save note');
    }
  }, [eventId, activeSessionId, sessionNote, activeSession, invalidateAfterOperation]);

  const handleSaveSpotlightNote = useCallback(async () => {
    if (!activeSessionId || !spotlightDriver || !spotlightNote.trim()) {
      toast.error('Please enter a note');
      return;
    }
    try {
      await base44.entities.OperationLog.create({
        operation_type: 'announcer_driver_note',
        source_type: 'RaceCore',
        entity_name: 'Driver',
        status: 'success',
        metadata: {
          event_id: eventId,
          session_id: activeSessionId,
          driver_id: spotlightDriver.driver_id,
          note_text: spotlightNote,
          timestamp: new Date().toISOString(),
        },
      });
      invalidateAfterOperation('announcer_updated', { eventId });
      toast.success('Driver note saved');
    } catch (err) {
      console.error('Failed to save driver note:', err);
      toast.error('Failed to save note');
    }
  }, [eventId, activeSessionId, spotlightDriver, spotlightNote, invalidateAfterOperation]);

  // ── Copy helpers ───────────────────────────────────────────────────────────

  const buildRundown = () => {
    if (!activeSession) return 'No session selected';
    const lines = [];
    lines.push(`EVENT: ${selectedEvent?.name || ''}`);
    lines.push(`DATE: ${selectedEvent?.event_date || ''}`);
    lines.push(`SESSION: ${activeSession.session_type}${activeSession.session_number ? ` ${activeSession.session_number}` : ''}`);
    lines.push('');
    
    if (sessionResults.length > 0) {
      lines.push('RESULTS:');
      sessionResults.slice(0, 10).forEach((r) => {
        const driver = driverMap[r.driver_id];
        const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
        lines.push(`  P${r.position || '?'} | #${r.car_number || '—'} | ${driverName}`);
      });
    } else {
      lines.push('(No results posted yet)');
    }
    return lines.join('\n');
  };

  const buildTop3 = () => {
    if (!activeSession || sessionResults.length === 0) return 'No results available';
    const top3 = sessionResults.slice(0, 3);
    const lines = [];
    lines.push(`TOP 3 — ${activeSession.session_type}${activeSession.session_number ? ` ${activeSession.session_number}` : ''}`);
    lines.push('');
    top3.forEach((r) => {
      const driver = driverMap[r.driver_id];
      const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
      lines.push(`${r.position}. #${r.car_number || '—'} ${driverName}`);
    });
    return lines.join('\n');
  };

  const buildStartingOrder = () => {
    if (!activeSession || sessionResults.length === 0) return 'Starting order not available';
    const lines = [];
    lines.push(`STARTING ORDER — ${activeSession.session_type}${activeSession.session_number ? ` ${activeSession.session_number}` : ''}`);
    lines.push('(Position field indicates starting position if available)');
    lines.push('');
    sessionResults.forEach((r) => {
      const driver = driverMap[r.driver_id];
      const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
      lines.push(`#${r.car_number || '—'} ${driverName}`);
    });
    return lines.join('\n');
  };

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Announcer Console</p>
          <p className="text-gray-400 text-sm">Select an event to access the run sheet and announcer notes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Left Column: Run Sheet ────────────────────────────────────────── */}
      <div className="lg:col-span-1">
        {/* Event Header */}
        <Card className="bg-[#171717] border-gray-800 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-400" /> {selectedEvent.name}
            </CardTitle>
            {selectedTrack && (
              <p className="text-xs text-gray-400 mt-1">{selectedTrack.name}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {selectedEvent.event_date}
              {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date ? ` – ${selectedEvent.end_date}` : ''}
            </p>
          </CardHeader>
        </Card>

        {/* Run Sheet */}
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Run Sheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedSessions.length === 0 ? (
              <p className="text-gray-500 text-xs py-4">No sessions found</p>
            ) : (
              sortedSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id === activeSessionId ? null : session.id)}
                  className={`w-full flex items-start justify-between text-left px-3 py-2 rounded border text-xs transition-colors ${
                    activeSessionId === session.id
                      ? 'bg-purple-900/30 border-purple-700'
                      : 'bg-[#262626] border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-white font-semibold">
                      {session.session_type}
                      {session.session_number ? ` ${session.session_number}` : ''}
                    </p>
                    {session.scheduled_time && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        {new Date(session.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <Badge className={`text-xs ${statusColors[session.status] || 'bg-gray-700/60 text-gray-400'}`}>
                    {session.status || 'Draft'}
                  </Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Right Column: Session Brief ───────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        {activeSession ? (
          <>
            {/* Session Header */}
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">
                    {activeSession.session_type}
                    {activeSession.session_number ? ` ${activeSession.session_number}` : ''} — {activeSession.name || 'Session'}
                  </CardTitle>
                  <Badge className={`text-xs ${statusColors[activeSession.status] || 'bg-gray-700/60 text-gray-400'}`}>
                    {activeSession.status || 'Draft'}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Quick Copy Buttons */}
            <div className="flex gap-2 flex-wrap">
              <CopyButton text={buildRundown()} label="Copy Rundown" small />
              <CopyButton text={buildTop3()} label="Copy Top 3" small />
              <CopyButton text={buildStartingOrder()} label="Copy Starting Order" small />
            </div>

            {/* Quick Results */}
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Quick Results</CardTitle>
              </CardHeader>
              <CardContent>
                {sessionResults.length === 0 ? (
                  <p className="text-gray-500 text-xs py-4">No results posted yet for this session</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-700">
                          {['Pos', 'Car', 'Driver', 'Team', 'Status', 'Best Lap'].map((h) => (
                            <th key={h} className="text-left text-gray-500 px-1.5 py-1 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sessionResults.slice(0, 10).map((r) => {
                          const driver = driverMap[r.driver_id];
                          const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
                          const team = teamMap[r.team_id];
                          return (
                            <tr key={r.id} className="border-b border-gray-800/50">
                              <td className="px-1.5 py-1.5 font-bold text-white">{r.position || '—'}</td>
                              <td className="px-1.5 py-1.5 font-mono text-gray-300">{r.car_number || '—'}</td>
                              <td className="px-1.5 py-1.5 text-white">{driverName}</td>
                              <td className="px-1.5 py-1.5 text-gray-400 text-xs">{team?.name || '—'}</td>
                              <td className="px-1.5 py-1.5">
                                <Badge className={`text-xs ${r.status === 'Running' ? 'bg-green-900/40 text-green-300' : r.status === 'DNF' ? 'bg-red-900/40 text-red-300' : 'bg-gray-700/60 text-gray-400'}`}>
                                  {r.status || '—'}
                                </Badge>
                              </td>
                              <td className="px-1.5 py-1.5 font-mono text-gray-300">
                                {r.best_lap_time_ms ? `${(r.best_lap_time_ms / 1000).toFixed(2)}s` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Announcer Notes */}
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Session Announcer Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  placeholder="Write session notes, key stories, any on-air talking points..."
                  className="bg-[#262626] border-gray-700 text-white text-sm h-24 resize-none"
                />
                <Button
                  onClick={handleSaveSessionNote}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save Session Notes
                </Button>
              </CardContent>
            </Card>

            {/* Driver Spotlights */}
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <User className="w-4 h-4" /> Driver Spotlight
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!spotlightDriver ? (
                  <>
                    <Input
                      placeholder="Search driver by name or car #..."
                      value={driverSearch}
                      onChange={(e) => setDriverSearch(e.target.value)}
                      className="bg-[#262626] border-gray-700 text-white text-sm"
                    />
                    {driverSearch && (
                      <div className="space-y-1">
                        {sessionResults
                          .filter((r) => {
                            const driver = driverMap[r.driver_id];
                            const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
                            const carNum = (r.car_number || '').toString();
                            return driverName.includes(driverSearch.toLowerCase()) || carNum.includes(driverSearch.toLowerCase());
                          })
                          .slice(0, 10)
                          .map((r) => {
                            const driver = driverMap[r.driver_id];
                            const driverName = driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
                            return (
                              <button
                                key={r.id}
                                onClick={() => {
                                  setSpotlightDriver(r);
                                  setDriverSearch('');
                                }}
                                className="w-full text-left px-3 py-2 rounded bg-[#262626] border border-gray-700 hover:border-gray-600 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-white text-sm font-medium">{driverName}</span>
                                  <span className="text-xs text-gray-500 font-mono">#{r.car_number || '—'}</span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-[#262626] border border-gray-700 rounded-lg p-3 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-white">{driverMap[spotlightDriver.driver_id]?.first_name || ''} {driverMap[spotlightDriver.driver_id]?.last_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">#{spotlightDriver.car_number || '—'}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSpotlightDriver(null);
                          setSpotlightNote('');
                        }}
                        className="text-gray-500 hover:text-white text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <Textarea
                      value={spotlightNote}
                      onChange={(e) => setSpotlightNote(e.target.value)}
                      placeholder="Driver background, storylines, quotes..."
                      className="bg-[#1a1a1a] border-gray-700 text-white text-sm h-20 resize-none"
                    />
                    <Button
                      onClick={handleSaveSpotlightNote}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" /> Save Driver Notes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="bg-[#171717] border-gray-800">
            <CardContent className="py-20 text-center">
              <p className="text-gray-400">Select a session from the run sheet to view details</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}