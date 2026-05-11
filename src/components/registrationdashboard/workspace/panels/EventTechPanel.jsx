/**
 * REVISION 7A Part 6 — EventTechPanel
 * Thin adapter: pulls required props from EventWorkspaceContext and passes
 * them into TechManager as a black box.
 *
 * TechManager internals are NOT modified.
 */
import React from 'react';
import { useEventWorkspace } from '../EventWorkspaceContext';
import TechManager from '../../TechManager';

export default function EventTechPanel() {
  const {
    selectedEvent,
    user,
    dashboardContext,
    invalidateAfterOperation,
  } = useEventWorkspace();

  return (
    <TechManager
      selectedEvent={selectedEvent}
      user={user}
      dashboardContext={dashboardContext}
      invalidateAfterOperation={invalidateAfterOperation}
    />
  );
}