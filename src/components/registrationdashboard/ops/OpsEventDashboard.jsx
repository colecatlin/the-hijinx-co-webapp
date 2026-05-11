/**
 * REVISION 6A — OpsEventDashboard
 * Main orchestration component for the Race Ops operational interface.
 * Integrates weekend timeline, session intelligence, results manager, and right sidebar.
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import EventCommandHeader from './EventCommandHeader';
import LiveStatusBar from './LiveStatusBar';
import SessionControlCenter from './SessionControlCenter';
import OpsRightSidebar from './OpsRightSidebar';
import OperationsSnapshot from '../workspace/OperationsSnapshot';
import ResultsManager from '../ResultsManager';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, Trophy } from 'lucide-react';
import { isScoringSession } from './sessionOrdering';
import { Button } from '@/components/ui/button';
import { sortSessionsChronologically } from './sessionOrdering';

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
  standingsLastCalculatedAt,
  onSetStandingsDirty,
  onResultsProvisional,
  onResultsOfficial,
  onResultsLocked,
}) {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const eventId = selectedEvent?.id;

  // Fetch sessions
  const { data: rawSessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  // Sorted chronologically for display
  const sessions = useMemo(() => sortSessionsChronologically(rawSessions), [rawSessions]);

  // Fetch results
  const { data: results = [] } = useQuery({
    queryKey: ['results', eventId],
    queryFn: () => (eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  // Fetch standings (for status bar)
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

  // Fetch series classes (for sidebar)
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
    ...DQ,
  });

  // Fetch operation logs for sidebar activity
  const { data: operationLogs = [] } = useQuery({
    queryKey: ['operationLogs', eventId],
    queryFn: () =>
      eventId
        ? base44.entities.OperationLog.filter({ event_id: eventId }, '-created_date', 50)
        : Promise.resolve([]),
    enabled: !!eventId,
    ...DQ,
  });

  const selectedSession = useMemo(
    () => sessions.find(s => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId]
  );

  // Fetch entries for operational alerts
  const { data: entries = [] } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => (eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

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
    <div className="space-y-5">
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

      {/* Operations Snapshot — enhanced overview */}
      <OperationsSnapshot
        selectedEvent={selectedEvent}
        sessions={sessions}
        entries={entries}
        results={results}
        standings={standings}
      />

      {/* Main layout: timeline + (results panel) + sidebar */}
      <div className="flex gap-5 items-start">
        {/* Left column: Weekend Timeline + inline Results */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Weekend Schedule / Session Control Center */}
          <SessionControlCenter
            sessions={sessions}
            results={results}
            selectedEvent={selectedEvent}
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
          />

          {/* Inline Results Manager — shown when a session is selected */}
          {selectedSession && (
            <div className="border border-gray-800 rounded-lg bg-[#111] overflow-hidden">
              {/* Panel header — Part 2 + 7: scheduled time and scoring pill */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-[#171717] border-b border-gray-800">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                  onClick={() => setSelectedSessionId('')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-semibold text-white">{selectedSession.name}</span>
                {selectedSession.scheduled_time && (
                  <span className="text-xs text-gray-500">
                    {new Date(selectedSession.scheduled_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' '}
                    {new Date(selectedSession.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                )}
                {isScoringSession(selectedSession) ? (
                  <span className="ml-auto flex items-center gap-1 text-xs text-amber-400 font-medium">
                    <Trophy className="w-3 h-3" /> Scoring session
                  </span>
                ) : (
                  <span className="ml-auto text-xs text-gray-600">⚪ Non-scoring</span>
                )}
              </div>

              {/* Results Manager — Part 2: pass initialSessionId for auto-targeting */}
              <div className="p-4">
                <ResultsManager
                  selectedEvent={selectedEvent}
                  initialSessionId={selectedSessionId}
                  isAdmin={isAdmin}
                  canAction={isAdmin
                    ? ['results_save_draft', 'results_mark_provisional', 'results_publish_official', 'results_lock_session', 'results_unlock_session']
                    : ['results_save_draft', 'results_mark_provisional']}
                  dashboardContext={dashboardContext}
                  invalidateAfterOperation={invalidateAfterOperation}
                  standingsLastCalculatedAt={standingsLastCalculatedAt}
                  onSetStandingsDirty={onSetStandingsDirty}
                  onResultsProvisional={onResultsProvisional}
                  onResultsOfficial={onResultsOfficial}
                  onResultsLocked={onResultsLocked}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: Session Health + Activity */}
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