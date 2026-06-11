/**
 * R9CQ — EventResultsPanel
 * Adds session status strip + bulk publish actions above ResultsManager.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ResultsManager from '@/components/registrationdashboard/ResultsManager';
import { useEventWorkspace } from '../EventWorkspaceContext';
import SessionResultsStatusStrip from '@/components/registrationdashboard/results/SessionResultsStatusStrip';
import BulkPublishActions from '@/components/registrationdashboard/results/BulkPublishActions';
import { Card, CardContent } from '@/components/ui/card';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

export default function EventResultsPanel() {
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
    onResultsProvisional,
    onResultsOfficial,
    onResultsLocked,
  } = useEventWorkspace();

  const eventId = selectedEvent?.id;

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', eventId],
    queryFn: () => eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results', eventId],
    queryFn: () => eventId ? base44.entities.Results.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

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
    <div className="space-y-3">
      {/* Session status strip — click to navigate between sessions */}
      <SessionResultsStatusStrip
        sessions={sessions}
        results={results}
        onSelectSession={setSelectedSessionId}
        activeSessionId={selectedSessionId}
      />

      {/* Bulk publish actions */}
      {isAdmin && sessions.length > 0 && (
        <BulkPublishActions
          sessions={sessions}
          results={results}
          eventId={eventId}
          isAdmin={isAdmin}
        />
      )}

      {/* Results manager */}
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
    </div>
  );
}