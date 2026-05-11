/**
 * REVISION 7A Part 9 — EventEntriesPanel
 * Thin adapter: renders EntriesManager as a black box.
 * 
 * Isolates EntriesManager from RegistrationDashboard URL params by passing useUrlFilters={false},
 * which keeps all filter state local and prevents URL collisions with orgType/orgId/eventId/tab/seasonYear.
 * 
 * EntriesManager internals are NOT modified (except for Part 8 useUrlFilters prop).
 */
import React from 'react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import EntriesManager from '../../EntriesManager';

export default function EventEntriesPanel() {
  const {
    selectedEvent,
    selectedSeries,
    dashboardContext,
    dashboardPermissions,
    invalidateAfterOperation,
  } = useEventWorkspace();

  return (
    <EntriesManager
      eventId={selectedEvent?.id}
      seriesId={selectedSeries?.id || selectedEvent?.series_id}
      selectedEvent={selectedEvent}
      dashboardContext={dashboardContext}
      dashboardPermissions={dashboardPermissions}
      invalidateAfterOperation={invalidateAfterOperation}
      useUrlFilters={false}
    />
  );
}