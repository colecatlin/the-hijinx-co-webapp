import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Plus, Edit2, Copy, Trash2, Lock, LockOpen, ChevronUp, ChevronDown, Settings, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import useDashboardMutation from './useDashboardMutation';
import { buildInvalidateAfterOperation } from './invalidationHelper';

const EMPTY_CLASS_FORM = {
  class_name: '', series_class_id: '', max_entries: '', class_status: 'Open', class_order: '', notes: '',
};
const EMPTY_SESSION_FORM = {
  event_class_id: '', session_type: 'Practice', name: '', session_number: '',
  scheduled_time: '', laps: '', input_source: 'Manual', status: 'Draft', advancement_rules: '',
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

  const sharedOpts = {
    invalidateAfterOperation,
    dashboardContext: dashboardContext ?? { eventId },
    selectedEvent: selectedEvent ?? null,
  };

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

  // ── Session handlers ──────────────────────────────────────────────────────
  const openAddSession = (classGroup) => {
    setEditingSession(null);
    setSessionForm({
      ...EMPTY_SESSION_FORM,
      event_class_id: classGroup.id,
      session_order: String(classGroup.sessions.length),
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
      scheduled_time: session.scheduled_time || '',
      laps: session.laps != null ? String(session.laps) : '',
      input_source: session.input_source || 'Manual',
      status: session.status || 'Draft',
      advancement_rules: session.advancement_rules || '',
    });
    setSessionDialog(true);
  };

  const handleSaveSession = async () => {
    if (!sessionForm.name.trim()) { toast.error('Session name required'); return; }
    if (!sessionForm.event_class_id) { toast.error('Select a class'); return; }
    const payload = {
      event_id: eventId,
      event_class_id: sessionForm.event_class_id,
      session_type: sessionForm.session_type,
      name: sessionForm.name.trim(),
      session_number: sessionForm.session_number ? Number(sessionForm.session_number) : undefined,
      scheduled_time: sessionForm.scheduled_time || undefined,
      laps: sessionForm.laps ? Number(sessionForm.laps) : undefined,
      input_source: sessionForm.input_source,
      status: sessionForm.status,
      advancement_rules: sessionForm.advancement_rules || undefined,
      session_order: editingSession
        ? editingSession.session_order
        : (sessions.length ? Math.max(...sessions.map((s) => s.session_order || 0)) + 1 : 0),
    };
    if (editingSession) {
      await updateSession({ id: editingSession.id, data: payload });
    } else {
      await createSession(payload);
    }
    setSessionDialog(false);
  };

  const handleDuplicate = (session) => {
    const maxOrder = sessions.length ? Math.max(...sessions.map((s) => s.session_order || 0)) + 1 : 0;
    createSession({
      event_id: eventId,
      event_class_id: session.event_class_id,
      session_type: session.session_type,
      name: `${session.name} Copy`,
      session_number: session.session_number,
      laps: session.laps,
      input_source: 'Manual',
      status: 'Draft',
      session_order: maxOrder,
    });
  };

  const handleMove = (session, direction, classGroup) => {
    const sorted = [...classGroup.sessions].sort((a, b) => (a.session_order || 0) - (b.session_order || 0));
    const idx = sorted.findIndex((s) => s.id === session.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    Promise.all([
      updateSession({ id: session.id, data: { session_order: swap.session_order || 0 } }),
      updateSession({ id: swap.id, data: { session_order: session.session_order || 0 } }),
    ]);
  };

  const handleToggleLock = (session) => {
    const newStatus = session.status === 'Locked' ? 'Draft' : 'Locked';
    updateSession({ id: session.id, data: { status: newStatus, locked: newStatus === 'Locked' } });
    setLockConfirm(null);
  };

  const isLocked = (s) => s.status === 'Locked' || s.locked;

  const statusBadge = (s) => {
    if (s === 'Open') return 'bg-green-500/20 text-green-400';
    if (s === 'Full') return 'bg-yellow-500/20 text-yellow-400';
    if (s === 'Closed') return 'bg-red-500/20 text-red-400';
    return 'bg-gray-500/20 text-gray-400';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Classes & Sessions</h2>
          <p className="text-sm text-gray-400 mt-1">Define classes, then build sessions under each class</p>
        </div>
        <Button onClick={openAddClass} disabled={creatingClass} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> Add Class
        </Button>
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
            const sortedSessions = [...cg.sessions].sort((a, b) => (a.session_order || 0) - (b.session_order || 0));

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
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-500 mb-3">No sessions in this class</p>
                      <Button onClick={() => openAddSession(cg)} variant="outline" size="sm" className="border-gray-700 text-gray-300">
                        <Plus className="w-3 h-3 mr-1" /> Add Session
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sortedSessions.map((session) => (
                        <div
                          key={session.id}
                          className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                            isLocked(session) ? 'bg-gray-800/20 border-gray-700 opacity-60' : 'bg-gray-800/40 border-gray-700 hover:bg-gray-700/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-500 w-5 flex-shrink-0">#{session.session_number || '—'}</span>
                              <div>
                                <p className="font-medium text-white text-sm truncate">{session.name}</p>
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">{session.session_type}</Badge>
                                  <Badge className={`text-xs ${isLocked(session) ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-300'}`}>{session.status}</Badge>
                                  {session.laps && <Badge variant="outline" className="text-xs text-gray-400">{session.laps}L</Badge>}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {!isLocked(session) && <>
                              <button onClick={() => handleMove(session, 'up', cg)} className="p-1 hover:bg-gray-600 rounded" title="Move up"><ChevronUp className="w-3 h-3 text-gray-400" /></button>
                              <button onClick={() => handleMove(session, 'down', cg)} className="p-1 hover:bg-gray-600 rounded" title="Move down"><ChevronDown className="w-3 h-3 text-gray-400" /></button>
                              <button onClick={() => openEditSession(session)} className="p-1 hover:bg-gray-600 rounded" title="Edit"><Edit2 className="w-3 h-3 text-gray-400" /></button>
                              <button onClick={() => handleDuplicate(session)} className="p-1 hover:bg-gray-600 rounded" title="Duplicate"><Copy className="w-3 h-3 text-gray-400" /></button>
                            </>}
                            <button onClick={() => setLockConfirm(session.id)} className="p-1 hover:bg-gray-600 rounded" title={isLocked(session) ? 'Unlock' : 'Lock'}>
                              {isLocked(session) ? <LockOpen className="w-3 h-3 text-yellow-400" /> : <Lock className="w-3 h-3 text-gray-400" />}
                            </button>
                            {!isLocked(session) && session.status === 'Draft' && (
                              <button onClick={() => deleteSession(session.id)} className="p-1 hover:bg-red-900/30 rounded" title="Delete"><Trash2 className="w-3 h-3 text-red-400" /></button>
                            )}
                          </div>
                        </div>
                      ))}
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
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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
                <label className="text-xs text-gray-400 uppercase block mb-1">Session Type</label>
                <Select value={sessionForm.session_type} onValueChange={(v) => setSessionForm({ ...sessionForm, session_type: v })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Session Name *</label>
                <Input value={sessionForm.name} onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="e.g. Heat 1, Final" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Session #</label>
                <Input type="number" value={sessionForm.session_number} onChange={(e) => setSessionForm({ ...sessionForm, session_number: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="Optional" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Scheduled Time</label>
                <Input type="datetime-local" value={sessionForm.scheduled_time} onChange={(e) => setSessionForm({ ...sessionForm, scheduled_time: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Laps</label>
                <Input type="number" value={sessionForm.laps} onChange={(e) => setSessionForm({ ...sessionForm, laps: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="Unlimited" />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Input Source</label>
                <Select value={sessionForm.input_source} onValueChange={(v) => setSessionForm({ ...sessionForm, input_source: v })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="CSV">CSV</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Status</label>
                <Select value={sessionForm.status} onValueChange={(v) => setSessionForm({ ...sessionForm, status: v })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Provisional">Provisional</SelectItem>
                    <SelectItem value="Official">Official</SelectItem>
                    <SelectItem value="Locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
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
    </div>
  );
}