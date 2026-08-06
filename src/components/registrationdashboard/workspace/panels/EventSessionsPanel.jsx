/**
 * REVISION R7E PART 1 — EventSessionsPanel
 * Thin adapter that pulls from EventWorkspaceContext and passes props to ClassSessionBuilder.
 * Zero modifications to ClassSessionBuilder logic or UI.
 */
import React from 'react';
import ClassSessionBuilder from '@/components/registrationdashboard/ClassSessionBuilder';
import { useEventWorkspace } from '../EventWorkspaceContext';

export default function EventSessionsPanel() {
  const {
    selectedEvent,
    selectedSeries,
    dashboardContext,
    dashboardPermissions,
    invalidateAfterOperation,
    isAdmin,
    requireAdminOverride,
    onShowOverrideDialog,
  } = useEventWorkspace();

  if (!selectedEvent) {
    return (
      <div className="bg-surface border border-divider rounded-lg p-8 text-center">
        <p className="text-foreground-quiet">Select an event to manage classes and sessions</p>
      </div>
    );
  }

  return (
    <ClassSessionBuilder
      eventId={selectedEvent.id}
      seriesId={selectedEvent.series_id}
      selectedEvent={selectedEvent}
      dashboardContext={dashboardContext}
      dashboardPermissions={dashboardPermissions}
      invalidateAfterOperation={invalidateAfterOperation}
      isAdmin={isAdmin}
      requireAdminOverride={requireAdminOverride}
      onShowOverrideDialog={onShowOverrideDialog}
    />
  );
}