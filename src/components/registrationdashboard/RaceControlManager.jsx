import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { canTab } from '@/components/access/accessControl';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Lock, Unlock, MessageSquare, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function RaceControlManager({
  selectedEvent,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
  isAdmin,
}) {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesText, setNotesText] = useState('');

  // Check permissions
  const canEdit = canTab(dashboardPermissions, 'race_control');

  // Load sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['racecore', 'race_control', 'sessions', selectedEvent?.id],
    queryFn: () => 
      selectedEvent 
        ? base44.entities.Session.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  // Load series classes for labels
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['racecore', 'race_control', 'classes'],
    queryFn: () => base44.entities.SeriesClass.list(),
  });

  // Build maps
  const classMap = useMemo(
    () => new Map(seriesClasses.map(c => [c.id, c])),
    [seriesClasses]
  );

  // Group and sort sessions
  const sessionsByClass = useMemo(() => {
    const grouped = {};
    sessions.forEach(s => {
      const classKey = s.series_class_id || 'unassigned';
      if (!grouped[classKey]) grouped[classKey] = [];
      grouped[classKey].push(s);
    });

    // Sort within each class
    Object.keys(grouped).forEach(classKey => {
      grouped[classKey].sort((a, b) => {
        if (a.session_order !== b.session_order) return a.session_order - b.session_order;
        if (a.session_type !== b.session_type) return (a.session_type || '').localeCompare(b.session_type);
        return (a.session_number || 0) - (b.session_number || 0);
      });
    });

    return grouped;
  }, [sessions]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { Draft: 0, Provisional: 0, Official: 0, Locked: 0 };
    sessions.forEach(s => {
      if (s.locked) counts.Locked++;
      else if (s.status) counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return counts;
  }, [sessions]);

  // Mutations
  const updateSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.update(selectedEvent.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['racecore', 'race_control', 'sessions', selectedEvent.id],
      });
    },
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.OperationLog.create(data),
  });

  // Handle status change
  const handleStatusChange = async (session, newStatus) => {
    if (!canEdit) return;

    try {
      const beforeStatus = session.status || 'Draft';
      
      await updateSessionMutation.mutateAsync({
        id: session.id,
        status: newStatus,
        locked: false, // Unlock when changing status manually
      });

      await createLogMutation.mutateAsync({
        operation_type: 'session_status_changed',
        entity_name: 'Session',
        entity_id: session.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          session_id: session.id,
          before_status: beforeStatus,
          after_status: newStatus,
        },
      });

      invalidateAfterOperation('session_updated', { eventId: selectedEvent.id });
      toast.success(`Session status changed to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update session status');
      console.error(error);
    }
  };

  // Handle lock toggle
  const handleLockToggle = async (session) => {
    if (!canEdit) return;

    try {
      const beforeLocked = session.locked || false;
      const afterLocked = !beforeLocked;
      let newStatus = session.status;

      if (afterLocked && newStatus === 'Locked') {
        newStatus = 'Draft';
      }

      await updateSessionMutation.mutateAsync({
        id: session.id,
        locked: afterLocked,
        status: newStatus,
      });

      await createLogMutation.mutateAsync({
        operation_type: 'session_lock_toggled',
        entity_name: 'Session',
        entity_id: session.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          session_id: session.id,
          before_locked: beforeLocked,
          after_locked: afterLocked,
        },
      });

      invalidateAfterOperation('session_updated', { eventId: selectedEvent.id });
      toast.success(afterLocked ? 'Session locked' : 'Session unlocked');
    } catch (error) {
      toast.error('Failed to toggle lock');
      console.error(error);
    }
  };

  // Handle notes save
  const handleSaveNotes = async (session) => {
    if (!canEdit) return;

    try {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        rc_notes: notesText,
      });

      await createLogMutation.mutateAsync({
        operation_type: 'race_control_note_saved',
        entity_name: 'Session',
        entity_id: session.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          session_id: session.id,
          note_length: notesText.length,
        },
      });

      invalidateAfterOperation('session_updated', { eventId: selectedEvent.id });
      setNotesDialogOpen(false);
      setNotesText('');
      toast.success('Notes saved');
    } catch (error) {
      toast.error('Failed to save notes');
      console.error(error);
    }
  };

  // Handle admin override
  const handleAdminOverride = async (session) => {
    if (!isAdmin) return;

    try {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        status: 'Official',
        locked: true,
      });

      await createLogMutation.mutateAsync({
        operation_type: 'race_control_override',
        entity_name: 'Session',
        entity_id: session.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          session_id: session.id,
          action: 'official_and_lock',
        },
      });

      invalidateAfterOperation('session_updated', { eventId: selectedEvent.id });
      toast.success('Session set to Official and Locked');
    } catch (error) {
      toast.error('Failed to apply admin override');
      console.error(error);
    }
  };

  const openNotes = (session) => {
    setSelectedSessionId(session.id);
    setNotesText(session.rc_notes || '');
    setNotesDialogOpen(true);
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">Select an event to view race control</p>
        </CardContent>
      </Card>
    );
  }

  if (!canEdit) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-gray-400">You don't have access to Race Control</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Session Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-900/50 p-3 rounded">
              <p className="text-xs text-gray-400 mb-1">Total Sessions</p>
              <p className="text-xl font-bold text-white">{sessions.length}</p>
            </div>
            <div className="bg-blue-900/20 p-3 rounded border border-blue-800/50">
              <p className="text-xs text-gray-400 mb-1">Draft</p>
              <p className="text-xl font-bold text-blue-300">{statusCounts.Draft}</p>
            </div>
            <div className="bg-yellow-900/20 p-3 rounded border border-yellow-800/50">
              <p className="text-xs text-gray-400 mb-1">Provisional</p>
              <p className="text-xl font-bold text-yellow-300">{statusCounts.Provisional}</p>
            </div>
            <div className="bg-green-900/20 p-3 rounded border border-green-800/50">
              <p className="text-xs text-gray-400 mb-1">Official</p>
              <p className="text-xl font-bold text-green-300">{statusCounts.Official}</p>
            </div>
            <div className="bg-red-900/20 p-3 rounded border border-red-800/50">
              <p className="text-xs text-gray-400 mb-1">Locked</p>
              <p className="text-xl font-bold text-red-300">{statusCounts.Locked}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions by Class */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Session Control</CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <p className="text-gray-400 text-sm">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="text-gray-400 text-sm">No sessions found</p>
          ) : (
            <Accordion type="multiple" defaultValue={Object.keys(sessionsByClass).slice(0, 1)}>
              {Object.entries(sessionsByClass).map(([classKey, classSessions]) => {
                const classObj = classMap.get(classKey);
                const classLabel = classObj?.name || (classKey === 'unassigned' ? 'Unassigned' : classKey);

                return (
                  <AccordionItem key={classKey} value={classKey}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <span className="font-semibold text-white">{classLabel}</span>
                        <Badge variant="outline" className="text-xs">
                          {classSessions.length} sessions
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-700">
                              <TableHead className="text-gray-400">Order</TableHead>
                              <TableHead className="text-gray-400">Session</TableHead>
                              <TableHead className="text-gray-400">Type</TableHead>
                              <TableHead className="text-gray-400">Time</TableHead>
                              <TableHead className="text-gray-400">Status</TableHead>
                              <TableHead className="text-gray-400">Locked</TableHead>
                              <TableHead className="text-gray-400">Source</TableHead>
                              <TableHead className="text-gray-400">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classSessions.map((session) => (
                              <TableRow key={session.id} className="border-gray-800">
                                <TableCell className="text-white text-sm">
                                  {session.session_order || '-'}
                                </TableCell>
                                <TableCell className="text-white text-sm">
                                  {session.name}
                                </TableCell>
                                <TableCell className="text-gray-400 text-sm">
                                  {session.session_type}
                                </TableCell>
                                <TableCell className="text-gray-400 text-sm">
                                  {session.scheduled_time
                                    ? new Date(session.scheduled_time).toLocaleTimeString()
                                    : '-'}
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={session.status || 'Draft'}
                                    onValueChange={(v) => handleStatusChange(session, v)}
                                  >
                                    <SelectTrigger className="w-32 h-8 bg-gray-900 border-gray-700 text-white text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-900 border-gray-700">
                                      <SelectItem value="Draft" className="text-white">
                                        Draft
                                      </SelectItem>
                                      <SelectItem value="Provisional" className="text-white">
                                        Provisional
                                      </SelectItem>
                                      <SelectItem value="Official" className="text-white">
                                        Official
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <button
                                    onClick={() => handleLockToggle(session)}
                                    className="p-1.5 hover:bg-gray-800 rounded transition-colors"
                                  >
                                    {session.locked ? (
                                      <Lock className="w-4 h-4 text-red-400" />
                                    ) : (
                                      <Unlock className="w-4 h-4 text-gray-500" />
                                    )}
                                  </button>
                                </TableCell>
                                <TableCell className="text-gray-400 text-sm">
                                  {session.input_source || '-'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openNotes(session)}
                                      className="p-1 h-auto text-gray-400 hover:text-white hover:bg-gray-800"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                    </Button>
                                    {isAdmin && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleAdminOverride(session)}
                                        className="p-1 h-auto text-yellow-500 hover:bg-yellow-900/20 hover:text-yellow-400"
                                        title="Set to Official & Lock"
                                      >
                                        <Shield className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="bg-[#262626] border-gray-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Race Control Notes</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add internal notes for this session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter race control notes..."
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              className="bg-gray-900 border-gray-600 text-white h-32"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setNotesDialogOpen(false)}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSaveNotes(sessions.find(s => s.id === selectedSessionId))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Notes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}