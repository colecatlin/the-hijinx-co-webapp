import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { AlertCircle, Lock, Unlock, CheckCircle2, Clock, Zap } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { canAction } from '@/components/access/accessControl';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

const SESSION_STATUSES = [
  'Draft',
  'Provisional',
  'Official',
  'Scheduled',
  'In Progress',
  'Completed',
  'Cancelled',
];

export default function RaceControlPanel({
  selectedEvent,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [prevStatus, setPrevStatus] = useState('');

  // Load sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['racecontrol_sessions', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Session.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load operation logs
  const { data: operationLogs = [] } = useQuery({
    queryKey: ['racecontrol_logs', selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return [];
      const logs = await base44.entities.OperationLog.filter({
        event_id: selectedEvent.id,
      });
      return logs.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      ).slice(0, 50);
    },
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Mutations
  const updateSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.update(data.sessionId, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racecontrol_sessions'] });
      invalidateAfterOperation?.('session_updated', { eventId: selectedEvent?.id });
    },
  });

  const createOpLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
  });

  // Build class options from sessions
  const classOptions = useMemo(() => {
    const classes = new Set();
    sessions.forEach(s => {
      const className = s.series_class_id || s.class_name || 'Unclassified';
      classes.add(className);
    });
    return Array.from(classes).sort();
  }, [sessions]);

  // Filter sessions by selected class
  const filteredSessions = useMemo(() => {
    if (!selectedClass) return sessions.sort((a, b) => (a.session_order || 0) - (b.session_order || 0));
    return sessions
      .filter(s => {
        const className = s.series_class_id || s.class_name || 'Unclassified';
        return className === selectedClass;
      })
      .sort((a, b) => (a.session_order || 0) - (b.session_order || 0));
  }, [sessions, selectedClass]);

  const selectedSession = useMemo(() => 
    sessions.find(s => s.id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    if (!selectedSession) return;

    const currentStatus = selectedSession.status;
    if (currentStatus === newStatus) return;

    try {
      setPrevStatus(currentStatus);
      await updateSessionMutation.mutateAsync({
        sessionId: selectedSession.id,
        updates: { status: newStatus },
      });

      await createOpLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'race_control_status_change',
        source_type: 'race_control_panel',
        entity_name: 'Session',
        entity_id: selectedSession.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          session_id: selectedSession.id,
          from_status: currentStatus,
          to_status: newStatus,
        }),
        notes: `Session status changed from ${currentStatus} to ${newStatus}`,
      });

      toast.success(`Session set to ${newStatus}`);
    } catch (error) {
      toast.error('Status change failed');
    }
  };

  // Handle lock
  const handleLock = async () => {
    if (!selectedSession) return;

    try {
      await updateSessionMutation.mutateAsync({
        sessionId: selectedSession.id,
        updates: { locked: true, status: 'Locked' },
      });

      await createOpLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'race_control_lock_session',
        source_type: 'race_control_panel',
        entity_name: 'Session',
        entity_id: selectedSession.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          session_id: selectedSession.id,
        }),
        notes: `Session locked`,
      });

      toast.success('Session locked');
    } catch (error) {
      toast.error('Lock failed');
    }
  };

  // Handle unlock
  const handleUnlock = async () => {
    if (!selectedSession) return;

    try {
      const unlockedStatus = prevStatus && prevStatus !== 'Locked' ? prevStatus : 'Official';
      await updateSessionMutation.mutateAsync({
        sessionId: selectedSession.id,
        updates: { locked: false, status: unlockedStatus },
      });

      await createOpLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'race_control_unlock_session',
        source_type: 'race_control_panel',
        entity_name: 'Session',
        entity_id: selectedSession.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          session_id: selectedSession.id,
        }),
        notes: `Session unlocked`,
      });

      toast.success('Session unlocked');
    } catch (error) {
      toast.error('Unlock failed');
    }
  };

  // Handle publish
  const handlePublish = async (publishType) => {
    if (!selectedSession) return;

    const targetStatus = publishType === 'provisional' ? 'Provisional' : 'Official';
    
    // Enforce status before publish
    if (selectedSession.status !== targetStatus) {
      await handleStatusChange(targetStatus);
    }

    try {
      await createOpLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: `race_control_publish_${publishType}`,
        source_type: 'race_control_panel',
        entity_name: 'Session',
        entity_id: selectedSession.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          session_id: selectedSession.id,
          publish_type: publishType,
        }),
        notes: `Session marked for ${publishType} publish`,
      });

      invalidateAfterOperation?.('results_published', { eventId: selectedEvent?.id });
      toast.success(`Marked for ${publishType} publish`);
    } catch (error) {
      toast.error('Publish failed');
    }
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to access Race Control</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Main controls */}
      <div className="lg:col-span-2 space-y-6">
        {/* Control Row */}
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Session Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    <SelectItem value={null}>All Classes</SelectItem>
                    {classOptions.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Session</label>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    {filteredSessions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Details */}
        {selectedSession && (
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">{selectedSession.name}</CardTitle>
                <Badge className={`${
                  selectedSession.status === 'Official' ? 'bg-green-900/40 text-green-300' :
                  selectedSession.status === 'Provisional' ? 'bg-yellow-900/40 text-yellow-300' :
                  selectedSession.status === 'Draft' ? 'bg-gray-900/40 text-gray-300' :
                  selectedSession.status === 'Locked' ? 'bg-red-900/40 text-red-300' :
                  'bg-blue-900/40 text-blue-300'
                }`}>
                  {selectedSession.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-3">Session Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {SESSION_STATUSES.map(status => (
                    <Button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      disabled={!canAction(dashboardPermissions, 'race_control') || selectedSession.locked}
                      className={`h-8 text-xs ${
                        selectedSession.status === status
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800'
                      }`}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator className="bg-gray-800" />

              <div className="grid grid-cols-2 gap-3">
                {!selectedSession.locked ? (
                  <Button
                    onClick={handleLock}
                    disabled={!canAction(dashboardPermissions, 'race_control')}
                    className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  >
                    <Lock className="w-4 h-4" /> Lock Session
                  </Button>
                ) : (
                  <Button
                    onClick={handleUnlock}
                    disabled={!canAction(dashboardPermissions, 'race_control')}
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                  >
                    <Unlock className="w-4 h-4" /> Unlock
                  </Button>
                )}
                
                <Button
                  disabled={selectedSession.status === 'Draft' || !canAction(dashboardPermissions, 'race_control')}
                  onClick={() => handlePublish('provisional')}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white gap-2"
                >
                  <Clock className="w-4 h-4" /> Mark Provisional
                </Button>
              </div>

              <Button
                disabled={selectedSession.status === 'Draft' || !canAction(dashboardPermissions, 'race_control')}
                onClick={() => handlePublish('official')}
                className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark Official Published
              </Button>
            </CardContent>
          </Card>
        )}

        {!selectedSession && (
          <Card className="bg-[#171717] border-gray-800">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Select a session to view controls</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Actions */}
      <Card className="bg-[#171717] border-gray-800 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" /> Recent Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {operationLogs.filter(log => 
              log.operation_type.includes('race_control') || 
              log.operation_type.includes('session')
            ).slice(0, 20).map((log, idx) => (
              <div key={idx} className="text-xs border-l-2 border-gray-800 pl-3 py-2">
                <div className="font-semibold text-gray-300">{log.operation_type.replace(/_/g, ' ')}</div>
                <div className="text-gray-500 text-xs mt-1">{log.notes}</div>
                <div className="text-gray-600 text-xs mt-1">
                  {new Date(log.created_date).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {operationLogs.length === 0 && (
              <p className="text-gray-500 text-xs text-center py-4">No recent actions</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}