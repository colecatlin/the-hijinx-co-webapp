/**
 * RaceControlManager.jsx
 * Live race operations panel for RegistrationDashboard.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { logOperation } from './operationLogger';
import { canAction } from '@/components/access/accessControl';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  RefreshCw,
  Flag,
  Play,
  Square,
  XCircle,
  Lock,
  Unlock,
  CheckCircle2,
  FileText,
  Users,
  ExternalLink,
  ChevronRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── helpers ────────────────────────────────────────────────────────────────

const SESSION_TYPE_ORDER = ['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final'];

function sortSessions(sessions) {
  return [...sessions].sort((a, b) => {
    const ai = SESSION_TYPE_ORDER.indexOf(a.session_type);
    const bi = SESSION_TYPE_ORDER.indexOf(b.session_type);
    if (ai !== bi) return ai - bi;
    if ((a.session_number ?? 0) !== (b.session_number ?? 0))
      return (a.session_number ?? 0) - (b.session_number ?? 0);
    if (a.scheduled_time && b.scheduled_time)
      return new Date(a.scheduled_time) - new Date(b.scheduled_time);
    return 0;
  });
}

const STATUS_COLORS = {
  Draft: 'bg-gray-700 text-gray-200',
  Provisional: 'bg-yellow-700 text-yellow-100',
  Official: 'bg-blue-700 text-blue-100',
  Locked: 'bg-purple-800 text-purple-100',
  scheduled: 'bg-slate-600 text-slate-200',
  in_progress: 'bg-green-700 text-green-100',
  completed: 'bg-teal-700 text-teal-100',
  cancelled: 'bg-red-800 text-red-200',
  Completed: 'bg-teal-700 text-teal-100',
  Cancelled: 'bg-red-800 text-red-200',
};

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || 'bg-gray-600 text-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function fmt(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Issues computation ──────────────────────────────────────────────────────

function computeIssues(session, results, entries, driverPrograms) {
  if (!session) return [];
  const issues = [];

  // No results but Provisional/Official
  if (
    results.length === 0 &&
    ['Provisional', 'Official'].includes(session.status)
  ) {
    issues.push('No results recorded but session is marked Provisional/Official.');
  }

  // Duplicate positions
  if (results.length > 0) {
    const positions = results.map((r) => r.position).filter((p) => p != null);
    const seen = new Set();
    for (const p of positions) {
      if (seen.has(p)) {
        issues.push(`Duplicate finishing position detected (position ${p}).`);
        break;
      }
      seen.add(p);
    }
  }

  // Drivers in results not in entry/program list
  if (results.length > 0 && (entries.length > 0 || driverPrograms.length > 0)) {
    const knownDriverIds = new Set([
      ...entries.map((e) => e.driver_id),
      ...driverPrograms.map((p) => p.driver_id),
    ]);
    const unknownDrivers = results.filter(
      (r) => r.driver_id && !knownDriverIds.has(r.driver_id)
    );
    if (unknownDrivers.length > 0) {
      issues.push(
        `${unknownDrivers.length} result(s) reference driver(s) not found in event entries.`
      );
    }
  }

  return issues;
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function RaceControlManager({
  selectedEvent,
  selectedSeries,
  invalidateAfterOperation,
  isAdmin,
  dashboardPermissions,
  currentUser,
}) {
  const queryClient = useQueryClient();
  const eventId = selectedEvent?.id;
  const seriesId = selectedSeries?.id;

  const [activeSessionId, setActiveSessionId] = useState(null);
  const [classFilter, setClassFilter] = useState('all');
  const [redFlagOpen, setRedFlagOpen] = useState(false);
  const [redFlagNotes, setRedFlagNotes] = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // { title, body, onConfirm }

  // ── Queries ──────────────────────────────────────────────────────────────

  const sessionsQuery = useQuery({
    queryKey: ['rc_sessions', eventId],
    queryFn: () =>
      base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    staleTime: 15_000,
  });

  const seriesClassesQuery = useQuery({
    queryKey: ['rc_series_classes', seriesId],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: seriesId }),
    enabled: !!seriesId,
    staleTime: 60_000,
  });

  const entriesQuery = useQuery({
    queryKey: ['rc_entries', eventId],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
    staleTime: 30_000,
  });

  const driverProgramsQuery = useQuery({
    queryKey: ['rc_driver_programs', eventId],
    queryFn: () => base44.entities.DriverProgram.filter({ event_id: eventId }),
    enabled: !!eventId,
    staleTime: 30_000,
  });

  const sessions = useMemo(
    () => sortSessions(sessionsQuery.data || []),
    [sessionsQuery.data]
  );

  const seriesClasses = seriesClassesQuery.data || [];
  const entries = entriesQuery.data || [];
  const driverPrograms = driverProgramsQuery.data || [];

  // Active session
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || sessions[0] || null,
    [sessions, activeSessionId]
  );

  // Results for active session
  const resultsQuery = useQuery({
    queryKey: ['rc_results', activeSession?.id],
    queryFn: () =>
      base44.entities.Results.filter({ session_id: activeSession.id }),
    enabled: !!activeSession?.id,
    staleTime: 10_000,
    select: (data) =>
      [...data].sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999)),
  });

  const results = resultsQuery.data || [];

  // Class name helper
  const getClassName = useCallback(
    (classId) => {
      if (!classId) return null;
      return seriesClasses.find((c) => c.id === classId)?.name || classId;
    },
    [seriesClasses]
  );

  // Filtered sessions by class
  const filteredSessions = useMemo(() => {
    if (classFilter === 'all') return sessions;
    return sessions.filter((s) => s.series_class_id === classFilter);
  }, [sessions, classFilter]);

  // Issues
  const issues = useMemo(
    () => computeIssues(activeSession, results, entries, driverPrograms),
    [activeSession, results, entries, driverPrograms]
  );

  // Issues per session (count only)
  const issueCountBySession = useMemo(() => {
    const map = {};
    sessions.forEach((s) => {
      const r = results; // We only have full results for active session; use 0 for others
      map[s.id] = s.id === activeSession?.id ? issues.length : 0;
    });
    return map;
  }, [sessions, activeSession, issues, results]);

  // ── Mutations helper ──────────────────────────────────────────────────────

  const doSessionUpdate = useCallback(
    async ({ updates, operationType, message, invalidateType, extraMeta }) => {
      if (!activeSession) return;
      try {
        await base44.entities.Session.update(activeSession.id, updates);
        await logOperation({
          operation_type: operationType,
          status: 'success',
          entity_name: 'Session',
          entity_id: activeSession.id,
          event_id: eventId,
          message: message || operationType,
          meta_json: extraMeta,
        });
        invalidateAfterOperation(invalidateType || 'session_updated', { eventId });
        toast.success(message || 'Done');
      } catch (err) {
        await logOperation({
          operation_type: operationType,
          status: 'failed',
          entity_name: 'Session',
          entity_id: activeSession.id,
          event_id: eventId,
          message: err?.message || 'Error',
        });
        toast.error(err?.message || 'Operation failed');
      }
    },
    [activeSession, eventId, invalidateAfterOperation]
  );

  // ── Status workflow handlers ──────────────────────────────────────────────

  const handleSetDraft = () =>
    doSessionUpdate({
      updates: { status: 'Draft' },
      operationType: 'session_set_draft',
      message: 'Session set to Draft.',
      invalidateType: 'session_updated',
    });

  const handleMarkProvisional = () =>
    doSessionUpdate({
      updates: { status: 'Provisional' },
      operationType: 'session_mark_provisional',
      message: 'Session marked Provisional.',
      invalidateType: 'session_updated',
    });

  const handlePublishOfficial = () => {
    if (results.length === 0) {
      setConfirmModal({
        title: 'Publish Official — No Results',
        body: 'This session has no results recorded. Are you sure you want to publish it as Official?',
        onConfirm: () =>
          doSessionUpdate({
            updates: { status: 'Official' },
            operationType: 'session_publish_official',
            message: 'Session published as Official.',
            invalidateType: 'results_published',
          }),
      });
    } else {
      doSessionUpdate({
        updates: { status: 'Official' },
        operationType: 'session_publish_official',
        message: 'Session published as Official.',
        invalidateType: 'results_published',
      });
    }
  };

  const handleLock = () => {
    if (activeSession?.status !== 'Official') {
      toast.error('Session must be Official before locking.');
      return;
    }
    doSessionUpdate({
      updates: { status: 'Locked' },
      operationType: 'session_locked',
      message: 'Session locked.',
      invalidateType: 'session_locked',
    });
  };

  const handleUnlock = () => {
    if (!isAdmin) {
      toast.error('Only admins can unlock a session.');
      return;
    }
    doSessionUpdate({
      updates: { status: 'Official' },
      operationType: 'session_unlocked',
      message: 'Session unlocked (set back to Official).',
      invalidateType: 'session_updated',
    });
  };

  // ── Live Ops handlers ─────────────────────────────────────────────────────

  const handleStartSession = () =>
    doSessionUpdate({
      updates: { status: 'in_progress' },
      operationType: 'session_start',
      message: 'Session started.',
      invalidateType: 'session_updated',
    });

  const handleEndSession = () =>
    doSessionUpdate({
      updates: { status: 'Completed' },
      operationType: 'session_end',
      message: 'Session ended.',
      invalidateType: 'session_updated',
    });

  const handleCancelSession = () => {
    setConfirmModal({
      title: 'Cancel Session',
      body: 'Are you sure you want to cancel this session? This cannot be easily undone.',
      onConfirm: () =>
        doSessionUpdate({
          updates: { status: 'Cancelled' },
          operationType: 'session_cancel',
          message: 'Session cancelled.',
          invalidateType: 'session_updated',
        }),
    });
  };

  const handleRedFlag = async () => {
    try {
      await logOperation({
        operation_type: 'red_flag',
        status: 'success',
        entity_name: 'Session',
        entity_id: activeSession?.id,
        event_id: eventId,
        message: redFlagNotes || 'Red flag issued.',
      });
      invalidateAfterOperation('operation_logged', { eventId });
      toast.success('Red flag logged.');
      setRedFlagOpen(false);
      setRedFlagNotes('');
    } catch (err) {
      toast.error('Failed to log red flag.');
    }
  };

  // ── Refresh ───────────────────────────────────────────────────────────────

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['rc_sessions', eventId] });
    queryClient.invalidateQueries({ queryKey: ['rc_results', activeSession?.id] });
    toast.success('Refreshed.');
  };

  // ── No event guard ────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Select an event to use Race Control.
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-[#0f1117] min-h-screen text-white p-4 space-y-4">

      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Session selector */}
          <Select
            value={activeSession?.id || ''}
            onValueChange={(val) => setActiveSessionId(val)}
          >
            <SelectTrigger className="w-56 bg-gray-800 border-gray-600 text-white text-sm h-9">
              <SelectValue placeholder="Select session…" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600 text-white">
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-white focus:bg-gray-700">
                  {s.session_type} {s.session_number ? `#${s.session_number}` : ''}{' '}
                  {getClassName(s.series_class_id)
                    ? `— ${getClassName(s.series_class_id)}`
                    : s.class_name
                    ? `— ${s.class_name}`
                    : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Class filter */}
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-44 bg-gray-800 border-gray-600 text-white text-sm h-9">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600 text-white">
              <SelectItem value="all" className="text-white focus:bg-gray-700">All Classes</SelectItem>
              {seriesClasses.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-white focus:bg-gray-700">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 h-9"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 h-9"
            onClick={() =>
              window.location.assign(
                createPageUrl('RegistrationDashboard') + '?tab=results'
              )
            }
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Results
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 h-9"
            onClick={() =>
              window.location.assign(
                createPageUrl('RegistrationDashboard') + '?tab=entries'
              )
            }
          >
            <Users className="w-3.5 h-3.5 mr-1.5" /> Entries
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* LEFT — Session Queue */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-700 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Session Queue
          </div>
          {sessionsQuery.isLoading ? (
            <div className="p-6 text-center text-gray-500 text-sm">Loading sessions…</div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No sessions found.</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredSessions.map((s) => {
                const isActive = activeSession?.id === s.id;
                const className =
                  getClassName(s.series_class_id) || s.class_name || '—';
                const issueCount = s.id === activeSession?.id ? issues.length : 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-800 transition-colors ${
                      isActive ? 'bg-gray-800 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">
                          {s.session_type}
                          {s.session_number ? ` #${s.session_number}` : ''}
                        </span>
                        <span className="text-xs text-gray-400">{className}</span>
                      </div>
                      {s.scheduled_time && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {fmt(s.scheduled_time)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={s.status} />
                      {issueCount > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-700 text-red-100">
                          {issueCount}
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT — Active Session Control Panel */}
        <div className="space-y-3">
          {!activeSession ? (
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-8 text-center text-gray-500 text-sm">
              Select a session from the queue.
            </div>
          ) : (
            <>
              {/* Session summary */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-bold text-white">
                      {activeSession.session_type}
                      {activeSession.session_number
                        ? ` #${activeSession.session_number}`
                        : ''}
                    </div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      {getClassName(activeSession.series_class_id) ||
                        activeSession.class_name ||
                        'No class'}
                    </div>
                    {activeSession.scheduled_time && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <Clock className="w-3 h-3" />
                        Scheduled: {fmt(activeSession.scheduled_time)}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={activeSession.status} />
                </div>
              </div>

              {/* Issues */}
              {issues.length > 0 && (
                <div className="bg-red-950 border border-red-800 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-red-300 text-xs font-semibold uppercase tracking-wider mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {issues.length} Issue{issues.length > 1 ? 's' : ''} Detected
                  </div>
                  <ul className="space-y-1">
                    {issues.map((iss, i) => (
                      <li key={i} className="text-xs text-red-300 flex items-start gap-1.5">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {iss}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Status Workflow */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Status Workflow
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={handleSetDraft}
                    disabled={activeSession.status === 'Locked' && !isAdmin}
                  >
                    Set Draft
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-yellow-700 text-yellow-300 hover:bg-yellow-900 hover:text-yellow-100"
                    onClick={handleMarkProvisional}
                    disabled={activeSession.status === 'Locked' && !isAdmin}
                  >
                    Mark Provisional
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-700 hover:bg-blue-600 text-white"
                    onClick={handlePublishOfficial}
                    disabled={activeSession.status === 'Locked' && !isAdmin}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Publish Official
                  </Button>
                  {activeSession.status !== 'Locked' ? (
                    <Button
                      size="sm"
                      className="bg-purple-800 hover:bg-purple-700 text-white"
                      onClick={handleLock}
                      disabled={activeSession.status !== 'Official'}
                      title={
                        activeSession.status !== 'Official'
                          ? 'Session must be Official to lock'
                          : ''
                      }
                    >
                      <Lock className="w-3.5 h-3.5 mr-1.5" />
                      Lock Session
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className={`${
                        isAdmin
                          ? 'bg-orange-800 hover:bg-orange-700 text-white'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                      onClick={handleUnlock}
                      disabled={!isAdmin}
                      title={!isAdmin ? 'Admin only' : 'Unlock session (admin override)'}
                    >
                      <Unlock className="w-3.5 h-3.5 mr-1.5" />
                      Unlock (Admin)
                    </Button>
                  )}
                </div>
              </div>

              {/* Live Ops */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Live Ops
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    className="bg-green-700 hover:bg-green-600 text-white"
                    onClick={handleStartSession}
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Start Session
                  </Button>
                  <Button
                    size="sm"
                    className="bg-teal-700 hover:bg-teal-600 text-white"
                    onClick={handleEndSession}
                  >
                    <Square className="w-3.5 h-3.5 mr-1.5" />
                    End Session
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-700 text-red-400 hover:bg-red-950 hover:text-red-200"
                    onClick={handleCancelSession}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    Cancel Session
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-700 hover:bg-red-600 text-white"
                    onClick={() => setRedFlagOpen(true)}
                  >
                    <Flag className="w-3.5 h-3.5 mr-1.5" />
                    Red Flag Log
                  </Button>
                </div>
              </div>

              {/* Announcer */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Announcer
                </div>
                <a
                  href={createPageUrl(`SessionProfile?id=${activeSession.id}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700 w-full"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open Session Profile
                  </Button>
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Red Flag Dialog */}
      <Dialog open={redFlagOpen} onOpenChange={setRedFlagOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Flag className="w-4 h-4" /> Red Flag Log
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-400">
              Add notes about this red flag. This will be logged in the Operation Log.
            </p>
            <Textarea
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 min-h-[80px]"
              placeholder="Notes (optional)…"
              value={redFlagNotes}
              onChange={(e) => setRedFlagNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-400"
              onClick={() => setRedFlagOpen(false)}
            >
              Cancel
            </Button>
            <Button className="bg-red-700 hover:bg-red-600 text-white" onClick={handleRedFlag}>
              Log Red Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generic confirm modal */}
      <Dialog
        open={!!confirmModal}
        onOpenChange={(open) => { if (!open) setConfirmModal(null); }}
      >
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              {confirmModal?.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-300 py-2">{confirmModal?.body}</p>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-400"
              onClick={() => setConfirmModal(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-yellow-700 hover:bg-yellow-600 text-white"
              onClick={() => {
                confirmModal?.onConfirm?.();
                setConfirmModal(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}