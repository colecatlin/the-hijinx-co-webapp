import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import EventStatusCard from './EventStatusCard';
import EntriesSummaryCard from './EntriesSummaryCard';
import ComplianceAlertsCard from './ComplianceAlertsCard';
import ResultsStatusCard from './ResultsStatusCard';
import StandingsStatusCard from './StandingsStatusCard';
import SystemAlertsFeed from './SystemAlertsFeed';

export default function OverviewGrid({
  selectedEvent,
  selectedTrack,
  sessions,
  standings,
  results,
  operationLogs,
  importLogs,
}) {
  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event from the top bar to view operations overview</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <EventStatusCard event={selectedEvent} track={selectedTrack} />
      <EntriesSummaryCard />
      <ComplianceAlertsCard />
      <ResultsStatusCard sessions={sessions} />
      <StandingsStatusCard standings={standings} results={results} />
      <SystemAlertsFeed operationLogs={operationLogs} importLogs={importLogs} />
    </div>
  );
}