import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

export default function RaceControlConsole({
  selectedEvent,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // Load sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['racecore', 'race_control_console', 'sessions', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.Session.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  // Load results
  const { data: results = [] } = useQuery({
    queryKey: ['racecore', 'race_control_console', 'results', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.Results.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  // Mutations
  const updateSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.Session.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['racecore', 'race_control_console', 'sessions', selectedEvent?.id],
      });
    },
  });

  const logMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.OperationLog.create(data),
  });

  // Handlers
  const handleStatusChange = async (session, newStatus) => {
    try {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        status: newStatus,
      });

      await logMutation.mutateAsync({
        operation_type: 'race_control_session_status_changed',
        entity_name: 'Session',
        entity_id: session.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          session_id: session.id,
          new_status: newStatus,
          old_status: session.status,
        },
      });

      invalidateAfterOperation('session_updated');
      toast.success(`Session status changed to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update session status');
      console.error(error);
    }
  };

  const handleToggleLock = async (session) => {
    try {
      const nextLocked = !session.locked;
      await updateSessionMutation.mutateAsync({
        id: session.id,
        locked: nextLocked,
      });

      await logMutation.mutateAsync({
        operation_type: 'race_control_session_locked',
        entity_name: 'Session',
        entity_id: session.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          session_id: session.id,
          locked: nextLocked,
        },
      });

      invalidateAfterOperation('session_updated');
      toast.success(nextLocked ? 'Session locked' : 'Session unlocked');
    } catch (error) {
      toast.error('Failed to update lock status');
      console.error(error);
    }
  };

  const handlePublishOfficial = async (session) => {
    try {
      await updateSessionMutation.mutateAsync({
        id: session.id,
        status: 'Official',
        locked: true,
      });

      await logMutation.mutateAsync({
        operation_type: 'race_control_publish_official',
        entity_name: 'Session',
        entity_id: session.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          session_id: session.id,
        },
      });

      invalidateAfterOperation('session_updated');
      toast.success('Session published as Official');
    } catch (error) {
      toast.error('Failed to publish session');
      console.error(error);
    }
  };

  // Derived data
  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const sessionResults = selectedSession
    ? results.filter(r => r.session_id === selectedSession.id)
    : [];

  const resultHealthMetrics = useMemo(() => {
    if (!selectedSession) return { totalResults: 0, hasDuplicates: false, missingDrivers: false };

    const totalResults = sessionResults.length;
    const positions = new Set(sessionResults.map(r => r.position_finish));
    const hasDuplicates = positions.size < sessionResults.length;
    const missingDrivers = sessionResults.some(r => !r.driver_id);

    return { totalResults, hasDuplicates, missingDrivers };
  }, [selectedSession, sessionResults]);

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">Select an event to access Race Control Console</p>
        </CardContent>
      </Card>
    );
  }

  if (sessionsLoading) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Loading sessions...</p>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-blue-500 mx-auto mb-3" />
          <p className="text-gray-400">No sessions created yet</p>
          <p className="text-sm text-gray-500 mt-2">Create sessions in the Classes and Sessions tab</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-screen">
      {/* Left: Session List */}
      <div className="lg:col-span-1 space-y-2">
        <h3 className="text-sm font-semibold text-white px-1">Sessions</h3>
        <div className="space-y-2">
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => setSelectedSessionId(session.id)}
              className={`w-full text-left p-3 rounded border transition-colors ${
                selectedSessionId === session.id
                  ? 'bg-blue-900/30 border-blue-700'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              }`}
            >
              <p className="text-sm font-semibold text-white">{session.name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs bg-gray-800 text-gray-300">
                  {session.status || 'Draft'}
                </Badge>
                {session.locked && (
                  <Badge variant="outline" className="text-xs bg-orange-900/30 text-orange-400">
                    <Lock className="w-3 h-3 mr-1" /> Locked
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Control Panel */}
      <div className="lg:col-span-2">
        {selectedSession ? (
          <div className="space-y-4">
            {/* Header */}
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">{selectedSession.name}</CardTitle>
              </CardHeader>
            </Card>

            {/* Status Control */}
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Status Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Session Status</label>
                  <Select value={selectedSession.status || 'Draft'} onValueChange={(value) => handleStatusChange(selectedSession, value)}>
                    <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="Draft" className="text-white">Draft</SelectItem>
                      <SelectItem value="Provisional" className="text-white">Provisional</SelectItem>
                      <SelectItem value="Official" className="text-white">Official</SelectItem>
                      <SelectItem value="Locked" className="text-white">Locked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lock Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Lock Session</span>
                  <Button
                    onClick={() => handleToggleLock(selectedSession)}
                    className={`gap-2 ${
                      selectedSession.locked
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {selectedSession.locked ? (
                      <>
                        <Lock className="w-4 h-4" /> Locked
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" /> Unlocked
                      </>
                    )}
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="pt-3 border-t border-gray-700 space-y-2">
                  <Button
                    onClick={() => handleStatusChange(selectedSession, 'Provisional')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
                  >
                    Mark Provisional
                  </Button>
                  <Button
                    onClick={() => handlePublishOfficial(selectedSession)}
                    className="w-full bg-green-600 hover:bg-green-700 text-sm"
                  >
                    Publish Official
                  </Button>
                  <Button
                    onClick={() => handleToggleLock(selectedSession)}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-sm"
                  >
                    Toggle Lock
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Health */}
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Results Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-900 rounded">
                  <span className="text-sm text-gray-400">Total Results</span>
                  <span className="text-lg font-bold text-white">{resultHealthMetrics.totalResults}</span>
                </div>
                {resultHealthMetrics.totalResults === 0 && (
                  <div className="p-2 bg-red-900/20 border border-red-800/50 rounded">
                    <p className="text-xs text-red-300">⚠ No results entered</p>
                  </div>
                )}
                {resultHealthMetrics.hasDuplicates && (
                  <div className="p-2 bg-yellow-900/20 border border-yellow-800/50 rounded">
                    <p className="text-xs text-yellow-300">⚠ Duplicate positions detected</p>
                  </div>
                )}
                {resultHealthMetrics.missingDrivers && (
                  <div className="p-2 bg-yellow-900/20 border border-yellow-800/50 rounded">
                    <p className="text-xs text-yellow-300">⚠ Missing driver linkage</p>
                  </div>
                )}
                {resultHealthMetrics.totalResults > 0 &&
                  !resultHealthMetrics.hasDuplicates &&
                  !resultHealthMetrics.missingDrivers && (
                    <div className="p-2 bg-green-900/20 border border-green-800/50 rounded">
                      <p className="text-xs text-green-300">✓ Results look good</p>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-[#171717] border-gray-800">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-8 h-8 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">Select a session to control</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}