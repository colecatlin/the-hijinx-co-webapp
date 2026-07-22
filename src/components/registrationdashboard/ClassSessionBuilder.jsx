import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Plus, Edit2, Copy, Trash2, Lock, LockOpen, ChevronUp, ChevronDown, Settings, Zap, Layers, ClipboardPaste,
} from 'lucide-react';
import { toast } from 'sonner';
import useDashboardMutation from './useDashboardMutation';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import { isSessionLocked } from './sessionLifecycle';
import { sortSessionsChronologically } from './ops/sessionOrdering';
import SchedulePasteImport from './SchedulePasteImport';

const EMPTY_CLASS_FORM = {
  class_name: '', series_class_id: '', max_entries: '', class_status: 'Open', class_order: '', notes: '',
};
const EMPTY_SESSION_FORM = {
  event_class_id: '', session_type: 'Practice', name: '', session_number: '',
  round_number: '', round_label: '', scheduled_time: '', duration_minutes: '', laps: '',
  run_order: '', input_source: 'Manual', status: 'Draft', advancement_rules: '',
  event_day_id: '', points_enabled: false, points_type: 'none', points_rule: '',
};

export default function ClassSessionBuilder({
  eventId,
  seriesId,
  selectedEvent,
  dashboardContext,
  invalidateAfterOperation: invalidateAfterOperationProp,
}) {
  const queryClient = useQueryClient();
  const invalidateAfterOperation = invalidateAfterOperationProp ?? buildInvalidateAfterOperation(queryClient);

  // ── Class dialog ──────────────────────────────────────────────────────────
  const [classDialog, setClassDialog] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classForm, setClassForm] = useState(EMPTY_CLASS_FORM);
  const [deleteClassConfirm, setDeleteClassConfirm] = useState(null);

  // ── Session dialog ────────────────────────────────────────────────────────
  const [sessionDialog, setSessionDialog] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION_FORM);
  const [lockConfirm, setLockConfirm] = useState(null);
  
  // ── Quick generate dialog ──────────────────────────────────────────────────
  const [quickGenDialog, setQuickGenDialog] = useState(null);
  const [heatInputs, setHeatInputs] = useState({ number_of_entries: '', cars_per_heat: '' });
  const [selectedClassForGen, setSelectedClassForGen] = useState(null);
  // Part 2 — optional date for quick-create generators
  const [quickGenDate, setQuickGenDate] = useState('');

  // ── Paste-to-Schedule import dialog ────────────────────────────────────────
  const [pasteImportOpen, setPasteImportOpen] = useState(false);

  const sharedOpts = {
    invalidateAfterOperation,
    dashboardContext: dashboardContext ?? { eventId },
    selectedEvent: selectedEvent ?? null,
  };

  // ── EventDays query ───────────────────────────────────────────────────────
  const { data: eventDays = [] } = useQuery({
    queryKey: ['eventDays', eventId],
    queryFn: () => base44.entities.EventDay.filter({ event_id: eventId }, 'sort_order', 50),
    enabled: !!eventId,
  });

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => base44.entities.EventClass.filter({ event_id: eventId }, 'class_order', 100),
    enabled: !!eventId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }, 'session_order', 500),
    enabled: !!eventId,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => seriesId ? base44.entities.SeriesClass.filter({ series_id: seriesId }) : Promise.resolve([]),
    enabled: !!seriesId,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const { data: eventResults = [] } = useQuery({
    queryKey: ['results', eventId],
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const sessionHasResults = (sessionId) => eventResults.some((r) => r.session_id === sessionId);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutateAsync: createEventClass, isPending: creatingClass } = useDashboardMutation({
    operationType: 'event_class_created', entityName: 'EventClass',
    mutationFn: (data) => base44.entities.EventClass.create(data),
    successMessage: 'Class created', ...sharedOpts,
  });
  const { mutateAsync: updateEventClass, isPending: updatingClass } = useDashboardMutation({
    operationType: 'event_class_updated', entityName: 'EventClass',
    mutationFn: ({ id, data }) => base44.entities.EventClass.update(id, data),
    successMessage: 'Class updated', ...sharedOpts,
  });
  const { mutateAsync: deleteEventClass } = useDashboardMutation({
    operationType: 'event_class_deleted', entityName: 'EventClass',
    mutationFn: (id) => base44.entities.EventClass.delete(id),
    successMessage: 'Class deleted', ...sharedOpts,
  });
  const { mutateAsync: createSession, isPending: creatingSession } = useDashboardMutation({
    operationType: 'session_created', entityName: 'Session',
    mutationFn: (data) => base44.entities.Session.create(data),
    successMessage: 'Session created', ...sharedOpts,
  });
  const { mutateAsync: updateSession } = useDashboardMutation({
    operationType: 'session_updated', entityName: 'Session',
    mutationFn: ({ id, data }) => base44.entities.Session.update(id, data),
    successMessage: 'Session updated', ...sharedOpts,
  });
  const { mutateAsync: deleteSession } = useDashboardMutation({
    operationType: 'session_deleted', entityName: 'Session',
    mutationFn: (id) => base44.entities.Session.delete(id),
    successMessage: 'Session deleted', ...sharedOpts,
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const entriesByClass = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (e.event_class_id) map[e.event_class_id] = (map[e.event_class_id] || 0) + 1;
    });
    return map;
  }, [entries]);

  const classGroups = useMemo(() => {
    const groups = {};
    eventClasses.forEach((ec) => { groups[ec.id] = { ...ec, sessions: [] }; });
    sessions.forEach((s) => {
      if (s.event_class_id && groups[s.event_class_id]) {
        groups[s.event_class_id].sessions.push(s);
      }
    });
    return Object.values(groups).sort((a, b) => (a.class_order || 0) - (b.class_order || 0));
  }, [eventClasses, sessions]);

  // ── Class handlers ────────────────────────────────────────────────────────
  const openAddClass = () => {
    setEditingClass(null);
    const nextOrder = eventClasses.length ? Math.max(...eventClasses.map((ec) => ec.class_order || 0)) + 1 : 1;
    setClassForm({ ...EMPTY_CLASS_FORM, class_order: String(nextOrder) });
    setClassDialog(true);
  };

  const openEditClass = (ec) => {
    setEditingClass(ec);
    setClassForm({
      class_name: ec.class_name || '',
      series_class_id: ec.series_class_id || '',
      max_entries: ec.max_entries != null ? String(ec.max_entries) : '',
      class_status: ec.class_status || 'Open',
      class_order: ec.class_order != null ? String(ec.class_order) : '0',
      notes: ec.notes || '',
    });
    setClassDialog(true);
  };

  const handleSaveClass = async () => {
    if (!classForm.class_name.trim()) { toast.error('Class name required'); return; }
    const payload = {
      event_id: eventId,
      class_name: classForm.class_name.trim(),
      series_class_id: classForm.series_class_id || undefined,
      max_entries: classForm.max_entries ? Number(classForm.max_entries) : undefined,
      class_status: classForm.class_status,
      class_order: classForm.class_order !== '' ? Number(classForm.class_order) : 0,
      notes: classForm.notes || undefined,
    };
    if (editingClass) {
      await updateEventClass({ id: editingClass.id, data: payload });
    } else {
      await createEventClass(payload);
    }
    setClassDialog(false);
  };

  const handleDeleteClass = async (id) => {
    const count = entriesByClass[id] || 0;
    if (count > 0) {
      toast.error(`Cannot delete — ${count} entr${count === 1 ? 'y' : 'ies'} assigned to this class`);
      setDeleteClassConfirm(null);
      return;
    }
    await deleteEventClass(id);
    setDeleteClassConfirm(null);
  };

  // ── Import series classes ─────────────────────────────────────────────────
  // When the event has a series attached, bulk-create EventClass records for
  // each SeriesClass not already linked, so they become available as session
  // options without having to be re-entered manually.
  const importSeriesClasses = async () => {
    const linkedIds = new Set(eventClasses.map((ec) => ec.series_class_id).filter(Boolean));
    const baseOrder = eventClasses.length
      ? Math.max(...eventClasses.map((ec) => ec.class_order || 0))
      : 0;
    const toCreate = seriesClasses
      .filter((sc) => !linkedIds.has(sc.id))
      .map((sc, i) => ({
        event_id: eventId,
        class_name: sc.class_name,
        series_class_id: sc.id,
        class_status: 'Open',
        class_order: sc.sort_order != null ? sc.sort_order : baseOrder + i + 1,
      }));
    if (toCreate.length === 0) {
      toast.info('All series classes already added to this event');
      return;
    }
    try {
      await base44.entities.EventClass.bulkCreate(toCreate);
      await invalidateAfterOperation('event_class_created', { eventId });
      toast.success(`Imported ${toCreate.length} class${toCreate.length === 1 ? '' : 'es'} from series`);
    } catch (err) {
      toast.error('Failed to import series classes');
    }
  };

  // ── Session handlers ──────────────────────────────────────────────────────
  const openAddSession = (classGroup) => {
    setEditingSession(null);
    const nextRunOrder = sessions.length ? Math.max(...sessions.map((s) => s.run_order || 0)) + 1 : 0;
    setSessionForm({
      ...EMPTY_SESSION_FORM,
      event_class_id: classGroup.id,
      run_order: String(nextRunOrder),
    });
    setSessionDialog(true);
  };

  const openEditSession = (session) => {
    setEditingSession(session);
    setSessionForm({
      event_class_id: session.event_class_id || '',
      session_type: session.session_type,
      name: session.name,
      session_number: session.session_number != null ? String(session.session_number) : '',
      round_number: session.round_number != null ? String(session.round_number) : '',
      round_label: session.round_label || '',
      scheduled_time: session.scheduled_time ? String(session.scheduled_time).slice(11, 16) : '',
      duration_minutes: session.duration_minutes != null ? String(session.duration_minutes) : '',
      laps: session.laps != null ? String(session.laps) : '',
      run_order: session.run_order != null ? String(session.run_order) : '',
      input_source: session.input_source || 'Manual',
      status: session.status || 'Draft',
      advancement_rules: session.advancement_rules || '',
      event_day_id: session.event_day_id || '',
      points_enabled: session.points_enabled || false,
      points_type: session.points_type || 'none',
      points_rule: session.points_rule || '',
    });
    setSessionDialog(true);
  };

  // Derive points fields from session_type when saving
  const derivePointsFields = (form) => {
    const type = form.session_type;
    if (!form.points_enabled || type === 'Practice' || type === 'Heat' || type === 'LCQ' || type === 'Time Attack') {
      return { points_enabled: false, points_type: 'none', points_rule: null, round_number: null };
    }
    if (type === 'Qualifying') {
      return {
        points_enabled: true,
        points_type: 'qualifying',
        points_rule: form.points_rule || 'top_2_qualifying',
        round_number: null,
      };
    }
    // Final / Feature
    return {
      points_enabled: true,
      points_type: 'final',
      points_rule: form.points_rule || 'standard_final',
      round_number: form.round_number ? Number(form.round_number) : null,
    };
  };

  const handleSaveSession = async () => {
    if (!sessionForm.name.trim()) { toast.error('Session name required'); return; }
    if (!sessionForm.event_class_id) { toast.error('Select a class'); return; }
    const pointsFields = derivePointsFields(sessionForm);
    // Guard: lifecycle statuses (Official/Locked) must go through updateSessionStatus state machine
    const safeStatus = ['Official', 'Locked'].includes(sessionForm.status)
      ? (editingSession?.status || 'Draft')
      : sessionForm.status;

    // Reconstruct full datetime: time-of-day combined with the selected Event Day's date
    // (falls back to the event's start date, then today) so storage stays a valid date-time.
    let scheduledTime = undefined;
    if (sessionForm.scheduled_time) {
      const dayId = sessionForm.event_day_id;
      const dayRecord = dayId ? eventDays.find((d) => d.id === dayId) : null;
      const baseDate = dayRecord?.date || selectedEvent?.event_date || new Date().toISOString().slice(0, 10);
      scheduledTime = `${baseDate}T${String(sessionForm.scheduled_time).padStart(5, '0').slice(0, 5)}:00`;
    }

    const payload = {
      event_id: eventId,
      event_class_id: sessionForm.event_class_id,
      event_day_id: sessionForm.event_day_id || undefined,
      session_type: sessionForm.session_type,
      name: sessionForm.name.trim(),
      session_number: sessionForm.session_number ? Number(sessionForm.session_number) : undefined,
      scheduled_time: scheduledTime,
      duration_minutes: sessionForm.duration_minutes ? Number(sessionForm.duration_minutes) : undefined,
      laps: sessionForm.laps ? Number(sessionForm.laps) : undefined,
      run_order: sessionForm.run_order !== ''
        ? Number(sessionForm.run_order)
        : editingSession
          ? editingSession.run_order
          : (sessions.length ? Math.max(...sessions.map((s) => s.run_order || 0)) + 1 : 0),
      input_source: sessionForm.input_source,
      status: safeStatus,
      advancement_rules: sessionForm.advancement_rules || undefined,
      round_label: sessionForm.round_label || undefined,
      ...pointsFields,
    };
    if (editingSession) {
      await updateSession({ id: editingSession.id, data: payload });
    } else {
      await createSession(payload);
    }
    setSessionDialog(false);
  };

  const handleDuplicate = (session) => {
    const maxOrder = sessions.length ? Math.max(...sessions.map((s) => s.run_order || 0)) + 1 : 0;
    createSession({
      event_id: eventId,
      event_class_id: session.event_class_id,
      session_type: session.session_type,
      name: `${session.name} Copy`,
      session_number: session.session_number,
      round_number: session.round_number,
      laps: session.laps,
      duration_minutes: session.duration_minutes,
      input_source: 'Manual',
      status: 'Draft',
      run_order: maxOrder,
    });
  };

  const handleMove = (session, direction, classGroup) => {
    const sorted = [...classGroup.sessions].sort((a, b) => (a.run_order || 0) - (b.run_order || 0));
    const idx = sorted.findIndex((s) => s.id === session.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    Promise.all([
      updateSession({ id: session.id, data: { run_order: swap.run_order || 0 } }),
      updateSession({ id: swap.id, data: { run_order: session.run_order || 0 } }),
    ]);
  };

  const handleToggleLock = async (session) => {
    const newStatus = session.status === 'Locked' ? 'Draft' : 'Locked';
    try {
      // Route through updateSessionStatus state machine (validates transition, logs, syncs results)
      const res = await base44.functions.invoke('updateSessionStatus', {
        session_id: session.id,
        new_status: newStatus,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      await invalidateAfterOperation('session_status_changed', {
        eventId: session.event_id,
        sessionId: session.id,
      });
      toast.success(`Session ${newStatus === 'Locked' ? 'locked' : 'unlocked'}`);
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    }
    setLockConfirm(null);
  };

  const isLocked = (s) => isSessionLocked(s);

  const statusBadge = (s) => {
    if (s === 'Open') return 'bg-green-500/20 text-green-400';
    if (s === 'Full') return 'bg-yellow-500/20 text-yellow-400';
    if (s === 'Closed') return 'bg-red-500/20 text-red-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  const generateSessions = async (type, classGroupId) => {
    const classGroup = classGroups.find(cg => cg.id === classGroupId);
    if (!classGroup) { toast.error('Class not found'); return; }

    const maxRunOrder = sessions.length ? Math.max(...sessions.map((s) => s.run_order || 0)) + 1 : 0;
    let sessionsToCreate = [];

    // quickGenDate now holds an EventDay ID (not a date string)
    const selectedDayId = quickGenDate || undefined;
    const selectedDayRecord = selectedDayId ? eventDays.find(d => d.id === selectedDayId) : null;
    const scheduledTime = selectedDayRecord ? `${selectedDayRecord.date}T12:00` : undefined;

    if (type === 'heats') {
      const entries = heatInputs.number_of_entries ? Number(heatInputs.number_of_entries) : 0;
      const perHeat = heatInputs.cars_per_heat ? Number(heatInputs.cars_per_heat) : 1;
      const numHeats = Math.ceil(entries / perHeat);
      if (numHeats <= 0) { toast.error('Invalid heat configuration'); return; }
      for (let i = 1; i <= numHeats; i++) {
        sessionsToCreate.push({
          event_id: eventId,
          event_class_id: classGroupId,
          series_class_id: classGroup.series_class_id,
          event_day_id: selectedDayId,
          session_type: 'Heat',
          name: `Heat ${i}`,
          session_number: i,
          scheduled_time: scheduledTime,
          input_source: 'Manual',
          status: 'Draft',
          run_order: maxRunOrder + i - 1,
          points_enabled: false,
          points_type: 'none',
        });
      }
    } else {
      const sessionTypeMap = {
        practice: { session_type: 'Practice', name: 'Practice' },
        qualifying: { session_type: 'Qualifying', name: 'Qualifying' },
        lcq: { session_type: 'LCQ', name: 'LCQ' },
        feature: { session_type: 'Feature', name: 'Feature' },
      };
      const config = sessionTypeMap[type];
      if (config) {
        const isPtsType = config.session_type === 'Feature';
        sessionsToCreate.push({
          event_id: eventId,
          event_class_id: classGroupId,
          series_class_id: classGroup.series_class_id,
          event_day_id: selectedDayId,
          session_type: config.session_type,
          name: config.name,
          scheduled_time: scheduledTime,
          input_source: 'Manual',
          status: 'Draft',
          run_order: maxRunOrder,
          points_enabled: isPtsType,
          points_type: isPtsType ? 'final' : 'none',
        });
      }
    }

    try {
      await Promise.all(sessionsToCreate.map((s) => createSession(s)));
      toast.success(`${sessionsToCreate.length} session${sessionsToCreate.length === 1 ? '' : 's'} created`);
      setQuickGenDialog(null);
      setHeatInputs({ number_of_entries: '', cars_per_heat: '' });
      setQuickGenDate('');
    } catch (err) {
      toast.error('Failed to create sessions');
    }
  };

  if (!eventId) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to manage classes and sessions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white">Classes &amp; Sessions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Define classes, then build sessions under each class.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {seriesId && seriesClasses.length > 0 && (
            <Button
              onClick={importSeriesClasses}
              disabled={creatingClass}
              variant="outline"
              size="sm"
              className="border-teal-700 text-teal-300 hover:bg-teal-900/30"
              title="Create event classes from this series' class definitions"
            >
              <Layers className="w-4 h-4 mr-1" /> Import Series Classes
            </Button>
          )}
          <Button
            onClick={() => setPasteImportOpen(true)}
            variant="outline"
            size="sm"
            className="border-teal-700 text-teal-300 hover:bg-teal-900/30"
            title="Paste a full schedule and bulk-create sessions"
          >
            <ClipboardPaste className="w-4 h-4 mr-1" /> Paste Schedule
          </Button>
          <Button onClick={openAddClass} disabled={creatingClass} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Class
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {classGroups.length === 0 && (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-gray-400 text-sm">No classes defined for this event yet</p>
            <Button onClick={openAddClass} disabled={creatingClass} variant="outline" size="sm" className="border-gray-700 text-gray-300">
              <Plus className="w-3 h-3 mr-1" /> Add First Class
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Accordion */}
      {classGroups.length > 0 && (
        <Accordion type="multiple" defaultValue={classGroups.map((cg) => cg.id)} className="space-y-2">
          {classGroups.map((cg) => {
            const hasLocked = cg.sessions.some(isLocked);
            const entryCount = entriesByClass[cg.id] || 0;
            const isFull = cg.max_entries && entryCount >= cg.max_entries;
            // Part 3: use shared sort for consistency with all other Ops views
            const sortedSessions = sortSessionsChronologically(cg.sessions);

            return (
              <AccordionItem key={cg.id} value={cg.id} className="bg-[#171717] border border-gray-800 rounded-lg overflow-hidden">
                <AccordionTrigger className="hover:bg-gray-800/50 px-4 py-3 [&>svg]:hidden">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white">{cg.class_name}</h3>
                        <Badge className={`text-xs ${statusBadge(cg.class_status)}`}>{cg.class_status || 'Open'}</Badge>
                        {hasLocked && <Badge className="text-xs bg-yellow-900/40 text-yellow-300"><Lock className="w-3 h-3 mr-1 inline" />Locked</Badge>}
                        {isFull && <Badge className="text-xs bg-orange-900/40 text-orange-300">Full</Badge>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {entryCount}{cg.max_entries ? `/${cg.max_entries}` : ''} entr{entryCount === 1 ? 'y' : 'ies'} · {sortedSessions.length} session{sortedSessions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEditClass(cg)} className="p-1.5 hover:bg-gray-700 rounded transition-colors" title="Edit class">
                        <Settings className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button
                        onClick={() => setDeleteClassConfirm(cg.id)}
                        className="p-1.5 hover:bg-red-900/30 rounded transition-colors"
                        title={entryCount > 0 ? `${entryCount} entries — cannot delete` : 'Delete class'}
                      >
                        <Trash2 className={`w-3.5 h-3.5 ${entryCount > 0 ? 'text-gray-600' : 'text-red-400'}`} />
                      </button>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 py-4 border-t border-gray-800">
                  {sortedSessions.length === 0 ? (
                    <div className="text-center py-4 space-y-3">
                      <p className="text-xs text-gray-500">No sessions in this class</p>
                      {/* Event Day selector for quick-gen */}
                      {eventDays.length > 0 && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 whitespace-nowrap">Assign to Day:</label>
                          <Select value={quickGenDate || '__none'} onValueChange={(v) => setQuickGenDate(v === '__none' ? '' : v)}>
                            <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white text-xs h-7 w-40"><SelectValue placeholder="No day" /></SelectTrigger>
                            <SelectContent className="bg-[#262626] border-gray-700">
                              <SelectItem value="__none">No day</SelectItem>
                              {[...eventDays].sort((a,b) => (a.sort_order||0)-(b.sort_order||0)).map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.label} — {d.date}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button onClick={() => generateSessions('practice', cg.id)} variant="outline" size="sm" className="border-gray-700 text-gray-300 text-xs">
                          <Zap className="w-3 h-3 mr-1" /> Practice
                        </Button>
                        <Button onClick={() => generateSessions('qualifying', cg.id)} variant="outline" size="sm" className="border-gray-700 text-gray-300 text-xs">
                          <Zap className="w-3 h-3 mr-1" /> Qualifying
                        </Button>
                        <Button onClick={() => { setSelectedClassForGen(cg.id); setQuickGenDialog('heats'); }} variant="outline" size="sm" className="border-gray-700 text-gray-300 text-xs">
                          <Zap className="w-3 h-3 mr-1" /> Heats
                        </Button>
                        <Button onClick={() => generateSessions('lcq', cg.id)} variant="outline" size="sm" className="border-gray-700 text-gray-300 text-xs">
                          <Zap className="w-3 h-3 mr-1" /> LCQ
                        </Button>
                        <Button onClick={() => generateSessions('feature', cg.id)} variant="outline" size="sm" className="border-gray-700 text-gray-300 text-xs">
                          <Zap className="w-3 h-3 mr-1" /> Feature 🏆
                        </Button>
                      </div>
                      <Button onClick={() => openAddSession(cg)} variant="outline" size="sm" className="border-gray-700 text-gray-300 w-full">
                        <Plus className="w-3 h-3 mr-1" /> Add Session
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                       {sortedSessions.map((session) => {
                         const sessionDay = eventDays.find(d => d.id === session.event_day_id);
                         let dayWeekday = '';
                         try { if (sessionDay) dayWeekday = format(parseISO(sessionDay.date), 'EEE'); } catch {}
                         return (
                         <div
                           key={session.id}
                           className={`p-3 rounded-lg border transition-colors ${
                             isLocked(session) ? 'bg-gray-800/20 border-gray-700 opacity-60' : 'bg-gray-800/40 border-gray-700 hover:bg-gray-700/50'
                           }`}
                         >
                           <div className="flex items-center justify-between gap-3">
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 flex-wrap">
                               <span className="text-[10px] font-mono text-gray-600">#{session.run_order || '0'}</span>
                               <p className="font-medium text-white text-sm">{session.name}</p>
                               <Badge className="bg-purple-500/20 text-purple-400 text-xs">{session.session_type}</Badge>
                               {(session.session_type === 'Feature' || session.session_type === 'Final') && (
                                 <Badge className="bg-amber-900/40 text-amber-300 text-xs">
                                   🏆 {session.round_number ? `Round ${session.round_number}` : 'Final'}
                                 </Badge>
                               )}
                               {session.points_enabled && session.points_type === 'qualifying' && (
                                 <Badge className="bg-blue-900/40 text-blue-300 text-xs">⬆ Qual Pts</Badge>
                               )}
                             </div>
                             <div className="flex items-center gap-2 mt-0.5">
                               {sessionDay ? (
                                 <span className="text-[9px] font-mono text-teal-700">{dayWeekday} · {sessionDay.label}</span>
                               ) : (
                                 <span className="text-[9px] font-mono text-gray-700">No day assigned</span>
                               )}
                               {session.scheduled_time && (
                                 <span className="text-[9px] font-mono text-gray-600">
                                   {new Date(session.scheduled_time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                                 </span>
                               )}
                               {session.duration_minutes && (
                                 <span className="text-[9px] font-mono text-gray-600">{session.duration_minutes}m</span>
                               )}
                             </div>
                           </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {!isLocked(session) && <>
                              <button onClick={() => handleMove(session, 'up', cg)} className="p-1 hover:bg-gray-600 rounded" title="Move up"><ChevronUp className="w-3 h-3 text-gray-400" /></button>
                              <button onClick={() => handleMove(session, 'down', cg)} className="p-1 hover:bg-gray-600 rounded" title="Move down"><ChevronDown className="w-3 h-3 text-gray-400" /></button>
                              <button onClick={() => openEditSession(session)} className="p-1 hover:bg-gray-600 rounded" title="Edit"><Edit2 className="w-3 h-3 text-gray-400" /></button>
                              <button onClick={() => handleDuplicate(session)} className="p-1 hover:bg-gray-600 rounded" title="Duplicate"><Copy className="w-3 h-3 text-gray-400" /></button>
                            </>}
                            {sessionHasResults(session.id) ? (
                              <button
                                className="p-1 rounded opacity-30 cursor-not-allowed"
                                title="Use the Results tab to lock sessions that already have results so result publishing and lifecycle states stay in sync."
                                disabled
                              >
                                <Lock className="w-3 h-3 text-gray-500" />
                              </button>
                            ) : (
                              <button onClick={() => setLockConfirm(session.id)} className="p-1 hover:bg-gray-600 rounded" title={isLocked(session) ? 'Unlock' : 'Lock'}>
                                {isLocked(session) ? <LockOpen className="w-3 h-3 text-yellow-400" /> : <Lock className="w-3 h-3 text-gray-400" />}
                              </button>
                            )}
                            {!isLocked(session) && session.status === 'Draft' && (
                              <button onClick={() => deleteSession(session.id)} className="p-1 hover:bg-red-900/30 rounded" title="Delete"><Trash2 className="w-3 h-3 text-red-400" /></button>
                            )}
                          </div>
                        </div>
                        </div>
                        );
                        })}
                        <Button onClick={() => openAddSession(cg)} variant="outline" size="sm" className="w-full border-gray-700 text-gray-300 mt-2">
                        <Plus className="w-3 h-3 mr-1" /> Add Session
                      </Button>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* ── Add/Edit Class Dialog ─────────────────────────────────────────── */}
      <Dialog open={classDialog} onOpenChange={setClassDialog}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editingClass ? 'Edit Class' : 'Add Class'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Class Name *</label>
              <Input value={classForm.class_name} onChange={(e) => setClassForm({ ...classForm, class_name: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="e.g. Pro Stock" />
            </div>
            {seriesClasses.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Linked Series Class (optional)</label>
                <Select value={classForm.series_class_id || '__none'} onValueChange={(v) => setClassForm({ ...classForm, series_class_id: v === '__none' ? '' : v })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value="__none">None</SelectItem>
                    {seriesClasses.map((sc) => <SelectItem key={sc.id} value={sc.id}>{sc.class_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Max Entries</label>
                <Input type="number" value={classForm.max_entries} onChange={(e) => setClassForm({ ...classForm, max_entries: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="Unlimited" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Display Order</label>
                <Input type="number" value={classForm.class_order} onChange={(e) => setClassForm({ ...classForm, class_order: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Status</label>
              <Select value={classForm.class_status} onValueChange={(v) => setClassForm({ ...classForm, class_status: v })}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Full">Full</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Notes</label>
              <Textarea value={classForm.notes} onChange={(e) => setClassForm({ ...classForm, notes: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" rows={2} placeholder="Optional admin notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialog(false)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button onClick={handleSaveClass} disabled={creatingClass || updatingClass} className="bg-blue-600 hover:bg-blue-700">
              {editingClass ? 'Update Class' : 'Create Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Session Dialog ────────────────────────────────────────── */}
      <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{editingSession ? 'Edit Session' : 'Add Session'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Row 1: Class + Day */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Class *</label>
                <Select value={sessionForm.event_class_id || ''} onValueChange={(v) => setSessionForm({ ...sessionForm, event_class_id: v })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue placeholder="Select class…" /></SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {eventClasses.map((ec) => <SelectItem key={ec.id} value={ec.id}>{ec.class_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Event Day</label>
                <Select value={sessionForm.event_day_id || '__none'} onValueChange={(v) => setSessionForm({ ...sessionForm, event_day_id: v === '__none' ? '' : v })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue placeholder="No day assigned" /></SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value="__none">No day assigned</SelectItem>
                    {[...eventDays].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((d) => {
                      let wd = '';
                      try { wd = format(parseISO(d.date), 'EEE'); } catch {}
                      return <SelectItem key={d.id} value={d.id}>{wd} {d.date}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                {eventDays.length === 0 && (
                  <p className="text-[10px] text-gray-600 mt-0.5">Generate event days in Settings to enable day assignment.</p>
                )}
              </div>
            </div>

            {/* Row 2: Session Type + Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Session Type</label>
                <Select
                  value={sessionForm.session_type}
                  onValueChange={(v) => {
                    // Auto-set points defaults based on type
                    const isPracticeOrHeat = ['Practice', 'Heat', 'LCQ', 'Time Attack', 'Other'].includes(v);
                    const isQual = v === 'Qualifying';
                    const isFinal = v === 'Final' || v === 'Feature';
                    setSessionForm(prev => ({
                      ...prev,
                      session_type: v,
                      points_enabled: isFinal || isQual ? prev.points_enabled : false,
                      points_type: isFinal ? 'final' : isQual ? 'qualifying' : 'none',
                      round_number: isFinal ? prev.round_number : '',
                    }));
                  }}
                >
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {['Practice', 'Qualifying', 'Heat', 'LCQ', 'Feature', 'Final', 'Time Attack', 'Other'].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t === 'Final' || t === 'Feature' ? `${t} 🏆` : t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Session Name *</label>
                <Input value={sessionForm.name} onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="e.g. Heat 1, Final" />
              </div>
            </div>

            {/* Points section */}
            <div className="p-3 bg-[#111518] border border-gray-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Points Settings</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-400">Points Active</span>
                  <button
                    type="button"
                    onClick={() => setSessionForm(prev => ({
                      ...prev,
                      points_enabled: !prev.points_enabled,
                      points_type: !prev.points_enabled
                        ? (prev.session_type === 'Qualifying' ? 'qualifying' : prev.session_type === 'Final' || prev.session_type === 'Feature' ? 'final' : 'none')
                        : 'none',
                    }))}
                    className={`w-9 h-5 rounded-full transition-colors ${sessionForm.points_enabled ? 'bg-teal-600' : 'bg-gray-700'}`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${sessionForm.points_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </label>
              </div>

              {sessionForm.points_enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase block mb-1">Points Type</label>
                    <Select
                      value={sessionForm.points_type}
                      onValueChange={(v) => setSessionForm({ ...sessionForm, points_type: v })}
                    >
                      <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#262626] border-gray-700">
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="qualifying">Qualifying</SelectItem>
                        <SelectItem value="final">Final (Championship)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {sessionForm.points_type === 'final' && (
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase block mb-1">Round #</label>
                      <Input
                        type="number"
                        value={sessionForm.round_number}
                        onChange={(e) => setSessionForm({ ...sessionForm, round_number: e.target.value })}
                        className="bg-[#1A1A1A] border-gray-700 text-white text-xs h-8"
                        placeholder="1, 2, 3…"
                        min="1"
                      />
                    </div>
                  )}
                  {sessionForm.points_type === 'final' && (
                    <div className="col-span-2">
                      <label className="text-[10px] text-gray-500 uppercase block mb-1">Round Label (optional)</label>
                      <Input
                        value={sessionForm.round_label}
                        onChange={(e) => setSessionForm({ ...sessionForm, round_label: e.target.value })}
                        className="bg-[#1A1A1A] border-gray-700 text-white text-xs h-8"
                        placeholder="e.g. Saturday Final"
                      />
                    </div>
                  )}
                </div>
              )}
              {!sessionForm.points_enabled && (
                <p className="text-[10px] text-gray-600">
                  {['Practice', 'Heat', 'LCQ'].includes(sessionForm.session_type)
                    ? 'Practice / Heat sessions do not award points.'
                    : 'Enable to award championship or qualifying points for this session.'}
                </p>
              )}
            </div>

            {/* Timing / logistics */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Scheduled Time</label>
                <Input type="time" value={sessionForm.scheduled_time} onChange={(e) => setSessionForm({ ...sessionForm, scheduled_time: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Duration (min)</label>
                <Input type="number" value={sessionForm.duration_minutes} onChange={(e) => setSessionForm({ ...sessionForm, duration_minutes: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Laps</label>
                <Input type="number" value={sessionForm.laps} onChange={(e) => setSessionForm({ ...sessionForm, laps: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="Unlimited" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Session #</label>
                <Input type="number" value={sessionForm.session_number} onChange={(e) => setSessionForm({ ...sessionForm, session_number: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Run Order</label>
                <Input type="number" value={sessionForm.run_order} onChange={(e) => setSessionForm({ ...sessionForm, run_order: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="Auto" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Status</label>
                <Select value={sessionForm.status} onValueChange={(v) => setSessionForm({ ...sessionForm, status: v })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Provisional">Provisional</SelectItem>
                    {/* Official and Locked transitions must use the state machine (lock button / Results tab) */}
                  </SelectContent>
                </Select>
                {(sessionForm.status === 'Official' || sessionForm.status === 'Locked') && (
                  <p className="text-[10px] text-amber-500 mt-1">
                    Official/Locked — use the Results tab or lock button to manage this transition.
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Advancement Rules</label>
              <Textarea value={sessionForm.advancement_rules} onChange={(e) => setSessionForm({ ...sessionForm, advancement_rules: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="Optional" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionDialog(false)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button onClick={handleSaveSession} disabled={creatingSession} className="bg-blue-600 hover:bg-blue-700">
              {editingSession ? 'Update Session' : 'Create Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Class Confirm ──────────────────────────────────────────── */}
      <AlertDialog open={!!deleteClassConfirm} onOpenChange={(o) => !o && setDeleteClassConfirm(null)}>
        <AlertDialogContent className="bg-[#262626] border-gray-700">
          <AlertDialogTitle className="text-white">Delete Class</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {(entriesByClass[deleteClassConfirm] || 0) > 0
              ? `This class has ${entriesByClass[deleteClassConfirm]} entr${entriesByClass[deleteClassConfirm] === 1 ? 'y' : 'ies'}. Remove them first.`
              : 'This will permanently delete this class and all its sessions.'}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
            {(entriesByClass[deleteClassConfirm] || 0) === 0 && (
              <AlertDialogAction onClick={() => handleDeleteClass(deleteClassConfirm)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Lock Confirm ─────────────────────────────────────────────────── */}
      <AlertDialog open={!!lockConfirm} onOpenChange={(o) => !o && setLockConfirm(null)}>
        <AlertDialogContent className="bg-[#262626] border-gray-700">
          <AlertDialogTitle className="text-white">
            {sessions.find((s) => s.id === lockConfirm)?.status === 'Locked' ? 'Unlock Session' : 'Lock Session'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {sessions.find((s) => s.id === lockConfirm)?.status === 'Locked'
              ? 'Unlock to allow editing again.'
              : 'Locking prevents all edits to this session.'}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { const s = sessions.find((s) => s.id === lockConfirm); if (s) handleToggleLock(s); }}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Confirm
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Paste-to-Schedule Import Dialog ─────────────────────────────────── */}
      <SchedulePasteImport
        open={pasteImportOpen}
        onOpenChange={setPasteImportOpen}
        eventId={eventId}
        seriesId={seriesId}
        eventDays={eventDays}
        eventClasses={eventClasses}
        seriesClasses={seriesClasses}
        selectedEventDate={selectedEvent?.event_date || selectedEvent?.start_date || null}
        invalidateAfterOperation={invalidateAfterOperation}
      />

      {/* ── Heat Generator Dialog ──────────────────────────────────────────── */}
      <Dialog open={quickGenDialog === 'heats'} onOpenChange={(o) => !o && setQuickGenDialog(null)}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Generate Heats</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Number of Entries</label>
              <Input type="number" value={heatInputs.number_of_entries} onChange={(e) => setHeatInputs({ ...heatInputs, number_of_entries: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="e.g. 18" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Cars Per Heat</label>
              <Input type="number" value={heatInputs.cars_per_heat} onChange={(e) => setHeatInputs({ ...heatInputs, cars_per_heat: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="e.g. 8" />
            </div>
                    <div>
              <label className="text-xs text-gray-400 block mb-1">Event Day (optional)</label>
              <Select value={quickGenDate || '__none'} onValueChange={(v) => setQuickGenDate(v === '__none' ? '' : v)}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white text-xs"><SelectValue placeholder="No day" /></SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="__none">No day</SelectItem>
                  {[...eventDays].sort((a,b) => (a.sort_order||0)-(b.sort_order||0)).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.label} — {d.date}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-gray-500">
              {heatInputs.number_of_entries && heatInputs.cars_per_heat
                ? `Will create ${Math.ceil(Number(heatInputs.number_of_entries) / Number(heatInputs.cars_per_heat))} heat${Math.ceil(Number(heatInputs.number_of_entries) / Number(heatInputs.cars_per_heat)) !== 1 ? 's' : ''}`
                : 'Enter values to preview'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickGenDialog(null)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button onClick={() => generateSessions('heats', selectedClassForGen)} className="bg-blue-600 hover:bg-blue-700">Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      );
      }