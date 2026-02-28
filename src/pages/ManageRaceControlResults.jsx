import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Unlock, Save, FileJson, Upload, Zap, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import ManualResultsEntry from '@/components/racecontrol/ManualResultsEntry';
import CSVResultsImport from '@/components/racecontrol/CSVResultsImport';
import APISyncResults from '@/components/racecontrol/APISyncResults';

export default function ManageRaceControlResults() {
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [mode, setMode] = useState('manual');

  // Fetch events
  const { data: events = [] } = useQuery({
    queryKey: ['raceControlEvents'],
    queryFn: () => base44.entities.RaceControlEvent.list(),
  });

  // Fetch classes for selected event
  const { data: classes = [] } = useQuery({
    queryKey: ['eventClasses', selectedEvent],
    queryFn: () => base44.entities.RaceControlEventClass.filter(
      { racecontrolevent_id: selectedEvent }
    ),
    enabled: !!selectedEvent,
  });

  // Fetch sessions for selected class
  const { data: sessions = [] } = useQuery({
    queryKey: ['eventSessions', selectedEvent, selectedClass],
    queryFn: async () => {
      if (!selectedClass) {
        const allSessions = await base44.entities.RaceControlSession.filter(
          { racecontrolevent_id: selectedEvent }
        );
        return allSessions;
      }
      return base44.entities.RaceControlSession.filter(
        { racecontrolevent_id: selectedEvent, racecontroleventclass_id: selectedClass }
      );
    },
    enabled: !!selectedEvent,
  });

  // Fetch current session
  const currentSession = sessions.find(s => s.id === selectedSession);

  // Fetch results for selected session
  const { data: sessionResults = [] } = useQuery({
    queryKey: ['sessionResults', selectedSession],
    queryFn: async () => {
      if (!selectedSession || !currentSession) return [];
      // For now, return empty - in production would fetch from a results table
      return [];
    },
    enabled: !!selectedSession && !!currentSession,
  });

  // Update session status mutation
  const updateSessionStatusMutation = useMutation({
    mutationFn: ({ sessionId, status }) =>
      base44.entities.RaceControlSession.update(sessionId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventSessions'] });
    },
  });

  const getEventName = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event?.event_name || '—';
  };

  const handlePublishResults = () => {
    if (!selectedSession) return;
    updateSessionStatusMutation.mutate({
      sessionId: selectedSession,
      status: 'completed',
    });
  };

  const handleLockSession = () => {
    if (!selectedSession) return;
    // Lock would be implemented via a session_locked field
    // For now, we'll disable further editing via UI state
  };

  const sessionStatus = currentSession?.status || 'scheduled';
  const isLocked = false; // Would come from session data in production

  return (
    <PageShell>
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">Race Results</h1>
            <p className="text-gray-600">Manage session results and points calculation</p>
          </div>

          {/* Top Controls */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Event</label>
                <Select value={selectedEvent} onValueChange={(value) => {
                  setSelectedEvent(value);
                  setSelectedClass('');
                  setSelectedSession('');
                }}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>{event.event_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Class</label>
                <Select value={selectedClass} onValueChange={(value) => {
                  setSelectedClass(value);
                  setSelectedSession('');
                }} disabled={!selectedEvent}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Classes</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.class_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Session</label>
                <Select value={selectedSession} onValueChange={setSelectedSession} disabled={!selectedEvent}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map(session => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.session_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Session Status and Controls */}
            {selectedSession && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  {sessionStatus === 'scheduled' && (
                    <>
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-600">Scheduled</span>
                    </>
                  )}
                  {sessionStatus === 'in_progress' && (
                    <>
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-semibold text-yellow-700">In Progress</span>
                    </>
                  )}
                  {sessionStatus === 'completed' && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">Completed</span>
                    </>
                  )}
                  {isLocked && (
                    <>
                      <Lock className="w-4 h-4 text-red-600 ml-2" />
                      <span className="text-xs text-red-600">Locked</span>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  {sessionStatus !== 'completed' && (
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={handlePublishResults}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Publish Official
                    </Button>
                  )}
                  {!isLocked && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={handleLockSession}
                    >
                      <Lock className="w-4 h-4" />
                      Lock Session
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* No Session Selected */}
          {!selectedSession ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Select an event, class, and session to manage results</p>
            </div>
          ) : (
            <>
              {/* Mode Tabs */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Session Results</CardTitle>
                    <CardDescription>{currentSession?.session_name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={mode} onValueChange={setMode} className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="manual" className="gap-2">
                          <Save className="w-4 h-4" />
                          Manual Entry
                        </TabsTrigger>
                        <TabsTrigger value="csv" className="gap-2">
                          <Upload className="w-4 h-4" />
                          CSV Import
                        </TabsTrigger>
                        <TabsTrigger value="api" className="gap-2">
                          <Zap className="w-4 h-4" />
                          API Sync
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="manual" className="mt-6">
                        <ManualResultsEntry
                          sessionId={selectedSession}
                          eventId={selectedEvent}
                          classId={selectedClass}
                          results={sessionResults}
                          isLocked={isLocked}
                        />
                      </TabsContent>

                      <TabsContent value="csv" className="mt-6">
                        <CSVResultsImport
                          sessionId={selectedSession}
                          eventId={selectedEvent}
                          isLocked={isLocked}
                        />
                      </TabsContent>

                      <TabsContent value="api" className="mt-6">
                        <APISyncResults
                          sessionId={selectedSession}
                          eventId={selectedEvent}
                          isLocked={isLocked}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Import History */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Import History</CardTitle>
                    <CardDescription>Recent result imports and changes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      No import history yet
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Version History */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Version History</CardTitle>
                    <CardDescription>Changes and revisions to this session</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      No version history yet
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}