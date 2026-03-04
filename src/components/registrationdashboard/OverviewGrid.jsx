import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, AlertCircle } from 'lucide-react';
import EventStatusCard from './EventStatusCard';
import EntriesSummaryCard from './EntriesSummaryCard';
import ComplianceAlertsCard from './ComplianceAlertsCard';
import ResultsStatusCard from './ResultsStatusCard';
import StandingsStatusCard from './StandingsStatusCard';
import SystemAlertsFeed from './SystemAlertsFeed';
import RaceDayReadinessCard from './RaceDayReadinessCard';
import EventTimeline from './EventTimeline';

import { useQuery, useMutation, useQueryClient, useState } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import useEntries from './hooks/useEntries';
import { toast } from 'sonner';
import { canAction } from '@/components/access/accessControl';
import {
  publishAllSessionsOfficial,
  publishAllResultsOfficial,
  publishStandings,
} from './publishActions';
import EventStatusDashboard from './EventStatusDashboard';

const DQ = applyDefaultQueryOptions();

export default function OverviewGrid({
  dashboardContext,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  sessions,
  standings,
  results,
  operationLogs,
  importLogs,
  complianceSeverity,
  announcerMode,
  onSelectSession,
  onEntriesNavigate,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();
  const [publishingSession, setPublishingSession] = useState(false);
  const [publishingResults, setPublishingResults] = useState(false);
  const [publishingStandings, setPublishingStandings] = useState(false);

  const canPublish = canAction(dashboardPermissions, 'publish_official');

  // Load real entries for the selected event
  const { entries, allEntries, counts: entryCounts } = useEntries({
    eventId: selectedEvent?.id,
  });

  // Sort sessions by time
  const sortedSessions = useMemo(() => {
    if (!sessions.length) return [];
    const sessionOrder = { 'Practice': 0, 'Qualifying': 1, 'Heat': 2, 'LCQ': 3, 'Final': 4 };
    return [...sessions].sort((a, b) => {
      if (a.scheduled_time && b.scheduled_time) {
        return new Date(a.scheduled_time) - new Date(b.scheduled_time);
      }
      const orderA = sessionOrder[a.session_type] ?? 99;
      const orderB = sessionOrder[b.session_type] ?? 99;
      return orderA - orderB;
    });
  }, [sessions]);

  // Publish handlers
  const handlePublishSessions = async () => {
    setPublishingSession(true);
    try {
      const count = await publishAllSessionsOfficial(selectedEvent.id);
      toast.success(`Published ${count} sessions as Official`);
      queryClient.invalidateQueries();
      invalidateAfterOperation?.('session_published', { eventId: selectedEvent.id });
    } catch (err) {
      toast.error(`Publish failed: ${err.message}`);
      base44.entities.OperationLog.create({
        operation_type: 'publish',
        status: 'error',
        entity_name: 'Session',
        event_id: selectedEvent.id,
        message: `Failed to publish sessions: ${err.message}`,
        metadata: JSON.stringify({
          publish_type: 'publish_sessions_official',
          error: err.message,
        }),
      }).catch(() => {});
    } finally {
      setPublishingSession(false);
    }
  };

  const handlePublishResults = async () => {
    setPublishingResults(true);
    try {
      const count = await publishAllResultsOfficial(selectedEvent.id);
      toast.success(`Published results for ${count} sessions`);
      queryClient.invalidateQueries();
      invalidateAfterOperation?.('results_published', { eventId: selectedEvent.id });
    } catch (err) {
      toast.error(`Publish failed: ${err.message}`);
      base44.entities.OperationLog.create({
        operation_type: 'publish',
        status: 'error',
        entity_name: 'Results',
        event_id: selectedEvent.id,
        message: `Failed to publish results: ${err.message}`,
        metadata: JSON.stringify({
          publish_type: 'publish_results_official',
          error: err.message,
        }),
      }).catch(() => {});
    } finally {
      setPublishingResults(false);
    }
  };

  const handlePublishStandings = async () => {
    setPublishingStandings(true);
    try {
      const count = await publishStandings(
        selectedSeries?.id || selectedEvent?.series_id,
        dashboardContext?.seasonYear || selectedEvent?.season,
        selectedEvent.id
      );
      toast.success(`Published standings for ${count} drivers`);
      queryClient.invalidateQueries();
      invalidateAfterOperation?.('standings_published', {
        eventId: selectedEvent.id,
        seriesId: selectedSeries?.id || selectedEvent?.series_id,
      });
    } catch (err) {
      toast.error(`Publish failed: ${err.message}`);
      base44.entities.OperationLog.create({
        operation_type: 'publish',
        status: 'error',
        entity_name: 'Standings',
        event_id: selectedEvent.id,
        message: `Failed to publish standings: ${err.message}`,
        metadata: JSON.stringify({
          publish_type: 'publish_standings',
          error: err.message,
        }),
      }).catch(() => {});
    } finally {
      setPublishingStandings(false);
    }
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-300 mb-2">No event selected</p>
          <p className="text-sm text-gray-400">Select a Track or Series above, then choose a Season and Event to view the operations overview</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Status Dashboard */}
      <EventStatusDashboard
        selectedEvent={selectedEvent}
        selectedTrack={selectedTrack}
        selectedSeries={selectedSeries}
        dashboardContext={dashboardContext}
        dashboardPermissions={dashboardPermissions}
        invalidateAfterOperation={invalidateAfterOperation}
        onTabChange={() => {}} // Handled by parent
      />

      {/* Publish Controls */}
      {canPublish ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Publish Controls</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={handlePublishSessions}
              disabled={publishingSession}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
            >
              {publishingSession ? 'Publishing…' : 'Publish All Sessions'}
            </Button>
            <Button
              onClick={handlePublishResults}
              disabled={publishingResults}
              className="bg-green-600 hover:bg-green-700 text-white text-xs h-9"
            >
              {publishingResults ? 'Publishing…' : 'Publish All Results'}
            </Button>
            <Button
              onClick={handlePublishStandings}
              disabled={publishingStandings}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9"
            >
              {publishingStandings ? 'Publishing…' : 'Publish Standings'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-4">
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">Publish controls require admin access.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {complianceSeverity === 'warning' && (
        <Card className="bg-amber-900/30 border-amber-700/50">
          <CardContent className="py-4">
            <div className="flex gap-3 items-start">
              <div className="w-1 h-1 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-400 font-semibold">Compliance Issues Detected</p>
                <p className="text-xs text-amber-300/80 mt-1">Resolve compliance items before advancing event lifecycle.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {announcerMode && (
        <Card className="bg-purple-900/20 border-purple-800/50">
          <CardHeader>
            <CardTitle className="text-purple-300 text-lg">Announcer Quick Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-2">Event</p>
              <p className="text-white font-semibold">{selectedEvent.name}</p>
              <p className="text-xs text-gray-400">{selectedTrack?.name} • {selectedEvent.event_date}{selectedEvent.end_date ? ` to ${selectedEvent.end_date}` : ''}</p>
            </div>

            <div className="border-t border-purple-800/30 pt-3">
              <p className="text-xs text-gray-400 mb-2">Next Sessions</p>
              <div className="space-y-2">
                {sortedSessions.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-900/50 rounded p-2">
                    <div>
                      <p className="text-sm text-white font-medium">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.session_type}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => onSelectSession?.(s.id)} className="text-purple-400 hover:bg-purple-900/30">
                      <Play className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={() => onSelectSession?.(sortedSessions.find(s => s.status === 'in_progress')?.id || sortedSessions[0]?.id)} className="w-full bg-purple-600 hover:bg-purple-700">
              Open Current Session Results
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <EventStatusCard selectedEvent={selectedEvent} selectedTrack={selectedTrack} dashboardContext={dashboardContext} />
         <EntriesSummaryCard selectedEvent={selectedEvent} entries={allEntries} entryCounts={entryCounts} onNavigate={onEntriesNavigate} />
         <RaceDayReadinessCard selectedEvent={selectedEvent} sessions={sessions} />
        <ComplianceAlertsCard selectedEvent={selectedEvent} />
        <ResultsStatusCard selectedEvent={selectedEvent} />
        <StandingsStatusCard selectedEvent={selectedEvent} dashboardContext={dashboardContext} selectedSeries={selectedSeries} />
        <SystemAlertsFeed selectedEvent={selectedEvent} dashboardContext={dashboardContext} />
      </div>

      {/* Event Timeline */}
      <div>
        <EventTimeline selectedEvent={selectedEvent} />
      </div>
    </div>
  );
}