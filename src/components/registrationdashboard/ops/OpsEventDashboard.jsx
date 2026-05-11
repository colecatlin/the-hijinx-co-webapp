import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import EventCommandHeader from './EventCommandHeader';
import LiveStatusBar from './LiveStatusBar';
import SessionControlCenter from './SessionControlCenter';
import OpsRightSidebar from './OpsRightSidebar';
import ResultsManager from '../ResultsManager';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const DQ = applyDefaultQueryOptions();

export default function OpsEventDashboard({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
  isAdmin,
  user,
  invalidateAfterOperation,
}) {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const eventId = selectedEvent?.id;

  // Fetch sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  // Fetch results
  const { data: results = [] } = useQuery({
    queryKey: ['results', eventId],
    queryFn: () => (eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  // Fetch standings
  const { data: standings = [] } = useQuery({
    queryKey: ['standings', selectedEvent?.series_id, selectedEvent?.season],
    queryFn: () =>
      selectedEvent?.series_id && selectedEvent?.season
        ? base44.entities.Standings.filter({
            series_id: selectedEvent.series_id,
            season_year: selectedEvent.season,
          })
        : Promise.resolve([]),
    enabled: !!selectedEvent?.series_id && !!selectedEvent?.season,
    ...DQ,
  });

  // Fetch series classes
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
    ...DQ,
  });

  // Fetch operation logs for activity
  const { data: operationLogs = [] } = useQuery({
    queryKey: ['operationLogs', eventId],
    queryFn: () =>
      eventId
        ? base44.entities.OperationLog.filter({ event_id: eventId }, '-created_date', 50)
        : Promise.resolve([]),
    enabled: !!eventId,
    ...DQ,
  });

  const selectedSession = useMemo(() => sessions.find(s => s.id === selectedSessionId), [sessions, selectedSessionId]);

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">Select an event to begin operations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Command Header */}
      <EventCommandHeader
        selectedEvent={selectedEvent}
        selectedTrack={selectedTrack}
        selectedSeries={selectedSeries}
        sessions={sessions}
        results={results}
        standings={standings}
      />

      {/* Live Status Bar */}
      <LiveStatusBar
        selectedEvent={selectedEvent}
        sessions={sessions}
        results={results}
        standings={standings}
      />

      {/* Main operational area */}
      <div className="flex gap-6">
        {/* Left: Session Control + Results Manager */}
        <div className="flex-1 min-w-0">
          {/* Session Control Center */}
          <SessionControlCenter
            sessions={sessions}
            results={results}
            seriesClasses={seriesClasses}
            selectedEvent={selectedEvent}
            onAddResults={(sessionId) => setSelectedSessionId(sessionId)}
            onPasteResults={(sessionId) => setSelectedSessionId(sessionId)}
            onImportCSV={(sessionId) => setSelectedSessionId(sessionId)}
          />

          {/* Results Manager (inline) */}
          {selectedSession && (
            <div className="mt-8 border-t border-gray-800 pt-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-4">
                Results for {selectedSession.name}
              </h3>
              <ResultsManager
                selectedEvent={selectedEvent}
                isAdmin={isAdmin}
                canAction={['results_save_draft', 'results_mark_provisional', 'results_publish_official', 'results_lock_session']}
                dashboardContext={dashboardContext}
                invalidateAfterOperation={invalidateAfterOperation}
                standingsLastCalculatedAt={null}
                onSetStandingsDirty={() => {}}
                onResultsProvisional={() => {}}
                onResultsOfficial={() => {}}
                onResultsLocked={() => {}}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar: Health + Activity */}
        <OpsRightSidebar
          selectedSession={selectedSession}
          sessions={sessions}
          results={results}
          seriesClasses={seriesClasses}
          operationLogs={operationLogs}
        />
      </div>
    </div>
  );
}