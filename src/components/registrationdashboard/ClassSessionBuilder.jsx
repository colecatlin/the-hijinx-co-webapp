import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Plus,
  Edit2,
  Copy,
  Trash2,
  Lock,
  LockOpen,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ClassSessionBuilder({ eventId, seriesId }) {
  const queryClient = useQueryClient();

  // State
  const [showAddSessionDialog, setShowAddSessionDialog] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [formData, setFormData] = useState({});
  const [showLockConfirm, setShowLockConfirm] = useState(null);
  const [pendingClassGroups, setPendingClassGroups] = useState([]);

  // Queries
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }, 'session_order', 500),
    enabled: !!eventId,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => (seriesId ? base44.entities.SeriesClass.filter({ series_id: seriesId }) : Promise.resolve([])),
    enabled: !!seriesId,
  });

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      setShowAddSessionDialog(false);
      setFormData({});
      setEditingSession(null);
      toast.success('Session created');
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Session.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      setFormData({});
      setEditingSession(null);
      toast.success('Session updated');
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id) => base44.entities.Session.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      toast.success('Session deleted');
    },
  });

  // Group sessions by class
  const classGroups = useMemo(() => {
    const groups = {};

    sessions.forEach((session) => {
      const classKey = session.series_class_id || session.class_name || 'Ungrouped';
      const className = session.series_class_id
        ? seriesClasses.find((sc) => sc.id === session.series_class_id)?.class_name || session.series_class_id
        : session.class_name || 'Ungrouped';

      if (!groups[classKey]) {
        groups[classKey] = {
          key: classKey,
          className,
          series_class_id: session.series_class_id,
          sessions: [],
        };
      }

      groups[classKey].sessions.push(session);
    });

    // Add pending class groups
    pendingClassGroups.forEach((pg) => {
      if (!groups[pg.key]) {
        groups[pg.key] = {
          ...pg,
          sessions: [],
        };
      }
    });

    return Object.values(groups).sort((a, b) => a.className.localeCompare(b.className));
  }, [sessions, seriesClasses, pendingClassGroups]);

  // Handlers
  const handleAddClassGroup = () => {
    const tempKey = `temp-${Date.now()}`;
    setPendingClassGroups([
      ...pendingClassGroups,
      { key: tempKey, className: 'New Class Group', series_class_id: '', sessions: [] },
    ]);
  };

  const handleAddSession = (classGroup) => {
    setFormData({
      series_class_id: classGroup.series_class_id || '',
      class_name: classGroup.series_class_id ? '' : classGroup.className,
      session_type: 'Practice',
      input_source: 'Manual',
      status: 'Draft',
      session_order: classGroup.sessions.length,
    });
    setEditingSession(null);
    setShowAddSessionDialog(true);
  };

  const handleEditSession = (session) => {
    setFormData({
      series_class_id: session.series_class_id || '',
      class_name: session.class_name || '',
      session_type: session.session_type,
      session_number: session.session_number,
      name: session.name,
      scheduled_time: session.scheduled_time || '',
      laps: session.laps || '',
      input_source: session.input_source,
      advancement_rules: session.advancement_rules || '',
      status: session.status,
    });
    setEditingSession(session);
    setShowAddSessionDialog(true);
  };

  const handleDuplicateSession = (session) => {
    const newName = `${session.name} Copy`;
    const data = {
      series_class_id: session.series_class_id,
      class_name: session.class_name,
      session_type: session.session_type,
      session_number: (session.session_number || 0) + 1,
      name: newName,
      scheduled_time: session.scheduled_time,
      laps: session.laps,
      input_source: 'Manual',
      advancement_rules: session.advancement_rules,
      status: 'Draft',
      session_order: Math.max(0, ...sessions.map((s) => s.session_order || 0)) + 1,
      event_id: eventId,
    };
    createSessionMutation.mutate(data);
  };

  const handleMoveSession = (session, direction) => {
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (
      (direction === 'up' && idx === 0) ||
      (direction === 'down' && idx === sessions.length - 1)
    ) {
      return;
    }

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const swapSession = sessions[swapIdx];

    const temp = session.session_order || 0;
    Promise.all([
      base44.entities.Session.update(session.id, { session_order: swapSession.session_order || 0 }),
      base44.entities.Session.update(swapSession.id, { session_order: temp }),
    ]).then(() => {
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      toast.success('Order updated');
    });
  };

  const handleSaveSession = () => {
    if (!formData.name) {
      toast.error('Session name required');
      return;
    }

    const data = {
      event_id: eventId,
      series_class_id: formData.series_class_id || undefined,
      class_name: formData.class_name || undefined,
      session_type: formData.session_type,
      session_number: formData.session_number || undefined,
      name: formData.name,
      scheduled_time: formData.scheduled_time || undefined,
      laps: formData.laps ? Number(formData.laps) : undefined,
      input_source: formData.input_source,
      advancement_rules: formData.advancement_rules || undefined,
      status: formData.status,
      session_order: editingSession ? editingSession.session_order : Math.max(0, ...sessions.map((s) => s.session_order || 0)) + 1,
    };

    if (editingSession) {
      updateSessionMutation.mutate({ id: editingSession.id, data });
    } else {
      createSessionMutation.mutate(data);
    }
  };

  const handleToggleLock = (session) => {
    const newStatus = session.status === 'Locked' ? 'Draft' : 'Locked';
    updateSessionMutation.mutate({
      id: session.id,
      data: { status: newStatus, locked: newStatus === 'Locked' },
    });
    setShowLockConfirm(null);
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

  const isLocked = (session) => session.status === 'Locked' || session.locked;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Classes & Sessions</h2>
          <p className="text-sm text-gray-400 mt-1">Build the weekend structure, set order, lock when official</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAddClassGroup}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Class Group
          </Button>
          <Button
            onClick={() => {
              const firstGroup = classGroups[0];
              if (firstGroup) {
                handleAddSession(firstGroup);
              } else {
                toast.error('Create a class group first');
              }
            }}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Session
          </Button>
        </div>
      </div>

      {/* Class Groups Accordion */}
      {classGroups.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-8 text-center">
            <p className="text-gray-400 text-sm mb-4">No class groups yet</p>
            <Button
              onClick={handleAddClassGroup}
              variant="outline"
              className="border-gray-700 text-gray-300"
              size="sm"
            >
              Add First Class Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {classGroups.map((classGroup) => {
            const hasLocked = classGroup.sessions.some(isLocked);
            return (
              <AccordionItem
                key={classGroup.key}
                value={classGroup.key}
                className="bg-[#171717] border border-gray-800 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="hover:bg-gray-800/50 px-4 py-3">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <div>
                      <h3 className="font-semibold text-white">{classGroup.className}</h3>
                      <p className="text-xs text-gray-400 mt-1">{classGroup.sessions.length} sessions</p>
                    </div>
                    {hasLocked && (
                      <Badge className="bg-yellow-900/40 text-yellow-300 ml-auto">
                        <Lock className="w-3 h-3 mr-1" /> Locked
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-4 border-t border-gray-800">
                  {classGroup.sessions.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-500 mb-3">No sessions in this group</p>
                      <Button
                        onClick={() => handleAddSession(classGroup)}
                        variant="outline"
                        size="sm"
                        className="border-gray-700 text-gray-300"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Session
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {classGroup.sessions.map((session) => (
                        <div
                          key={session.id}
                          className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                            isLocked(session)
                              ? 'bg-gray-800/30 border-gray-700 opacity-60'
                              : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-gray-500 w-6">#{session.session_number || '-'}</span>
                              <div>
                                <p className="font-medium text-white text-sm truncate">{session.name}</p>
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                                    {session.session_type}
                                  </Badge>
                                  <Badge
                                    className={`text-xs ${
                                      isLocked(session)
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-gray-500/20 text-gray-300'
                                    }`}
                                  >
                                    {session.status}
                                  </Badge>
                                  {session.laps && (
                                    <Badge variant="outline" className="text-xs text-gray-400">
                                      {session.laps}L
                                    </Badge>
                                  )}
                                  {session.input_source && session.input_source !== 'Manual' && (
                                    <Badge variant="outline" className="text-xs text-gray-400">
                                      {session.input_source}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-1 flex-shrink-0">
                            {!isLocked(session) && (
                              <>
                                <button
                                  onClick={() => handleMoveSession(session, 'up')}
                                  className="p-1 hover:bg-gray-600 rounded transition-colors"
                                  title="Move up"
                                >
                                  <ChevronUp className="w-3 h-3 text-gray-400" />
                                </button>
                                <button
                                  onClick={() => handleMoveSession(session, 'down')}
                                  className="p-1 hover:bg-gray-600 rounded transition-colors"
                                  title="Move down"
                                >
                                  <ChevronDown className="w-3 h-3 text-gray-400" />
                                </button>
                              </>
                            )}
                            {!isLocked(session) && (
                              <button
                                onClick={() => handleEditSession(session)}
                                className="p-1 hover:bg-gray-600 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3 text-gray-400" />
                              </button>
                            )}
                            {!isLocked(session) && (
                              <button
                                onClick={() => handleDuplicateSession(session)}
                                className="p-1 hover:bg-gray-600 rounded transition-colors"
                                title="Duplicate"
                              >
                                <Copy className="w-3 h-3 text-gray-400" />
                              </button>
                            )}
                            <button
                              onClick={() => setShowLockConfirm(session.id)}
                              className="p-1 hover:bg-gray-600 rounded transition-colors"
                              title={isLocked(session) ? 'Unlock' : 'Lock'}
                            >
                              {isLocked(session) ? (
                                <LockOpen className="w-3 h-3 text-yellow-400" />
                              ) : (
                                <Lock className="w-3 h-3 text-gray-400" />
                              )}
                            </button>
                            {!isLocked(session) && session.status === 'Draft' && (
                              <button
                                onClick={() => deleteSessionMutation.mutate(session.id)}
                                className="p-1 hover:bg-red-900/30 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      <Button
                        onClick={() => handleAddSession(classGroup)}
                        variant="outline"
                        size="sm"
                        className="w-full border-gray-700 text-gray-300 mt-3"
                      >
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

      {/* Add/Edit Session Dialog */}
      <Dialog open={showAddSessionDialog} onOpenChange={setShowAddSessionDialog}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingSession ? 'Edit Session' : 'Add Session'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Session Type</label>
                <Select value={formData.session_type || 'Practice'} onValueChange={(val) => setFormData({ ...formData, session_type: val })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value="Practice">Practice</SelectItem>
                    <SelectItem value="Qualifying">Qualifying</SelectItem>
                    <SelectItem value="Heat">Heat</SelectItem>
                    <SelectItem value="LCQ">LCQ</SelectItem>
                    <SelectItem value="Final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Session Number</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={formData.session_number || ''}
                  onChange={(e) => setFormData({ ...formData, session_number: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[#1A1A1A] border-gray-600 text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Session Name</label>
              <Input
                placeholder="e.g., Heat 1, Final"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#1A1A1A] border-gray-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Scheduled Time</label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_time || ''}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  className="bg-[#1A1A1A] border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Laps</label>
                <Input
                  type="number"
                  placeholder="Leave blank for unlimited"
                  value={formData.laps || ''}
                  onChange={(e) => setFormData({ ...formData, laps: e.target.value })}
                  className="bg-[#1A1A1A] border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Input Source</label>
                <Select value={formData.input_source || 'Manual'} onValueChange={(val) => setFormData({ ...formData, input_source: val })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="CSV">CSV</SelectItem>
                    <SelectItem value="API">API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Status</label>
                <Select value={formData.status || 'Draft'} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
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
              <Textarea
                placeholder="Rules for driver advancement"
                value={formData.advancement_rules || ''}
                onChange={(e) => setFormData({ ...formData, advancement_rules: e.target.value })}
                className="bg-[#1A1A1A] border-gray-600 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSessionDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveSession} className="bg-blue-600 hover:bg-blue-700">
              {editingSession ? 'Update Session' : 'Create Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock Confirmation Dialog */}
      <AlertDialog open={!!showLockConfirm} onOpenChange={(open) => !open && setShowLockConfirm(null)}>
        <AlertDialogContent className="bg-[#262626] border-gray-700">
          <AlertDialogTitle className="text-white">Lock Session</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Locking a session prevents editing. Are you sure?
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const session = sessions.find((s) => s.id === showLockConfirm);
                if (session) handleToggleLock(session);
              }}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {sessions.find((s) => s.id === showLockConfirm)?.status === 'Locked' ? 'Unlock' : 'Lock'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}