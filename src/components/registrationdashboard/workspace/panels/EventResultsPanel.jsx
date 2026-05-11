/**
 * REVISION R7E PART 3 — EventResultsPanel
 * Thin adapter that wraps ResultsManager for the Event Workspace.
 * 
 * Purpose: Enable ResultsManager to work inside the workspace context.
 * 
 * CRITICAL: This is a BLACK BOX adapter.
 * - Zero modifications to ResultsManager
 * - No new business logic
 * - No mutation overrides
 * - Pure prop forwarding
 */
import React from 'react';
import ResultsManager from '@/components/registrationdashboard/ResultsManager';
import { useEventWorkspace } from '../EventWorkspaceContext';
import { Card, CardContent } from '@/components/ui/card';

export default function EventResultsPanel() {
  const {
    selectedEvent,
    selectedSessionId,
    isAdmin,
    canAction,
    dashboardContext,
    invalidateAfterOperation,
    standingsLastCalculatedAt,
    onSetStandingsDirty,
    onResultsProvisional,
    onResultsOfficial,
    onResultsLocked,
  } = useEventWorkspace();

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to manage results</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ResultsManager
      selectedEvent={selectedEvent}
      initialSessionId={selectedSessionId}
      isAdmin={isAdmin}
      canAction={canAction}
      dashboardContext={dashboardContext}
      invalidateAfterOperation={invalidateAfterOperation}
      standingsLastCalculatedAt={standingsLastCalculatedAt}
      onSetStandingsDirty={onSetStandingsDirty}
      onResultsProvisional={onResultsProvisional}
      onResultsOfficial={onResultsOfficial}
      onResultsLocked={onResultsLocked}
    />
  );
}