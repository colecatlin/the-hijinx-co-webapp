/**
 * Race Control Console
 * Manage session state, lock/unlock, apply overrides, monitor issues.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, Lock, Unlock, Zap, History } from 'lucide-react';
import { toast } from 'sonner';
import { canAction } from '@/components/access/accessControl';

const DQ = applyDefaultQueryOptions();

const SESSION_TYPE_ORDER = { Practice: 0, Qualifying: 1, Heat: 2, LCQ: 3, Final: 4 };
const STATUS_ORDER = { Draft: 0, Provisional: 1, Official: 2, Locked: 3 };

const statusColors = {
  Draft: 'bg-gray-700/60 text-gray-400',
  Provisional: 'bg-yellow-900/40 text-yellow-300',
  Official: 'bg-green-900/40 text-green-300',
  Locked: 'bg-blue-900/40 text-blue-300',
};

export default function RaceControlConsole({
  selectedEvent,
  selectedTrack,
  invalidateAfterOperation,
  dashboardContext,
  dashboardPermissions,
}) {
  const eventId = selectedEvent?.id;
  const [classFilter, setClassFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [overrideDrawerOpen, setOverrideDrawerOpen] = useState(false);
  const [overrideType, setOverrideType] = useState('rerun_recalc');
  const [overrideSessionId, setOverrideSessionId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

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

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['raceControl_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 500),
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

  const classMap = useMemo(() => Object.fromEntries(seriesClasses.map((c) => [c.id, c])), [seriesClasses]);

  const resultsCountBySession = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      if (!map[r.session_id]) map[r.session_id] = 0;
      map[r.session_id]++;
    });
    return map;
  }, [results]);

  const entriesCountByClass = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!map[e.event_class_id]) map[e.event_class_id] = 0;
      map[e.event_class_id]++;
    });
    return map;
  }, [entries]);

  const getClassName = (classId, fallback) => {
    if (classMap[classId]) return classMap[classId].class_name;
    return fallback || 'Unknown Class';
  };

  // Get unique classes from sessions
  const uniqueClasses = useMemo(() => {
    const classes = {};
    sessions.forEach((s) => {
      if (s.series_class_id && !classes[s.series_class_id]) {
        classes[s.series_class_id] = getClassName(s.series_class_id, s.class_name);
      }
    });
    return classes;
  }, [sessions, classMap]);

  // Sessions grouped by status
  const sessionsByStatus = useMemo(() => {
    const grouped = { Draft: [], Provisional: [], Official: [], Locked: [] };
    
    sessions.forEach((session) => {
      let status = session.status || 'Draft';
      if (!Object.keys(grouped).includes(status)) status = 'Draft';

      const matchClass = classFilter === 'all' || session.series_class_id === classFilter || session.class_name === classFilter;
      const matchSession = sessionFilter === 'all' || session.id === sessionFilter;

      if (matchClass && matchSession) {
        grouped[status].push(session);
      }
    });

    return grouped;
  }, [sessions, classFilter, sessionFilter]);

  // Activity feed
  const activityFeed = useMemo(() => {
    return operationLogs
      .filter((log) => {
        const types = ['session_status_change', 'session_lock_change', 'race_control_override', 'results_published', 'standings_recalculated', 'sync_error', 'import_error'];
        return types.includes(log.operation_type);
      })
      .slice(0, 50);
  }, [operationLogs]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleStatusChange = useCallback(async (session, newStatus) => {
    try {
      const previousStatus = session.status || 'Draft';
      await base44.entities.Session.update(session.id, { status: newStatus });

      await base44.entities.OperationLog.create({
        operation_type: 'session_status_change',
        source_type: 'RaceCore',
        entity_name: 'Session',
        status: 'success',
        metadata: {
          event_id: eventId,
          session_id: session.id,
          previous_status: previousStatus,
          next_status: newStatus,
          timestamp: new Date().toISOString(),
        },
      });

      invalidateAfterOperation('session_updated', { eventId });
      invalidateAfterOperation('race_control_override', { eventId });
      toast.success(`Session set to ${newStatus}`);
    } catch (err) {
      console.error('Status change error:', err);
      toast.error('Failed to change session status');
    }
  }, [eventId, invalidateAfterOperation]);

  const handleLockSession = useCallback(async (session) => {
    try {
      await base44.entities.Session.update(session.id, { locked: true, status: 'Locked' });

      await base44.entities.OperationLog.create({
        operation_type: 'session_lock_change',
        source_type: 'RaceCore',
        entity_name: 'Session',
        status: 'success',
        metadata: {
          event_id: eventId,
          session_id: session.id,
          previous_locked: false,
          next_locked: true,
          timestamp: new Date().toISOString(),
        },
      });

      invalidateAfterOperation('session_updated', { eventId });
      invalidateAfterOperation('race_control_override', { eventId });
      toast.success('Session locked');
    } catch (err) {
      console.error('Lock error:', err);
      toast.error('Failed to lock session');
    }
  }, [eventId, invalidateAfterOperation]);

  const handleUnlockSession = useCallback(async (session) => {
    try {
      const resultsExist = resultsCountBySession[session.id] > 0;
      const nextStatus = resultsExist ? 'Official' : 'Provisional';

      await base44.entities.Session.update(session.id, { locked: false, status: nextStatus });

      await base44.entities.OperationLog.create({
        operation_type: 'session_lock_change',
        source_type: 'RaceCore',
        entity_name: 'Session',
        status: 'success',
        metadata: {
          event_id: eventId,
          session_id: session.id,
          previous_locked: true,
          next_locked: false,
          next_status: nextStatus,
          timestamp: new Date().toISOString(),
        },
      });

      invalidateAfterOperation('session_updated', { eventId });
      invalidateAfterOperation('race_control_override', { eventId });
      toast.success('Session unlocked');
    } catch (err) {
      console.error('Unlock error:', err);
      toast.error('Failed to unlock session');
    }
  }, [eventId, resultsCountBySession, invalidateAfterOperation]);

  const handleApplyOverride = useCallback(async () => {
    if (!overrideSessionId || !overrideReason.trim()) {
      toast.error('Select session and provide reason');
      return;
    }

    try {
      const targetSession = sessions.find((s) => s.id === overrideSessionId);
      if (!targetSession) {
        toast.error('Session not found');
        return;
      }

      // Execute override action
      if (overrideType === 'unlock_session') {
        await handleUnlockSession(targetSession);
      } else if (overrideType === 'force_official') {
        await base44.entities.Session.update(overrideSessionId, { status: 'Official' });
      } else if (overrideType === 'rerun_recalc') {
        // Just log, standings recalc would be triggered separately
      }
      // invalidate_cache is handled via invalidateAfterOperation

      // Log the override
      await base44.entities.OperationLog.create({
        operation_type: 'race_control_override',
        source_type: 'RaceCore',
        entity_name: 'Session',
        status: 'success',
        metadata: {
          event_id: eventId,
          session_id: overrideSessionId,
          override_type: overrideType,
          reason: overrideReason,
          timestamp: new Date().toISOString(),
        },
      });

      invalidateAfterOperation('race_control_override', { eventId });
      setOverrideDrawerOpen(false);
      setOverrideReason('');
      setOverrideSessionId('');
      toast.success('Override applied');
    } catch (err) {
      console.error('Override error:', err);
      toast.error('Failed to apply override');
    }
  }, [overrideSessionId, overrideReason, overrideType, eventId, sessions, handleUnlockSession, invalidateAfterOperation]);

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Race Control Console</p>
          <p className="text-gray-400 text-sm">Select an event to manage race control.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Controls ──────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center justify-between">
            <div>
              <p className="text-lg">{selectedEvent.name}</p>
              {selectedTrack && <p className="text-xs text-gray-400">{selectedTrack.name}</p>}
              <p className="text-xs text-gray-500">
                {selectedEvent.event_date}
                {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date ? ` – ${selectedEvent.end_date}` : ''}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-64">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
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
            </div>

            <div className="flex-1 min-w-64">
              <Select value={sessionFilter} onValueChange={setSessionFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
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
            </div>

            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search driver name or car #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#262626] border-gray-700 text-white"
              />
            </div>

            {canAction(dashboardPermissions, 'race_control_override') && (
              <Button
                onClick={() => setOverrideDrawerOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Zap className="w-4 h-4 mr-2" /> Override
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Status Board ──────────────────────────────────────────────────– */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Draft', 'Provisional', 'Official', 'Locked'].map((status) => (
          <Card key={status} className="bg-[#171717] border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Badge className={statusColors[status]}>{status}</Badge>
                <span className="text-gray-400 text-xs">({sessionsByStatus[status].length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sessionsByStatus[status].length === 0 ? (
                <p className="text-gray-500 text-xs py-2">No sessions</p>
              ) : (
                sessionsByStatus[status].map((session) => {
                  const resultCount = resultsCountBySession[session.id] || 0;
                  const entryCount = entriesCountByClass[session.event_class_id] || 0;
                  const className = getClassName(session.series_class_id, session.class_name);

                  return (
                    <div key={session.id} className="bg-[#262626] rounded-lg p-3 border border-gray-700 space-y-2">
                      <div>
                        <p className="text-white font-semibold text-xs">
                          {session.session_type}
                          {session.session_number ? ` ${session.session_number}` : ''}
                        </p>
                        <p className="text-gray-400 text-xs">{className}</p>
                        {session.scheduled_time && (
                          <p className="text-gray-500 text-xs">
                            {new Date(session.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1">
                        {session.input_source && (
                          <Badge className="bg-blue-900/40 text-blue-300 text-xs">
                            {session.input_source}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-gray-400 space-y-0.5">
                        {resultCount > 0 && <p>📊 {resultCount} results</p>}
                        {entryCount > 0 && <p>👥 {entryCount} entries</p>}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {status !== 'Draft' && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleStatusChange(session, 'Draft')}
                            className="text-xs h-6 px-1.5 border border-gray-700 text-gray-400 hover:text-white"
                          >
                            Draft
                          </Button>
                        )}
                        {status !== 'Provisional' && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleStatusChange(session, 'Provisional')}
                            className="text-xs h-6 px-1.5 border border-gray-700 text-gray-400 hover:text-white"
                          >
                            Prov
                          </Button>
                        )}
                        {status !== 'Official' && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleStatusChange(session, 'Official')}
                            className="text-xs h-6 px-1.5 border border-gray-700 text-gray-400 hover:text-white"
                          >
                            Ofc
                          </Button>
                        )}
                      </div>

                      <div className="flex gap-1">
                        {status === 'Locked' ? (
                          <Button
                            size="xs"
                            onClick={() => handleUnlockSession(session)}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs h-6"
                          >
                            <Unlock className="w-3 h-3 mr-1" /> Unlock
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            onClick={() => handleLockSession(session)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-6"
                          >
                            <Lock className="w-3 h-3 mr-1" /> Lock
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Activity Feed ─────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <History className="w-4 h-4" /> Activity Feed (Last 50)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityFeed.length === 0 ? (
            <p className="text-gray-500 text-xs py-4">No activity yet</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {activityFeed.map((log, idx) => (
                <div key={idx} className="text-xs border-b border-gray-800 pb-2 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-gray-300 font-mono">
                        {new Date(log.created_date).toLocaleString()}
                      </p>
                      <p className="text-gray-400">
                        {log.operation_type.replace(/_/g, ' ')}
                      </p>
                      {log.metadata?.reason && (
                        <p className="text-gray-500 text-xs italic mt-0.5">"{log.metadata.reason}"</p>
                      )}
                    </div>
                    {log.status === 'success' ? (
                      <Badge className="bg-green-900/40 text-green-300 text-xs">✓</Badge>
                    ) : (
                      <Badge className="bg-red-900/40 text-red-300 text-xs">✗</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Override Drawer ───────────────────────────────────────────────── */}
      {canAction(dashboardPermissions, 'race_control_override') && (
        <Drawer open={overrideDrawerOpen} onOpenChange={setOverrideDrawerOpen}>
          <DrawerContent className="bg-[#171717] border-gray-800">
            <DrawerHeader>
              <DrawerTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" /> Race Control Override
              </DrawerTitle>
              <DrawerDescription className="text-gray-400 mt-2">
                Apply admin-level overrides to session state.
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 space-y-4 py-4">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Override Type</label>
                <Select value={overrideType} onValueChange={setOverrideType}>
                  <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700 text-white">
                    <SelectItem value="rerun_recalc" className="text-white">Recalculate Standings</SelectItem>
                    <SelectItem value="unlock_session" className="text-white">Unlock Session</SelectItem>
                    <SelectItem value="force_official" className="text-white">Force Official</SelectItem>
                    <SelectItem value="invalidate_cache" className="text-white">Invalidate Cache</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Target Session</label>
                <Select value={overrideSessionId} onValueChange={setOverrideSessionId}>
                  <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                    <SelectValue placeholder="Select session..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700 text-white max-h-60">
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-white">
                        {s.session_type}
                        {s.session_number ? ` ${s.session_number}` : ''} — {s.class_name || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Reason (required)</label>
                <Textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Why is this override necessary?"
                  className="bg-[#262626] border-gray-700 text-white h-20 resize-none"
                />
              </div>
            </div>

            <DrawerFooter>
              <div className="flex gap-2">
                <Button
                  onClick={handleApplyOverride}
                  disabled={!overrideSessionId || !overrideReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                >
                  Apply Override
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setOverrideDrawerOpen(false)}
                  className="flex-1 border-gray-700 text-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}