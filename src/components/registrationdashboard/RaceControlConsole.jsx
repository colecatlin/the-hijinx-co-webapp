import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  const [selectedSessionId, setSelectedSessionId] = useState(null);

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

  // Load sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['raceControl', 'sessions', selectedEvent.id],
    queryFn: () => base44.entities.Session.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent.id,
  });

  // Load results
  const { data: results = [] } = useQuery({
    queryKey: ['raceControl', 'results', selectedEvent.id],
    queryFn: () => base44.entities.Results.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent.id,
  });

  // Mutations
  const updateSessionMutation = useMutation({
    mutationFn: ({ sessionId, data }) => base44.entities.Session.update(sessionId, data),
  });

  const logOperationMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.OperationLog.create(data),
  });

  // Handle session update
  const handleSessionUpdate = async (session, updates, operationType) => {
    try {
      await updateSessionMutation.mutateAsync({
        sessionId: session.id,
        data: updates,
      });

      // Log operation
      await logOperationMutation.mutateAsync({
        operation_type: operationType,
        entity_name: 'Session',
        entity_id: session.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          session_id: session.id,
          changes: updates,
          before_status: session.status,
          after_status: updates.status || session.status,
        },
      });

      // Invalidate queries
      await invalidateAfterOperation('session_updated', { sessionId: session.id });
      toast.success(`Session updated: ${operationType}`);
    } catch (error) {
      toast.error(`Failed to update session: ${error.message}`);
      console.error(error);
    }
  };

  // Sort sessions by order and type
  const sortedSessions = useMemo(() => {
    const SESSION_TYPE_ORDER = ['Practice', 'Qualifying', 'Heat', 'LCQ', 'Final'];
    return [...sessions].sort((a, b) => {
      const aIdx = SESSION_TYPE_ORDER.indexOf(a.session_type || '');
      const bIdx = SESSION_TYPE_ORDER.indexOf(b.session_type || '');
      if (aIdx !== bIdx) return (aIdx >= 0 ? aIdx : 999) - (bIdx >= 0 ? bIdx : 999);
      return (a.session_order || 0) - (b.session_order || 0);
    });
  }, [sessions]);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  // Results health for selected session
  const resultsHealth = useMemo(() => {
    if (!selectedSession) return null;
    const sessionResults = results.filter(r => r.session_id === selectedSession.id);
    const positions = sessionResults.map(r => r.position).filter(Boolean);
    const duplicatePositions = positions.length !== new Set(positions).size;
    const totalResults = sessionResults.length;
    const missingDriver = sessionResults.filter(r => !r.driver_id).length;

    return {
      totalResults,
      duplicatePositions,
      missingDriver,
    };
  }, [selectedSession, results]);

  if (sessionsLoading) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-8 text-center">
          <p className="text-gray-400">Loading sessions...</p>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">No sessions created yet</p>
          <p className="text-xs text-gray-500 mt-2">Create sessions in Classes & Sessions tab to enable race control</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Session List */}
      <div className="lg:col-span-1">
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  selectedSessionId === session.id
                    ? 'bg-blue-900/30 border-blue-500'
                    : 'bg-gray-900/30 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-white text-sm">{session.name}</div>
                  {session.locked && <Lock className="w-3 h-3 text-red-400" />}
                </div>
                <div className="text-xs text-gray-400 flex gap-2">
                  <span>{session.session_type}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs px-1.5 py-0 ${
                      ['Official', 'Locked'].includes(session.status)
                        ? 'border-green-600 bg-green-900/20 text-green-300'
                        : 'border-gray-600 bg-gray-900/20 text-gray-300'
                    }`}
                  >
                    {session.status}
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Session Control Panel */}
      <div className="lg:col-span-2">
        {!selectedSession ? (
          <Card className="bg-[#171717] border-gray-800">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Select a session to manage</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Session Info */}
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">{selectedSession.name}</CardTitle>
                <p className="text-xs text-gray-400 mt-2">
                  {selectedSession.session_type}
                  {selectedSession.laps && ` • ${selectedSession.laps} laps`}
                  {selectedSession.scheduled_time && ` • ${new Date(selectedSession.scheduled_time).toLocaleTimeString()}`}
                </p>
              </CardHeader>
            </Card>

            {/* Status Control */}
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-sm text-white">Session Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Select
                    value={selectedSession.status || 'Draft'}
                    onValueChange={(newStatus) =>
                      handleSessionUpdate(
                        selectedSession,
                        { status: newStatus },
                        'race_control_session_status_changed'
                      )
                    }
                  >
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

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700">
                  <Button
                    onClick={() =>
                      handleSessionUpdate(
                        selectedSession,
                        { status: 'Provisional' },
                        'race_control_session_status_changed'
                      )
                    }
                    size="sm"
                    className="text-xs bg-orange-600 hover:bg-orange-700"
                  >
                    Mark Provisional
                  </Button>
                  <Button
                    onClick={() =>
                      handleSessionUpdate(
                        selectedSession,
                        { status: 'Official' },
                        'race_control_publish_official'
                      )
                    }
                    size="sm"
                    className="text-xs bg-green-600 hover:bg-green-700"
                  >
                    Publish Official
                  </Button>
                  <Button
                    onClick={() =>
                      handleSessionUpdate(
                        selectedSession,
                        { status: 'Locked', locked: true },
                        'race_control_session_locked'
                      )
                    }
                    size="sm"
                    className="text-xs bg-red-600 hover:bg-red-700 col-span-2"
                  >
                    Lock Session
                  </Button>
                </div>

                {/* Lock Toggle */}
                <div className="pt-2 border-t border-gray-700 flex items-center gap-2">
                  <Button
                    onClick={() =>
                      handleSessionUpdate(
                        selectedSession,
                        { locked: !selectedSession.locked },
                        'race_control_session_locked'
                      )
                    }
                    size="sm"
                    variant="outline"
                    className="text-xs border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    {selectedSession.locked ? (
                      <>
                        <Unlock className="w-3 h-3 mr-1" /> Unlock
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 mr-1" /> Lock
                      </>
                    )}
                  </Button>
                  <span className="text-xs text-gray-500">
                    {selectedSession.locked ? 'Session locked' : 'Unlocked'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Results Health Indicator */}
            {resultsHealth && (
              <Card className={`border-2 ${
                resultsHealth.totalResults === 0
                  ? 'bg-red-900/20 border-red-700'
                  : resultsHealth.duplicatePositions || resultsHealth.missingDriver > 0
                  ? 'bg-yellow-900/20 border-yellow-700'
                  : 'bg-green-900/20 border-green-700'
              }`}>
                <CardHeader>
                  <CardTitle className="text-sm text-white">Results Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Results:</span>
                    <span className="text-white font-semibold">{resultsHealth.totalResults}</span>
                  </div>
                  {resultsHealth.totalResults === 0 && (
                    <div className="text-red-300 font-semibold">⚠ No results posted</div>
                  )}
                  {resultsHealth.duplicatePositions && (
                    <div className="text-yellow-300">⚠ Duplicate positions detected</div>
                  )}
                  {resultsHealth.missingDriver > 0 && (
                    <div className="text-yellow-300">⚠ {resultsHealth.missingDriver} result(s) missing driver</div>
                  )}
                  {resultsHealth.totalResults > 0 && !resultsHealth.duplicatePositions && resultsHealth.missingDriver === 0 && (
                    <div className="text-green-300 font-semibold">✓ All healthy</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}