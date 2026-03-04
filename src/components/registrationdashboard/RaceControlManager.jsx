import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { AlertCircle, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

const STATUS_OPTIONS = ['Draft', 'Provisional', 'Official', 'Locked'];
const SEVERITY_OPTIONS = ['Low', 'Medium', 'High'];

export default function RaceControlManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [newStatus, setNewStatus] = useState('');
  const [incidentNote, setIncidentNote] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState('Medium');
  const [overrideReason, setOverrideReason] = useState('');

  // Load sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['racecore', 'racecontrol', 'sessions', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Session.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load results
  const { data: results = [] } = useQuery({
    queryKey: ['racecore', 'racecontrol', 'results', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Results.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load series classes
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['racecore', 'racecontrol', 'classes', selectedSeries?.id || 'none'],
    queryFn: () => (selectedSeries?.id 
      ? base44.entities.SeriesClass.filter({ series_id: selectedSeries.id })
      : base44.entities.SeriesClass.list()),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load operation logs
  const { data: allLogs = [] } = useQuery({
    queryKey: ['racecore', 'racecontrol', 'logs', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.OperationLog.filter({
          event_id: selectedEvent.id,
        }, '-created_date', 500)
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Filter logs by operation type
  const raceLogs = useMemo(() => {
    return allLogs.filter(log => 
      ['race_control_update', 'race_control_incident', 'race_control_override'].includes(log.operation_type)
    );
  }, [allLogs]);

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => base44.auth.me(),
    ...DQ,
  });

  // Mutations
  const updateSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.update(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racecore', 'racecontrol', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['racecore', 'racecontrol', 'logs'] });
      invalidateAfterOperation('session_updated', { eventId: selectedEvent.id });
    },
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racecore', 'racecontrol', 'logs'] });
    },
  });

  // Build class list
  const classList = useMemo(() => {
    const classes = new Set();
    sessions.forEach(s => {
      if (s.series_class_id) classes.add(s.series_class_id);
    });
    seriesClasses.forEach(sc => classes.add(sc.id));
    return Array.from(classes).sort();
  }, [sessions, seriesClasses]);

  // Filter sessions by class
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => 
      selectedClassId === 'all' || s.series_class_id === selectedClassId
    ).sort((a, b) => (a.session_order || 0) - (b.session_order || 0));
  }, [sessions, selectedClassId]);

  // Get selected session
  const selectedSession = useMemo(() => 
    sessions.find(s => s.id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  // Auto-select first session
  if (!selectedSessionId && filteredSessions.length > 0) {
    setSelectedSessionId(filteredSessions[0].id);
  }

  // Count results for selected session
  const sessionResultCount = useMemo(() => {
    if (!selectedSessionId) return 0;
    return results.filter(r => r.session_id === selectedSessionId).length;
  }, [results, selectedSessionId]);

  // Calculate stats
  const stats = useMemo(() => {
    const counts = {
      total: sessions.length,
      draft: sessions.filter(s => s.status === 'Draft').length,
      provisional: sessions.filter(s => s.status === 'Provisional').length,
      official: sessions.filter(s => s.status === 'Official').length,
      locked: sessions.filter(s => s.status === 'Locked' || s.locked).length,
    };
    return counts;
  }, [sessions]);

  // Handle status save
  const handleSaveStatus = async () => {
    if (!selectedSession || !newStatus) return;
    
    try {
      await updateSessionMutation.mutateAsync({
        id: selectedSession.id,
        updates: { status: newStatus },
      });

      await createLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'race_control_update',
        entity_name: 'Session',
        entity_id: selectedSession.id,
        source_type: 'race_control',
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          session_id: selectedSession.id,
          previous_status: selectedSession.status,
          new_status: newStatus,
          locked_before: selectedSession.locked,
          locked_after: selectedSession.locked,
        }),
        notes: `Status changed: ${selectedSession.status} → ${newStatus}`,
      });

      setNewStatus('');
      toast.success('Session status updated');
    } catch (error) {
      toast.error('Failed to update session');
    }
  };

  // Handle lock
  const handleLock = async () => {
    if (!selectedSession) return;

    try {
      await updateSessionMutation.mutateAsync({
        id: selectedSession.id,
        updates: { locked: true, status: 'Locked' },
      });

      await createLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'race_control_update',
        entity_name: 'Session',
        entity_id: selectedSession.id,
        source_type: 'race_control',
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          session_id: selectedSession.id,
          previous_status: selectedSession.status,
          new_status: 'Locked',
          locked_before: selectedSession.locked,
          locked_after: true,
        }),
        notes: `Session locked`,
      });

      toast.success('Session locked');
    } catch (error) {
      toast.error('Failed to lock session');
    }
  };

  // Handle unlock
  const handleUnlock = async () => {
    if (!selectedSession) return;

    const nextStatus = selectedSession.status === 'Locked' ? 'Official' : selectedSession.status;

    try {
      await updateSessionMutation.mutateAsync({
        id: selectedSession.id,
        updates: { locked: false, status: nextStatus },
      });

      await createLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'race_control_update',
        entity_name: 'Session',
        entity_id: selectedSession.id,
        source_type: 'race_control',
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          session_id: selectedSession.id,
          previous_status: selectedSession.status,
          new_status: nextStatus,
          locked_before: true,
          locked_after: false,
        }),
        notes: `Session unlocked`,
      });

      toast.success('Session unlocked');
    } catch (error) {
      toast.error('Failed to unlock session');
    }
  };

  // Handle log incident
  const handleLogIncident = async () => {
    if (!incidentNote.trim()) {
      toast.error('Note cannot be empty');
      return;
    }

    try {
      await createLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'race_control_incident',
        entity_name: 'Event',
        entity_id: selectedEvent.id,
        source_type: 'race_control',
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          session_id: selectedSessionId || null,
          severity: incidentSeverity,
          note: incidentNote,
          created_by_user_id: user?.id,
        }),
        notes: incidentNote,
      });

      setIncidentNote('');
      setIncidentSeverity('Medium');
      toast.success('Incident logged');
    } catch (error) {
      toast.error('Failed to log incident');
    }
  };

  // Handle override
  const handleOverride = async (action) => {
    if (!selectedSession || !overrideReason.trim()) {
      toast.error('Reason required');
      return;
    }

    const updates = action === 'force_official' 
      ? { status: 'Official', locked: false }
      : { status: 'Locked', locked: true };

    try {
      await updateSessionMutation.mutateAsync({
        id: selectedSession.id,
        updates,
      });

      await createLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'race_control_override',
        entity_name: 'Session',
        entity_id: selectedSession.id,
        source_type: 'race_control',
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          session_id: selectedSession.id,
          requested_action: action,
          reason: overrideReason,
          previous_status: selectedSession.status,
          new_status: updates.status,
          locked_before: selectedSession.locked,
          locked_after: updates.locked,
          override_by_user_id: user?.id,
        }),
        notes: `Admin override: ${action}. Reason: ${overrideReason}`,
      });

      setOverrideReason('');
      toast.success('Override applied');
    } catch (error) {
      toast.error('Failed to apply override');
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

  const canOverride = dashboardPermissions?.actions?.includes('race_control_override');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Race Control</CardTitle>
          <p className="text-xs text-gray-400 mt-1">Session management, incident logging, and admin overrides</p>
        </CardHeader>
      </Card>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-gray-400 uppercase tracking-wide block">Class</label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-800">
              <SelectItem value="all">All Classes</SelectItem>
              {classList.map(cls => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-400 uppercase tracking-wide block">Session</label>
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
              <SelectValue />
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

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-900/30' },
          { label: 'Draft', value: stats.draft, color: 'bg-blue-900/20' },
          { label: 'Prov.', value: stats.provisional, color: 'bg-yellow-900/20' },
          { label: 'Off.', value: stats.official, color: 'bg-green-900/20' },
          { label: 'Lock', value: stats.locked, color: 'bg-red-900/20' },
        ].map(stat => (
          <Card key={stat.label} className={`border-gray-800 ${stat.color}`}>
            <CardContent className="pt-4 text-center">
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session Details */}
      {selectedSession && (
        <>
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">{selectedSession.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-400">Type</p>
                  <p className="text-white font-semibold">{selectedSession.session_type}</p>
                </div>
                <div>
                  <p className="text-gray-400">Results</p>
                  <p className="text-white font-semibold">{sessionResultCount}</p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <Badge className={`mt-1 ${
                    selectedSession.status === 'Official' ? 'bg-green-900/40 text-green-300' :
                    selectedSession.status === 'Locked' ? 'bg-red-900/40 text-red-300' :
                    selectedSession.status === 'Provisional' ? 'bg-yellow-900/40 text-yellow-300' :
                    'bg-blue-900/40 text-blue-300'
                  }`}>
                    {selectedSession.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-400">Locked</p>
                  <p className="text-white font-semibold">{selectedSession.locked ? 'Yes' : 'No'}</p>
                </div>
              </div>

              <Separator className="bg-gray-800" />

              {/* Status Control */}
              <div className="space-y-3">
                <label className="text-xs text-gray-400 uppercase tracking-wide block">Change Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleSaveStatus}
                  disabled={!newStatus || updateSessionMutation.isPending}
                  className="w-full bg-blue-700 hover:bg-blue-600 text-white text-xs h-8"
                >
                  Save Status
                </Button>
              </div>

              {/* Lock/Unlock */}
              <div className="flex gap-2">
                {!selectedSession.locked ? (
                  <Button
                    onClick={handleLock}
                    disabled={updateSessionMutation.isPending}
                    className="flex-1 bg-red-700 hover:bg-red-600 text-white text-xs h-8 gap-1"
                  >
                    <Lock className="w-3 h-3" /> Lock
                  </Button>
                ) : (
                  <Button
                    onClick={handleUnlock}
                    disabled={updateSessionMutation.isPending}
                    className="flex-1 bg-amber-700 hover:bg-amber-600 text-white text-xs h-8 gap-1"
                  >
                    <Unlock className="w-3 h-3" /> Unlock
                  </Button>
                )}
              </div>

              {/* Admin Override */}
              {canOverride && (
                <>
                  <Separator className="bg-gray-800" />
                  <div className="bg-yellow-900/20 border border-yellow-800 p-3 rounded-lg">
                    <p className="text-xs text-yellow-300 font-semibold mb-3 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Admin Override
                    </p>
                    <div className="space-y-2">
                      <textarea
                        placeholder="Reason for override..."
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded text-xs text-white p-2 h-16"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleOverride('force_official')}
                          disabled={!overrideReason.trim() || updateSessionMutation.isPending}
                          className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs h-7"
                        >
                          Force Official
                        </Button>
                        <Button
                          onClick={() => handleOverride('force_lock')}
                          disabled={!overrideReason.trim() || updateSessionMutation.isPending}
                          className="flex-1 bg-red-700 hover:bg-red-600 text-white text-xs h-7"
                        >
                          Force Lock
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Incident Notes */}
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Log Incident</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Incident description..."
                value={incidentNote}
                onChange={(e) => setIncidentNote(e.target.value)}
                className="bg-gray-900 border-gray-800 text-white text-xs h-16"
              />
              <Select value={incidentSeverity} onValueChange={setIncidentSeverity}>
                <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  {SEVERITY_OPTIONS.map(sev => (
                    <SelectItem key={sev} value={sev}>
                      {sev}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleLogIncident}
                disabled={!incidentNote.trim() || createLogMutation.isPending}
                className="w-full bg-purple-700 hover:bg-purple-600 text-white text-xs h-8"
              >
                Log Incident
              </Button>
            </CardContent>
          </Card>

          {/* Incident History */}
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Recent Incidents & Updates</CardTitle>
            </CardHeader>
            <CardContent>
              {raceLogs.length === 0 ? (
                <p className="text-xs text-gray-500">No incidents or updates logged</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {raceLogs.map((log, idx) => {
                    const meta = (() => {
                      try {
                        return JSON.parse(log.metadata || '{}');
                      } catch {
                        return {};
                      }
                    })();

                    return (
                      <div key={idx} className="bg-gray-900/30 p-3 rounded text-xs border-l-2 border-gray-700">
                        <div className="flex items-start gap-2 mb-1">
                          <Badge className={`${
                            log.operation_type === 'race_control_incident' ? 'bg-orange-900/40 text-orange-300' :
                            log.operation_type === 'race_control_override' ? 'bg-red-900/40 text-red-300' :
                            'bg-blue-900/40 text-blue-300'
                          }`}>
                            {log.operation_type === 'race_control_incident' ? 'Incident' :
                             log.operation_type === 'race_control_override' ? 'Override' :
                             'Update'}
                          </Badge>
                          {meta.severity && (
                            <Badge className={`${
                              meta.severity === 'High' ? 'bg-red-900/40 text-red-300' :
                              meta.severity === 'Medium' ? 'bg-yellow-900/40 text-yellow-300' :
                              'bg-blue-900/40 text-blue-300'
                            }`}>
                              {meta.severity}
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-300 mb-1">{log.notes || meta.note}</p>
                        <p className="text-gray-500">
                          {new Date(log.created_date).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}