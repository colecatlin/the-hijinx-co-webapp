/**
 * REVISION R7E PART 1 — EventStandingsPanel
 * Thin adapter that pulls from EventWorkspaceContext and passes props to PointsAndStandingsManager.
 * Zero modifications to PointsAndStandingsManager logic or UI.
 */
import React from 'react';
import PointsAndStandingsManager from '@/components/registrationdashboard/PointsAndStandingsManager';
import { useEventWorkspace } from '../EventWorkspaceContext';

export default function EventStandingsPanel() {
  const {
    selectedEvent,
    selectedSeries,
    dashboardContext,
    isAdmin,
    standingsDirty,
    onClearDirty,
    onStandingsCalculated,
    sessions,
  } = useEventWorkspace();

  if (!selectedEvent) {
    return (
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-400">Select an event to view standings</p>
      </div>
    );
  }

  return (
    <PointsAndStandingsManager
      selectedEvent={selectedEvent}
      selectedSeries={selectedSeries}
      dashboardContext={dashboardContext}
      isAdmin={isAdmin}
      standingsDirty={standingsDirty}
      onClearDirty={onClearDirty}
      onStandingsCalculated={onStandingsCalculated}
      sessions={sessions}
    />
  );
}