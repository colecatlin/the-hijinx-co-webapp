/**
 * Race Control Manager
 * Manage live session states, publishing workflow, and operational overrides.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, RefreshCw, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

const SESSION_STATUSES = ['Draft', 'Provisional', 'Official', 'Locked'];
const STATUS_COLORS = {
  Draft: 'bg-gray-700 text-gray-200',
  Provisional: 'bg-yellow-700 text-yellow-100',
  Official: 'bg-green-700 text-green-100',
  Locked: 'bg-red-700 text-red-100',
};

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
  const [classFilter, setClassFilter] = useState('all');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  // Permission checks
  const isAdmin = dashboardPermissions?.role === 'admin';
  const canEditStatus = ['admin', 'entity_owner', 'entity_editor'].includes(dashboardPermissions?.role);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: sessions = [], refetch: refetchSessions } = useQuery({
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

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['raceControl_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['raceControl_operationLogs'],
    queryFn: () =>
      base44.entities.OperationLog.list('-created_date', 100),
    staleTime: 30_000,
    ...DQ,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateSessionMutation = useMutation({
    mutationFn: ({ sessionId, data }) => base44.entities.Session.update(sessionId, data),
    onSuccess: () => {
      invalidateAfterOperation('session_updated');
      queryClient.invalidateQueries({ queryKey: REG_QK.sessions(eventId) });
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
      toast.success('Override logged');
    },
    onError: (err) => {
      console.error('Failed to log operation:', err);
      toast.error('Failed to log override');
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const classMap = useMemo(
    () => Object.fromEntries(seriesClasses.map((c) => [c.id, c])),
    [seriesClasses]
  );

  // Get unique classes from sessions
  const uniqueClasses = useMemo(() => {
    const classIds = new Set();
    sessions.forEach((s) => {
      if (s.series_class_id || s.event_class_id) {
        classIds.add(s.series_class_id || s.event_class_id);
      }
    });
    return Array.from(classIds);
  }, [sessions]);

  // Filter sessions by class
  const filteredSessions = useMemo(() => {
    let result = [...sessions];
    if (classFilter !== 'all') {
      result = result.filter((s) => (s.series_class_id || s.event_class_id) === classFilter);
    }
    return result.sort((a, b) => (a.session_order || 0) - (b.session_order || 0));
  }, [sessions, classFilter]);

  // Get selected session
  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  // Results for selected session
  const sessionResults = useMemo(() => {
    if (!selectedSessionId) return [];
    return results.filter((r) => r.session_id === selectedSessionId);
  }, [results, selectedSessionId]);

  // Event scoped operation logs
  const eventOperationLogs = useMemo(() => {
    if (!eventId) return [];
    return operationLogs
      .filter((log) => {
        try {
          const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          return metadata?.event_id === eventId || log.event_id === eventId;
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 25);
  }, [operationLogs, eventId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleUpdateSessionStatus = useCallback(
    (newStatus) => {
      if (!selectedSession) return;

      // Permission check: only admin can set Official, Lock/Unlock
      if (!isAdmin && (newStatus === 'Official' || newStatus === 'Locked')) {
        toast.error('Admin only');
        return;
      }

      // Log override if not Draft or Provisional
      if (isAdmin && (newStatus === 'Official' || newStatus === 'Locked')) {
        createOperationLogMutation.mutate({
          operation_type: 'race_control_override',
          source_type: 'dashboard',
          entity_name: 'Session',
          entity_id: selectedSession.id,
          status: 'success',
          metadata: JSON.stringify({
            event_id: eventId,
            session_id: selectedSession.id,
            before_status: selectedSession.status,
            after_status: newStatus,
            action: 'status_change',
          }),
        });
      }

      updateSessionMutation.mutate({
        sessionId: selectedSession.id,
        data: { status: newStatus },
      });
    },
    [selectedSession, isAdmin, eventId, updateSessionMutation, createOperationLogMutation]
  );

  const handleLockSession = useCallback(() => {
    if (!selectedSession) return;
    if (!isAdmin) {
      toast.error('Admin only');
      return;
    }

    createOperationLogMutation.mutate({
      operation_type: 'race_control_override',
      source_type: 'dashboard',
      entity_name: 'Session',
      entity_id: selectedSession.id,
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        session_id: selectedSession.id,
        action: 'lock_session',
        locked: true,
      }),
    });

    updateSessionMutation.mutate({
      sessionId: selectedSession.id,
      data: { locked: true },
    });
  }, [selectedSession, isAdmin, eventId, updateSessionMutation, createOperationLogMutation]);

  const handleUnlockSession = useCallback(() => {
    if (!selectedSession) return;
    if (!isAdmin) {
      toast.error('Admin only');
      return;
    }

    createOperationLogMutation.mutate({
      operation_type: 'race_control_override',
      source_type: 'dashboard',
      entity_name: 'Session',
      entity_id: selectedSession.id,
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        session_id: selectedSession.id,
        action: 'unlock_session',
        locked: false,
      }),
    });

    updateSessionMutation.mutate({
      sessionId: selectedSession.id,
      data: { locked: false },
    });
  }, [selectedSession, isAdmin, eventId, updateSessionMutation, createOperationLogMutation]);

  const handleQuickPublish = useCallback(() => {
    if (!selectedSession) return;
    if (!isAdmin) {
      toast.error('Admin only');
      return;
    }

    createOperationLogMutation.mutate({
      operation_type: 'race_control_override',
      source_type: 'dashboard',
      entity_name: 'Session',
      entity_id: selectedSession.id,
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        session_id: selectedSession.id,
        action: 'quick_publish',
        before_status: selectedSession.status,
        after_status: 'Locked',
      }),
    });

    updateSessionMutation.mutate({
      sessionId: selectedSession.id,
      data: { status: 'Official', locked: true },
    });
  }, [selectedSession, isAdmin, eventId, updateSessionMutation, createOperationLogMutation]);

  // ── Empty state ────────────────────────────────────────────────────────────

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

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white text-2xl">Race Control</CardTitle>
              <p className="text-sm text-gray-400 mt-1">Session state, publishing workflow, and overrides</p>
            </div>
            <Button
              onClick={() => refetchSessions()}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs h-9 px-3"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>

        {/* Selection Row */}
        <CardContent className="space-y-3 border-t border-gray-700 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Class</label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="all" className="text-white">All Classes</SelectItem>
                  {uniqueClasses.map((classId) => (
                    <SelectItem key={classId} value={classId} className="text-white">
                      {classMap[classId]?.class_name || classId.slice(0, 6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Session</label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-9">
                  <SelectValue placeholder="Select session..." />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {filteredSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id} className="text-white">
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Session Status Panel ──────────────────────────────────────────── */}
      {selectedSession && (
        <div className="space-y-6">
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedSession.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`text-xs ${STATUS_COLORS[selectedSession.status] || 'bg-gray-700'}`}>
                      {selectedSession.status || 'Draft'}
                    </Badge>
                    {selectedSession.locked && (
                      <Badge className="text-xs bg-red-900/50 text-red-300 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 border-t border-gray-700 pt-4">
              {/* Session Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Type</p>
                  <p className="text-white font-semibold">{selectedSession.session_type}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Class</p>
                  <p className="text-white font-semibold">
                    {classMap[selectedSession.series_class_id]?.class_name || selectedSession.class_name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Laps</p>
                  <p className="text-white font-semibold">{selectedSession.laps || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Input Source</p>
                  <p className="text-white font-semibold">{selectedSession.input_source || 'Manual'}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Scheduled</p>
                  <p className="text-white font-semibold text-xs">
                    {selectedSession.scheduled_time
                      ? new Date(selectedSession.scheduled_time).toLocaleString()
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Status Timeline</p>
                <div className="flex gap-2">
                  {SESSION_STATUSES.map((status, idx) => (
                    <div key={status} className="flex-1 flex items-center gap-1">
                      <div
                        className={`flex-1 h-2 rounded ${
                          SESSION_STATUSES.indexOf(selectedSession.status || 'Draft') >= idx
                            ? 'bg-green-600'
                            : 'bg-gray-700'
                        }`}
                      />
                      <span className="text-xs text-gray-400">{status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Results Summary */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Results Readiness</p>
                <div className="bg-[#262626] rounded p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total result rows</span>
                    <span className="text-white font-semibold">{sessionResults.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last update</span>
                    <span className="text-white font-semibold text-xs">
                      {sessionResults.length > 0
                        ? new Date(
                            Math.max(...sessionResults.map((r) => new Date(r.created_date)))
                          ).toLocaleString()
                        : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 italic">Validation and diagnostics expand in future releases</p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Controls</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Button
                    onClick={() => handleUpdateSessionStatus('Draft')}
                    disabled={!canEditStatus}
                    className="text-xs h-9 bg-gray-700 hover:bg-gray-600 disabled:opacity-50"
                  >
                    Set Draft
                  </Button>
                  <Button
                    onClick={() => handleUpdateSessionStatus('Provisional')}
                    disabled={!canEditStatus}
                    className="text-xs h-9 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50"
                  >
                    Set Provisional
                  </Button>
                  <Button
                    onClick={() => handleUpdateSessionStatus('Official')}
                    disabled={!isAdmin}
                    className="text-xs h-9 bg-green-700 hover:bg-green-600 disabled:opacity-50"
                  >
                    Set Official
                  </Button>
                  <Button
                    onClick={handleLockSession}
                    disabled={!isAdmin || selectedSession.locked}
                    className="text-xs h-9 bg-red-700 hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
                  >
                    <Lock className="w-3 h-3" /> Lock
                  </Button>
                  <Button
                    onClick={handleUnlockSession}
                    disabled={!isAdmin || !selectedSession.locked}
                    className="text-xs h-9 bg-orange-700 hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1"
                  >
                    <Unlock className="w-3 h-3" /> Unlock
                  </Button>
                  <Button
                    onClick={handleQuickPublish}
                    disabled={!isAdmin}
                    className="text-xs h-9 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Publish
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Activity Log ──────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {eventOperationLogs.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No operations logged yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {eventOperationLogs.map((log) => {
                let metadata = {};
                try {
                  metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata || {};
                } catch {
                  metadata = {};
                }

                return (
                  <div key={log.id} className="bg-[#262626] rounded p-3 border border-gray-700 text-xs">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold">{log.operation_type}</span>
                          <Badge
                            className={`text-xs ${
                              log.status === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                            }`}
                          >
                            {log.status}
                          </Badge>
                        </div>
                        <p className="text-gray-400">{log.entity_name}</p>
                        {metadata.action && (
                          <p className="text-gray-500 text-xs mt-1">
                            {metadata.action === 'status_change' && `Changed from ${metadata.before_status} to ${metadata.after_status}`}
                            {metadata.action === 'lock_session' && 'Locked session'}
                            {metadata.action === 'unlock_session' && 'Unlocked session'}
                            {metadata.action === 'quick_publish' && 'Published Official & Locked'}
                          </p>
                        )}
                      </div>
                      <span className="text-gray-500 text-xs whitespace-nowrap ml-2">
                        {new Date(log.created_date).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}