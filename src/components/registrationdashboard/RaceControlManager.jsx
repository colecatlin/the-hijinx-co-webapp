/**
 * Race Control Manager
 * Manage live race operations states, session status, flags, and notes.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, Flag, AlertTriangle, RotateCcw, Gavel, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { canTab, canAction } from '@/components/access/accessControl';

const DQ = applyDefaultQueryOptions();

const SESSION_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];
const STATUS_COLORS = {
  scheduled: 'bg-gray-700 text-gray-200',
  in_progress: 'bg-blue-700 text-blue-100',
  completed: 'bg-green-700 text-green-100',
  cancelled: 'bg-red-700 text-red-100',
};

const INCIDENT_TYPES = [
  { key: 'yellow_flag', label: 'Yellow Flag', icon: Flag, color: 'bg-yellow-600 hover:bg-yellow-700' },
  { key: 'red_flag', label: 'Red Flag', icon: AlertTriangle, color: 'bg-red-600 hover:bg-red-700' },
  { key: 'restart', label: 'Restart', icon: RotateCcw, color: 'bg-blue-600 hover:bg-blue-700' },
  { key: 'penalty', label: 'Penalty', icon: Gavel, color: 'bg-purple-600 hover:bg-purple-700' },
  { key: 'tow', label: 'Tow', icon: Truck, color: 'bg-orange-600 hover:bg-orange-700' },
];

export default function RaceControlManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();

  // ── Permission checks ──────────────────────────────────────────────────────

  const hasAccess = canTab(dashboardPermissions, 'race_control');
  const canOverride = canAction(dashboardPermissions, 'race_control_override');

  // ── State ──────────────────────────────────────────────────────────────────

  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [raceNotes, setRaceNotes] = useState('');

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: sessions = [] } = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && hasAccess,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['raceControl_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 500),
    staleTime: 60_000,
    enabled: hasAccess,
    ...DQ,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['raceControl_operationLogs'],
    queryFn: () => base44.entities.OperationLog.list('-created_date', 200),
    staleTime: 30_000,
    enabled: !!eventId && hasAccess,
    ...DQ,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateSessionMutation = useMutation({
    mutationFn: ({ sessionId, data }) => base44.entities.Session.update(sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REG_QK.sessions(eventId) });
      invalidateAfterOperation('session_updated');
      toast.success('Session updated');
    },
    onError: (err) => {
      console.error('Failed to update session:', err);
      toast.error('Failed to update session');
    },
  });

  const createOperationLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raceControl_operationLogs'] });
      invalidateAfterOperation('operation_logged');
      toast.success('Logged');
    },
    onError: (err) => {
      console.error('Failed to log operation:', err);
      toast.error('Failed to log operation');
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const classMap = useMemo(
    () => Object.fromEntries(seriesClasses.map((c) => [c.id, c])),
    [seriesClasses]
  );

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => (a.session_order || 0) - (b.session_order || 0) || new Date(a.scheduled_time || 0) - new Date(b.scheduled_time || 0)),
    [sessions]
  );

  // Auto-select active session
  const selectedSession = useMemo(() => {
    if (selectedSessionId) return sessions.find((s) => s.id === selectedSessionId);

    // Find first in_progress, else first Final scheduled, else first
    const inProgress = sortedSessions.find((s) => s.status === 'in_progress');
    if (inProgress) return inProgress;

    const finalSession = sortedSessions.find((s) => s.session_type === 'Final');
    if (finalSession) return finalSession;

    return sortedSessions[0];
  }, [sessions, sortedSessions, selectedSessionId]);

  // Filter operation logs for selected event and session
  const eventOperationLogs = useMemo(() => {
    if (!eventId) return [];
    return operationLogs
      .filter((log) => {
        try {
          const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          return metadata?.event_id === eventId;
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [operationLogs, eventId]);

  const sessionOperationLogs = useMemo(() => {
    if (!selectedSession) return [];
    return eventOperationLogs.filter((log) => {
      try {
        const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
        return metadata?.session_id === selectedSession.id;
      } catch {
        return false;
      }
    });
  }, [eventOperationLogs, selectedSession]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSetStatus = useCallback(
    (newStatus) => {
      if (!selectedSession) return;
      if (selectedSession.locked && !canOverride) {
        toast.error('Session locked. Admin override required.');
        return;
      }
      updateSessionMutation.mutate({
        sessionId: selectedSession.id,
        data: { status: newStatus },
      });
    },
    [selectedSession, canOverride, updateSessionMutation]
  );

  const handleToggleLock = useCallback(() => {
    if (!selectedSession) return;
    if (selectedSession.locked && !canOverride) {
      toast.error('Cannot unlock. Admin override required.');
      return;
    }
    updateSessionMutation.mutate({
      sessionId: selectedSession.id,
      data: { locked: !selectedSession.locked },
    });
  }, [selectedSession, canOverride, updateSessionMutation]);

  const handleSaveNotes = useCallback(() => {
    if (!selectedSession || !raceNotes.trim()) return;
    createOperationLogMutation.mutate({
      operation_type: 'race_control_note',
      source_type: 'manual',
      entity_name: 'Session',
      entity_id: selectedSession.id,
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        session_id: selectedSession.id,
        note_text: raceNotes,
        timestamp_client: new Date().toISOString(),
      }),
    });
    setRaceNotes('');
  }, [selectedSession, raceNotes, eventId, createOperationLogMutation]);

  const handleLogIncident = useCallback(
    (incidentType) => {
      if (!selectedSession) return;
      createOperationLogMutation.mutate({
        operation_type: 'race_control_incident',
        source_type: 'manual',
        entity_name: 'Session',
        entity_id: selectedSession.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: eventId,
          session_id: selectedSession.id,
          incident_type: incidentType,
          timestamp_client: new Date().toISOString(),
        }),
      });
    },
    [selectedSession, eventId, createOperationLogMutation]
  );

  // ── Empty/No access state ──────────────────────────────────────────────────

  if (!hasAccess) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">You do not have access to Race Control.</p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Race Control</p>
          <p className="text-gray-400 text-sm">Select an event to access race control.</p>
        </CardContent>
      </Card>
    );
  }

  if (sortedSessions.length === 0) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center text-gray-500 text-sm">
          No sessions. Add sessions in Classes & Sessions.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white text-2xl">Race Control</CardTitle>
              <p className="text-sm text-gray-400 mt-1">Session states, run of show, flags, notes</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── Two Column Layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Run of Show */}
        <div className="space-y-4">
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Run of Show</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sortedSessions.map((session) => {
                const className =
                  classMap[session.series_class_id]?.class_name || session.class_name || '—';
                return (
                  <div
                    key={session.id}
                    className={`bg-[#262626] rounded p-3 border border-gray-700 space-y-2 ${
                      selectedSession?.id === session.id ? 'border-blue-600' : ''
                    }`}
                  >
                    {/* Session header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="text-xs bg-gray-800">{session.session_order || '—'}</Badge>
                          <p className="text-white font-semibold text-sm">{session.name}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{session.session_type}</span>
                          <span>•</span>
                          <span>{className}</span>
                        </div>
                        {session.scheduled_time && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(session.scheduled_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <Badge
                          className={`text-xs whitespace-nowrap ${
                            STATUS_COLORS[session.status] || 'bg-gray-700'
                          }`}
                        >
                          {session.status || 'scheduled'}
                        </Badge>
                        {session.locked && (
                          <Badge className="text-xs bg-red-900/50 text-red-300 whitespace-nowrap">
                            Locked
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Control buttons */}
                    <div className="flex gap-1 flex-wrap pt-2 border-t border-gray-600">
                      <Button
                        onClick={() => handleSetStatus('scheduled')}
                        disabled={session.locked && !canOverride}
                        className="text-xs h-7 px-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                      >
                        Draft
                      </Button>
                      <Button
                        onClick={() => handleSetStatus('in_progress')}
                        disabled={session.locked && !canOverride}
                        className="text-xs h-7 px-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50"
                      >
                        Live
                      </Button>
                      <Button
                        onClick={() => handleSetStatus('completed')}
                        disabled={session.locked && !canOverride}
                        className="text-xs h-7 px-2 bg-green-700 hover:bg-green-600 disabled:opacity-50"
                      >
                        Done
                      </Button>
                      <Button
                        onClick={handleToggleLock}
                        disabled={!canOverride && (session.locked || selectedSession?.id === session.id)}
                        className="text-xs h-7 px-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 ml-auto"
                      >
                        {session.locked ? 'Unlock' : 'Lock'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Operations Console */}
        <div className="space-y-4">
          {/* Active Session Selector */}
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Active Session</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedSession?.id || ''} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {sortedSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id} className="text-white">
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSession && (
                <div className="bg-[#262626] rounded p-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <Badge
                      className={`text-xs ${
                        STATUS_COLORS[selectedSession.status] || 'bg-gray-700'
                      }`}
                    >
                      {selectedSession.status || 'scheduled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Locked</span>
                    <span className="text-white">{selectedSession.locked ? 'Yes' : 'No'}</span>
                  </div>
                  {selectedSession.scheduled_time && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Scheduled</span>
                      <span className="text-white">
                        {new Date(selectedSession.scheduled_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedSession && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSetStatus('in_progress')}
                    disabled={selectedSession.locked && !canOverride}
                    className="flex-1 text-xs h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    In Progress
                  </Button>
                  <Button
                    onClick={() => handleSetStatus('completed')}
                    disabled={selectedSession.locked && !canOverride}
                    className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    Completed
                  </Button>
                  <Button
                    onClick={() => handleSetStatus('cancelled')}
                    disabled={selectedSession.locked && !canOverride}
                    className="flex-1 text-xs h-8 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    Cancelled
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Race Notes */}
          {selectedSession && (
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Race Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  placeholder="Add race control notes..."
                  value={raceNotes}
                  onChange={(e) => setRaceNotes(e.target.value)}
                  className="bg-[#262626] border-gray-700 text-white text-xs h-20"
                />
                <Button
                  onClick={handleSaveNotes}
                  disabled={!raceNotes.trim()}
                  className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Note
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Incident Quick Log */}
          {selectedSession && (
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Incident Log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {INCIDENT_TYPES.map((incident) => {
                    const Icon = incident.icon;
                    return (
                      <Button
                        key={incident.key}
                        onClick={() => handleLogIncident(incident.key)}
                        className={`text-xs h-8 ${incident.color} text-white flex items-center justify-center gap-1`}
                      >
                        <Icon className="w-3 h-3" /> {incident.label}
                      </Button>
                    );
                  })}
                </div>

                {/* Incident feed */}
                {sessionOperationLogs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700 max-h-48 overflow-y-auto">
                    <p className="text-xs text-gray-400 mb-2">Recent Incidents</p>
                    {sessionOperationLogs
                      .filter((log) => log.operation_type === 'race_control_incident')
                      .slice(0, 10)
                      .map((log) => {
                        let metadata = {};
                        try {
                          metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
                        } catch {
                          // ignore
                        }
                        return (
                          <div key={log.id} className="bg-[#262626] rounded p-2 mb-1 text-xs">
                            <div className="flex justify-between text-gray-300">
                              <span className="font-semibold capitalize">{metadata.incident_type?.replace(/_/g, ' ')}</span>
                              <span className="text-gray-500">
                                {new Date(log.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes Feed */}
          {selectedSession && sessionOperationLogs.length > 0 && (
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Notes Feed</CardTitle>
              </CardHeader>
              <CardContent className="max-h-48 overflow-y-auto space-y-2">
                {sessionOperationLogs
                  .filter((log) => log.operation_type === 'race_control_note')
                  .slice(0, 10)
                  .map((log) => {
                    let metadata = {};
                    try {
                      metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
                    } catch {
                      // ignore
                    }
                    return (
                      <div key={log.id} className="bg-[#262626] rounded p-2 text-xs border border-gray-700">
                        <p className="text-gray-300">{metadata.note_text}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {new Date(log.created_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}