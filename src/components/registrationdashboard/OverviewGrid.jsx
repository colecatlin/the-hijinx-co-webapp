import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import EventStatusCard from './EventStatusCard';
import EntriesSummaryCard from './EntriesSummaryCard';
import ComplianceAlertsCard from './ComplianceAlertsCard';
import ResultsStatusCard from './ResultsStatusCard';
import StandingsStatusCard from './StandingsStatusCard';
import SystemAlertsFeed from './SystemAlertsFeed';

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
}) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <EventStatusCard selectedEvent={selectedEvent} selectedTrack={selectedTrack} dashboardContext={dashboardContext} />
      <EntriesSummaryCard selectedEvent={selectedEvent} />
      <ComplianceAlertsCard selectedEvent={selectedEvent} />
      <ResultsStatusCard selectedEvent={selectedEvent} />
      <StandingsStatusCard selectedEvent={selectedEvent} dashboardContext={dashboardContext} selectedSeries={selectedSeries} />
      <SystemAlertsFeed selectedEvent={selectedEvent} dashboardContext={dashboardContext} />
    </div>
  );
}