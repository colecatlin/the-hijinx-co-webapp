/**
 * REVISION 7A Part 5 — EventMediaPanel
 * Thin adapter: pulls required props from EventWorkspaceContext and passes
 * them into MediaTabContent as a black box.
 *
 * MediaTabContent internals are NOT modified.
 * onOpenEventBuilder is bridged to onLegacyTabChange('eventBuilder').
 */
import React from 'react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import MediaTabContent from '../../MediaTabContent';

export default function EventMediaPanel() {
  const {
    dashboardContext,
    selectedEvent,
    selectedTrack,
    selectedSeries,
    dashboardPermissions,
    invalidateAfterOperation,
    onLegacyTabChange,
  } = useEventWorkspace();

  return (
    <MediaTabContent
      dashboardContext={dashboardContext}
      selectedEvent={selectedEvent}
      selectedTrack={selectedTrack}
      selectedSeries={selectedSeries}
      dashboardPermissions={dashboardPermissions}
      invalidateAfterOperation={invalidateAfterOperation}
      onOpenEventBuilder={() => onLegacyTabChange?.('eventBuilder')}
    />
  );
}