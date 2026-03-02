import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import ResultsControlBar from './results/ResultsControlBar';
import ResultsManualEntry from './results/ResultsManualEntry';
import ResultsCSVUpload from './results/ResultsCSVUpload';
import ResultsAPISync from './results/ResultsAPISync';
import ResultsSessionMeta from './results/ResultsSessionMeta';

export default function ResultsManager({ selectedEvent, isAdmin, standingsLastCalculatedAt, onSetStandingsDirty, onResultsSaved, onResultsProvisional, onResultsOfficial, onResultsLocked }) {
  const [organizationType, setOrganizationType] = useState('track');
  const [trackId, setTrackId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [seasonYear, setSeasonYear] = useState('');
  const [eventId, setEventId] = useState(selectedEvent?.id || '');
  const [classId, setClassId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [entryMode, setEntryMode] = useState('manual');
  const [showStandingsWarning, setShowStandingsWarning] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const queryClient = useQueryClient();

  const DQ = { staleTime: 30_000, gcTime: 300_000, refetchOnWindowFocus: false, refetchOnReconnect: false, retry: 1 };

  // Reset session/class selection when eventId changes
  React.useEffect(() => {
    setSessionId('');
    setClassId('');
    setEntryMode('manual');
  }, [eventId]);

  // Fetch all necessary data
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
    ...DQ,
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    ...DQ,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    ...DQ,
  });

  const { data: sessions = [], isLoading: sessionsLoading, isError: sessionsError, refetch: refetchSessions } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => base44.entities.Session.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: seriesId }),
    enabled: !!seriesId,
    ...DQ,
  });

  const { data: allResults = [], isLoading: resultsLoading, isError: resultsError, refetch: refetchResults } = useQuery({
    queryKey: ['results', eventId],
    queryFn: () => base44.entities.Results.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: seriesClassesAll = [] } = useQuery({
    queryKey: ['seriesClassesAll', selectedEvent?.series_id],
    queryFn: () => base44.entities.SeriesClass.filter({ series_id: selectedEvent.series_id }),
    enabled: !!selectedEvent?.series_id,
    ...DQ,
  });

  // Data integrity: filter results and sessions to match selected event
  const results = useMemo(() => {
    if (!selectedEvent) return allResults;
    const filtered = allResults.filter((result) => {
      if (result.event_id === selectedEvent.id && result.series_id !== selectedEvent.series_id) {
        console.warn('Series mismatch detected for event-linked record.');
        return false;
      }
      return true;
    });
    return filtered;
  }, [allResults, selectedEvent]);

  const validatedSessions = useMemo(() => {
    if (!selectedEvent) return sessions;
    const validated = sessions.filter((session) => {
      if (session.event_id !== selectedEvent.id) {
        return false;
      }
      if (session.series_class_id) {
        const matchingClass = seriesClassesAll.find((sc) => sc.id === session.series_class_id);
        if (matchingClass && matchingClass.series_id !== selectedEvent.series_id) {
          console.warn('Session series_class mismatch detected.');
          return false;
        }
      }
      return true;
    });
    return validated;
  }, [sessions, selectedEvent, seriesClassesAll]);

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
    ...DQ,
  });

  const { data: allDriverPrograms = [] } = useQuery({
    queryKey: ['driverPrograms', selectedEvent?.id],
    queryFn: () => base44.entities.DriverProgram.list(),
    ...DQ,
  });

  // Data integrity: filter driverPrograms to match selected event's series_id
  const driverPrograms = useMemo(() => {
    if (!selectedEvent) return allDriverPrograms;
    const filtered = allDriverPrograms.filter((dp) => {
      if (dp.event_id === selectedEvent.id && dp.series_id !== selectedEvent.series_id) {
        console.warn('Series mismatch detected for event-linked record.');
        return false;
      }
      return true;
    });
    return filtered;
  }, [allDriverPrograms, selectedEvent]);

  // Data integrity: validate results against DriverProgram and SeriesClass
  const validatedResults = useMemo(() => {
    if (!selectedEvent) return results;
    
    const validated = results.filter((result) => {
      // Rule 2: If result has program_id, validate DriverProgram
      if (result.program_id) {
        const program = allDriverPrograms.find((dp) => dp.id === result.program_id);
        if (!program) {
          console.warn('Result to DriverProgram mismatch detected.');
          return false;
        }
        if (program.event_id !== selectedEvent.id || program.series_id !== selectedEvent.series_id) {
          console.warn('Result to DriverProgram mismatch detected.');
          return false;
        }
      }

      // Rule 3: If result has series_class_id, validate it belongs to event's series
      if (result.series_class_id) {
        const matchingClass = seriesClassesAll.find((sc) => sc.id === result.series_class_id);
        if (matchingClass && matchingClass.series_id !== selectedEvent.series_id) {
          console.warn('Result class mismatch detected.');
          return false;
        }
      }

      return true;
    });
    return validated;
  }, [results, selectedEvent, allDriverPrograms, seriesClassesAll]);

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['operationLogs'],
    queryFn: () => base44.entities.OperationLog.list(),
    ...DQ,
  });

  const updateSessionStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const result = await base44.entities.Session.update(selectedSession.id, { status: newStatus });
      
      // Log status transition
      try {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'session_status_change',
          status: 'success',
          entity_name: 'Session',
          entity_id: selectedSession.id,
          metadata: JSON.stringify({ previousStatus: selectedSession.status, newStatus }),
          source_type: 'ResultsManager',
          event_id: selectedEvent?.id,
        });
      } catch (e) {
        console.warn('Failed to log operation:', e);
      }

      // Fire parent callbacks for cache invalidation
      if (newStatus === 'Provisional' && onResultsProvisional) onResultsProvisional();
      if (newStatus === 'Official') {
        if (onSetStandingsDirty) onSetStandingsDirty();
        if (onResultsOfficial) onResultsOfficial();
      }
      if (newStatus === 'Locked' && onResultsLocked) onResultsLocked();

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', eventId] });
      setShowStatusDialog(false);
      setPendingStatusChange(null);
      toast.success('Session status updated');
    },
    onError: () => {
      toast.error('Failed to update session status');
    },
  });

  // Memoize results by session for quick lookup
  const resultsBySession = useMemo(() => {
    const grouped = {};
    validatedResults.forEach((r) => {
      if (!grouped[r.session_id]) grouped[r.session_id] = [];
      grouped[r.session_id].push(r);
    });
    return grouped;
  }, [validatedResults]);

  // Auto-set event if selectedEvent is provided
  React.useEffect(() => {
    if (selectedEvent?.id && eventId !== selectedEvent.id) {
      setEventId(selectedEvent.id);
      if (selectedEvent.track_id && organizationType === 'track') {
        setTrackId(selectedEvent.track_id);
      }
    }
  }, [selectedEvent, eventId, organizationType]);

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">
            Select Track/Series, season, and event above to manage results
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-500">
            <AlertCircle className="w-5 h-5" />
            <p>Results Console is only available to admins</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (organizationType === 'track' && trackId) {
      filtered = filtered.filter((e) => e.track_id === trackId);
    } else if (organizationType === 'series' && seriesId) {
      filtered = filtered.filter((e) => e.series_id === seriesId);
    }

    if (seasonYear) {
      filtered = filtered.filter((e) => {
        if (e.season) return e.season === seasonYear;
        const eventYear = e.event_date
          ? new Date(e.event_date).getFullYear().toString()
          : null;
        return eventYear === seasonYear;
      });
    }

    return filtered;
  }, [events, organizationType, trackId, seriesId, seasonYear]);

  const selectedSession = useMemo(
    () => validatedSessions.find((s) => s.id === sessionId),
    [validatedSessions, sessionId]
  );

  const sessionResults = useMemo(
    () =>
      selectedSession
        ? validatedResults.filter((r) => r.session_id === selectedSession.id)
        : [],
    [validatedResults, selectedSession]
  );

  // Check if selected session has contributed to standings
  const sessionContributedToStandings = useMemo(() => {
    if (!selectedSession || !standingsLastCalculatedAt) return false;
    
    const isOfficialOrLocked = selectedSession.status === 'Official' || selectedSession.status === 'Locked';
    const sessionUpdatedBefore = new Date(selectedSession.updated_date) < new Date(standingsLastCalculatedAt);
    
    return isOfficialOrLocked && sessionUpdatedBefore;
  }, [selectedSession, standingsLastCalculatedAt]);

  // Validate session before Official transition
  const validateSessionForOfficial = (session) => {
    const errors = [];

    // At least one finisher exists
    const finishers = sessionResults.filter(r => r.position && r.position > 0);
    if (finishers.length === 0) {
      errors.push('At least one finisher is required');
    }

    // No missing driver_id
    const missingDriver = sessionResults.some(r => !r.driver_id);
    if (missingDriver) {
      errors.push('All results must have a driver assigned');
    }

    // No duplicate finishing positions
    const positions = new Map();
    sessionResults.forEach(r => {
      if (r.position && r.position > 0) {
        if (positions.has(r.position)) {
          positions.get(r.position).push(r.driver_id);
        } else {
          positions.set(r.position, [r.driver_id]);
        }
      }
    });
    const duplicatePositions = Array.from(positions.entries()).filter(([_, drivers]) => drivers.length > 1);
    if (duplicatePositions.length > 0) {
      errors.push('Duplicate finishing positions detected');
    }

    // No duplicate car numbers in same session
    const carNumbers = new Map();
    sessionResults.forEach(r => {
      if (r.car_number) {
        if (carNumbers.has(r.car_number)) {
          carNumbers.get(r.car_number).push(r.driver_id);
        } else {
          carNumbers.set(r.car_number, [r.driver_id]);
        }
      }
    });
    const duplicateCars = Array.from(carNumbers.entries()).filter(([_, drivers]) => drivers.length > 1);
    if (duplicateCars.length > 0) {
      errors.push('Duplicate car numbers in this session');
    }

    return errors;
  };

  const handleStatusTransition = (newStatus) => {
    // Prevent if event not in publishable state
    if ((newStatus === 'Official' || newStatus === 'Locked') && selectedEvent?.status === 'Draft') {
      toast.error('Cannot publish results while event is in Draft status');
      return;
    }

    // Validate before Official
    if (newStatus === 'Official') {
      const errors = validateSessionForOfficial(selectedSession);
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
    }

    // Check lifecycle order
    const statusOrder = ['Draft', 'Provisional', 'Official', 'Locked'];
    const currentIndex = statusOrder.indexOf(selectedSession.status);
    const newIndex = statusOrder.indexOf(newStatus);

    if (newIndex < currentIndex && newStatus !== 'Draft') {
      toast.error('Cannot move backward in session lifecycle');
      return;
    }

    if (newIndex > currentIndex + 1 && newStatus !== 'Draft') {
      toast.error('Cannot skip session lifecycle stages');
      return;
    }

    setPendingStatusChange(newStatus);
    setShowStatusDialog(true);
  };

  const handleEditWithWarning = (callback) => {
    if (sessionContributedToStandings) {
      setPendingEdit(callback);
      setShowStandingsWarning(true);
    } else {
      callback();
    }
  };

  const handleConfirmEdit = () => {
    setShowStandingsWarning(false);
    if (pendingEdit) {
      pendingEdit();
      if (onSetStandingsDirty) {
        onSetStandingsDirty();
      }
    }
    setPendingEdit(null);
  };

  // Show empty state if no event selected
  if (!eventId) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">
            Select an event to manage results
          </p>
        </CardContent>
      </Card>
    );
  }

  if (sessionsLoading || resultsLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-800/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (sessionsError || resultsError) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center space-y-3">
          <p className="text-red-400 text-sm">Failed to load results data</p>
          <Button size="sm" variant="outline" onClick={() => { refetchSessions(); refetchResults(); }} className="border-gray-700 text-gray-300">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // Show CTA if no sessions exist
  if (sessions.length === 0) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400 mb-4">
            No sessions exist for this event. Create sessions first to enter results.
          </p>
          <Button
            onClick={() => {
              const tabElement = document.querySelector(
                '[value="classesSessions"]'
              );
              if (tabElement) {
                tabElement.click();
              }
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Go to Classes & Sessions
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <ResultsControlBar
        organizationType={organizationType}
        setOrganizationType={setOrganizationType}
        trackId={trackId}
        setTrackId={setTrackId}
        seriesId={seriesId}
        setSeriesId={setSeriesId}
        seasonYear={seasonYear}
        setSeasonYear={setSeasonYear}
        eventId={eventId}
        setEventId={setEventId}
        classId={classId}
        setClassId={setClassId}
        sessionId={sessionId}
        setSessionId={setSessionId}
        tracks={tracks}
        seriesList={seriesList}
        filteredEvents={filteredEvents}
        seriesClasses={seriesClasses}
        sessions={validatedSessions}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Results Entry */}
        <div className="lg:col-span-2">
          {selectedSession ? (
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Results Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={entryMode} onValueChange={setEntryMode}>
                          <TabsList className="bg-[#262626] border border-gray-700 w-full">
                            <TabsTrigger
                              value="manual"
                              className="data-[state=active]:bg-gray-700 text-gray-300 flex-1"
                            >
                              Manual Entry
                            </TabsTrigger>
                            <TabsTrigger
                              value="csv"
                              className="data-[state=active]:bg-gray-700 text-gray-300 flex-1"
                            >
                              CSV Upload
                            </TabsTrigger>
                            <TabsTrigger
                              value="api"
                              className="data-[state=active]:bg-gray-700 text-gray-300 flex-1"
                            >
                              API Sync
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="manual" className="mt-4">
                            <ResultsManualEntry
                              session={selectedSession}
                              results={sessionResults}
                              drivers={drivers}
                              driverPrograms={driverPrograms}
                              classId={classId}
                              selectedEvent={selectedEvent}
                              onEditWithWarning={handleEditWithWarning}
                              sessionContributedToStandings={sessionContributedToStandings}
                            />
                          </TabsContent>

                  <TabsContent value="csv" className="mt-4">
                    <ResultsCSVUpload
                      session={selectedSession}
                      drivers={drivers}
                      driverPrograms={driverPrograms}
                    />
                  </TabsContent>

                  <TabsContent value="api" className="mt-4">
                    <ResultsAPISync session={selectedSession} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-[#171717] border-gray-800">
              <CardContent className="py-8 text-center">
                <p className="text-gray-400">Select a session to enter results</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel - Session Meta, Status, and History */}
        <div className="space-y-4">
          <ResultsSessionMeta
            session={selectedSession}
            event={selectedEvent}
            operationLogs={operationLogs}
            eventId={eventId}
          />

          {/* Session Status Controls */}
          {selectedSession && (
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Session Lifecycle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {selectedSession.status || 'Draft'}
                  </Badge>
                  {(selectedSession.status === 'Official' || selectedSession.status === 'Locked') && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                  {selectedSession.status === 'Locked' && (
                    <Lock className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                <div className="text-xs text-gray-400 mb-3">
                  <p>Last updated: {selectedSession.updated_date ? new Date(selectedSession.updated_date).toLocaleString() : 'Never'}</p>
                </div>

                {validationErrors.length > 0 && (
                  <div className="bg-red-900/30 border border-red-800 rounded p-2 mb-3">
                    <p className="text-xs text-red-300 font-medium mb-1">Validation errors:</p>
                    {validationErrors.map((err, idx) => (
                      <p key={idx} className="text-xs text-red-300">• {err}</p>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {selectedSession.status !== 'Provisional' && (
                    <Button
                      onClick={() => handleStatusTransition('Provisional')}
                      disabled={updateSessionStatusMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      Mark Provisional
                    </Button>
                  )}
                  {selectedSession.status !== 'Official' && selectedSession.status !== 'Locked' && (
                    <Button
                      onClick={() => handleStatusTransition('Official')}
                      disabled={updateSessionStatusMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      Mark Official
                    </Button>
                  )}
                  {selectedSession.status === 'Official' && (
                    <Button
                      onClick={() => handleStatusTransition('Locked')}
                      disabled={updateSessionStatusMutation.isPending}
                      className="w-full bg-gray-600 hover:bg-gray-700"
                      size="sm"
                    >
                      Lock Session
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Standings Impact Warning Modal */}
      <AlertDialog open={showStandingsWarning} onOpenChange={setShowStandingsWarning}>
        <AlertDialogContent className="bg-[#262626] border-gray-700">
          <AlertDialogTitle className="text-white">Standings Impact Warning</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            This session has already contributed to published standings. Editing results will invalidate championship points. Continue?
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit} className="bg-amber-600 hover:bg-amber-700">
              Proceed
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session Status Transition Dialog */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent className="bg-[#262626] border-gray-700">
          <AlertDialogTitle className="text-white">
            Confirm Status Change to {pendingStatusChange}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400 space-y-2">
            <p>
              {pendingStatusChange === 'Official' 
                ? 'Official status makes results immutable and will trigger standings recalculation. Continue?'
                : pendingStatusChange === 'Locked'
                ? 'Locked status prevents all further edits. Only admins can unlock. Continue?'
                : 'Results will become editable. Continue?'}
            </p>
            {selectedSession?.status === 'Provisional' && pendingStatusChange === 'Official' && (
              <p className="text-amber-400 text-sm">⚠️ Standings will be marked for recalculation in the Points & Standings tab.</p>
            )}
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => updateSessionStatusMutation.mutate(pendingStatusChange)}
              disabled={updateSessionStatusMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirm
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}