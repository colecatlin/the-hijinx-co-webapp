/**
 * RaceControlManager.jsx
 * Race Control tab — event ops, session state, incident log, audit summary.
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { REG_QK } from './queryKeys';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Radio,
  Play,
  CheckCircle2,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  ClipboardList,
  Clock,
  Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DQ = applyDefaultQueryOptions();

// ── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_STATUSES = ['Draft', 'Provisional', 'Official', 'Locked'];

const STATUS_COLORS = {
  Draft:       'bg-gray-700 text-gray-200',
  Provisional: 'bg-yellow-800 text-yellow-100',
  Official:    'bg-blue-800 text-blue-100',
  Locked:      'bg-purple-900 text-purple-100',
  scheduled:   'bg-slate-700 text-slate-200',
  in_progress: 'bg-green-800 text-green-100',
  completed:   'bg-teal-800 text-teal-100',
  cancelled:   'bg-red-900 text-red-200',
  Live:        'bg-green-800 text-green-100',
  Completed:   'bg-teal-800 text-teal-100',
};

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || 'bg-gray-700 text-gray-200';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{status}</span>;
}

function fmtTime(dt) {
  if (!dt) return '—';
  try { return format(new Date(dt), 'h:mm a'); } catch { return '—'; }
}

function fmtDateTime(dt) {
  if (!dt) return '—';
  try { return format(new Date(dt), 'MMM d, h:mm a'); } catch { return '—'; }
}

const INCIDENT_TYPES = ['On Track', 'Timing', 'Penalty', 'Safety', 'Other'];

// ── Main component ────────────────────────────────────────────────────────────

export default function RaceControlManager({
  selectedEvent,
  selectedSeries,
  selectedTrack,
  invalidateAfterOperation: invalidateProp,
  isAdmin,
  dashboardPermissions,
  currentUser,
}) {
  const queryClient = useQueryClient();
  const inv = invalidateProp || buildInvalidateAfterOperation(queryClient);

  const eventId = selectedEvent?.id || '';

  // Per-row dirty state: { [sessionId]: { status, locked } }
  const [rowEdits, setRowEdits] = useState({});
  const [saving, setSaving] = useState({}); // { [sessionId]: bool }
  const [eventSaving, setEventSaving] = useState(false);

  // Incident form
  const [incidentType, setIncidentType] = useState('On Track');
  const [incidentSession, setIncidentSession] = useState('');
  const [incidentMessage, setIncidentMessage] = useState('');
  const [incidentSaving, setIncidentSaving] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }, 'session_order', 500),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => base44.entities.EventClass.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: opLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['rc_op_logs', eventId],
    queryFn: () =>
      base44.entities.OperationLog.filter({ metadata: { event_id: eventId } }, '-created_date', 20),
    enabled: !!eventId,
    ...DQ,
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const classMap = useMemo(
    () => Object.fromEntries(eventClasses.map((c) => [c.id, c.class_name || c.id])),
    [eventClasses]
  );

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => (a.session_order ?? 0) - (b.session_order ?? 0)),
    [sessions]
  );

  const canMarkLive = isAdmin || ['entity_owner'].includes(currentUser?.role);

  // ── Row helpers ────────────────────────────────────────────────────────────

  function getRowVal(session, field) {
    return rowEdits[session.id]?.[field] ?? session[field];
  }

  function setRowVal(sessionId, field, value) {
    setRowEdits((prev) => ({
      ...prev,
      [sessionId]: { ...prev[sessionId], [field]: value },
    }));
  }

  // ── Log helper ────────────────────────────────────────────────────────────

  async function writeLog({ operation_type, metadata, status = 'success' }) {
    try {
      await base44.entities.OperationLog.create({
        operation_type,
        source_type: 'RaceControlManager',
        entity_name: 'Session',
        status,
        metadata,
      });
      queryClient.invalidateQueries({ queryKey: ['rc_op_logs', eventId] });
    } catch (_) {}
  }

  // ── Save session row ──────────────────────────────────────────────────────

  async function handleSaveRow(session) {
    const edits = rowEdits[session.id];
    if (!edits) return;

    const changedFields = Object.keys(edits).filter((k) => edits[k] !== session[k]);
    if (changedFields.length === 0) {
      toast.info('No changes to save.');
      return;
    }

    setSaving((p) => ({ ...p, [session.id]: true }));

    const updates = Object.fromEntries(changedFields.map((k) => [k, edits[k]]));
    const prevValues = Object.fromEntries(changedFields.map((k) => [k, session[k]]));

    await base44.entities.Session.update(session.id, updates);

    // Determine invalidation type
    const newStatus = edits.status ?? session.status;
    let invType = 'session_updated';
    if (newStatus === 'Official') invType = 'results_published';

    await writeLog({
      operation_type: 'session_updated',
      metadata: {
        event_id: eventId,
        session_id: session.id,
        session_name: session.name,
        changed_fields: changedFields,
        previous_values: prevValues,
        new_values: updates,
      },
    });

    inv(invType, { eventId });
    toast.success(`Session "${session.name}" saved.`);

    // Clear edits for this row
    setRowEdits((p) => { const n = { ...p }; delete n[session.id]; return n; });
    setSaving((p) => ({ ...p, [session.id]: false }));
  }

  // ── Reorder session ───────────────────────────────────────────────────────

  async function handleReorder(session, direction) {
    const idx = sortedSessions.findIndex((s) => s.id === session.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedSessions.length) return;

    const swapSession = sortedSessions[swapIdx];
    const aOrder = session.session_order ?? idx;
    const bOrder = swapSession.session_order ?? swapIdx;

    await Promise.all([
      base44.entities.Session.update(session.id, { session_order: bOrder }),
      base44.entities.Session.update(swapSession.id, { session_order: aOrder }),
    ]);

    await writeLog({
      operation_type: 'session_updated',
      metadata: {
        event_id: eventId,
        session_id: session.id,
        session_name: session.name,
        changed_fields: ['session_order'],
        previous_values: { session_order: aOrder },
        new_values: { session_order: bOrder },
      },
    });

    inv('session_updated', { eventId });
    queryClient.invalidateQueries({ queryKey: REG_QK.sessions(eventId) });
  }

  // ── Event status actions ──────────────────────────────────────────────────

  async function handleMarkEventStatus(newStatus) {
    if (!selectedEvent) return;
    setEventSaving(true);

    const prev = selectedEvent.status;
    await base44.entities.Event.update(selectedEvent.id, { status: newStatus });

    const invType = newStatus === 'Completed' || newStatus === 'completed'
      ? 'points_recalculated'
      : 'event_updated';

    await writeLog({
      operation_type: 'event_status_changed',
      metadata: {
        event_id: eventId,
        changed_fields: ['status'],
        previous_values: { status: prev },
        new_values: { status: newStatus },
      },
    });

    inv(invType, { eventId });
    toast.success(`Event marked ${newStatus}.`);
    setEventSaving(false);
  }

  // ── Incident log ──────────────────────────────────────────────────────────

  async function handleCreateIncident() {
    if (!incidentMessage.trim()) {
      toast.error('Please enter an incident message.');
      return;
    }
    setIncidentSaving(true);

    await base44.entities.OperationLog.create({
      operation_type: 'incident_logged',
      source_type: 'RaceControlManager',
      entity_name: 'Event',
      status: 'success',
      metadata: {
        event_id: eventId,
        session_id: incidentSession || undefined,
        incident_type: incidentType,
        message: incidentMessage.trim(),
      },
    });

    inv('operation_logged', { eventId });
    queryClient.invalidateQueries({ queryKey: ['rc_op_logs', eventId] });
    toast.success('Incident logged.');
    setIncidentMessage('');
    setIncidentSaving(false);
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <Radio className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Race Control</p>
          <p className="text-gray-400 text-sm">
            Select Track or Series, Season, and Event above to activate race control.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Event Summary Strip ─────────────────────────────────────────── */}
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-400" />
            <h2 className="text-lg font-bold text-white">{selectedEvent.name}</h2>
            <StatusBadge status={selectedEvent.status || 'upcoming'} />
          </div>
          <p className="text-xs text-gray-500">
            {selectedTrack?.name || '—'}
            {selectedEvent.event_date ? ` · ${selectedEvent.event_date}` : ''}
            {selectedEvent.round_number ? ` · Round ${selectedEvent.round_number}` : ''}
          </p>
        </div>

        {canMarkLive && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={eventSaving || selectedEvent.status === 'in_progress' || selectedEvent.status === 'Live'}
              onClick={() => handleMarkEventStatus('in_progress')}
              className="bg-green-700 hover:bg-green-600 text-white"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" /> Mark Event Live
            </Button>
            <Button
              size="sm"
              disabled={eventSaving || selectedEvent.status === 'completed' || selectedEvent.status === 'Completed'}
              onClick={() => handleMarkEventStatus('completed')}
              className="bg-teal-800 hover:bg-teal-700 text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark Completed
            </Button>
          </div>
        )}
      </div>

      {/* ── Sessions Panel ─────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sessionsLoading && (
            <div className="py-10 text-center text-sm text-gray-500">Loading sessions…</div>
          )}
          {!sessionsLoading && sortedSessions.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-gray-400 text-sm">No sessions found.</p>
              <p className="text-gray-600 text-xs mt-1">Create sessions in the Classes &amp; Sessions tab.</p>
            </div>
          )}
          {sortedSessions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-2 w-10">#</th>
                    <th className="text-left px-4 py-2">Class</th>
                    <th className="text-left px-4 py-2">Session</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Time</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-left px-4 py-2">Locked</th>
                    <th className="text-left px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {sortedSessions.map((session, idx) => {
                    const rowStatus = getRowVal(session, 'status');
                    const rowLocked = getRowVal(session, 'locked');
                    const isDirty = !!rowEdits[session.id];
                    const isSaving = !!saving[session.id];

                    return (
                      <tr key={session.id} className={`hover:bg-[#1e1e1e] ${isDirty ? 'bg-amber-950/10' : ''}`}>
                        {/* Order */}
                        <td className="px-4 py-2">
                          <div className="flex flex-col gap-0.5">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleReorder(session, 'up')}
                              className="p-0.5 text-gray-500 hover:text-white disabled:opacity-20"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              disabled={idx === sortedSessions.length - 1}
                              onClick={() => handleReorder(session, 'down')}
                              className="p-0.5 text-gray-500 hover:text-white disabled:opacity-20"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Class */}
                        <td className="px-4 py-2 text-gray-400 text-xs">
                          {classMap[session.event_class_id] || session.class_name || '—'}
                        </td>

                        {/* Session name */}
                        <td className="px-4 py-2 text-white font-medium">{session.name}</td>

                        {/* Type */}
                        <td className="px-4 py-2 text-gray-400 text-xs">{session.session_type}</td>

                        {/* Scheduled time */}
                        <td className="px-4 py-2 text-gray-500 text-xs">{fmtTime(session.scheduled_time)}</td>

                        {/* Status dropdown */}
                        <td className="px-4 py-2">
                          <Select
                            value={rowStatus || 'Draft'}
                            onValueChange={(v) => setRowVal(session.id, 'status', v)}
                            disabled={rowLocked && !isAdmin}
                          >
                            <SelectTrigger className="w-32 h-7 text-xs bg-[#262626] border-gray-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#262626] border-gray-700 text-white">
                              {SESSION_STATUSES.map((s) => (
                                <SelectItem key={s} value={s} className="text-white text-xs focus:bg-gray-700">
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Locked toggle */}
                        <td className="px-4 py-2">
                          <button
                            onClick={() => setRowVal(session.id, 'locked', !rowLocked)}
                            disabled={rowStatus === 'Locked' && !isAdmin}
                            className="p-1.5 rounded hover:bg-gray-700 transition-colors"
                            title={rowLocked ? 'Unlock session' : 'Lock session'}
                          >
                            {rowLocked
                              ? <Lock className="w-4 h-4 text-purple-400" />
                              : <Unlock className="w-4 h-4 text-gray-500 hover:text-gray-300" />}
                          </button>
                        </td>

                        {/* Save */}
                        <td className="px-4 py-2">
                          <Button
                            size="sm"
                            disabled={!isDirty || isSaving}
                            onClick={() => handleSaveRow(session)}
                            className="h-7 px-3 text-xs bg-blue-700 hover:bg-blue-600 text-white disabled:opacity-30"
                          >
                            {isSaving ? '…' : 'Save'}
                          </Button>
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

      {/* ── Incident Log Form ──────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-400" /> Log Incident
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Select value={incidentType} onValueChange={setIncidentType}>
              <SelectTrigger className="w-40 bg-[#262626] border-gray-700 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700 text-white">
                {INCIDENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-white focus:bg-gray-700">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={incidentSession} onValueChange={setIncidentSession}>
              <SelectTrigger className="w-48 bg-[#262626] border-gray-700 text-white text-sm">
                <SelectValue placeholder="Session (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700 text-white">
                <SelectItem value={null} className="text-gray-400 focus:bg-gray-700">No session</SelectItem>
                {sortedSessions.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-white focus:bg-gray-700">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea
            value={incidentMessage}
            onChange={(e) => setIncidentMessage(e.target.value)}
            placeholder="Describe the incident…"
            className="bg-[#262626] border-gray-700 text-white placeholder-gray-600 min-h-[80px]"
          />

          <Button
            onClick={handleCreateIncident}
            disabled={incidentSaving || !incidentMessage.trim()}
            className="bg-red-700 hover:bg-red-600 text-white"
          >
            {incidentSaving ? 'Logging…' : 'Create Incident'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Audit Summary ──────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" /> Recent Activity
            <span className="text-gray-600 font-normal text-xs">(last 20 ops)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logsLoading && (
            <div className="py-6 text-center text-sm text-gray-500">Loading logs…</div>
          )}
          {!logsLoading && opLogs.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-600">No activity logged yet.</div>
          )}
          {opLogs.length > 0 && (
            <div className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
              {opLogs.map((log) => (
                <div key={log.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertCircle className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-300 font-medium truncate">{log.operation_type}</p>
                      {log.metadata?.message && (
                        <p className="text-xs text-gray-500 truncate">{log.metadata.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={`text-xs px-1.5 py-0.5 ${
                        log.status === 'success'
                          ? 'bg-green-900/50 text-green-300'
                          : log.status === 'failed'
                          ? 'bg-red-900/50 text-red-300'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {log.status}
                    </Badge>
                    <span className="text-xs text-gray-600">{fmtDateTime(log.created_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}