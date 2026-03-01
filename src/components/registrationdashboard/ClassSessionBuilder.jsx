import React, { useState, useMemo } from 'react';
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
  DialogDescription 
} from '@/components/ui/dialog';
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
  Plus,
  Edit2,
  Copy,
  Archive,
  Trash2,
  Lock,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ClassSessionBuilder({ eventId, seriesId }) {
  const queryClient = useQueryClient();
  
  // State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [reorderMode, setReorderMode] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [dialogMode, setDialogMode] = useState(null); // 'addClass', 'editClass', 'addSession', 'editSession'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Queries
  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => base44.entities.EventClass.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId, selectedClassId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => (seriesId ? base44.entities.SeriesClass.filter({ series_id: seriesId }) : Promise.resolve([])),
    enabled: !!seriesId,
  });

  // Mutations
  const createClassMutation = useMutation({
    mutationFn: (data) => base44.entities.EventClass.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventClasses', eventId] });
      setDialogMode(null);
      setFormData({});
      toast.success('Class created');
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EventClass.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventClasses', eventId] });
      setDialogMode(null);
      setFormData({});
      toast.success('Class updated');
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId, selectedClassId] });
      setDialogMode(null);
      setFormData({});
      toast.success('Session created');
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Session.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId, selectedClassId] });
      setDialogMode(null);
      setFormData({});
      toast.success('Session updated');
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (id) => base44.entities.Session.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId, selectedClassId] });
      toast.success('Session deleted');
    },
  });

  // Derived data
  const displayClasses = useMemo(() => {
    let filtered = eventClasses.filter(c => showArchived ? true : c.status !== 'archived');
    return filtered.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [eventClasses, showArchived]);

  const selectedClass = useMemo(() => {
    return eventClasses.find(c => c.id === selectedClassId);
  }, [eventClasses, selectedClassId]);

  const classSessions = useMemo(() => {
    let filtered = sessions.filter(s => s.event_class_id === selectedClassId);
    return filtered.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [sessions, selectedClassId]);

  // Handlers
  const handleAddClass = () => {
    setFormData({
      event_id: eventId,
      series_id: seriesId,
      class_status: 'Open',
      sort_order: eventClasses.length,
    });
    setEditingItem(null);
    setDialogMode('addClass');
  };

  const handleEditClass = (cls) => {
    setFormData({
      event_id: cls.event_id,
      series_id: cls.series_id,
      series_class_id: cls.series_class_id,
      class_name_override: cls.class_name_override,
      max_entries: cls.max_entries,
      class_status: cls.class_status,
      notes: cls.notes,
      sort_order: cls.sort_order,
    });
    setEditingItem(cls);
    setDialogMode('editClass');
  };

  const handleDuplicateClass = async (cls) => {
    const maxSort = Math.max(0, ...eventClasses.map(c => c.sort_order || 0));
    const newName = cls.class_name_override
      ? `${cls.class_name_override} Copy`
      : `${cls.class_name} Copy`;
    
    const data = {
      event_id: cls.event_id,
      series_id: cls.series_id,
      series_class_id: cls.series_class_id,
      class_name_override: newName,
      class_name: newName,
      class_status: 'Open',
      sort_order: maxSort + 1,
      notes: cls.notes,
    };
    
    createClassMutation.mutate(data);
  };

  const handleArchiveClass = async (cls) => {
    updateClassMutation.mutate({
      id: cls.id,
      data: { status: 'archived' },
    });
  };

  const handleMoveClass = async (cls, direction) => {
    const idx = displayClasses.findIndex(c => c.id === cls.id);
    if (
      (direction === 'up' && idx === 0) ||
      (direction === 'down' && idx === displayClasses.length - 1)
    ) {
      return;
    }

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const swapClass = displayClasses[swapIdx];

    const temp = cls.sort_order;
    updateClassMutation.mutate({
      id: cls.id,
      data: { sort_order: swapClass.sort_order },
    });

    updateClassMutation.mutate({
      id: swapClass.id,
      data: { sort_order: temp },
    });
  };

  const handleSaveClass = () => {
    if (!formData.class_name_override && !formData.series_class_id) {
      toast.error('Provide class name or link a series class');
      return;
    }

    const className = formData.class_name_override || formData.series_class_id
      ? seriesClasses.find(sc => sc.id === formData.series_class_id)?.class_name
      : '';

    const data = {
      event_id: formData.event_id,
      series_id: formData.series_id,
      series_class_id: formData.series_class_id,
      class_name_override: formData.class_name_override,
      class_name: className || formData.class_name_override,
      class_status: formData.class_status,
      max_entries: formData.max_entries,
      notes: formData.notes,
      sort_order: formData.sort_order,
    };

    if (editingItem) {
      updateClassMutation.mutate({ id: editingItem.id, data });
    } else {
      createClassMutation.mutate(data);
    }
  };

  const handleAddSession = () => {
    if (!selectedClassId) {
      toast.error('Select a class first');
      return;
    }

    setFormData({
      event_id: eventId,
      event_class_id: selectedClassId,
      series_class_id: selectedClass?.series_class_id,
      session_type: 'Practice',
      input_source: 'Manual',
      status: 'scheduled',
      sort_order: classSessions.length,
    });
    setEditingItem(null);
    setDialogMode('addSession');
  };

  const handleEditSession = (session) => {
    setFormData({
      event_id: session.event_id,
      event_class_id: session.event_class_id,
      series_class_id: session.series_class_id,
      session_type: session.session_type,
      heat_number: session.heat_number,
      name: session.name,
      scheduled_time: session.scheduled_time,
      laps: session.laps,
      input_source: session.input_source,
      advancement_rules: session.advancement_rules,
      status: session.status,
      sort_order: session.sort_order,
    });
    setEditingItem(session);
    setDialogMode('editSession');
  };

  const handleDuplicateSession = async (session) => {
    const maxSort = Math.max(0, ...classSessions.map(s => s.sort_order || 0));
    const newNumber = (session.heat_number || 0) + 1;

    const data = {
      event_id: session.event_id,
      event_class_id: session.event_class_id,
      series_class_id: session.series_class_id,
      session_type: session.session_type,
      heat_number: newNumber,
      name: `${session.name} Copy`,
      scheduled_time: session.scheduled_time,
      laps: session.laps,
      input_source: 'Manual',
      status: 'scheduled',
      sort_order: maxSort + 1,
    };

    createSessionMutation.mutate(data);
  };

  const handleLockSession = async (session) => {
    if (session.status === 'Official' || session.status === 'completed') {
      updateSessionMutation.mutate({
        id: session.id,
        data: { status: 'Locked' },
      });
    } else {
      updateSessionMutation.mutate({
        id: session.id,
        data: { status: 'Official' },
      });
      // Then lock
      setTimeout(() => {
        updateSessionMutation.mutate({
          id: session.id,
          data: { status: 'Locked' },
        });
      }, 200);
    }
  };

  const handleMoveSession = async (session, direction) => {
    const idx = classSessions.findIndex(s => s.id === session.id);
    if (
      (direction === 'up' && idx === 0) ||
      (direction === 'down' && idx === classSessions.length - 1)
    ) {
      return;
    }

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const swapSession = classSessions[swapIdx];

    const temp = session.sort_order;
    updateSessionMutation.mutate({
      id: session.id,
      data: { sort_order: swapSession.sort_order },
    });

    updateSessionMutation.mutate({
      id: swapSession.id,
      data: { sort_order: temp },
    });
  };

  const handleSaveSession = () => {
    if (!formData.name) {
      toast.error('Session name required');
      return;
    }

    const data = {
      event_id: formData.event_id,
      event_class_id: formData.event_class_id,
      series_class_id: formData.series_class_id,
      session_type: formData.session_type,
      heat_number: formData.heat_number,
      name: formData.name,
      scheduled_time: formData.scheduled_time,
      laps: formData.laps,
      input_source: formData.input_source,
      advancement_rules: formData.advancement_rules,
      status: formData.status,
      sort_order: formData.sort_order,
    };

    if (editingItem) {
      updateSessionMutation.mutate({ id: editingItem.id, data });
    } else {
      createSessionMutation.mutate(data);
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Classes Panel */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-white">Event Classes</CardTitle>
            <Button
              size="sm"
              onClick={handleAddClass}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Class
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReorderMode(!reorderMode)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              {reorderMode ? 'Done Reordering' : 'Reorder Mode'}
            </Button>
            {eventClasses.some(c => c.status === 'archived') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowArchived(!showArchived)}
                className="text-gray-400 hover:text-gray-200"
              >
                {showArchived ? 'Hide' : 'Show'} Archived
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {displayClasses.length === 0 ? (
            <p className="text-xs text-gray-500">No classes yet</p>
          ) : (
            <div className="space-y-2">
              {displayClasses.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => !reorderMode && setSelectedClassId(cls.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedClassId === cls.id
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">
                        {cls.class_name_override || cls.class_name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                          {cls.class_status}
                        </Badge>
                        {cls.max_entries && (
                          <span className="text-xs text-gray-400">Max: {cls.max_entries}</span>
                        )}
                      </div>
                    </div>
                    {reorderMode ? (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveClass(cls, 'up'); }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                        >
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveClass(cls, 'down'); }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                        >
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditClass(cls); }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-gray-400" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDuplicateClass(cls); }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                        >
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleArchiveClass(cls); }}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                        >
                          <Archive className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions Panel */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-white">
              {selectedClass
                ? `${selectedClass.class_name_override || selectedClass.class_name} Sessions`
                : 'Sessions'}
            </CardTitle>
            <Button
              size="sm"
              onClick={handleAddSession}
              disabled={!selectedClassId}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
          {selectedClass && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReorderMode(!reorderMode)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 mt-2"
            >
              {reorderMode ? 'Done Reordering' : 'Reorder Mode'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!selectedClassId ? (
            <p className="text-xs text-gray-500">Select a class to view sessions</p>
          ) : classSessions.length === 0 ? (
            <p className="text-xs text-gray-500">No sessions yet</p>
          ) : (
            <div className="space-y-2">
              {classSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{session.name}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                          {session.session_type}
                        </Badge>
                        <Badge className="bg-gray-500/20 text-gray-300 text-xs">
                          {session.status}
                        </Badge>
                        {session.input_source && (
                          <Badge variant="outline" className="text-xs text-gray-400">
                            {session.input_source}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {reorderMode ? (
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveSession(session, 'up')}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                        >
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleMoveSession(session, 'down')}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                        >
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditSession(session)}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDuplicateSession(session)}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                        >
                          <Copy className="w-3 h-3 text-gray-400" />
                        </button>
                        {session.status === 'Official' || session.status === 'completed' || session.status === 'Locked' ? (
                          <button
                            onClick={() => handleLockSession(session)}
                            disabled={session.status === 'Locked'}
                            className="p-1 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
                          >
                            <Lock className="w-3 h-3 text-yellow-400" />
                          </button>
                        ) : null}
                        {session.status === 'scheduled' && (
                          <button
                            onClick={() => deleteSessionMutation.mutate(session.id)}
                            className="p-1 hover:bg-red-900 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Class Dialog */}
      <Dialog open={dialogMode === 'addClass' || dialogMode === 'editClass'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="bg-[#262626] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {dialogMode === 'editClass' ? 'Edit Class' : 'Add Class'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase">Link Series Class (Optional)</label>
              <Select
                value={formData.series_class_id || ''}
                onValueChange={(val) => setFormData({ ...formData, series_class_id: val })}
              >
                <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white mt-1">
                  <SelectValue placeholder="Select series class..." />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  {seriesClasses.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id} className="text-white">
                      {sc.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase">Class Name Override</label>
              <Input
                placeholder="Custom class name"
                value={formData.class_name_override || ''}
                onChange={(e) => setFormData({ ...formData, class_name_override: e.target.value })}
                className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase">Max Entries</label>
              <Input
                type="number"
                placeholder="Unlimited"
                value={formData.max_entries || ''}
                onChange={(e) => setFormData({ ...formData, max_entries: e.target.value ? Number(e.target.value) : undefined })}
                className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase">Status</label>
              <Select value={formData.class_status || 'Open'} onValueChange={(val) => setFormData({ ...formData, class_status: val })}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Full">Full</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase">Notes</label>
              <Textarea
                placeholder="Class notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={handleSaveClass} className="bg-blue-600 hover:bg-blue-700">
              Save Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Session Dialog */}
      <Dialog open={dialogMode === 'addSession' || dialogMode === 'editSession'} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="bg-[#262626] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {dialogMode === 'editSession' ? 'Edit Session' : 'Add Session'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase">Session Type</label>
                <Select value={formData.session_type || 'Practice'} onValueChange={(val) => setFormData({ ...formData, session_type: val })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white mt-1">
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
                <label className="text-xs text-gray-400 uppercase">Heat Number</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={formData.heat_number || ''}
                  onChange={(e) => setFormData({ ...formData, heat_number: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase">Session Name</label>
              <Input
                placeholder="e.g., Heat 1, Final"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase">Scheduled Time</label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_time || ''}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase">Laps</label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={formData.laps || ''}
                  onChange={(e) => setFormData({ ...formData, laps: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 uppercase">Input Source</label>
                <Select value={formData.input_source || 'Manual'} onValueChange={(val) => setFormData({ ...formData, input_source: val })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white mt-1">
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
                <label className="text-xs text-gray-400 uppercase">Status</label>
                <Select value={formData.status || 'scheduled'} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Provisional">Provisional</SelectItem>
                    <SelectItem value="Official">Official</SelectItem>
                    <SelectItem value="Locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase">Advancement Rules</label>
              <Textarea
                placeholder="Rules for driver advancement"
                value={formData.advancement_rules || ''}
                onChange={(e) => setFormData({ ...formData, advancement_rules: e.target.value })}
                className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={handleSaveSession} className="bg-blue-600 hover:bg-blue-700">
              Save Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}