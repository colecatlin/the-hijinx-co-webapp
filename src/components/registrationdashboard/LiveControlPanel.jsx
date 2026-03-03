import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { canTransition, applyTransition, cascadeEffects, getValidNextStates } from '@/components/racecore/operationalStateEngine';
import { Lock, Unlock, AlertCircle } from 'lucide-react';

export default function LiveControlPanel({ selectedEvent, selectedSeries, invalidateAfterOperation }) {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedSessionClass, setSelectedSessionClass] = useState('');

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.Session.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['standings', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id && selectedEvent?.series_id
      ? base44.entities.Standings.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id && !!selectedEvent?.series_id,
  });

  // Event state mutations
  const eventUpdateMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.update(selectedEvent.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', selectedEvent.id] });
      invalidateAfterOperation('event_status_changed', { eventId: selectedEvent.id });
      toast.success('Event status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update event: ${error.message}`);
    },
  });

  // Session state mutations
  const sessionUpdateMutation = useMutation({
    mutationFn: ({ sessionId, data }) => base44.entities.Session.update(sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', selectedEvent?.id] });
      invalidateAfterOperation('session_status_changed', { eventId: selectedEvent.id });
      toast.success('Session status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update session: ${error.message}`);
    },
  });

  // Standings mutations
  const standingsUpdateMutation = useMutation({
    mutationFn: ({ standingsId, data }) => base44.entities.Standings.update(standingsId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings', selectedEvent?.id] });
      invalidateAfterOperation('standings_updated', { eventId: selectedEvent.id });
      toast.success('Standings status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update standings: ${error.message}`);
    },
  });

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to access live controls</p>
        </CardContent>
      </Card>
    );
  }

  // Map DB status to operational state
  const statusMap = {
    'upcoming': 'Draft',
    'in_progress': 'Published',
    'completed': 'Completed',
    'cancelled': 'Archived',
  };

  const dbStatusMap = {
    'Draft': 'upcoming',
    'Published': 'in_progress',
    'Completed': 'completed',
    'Archived': 'cancelled',
  };

  const currentEventOpsState = statusMap[selectedEvent.status] || 'Draft';
  const validEventNextStates = getValidNextStates('Event', currentEventOpsState);

  // Handle event state transitions
  const handleEventTransition = (nextOpsState) => {
    if (!canTransition('Event', currentEventOpsState, nextOpsState)) {
      toast.error(`Cannot transition from ${currentEventOpsState} to ${nextOpsState}`);
      return;
    }

    const nextDbStatus = dbStatusMap[nextOpsState];
    if (!nextDbStatus) {
      toast.error('Invalid state mapping');
      return;
    }

    const cascadeInstructions = cascadeEffects('Event', selectedEvent, nextOpsState);
    if (cascadeInstructions.warnings?.length > 0) {
      cascadeInstructions.warnings.forEach(w => toast.info(w));
    }

    eventUpdateMutation.mutate({ status: nextDbStatus });
  };

  // Handle session state transitions
  const handleSessionTransition = (session, nextSessionState) => {
    const currentSessionState = session.status || 'Draft';
    if (!canTransition('Session', currentSessionState, nextSessionState)) {
      toast.error(`Cannot transition from ${currentSessionState} to ${nextSessionState}`);
      return;
    }

    const cascadeInstructions = cascadeEffects('Session', session, nextSessionState);
    if (cascadeInstructions.warnings?.length > 0) {
      cascadeInstructions.warnings.forEach(w => toast.info(w));
    }

    sessionUpdateMutation.mutate({
      sessionId: session.id,
      data: { status: nextSessionState },
    });
  };

  // Group sessions by class and type
  const groupedSessions = sessions.reduce((acc, session) => {
    const key = `${session.series_class_id || 'unclassified'}-${session.session_type}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(session);
    return acc;
  }, {});

  const sessionClassOptions = sessions.map(s => s.series_class_id).filter(Boolean);
  const uniqueClasses = [...new Set(sessionClassOptions)];

  return (
    <div className="space-y-4">
      {/* Card A: Event State Control */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white text-sm">Event State Control</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-2">Current Status</p>
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-blue-900/40 text-blue-300 text-xs">
                {currentEventOpsState}
              </Badge>
              <p className="text-xs text-gray-400">{selectedEvent.status}</p>
            </div>
          </div>

          <div className="space-y-2">
            {validEventNextStates.map(nextState => {
              const nextDbStatus = dbStatusMap[nextState];
              const label = {
                'Published': 'Publish Event',
                'Draft': 'Revert to Draft',
                'Completed': 'Complete Event',
                'Archived': 'Archive Event',
              }[nextState] || nextState;

              return (
                <Button
                  key={nextState}
                  onClick={() => handleEventTransition(nextState)}
                  disabled={eventUpdateMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                >
                  {label}
                </Button>
              );
            })}
            {validEventNextStates.length === 0 && (
              <p className="text-xs text-gray-400">No valid transitions available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card B: Session Control */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white text-sm">Session Control</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {sessions.length === 0 ? (
            <p className="text-xs text-gray-400">No sessions in this event</p>
          ) : (
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-2">
                {sessions.map(session => {
                  const currentSessionState = session.status || 'Draft';
                  const validNextStates = getValidNextStates('Session', currentSessionState);

                  return (
                    <div key={session.id} className="p-3 bg-gray-900/50 rounded border border-gray-800 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-gray-300">{session.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-purple-900/40 text-purple-300 text-xs">
                              {currentSessionState}
                            </Badge>
                            {session.locked && (
                              <Lock className="w-3 h-3 text-red-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {validNextStates.length > 0 && (
                        <div className="space-y-1">
                          {validNextStates.map(nextState => {
                            const label = {
                              'Scheduled': 'Schedule',
                              'InProgress': 'Start',
                              'Provisional': 'Mark Provisional',
                              'Official': 'Publish Official',
                              'Locked': 'Lock',
                            }[nextState] || nextState;

                            return (
                              <Button
                                key={nextState}
                                size="sm"
                                onClick={() => handleSessionTransition(session, nextState)}
                                disabled={sessionUpdateMutation.isPending}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-7"
                              >
                                {label}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Card C: Results Publish Control */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white text-sm">Results Publish Control</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {sessions.length === 0 ? (
            <p className="text-xs text-gray-400">No sessions available</p>
          ) : (
            <>
              <div>
                <label className="text-xs text-gray-400 mb-2 block">Select Session</label>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs">
                    <SelectValue placeholder="Choose session..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {sessions.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-white text-xs">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSessionId && (
                (() => {
                  const session = sessions.find(s => s.id === selectedSessionId);
                  const currentState = session?.status || 'Draft';
                  const canPublish = currentState === 'Provisional';

                  return (
                    <div className="space-y-2">
                      <div className="text-xs">
                        <p className="text-gray-400 mb-1">Session Status</p>
                        <Badge className="bg-pink-900/40 text-pink-300 text-xs">
                          {currentState}
                        </Badge>
                      </div>
                      {canPublish ? (
                        <Button
                          onClick={() => handleSessionTransition(session, 'Official')}
                          disabled={sessionUpdateMutation.isPending}
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                        >
                          Publish Session Official
                        </Button>
                      ) : (
                        <div className="p-2 bg-yellow-900/30 rounded border border-yellow-800/50 flex items-start gap-2">
                          <AlertCircle className="w-3 h-3 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-yellow-300">
                            Session must be in Provisional state to publish results
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Card D: Standings Control */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="border-b border-gray-800">
          <CardTitle className="text-white text-sm">Standings Control</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {standings.length === 0 ? (
            <p className="text-xs text-gray-400">No standings data available</p>
          ) : (
            <div className="space-y-3">
              {standings.map(standing => {
                const currentState = standing.status || 'Draft';
                const validNextStates = getValidNextStates('Standings', currentState);

                return (
                  <div key={standing.id} className="p-3 bg-gray-900/50 rounded border border-gray-800 space-y-2">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Status</p>
                      <Badge className="bg-orange-900/40 text-orange-300 text-xs">
                        {currentState}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      {validNextStates.map(nextState => (
                        <Button
                          key={nextState}
                          size="sm"
                          onClick={() => standingsUpdateMutation.mutate({
                            standingsId: standing.id,
                            data: { status: nextState },
                          })}
                          disabled={standingsUpdateMutation.isPending}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs h-7"
                        >
                          {nextState === 'Provisional' && 'Publish Provisional'}
                          {nextState === 'Official' && 'Publish Official'}
                          {nextState === 'Locked' && 'Lock'}
                          {!['Provisional', 'Official', 'Locked'].includes(nextState) && nextState}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}