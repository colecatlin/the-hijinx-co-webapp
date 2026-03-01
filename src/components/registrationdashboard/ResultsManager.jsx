import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import ResultsControlBar from './results/ResultsControlBar';
import ResultsManualEntry from './results/ResultsManualEntry';
import ResultsCSVUpload from './results/ResultsCSVUpload';
import ResultsAPISync from './results/ResultsAPISync';
import ResultsSessionMeta from './results/ResultsSessionMeta';

export default function ResultsManager({ selectedEvent, isAdmin }) {
  const [organizationType, setOrganizationType] = useState('track');
  const [trackId, setTrackId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [seasonYear, setSeasonYear] = useState('');
  const [eventId, setEventId] = useState(selectedEvent?.id || '');
  const [classId, setClassId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [entryMode, setEntryMode] = useState('manual');

  // Fetch all necessary data
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () =>
      eventId
        ? base44.entities.Session.filter({ event_id: eventId })
        : Promise.resolve([]),
    enabled: !!eventId,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () =>
      seriesId
        ? base44.entities.SeriesClass.filter({ series_id: seriesId })
        : Promise.resolve([]),
    enabled: !!seriesId,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results', eventId],
    queryFn: () =>
      eventId
        ? base44.entities.Results.filter({ event_id: eventId })
        : Promise.resolve([]),
    enabled: !!eventId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['driverPrograms'],
    queryFn: () => base44.entities.DriverProgram.list(),
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['operationLogs'],
    queryFn: () => base44.entities.OperationLog.list(),
  });

  // Auto-set event if selectedEvent is provided
  React.useEffect(() => {
    if (selectedEvent?.id && eventId !== selectedEvent.id) {
      setEventId(selectedEvent.id);
      if (selectedEvent.track_id && organizationType === 'track') {
        setTrackId(selectedEvent.track_id);
      }
    }
  }, [selectedEvent, eventId, organizationType]);

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
    () => sessions.find((s) => s.id === sessionId),
    [sessions, sessionId]
  );

  const sessionResults = useMemo(
    () =>
      selectedSession
        ? results.filter((r) => r.session_id === selectedSession.id)
        : [],
    [results, selectedSession]
  );

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
        sessions={sessions}
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

        {/* Right Panel - Session Meta and History */}
        <div>
          <ResultsSessionMeta
            session={selectedSession}
            event={selectedEvent}
            operationLogs={operationLogs}
            eventId={eventId}
          />
        </div>
      </div>
    </div>
  );
}