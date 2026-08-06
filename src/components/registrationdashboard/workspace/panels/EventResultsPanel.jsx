/**
 * R9CQ — EventResultsPanel
 * Adds session status strip + bulk publish actions above ResultsManager.
 */
import React, { useState } from 'react';
import ResultsManager from '@/components/registrationdashboard/ResultsManager';
import { useEventWorkspace } from '../EventWorkspaceContext';
import SessionResultsStatusStrip from '@/components/registrationdashboard/results/SessionResultsStatusStrip';
import BulkPublishActions from '@/components/registrationdashboard/results/BulkPublishActions';
import SessionStatusControl from '@/components/registrationdashboard/results/SessionStatusControl';
import { Card, CardContent } from '@/components/ui/card';

// R9CU: EventResultsPanel accepts wsData from EventWorkspaceShell (workspace authority)
// R9CX: Also accepts results lifecycle callbacks from EventWorkspaceShell
export default function EventResultsPanel({ wsData, onResultsProvisional, onResultsOfficial, onResultsLocked }) {
  const {
    selectedEvent,
    selectedSessionId,
    setSelectedSessionId,
    isAdmin,
    canAction,
    dashboardContext,
    invalidateAfterOperation,
    standingsLastCalculatedAt,
    onSetStandingsDirty,
  } = useEventWorkspace();

  const eventId = selectedEvent?.id;

  // R9CU: Use workspace authority data when available; fall back to local queries only outside workspace
  const sessions = wsData?.sessions || [];
  const results = wsData?.results || [];

  if (!selectedEvent) {
    return (
      <Card className="bg-surface border-divider">
        <CardContent className="py-12 text-center">
          <p className="text-foreground-quiet">Select an event to manage results</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Session status strip — click to navigate between sessions */}
      <SessionResultsStatusStrip
        sessions={sessions}
        results={results}
        onSelectSession={setSelectedSessionId}
        activeSessionId={selectedSessionId}
      />

      {/* Admin per-session public status control (selected session) */}
      {isAdmin && selectedSessionId && (() => {
        const activeSession = sessions.find(s => s.id === selectedSessionId);
        return activeSession ? (
          <SessionStatusControl
            session={activeSession}
            eventId={eventId}
            isAdmin={isAdmin}
          />
        ) : null;
      })()}

      {/* Bulk publish actions */}
      {isAdmin && sessions.length > 0 && (
        <BulkPublishActions
          sessions={sessions}
          results={results}
          eventId={eventId}
          isAdmin={isAdmin}
        />
      )}

      {/* Results manager — R9CU: wsData passed for workspace authority */}
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
        wsData={wsData}
      />
    </div>
  );
}