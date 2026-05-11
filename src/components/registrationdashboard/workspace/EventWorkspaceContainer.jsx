/**
 * REVISION 7A — EventWorkspaceContainer
 * Shell component that wraps a selected event's operational workspace.
 * Provides EventWorkspaceContext to all child panels.
 * Does NOT rewrite or migrate any stabilized operational components.
 */
import React, { useState } from 'react';
import { EventWorkspaceProvider } from './EventWorkspaceContext';
import EventWorkspaceShell from './EventWorkspaceShell';

const WORKSPACE_PANELS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'schedule',   label: 'Schedule' },
  { id: 'sessions',   label: 'Sessions' },
  { id: 'results',    label: 'Results' },
  { id: 'entries',    label: 'Entries' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'standings',  label: 'Standings' },
  { id: 'media',      label: 'Media' },
  { id: 'activity',   label: 'Activity' },
  { id: 'settings',   label: 'Settings' },
];

export { WORKSPACE_PANELS };

export default function EventWorkspaceContainer({
  // All props come directly from RegistrationDashboard — no new logic introduced
  selectedEvent,
  selectedTrack,
  selectedSeries,
  eventId,
  organizationType,
  organizationId,
  seasonYear,
  dashboardContext,
  dashboardPermissions,
  isAdmin,
  user,
  requireAdminOverride,
  invalidateAfterOperation,
  // Callbacks for protected systems (passed through untouched)
  standingsDirty,
  standingsLastCalculatedAt,
  onSetStandingsDirty,
  onResultsProvisional,
  onResultsOfficial,
  onResultsLocked,
  // R7E: sessions/standings workspace fields
  sessions,
  onClearDirty,
  onStandingsCalculated,
  onShowOverrideDialog,
  // Legacy activeTab bridge — for navigating back to old tabs if needed
  onLegacyTabChange,
}) {
  const [eventWorkspacePanel, setEventWorkspacePanel] = useState('overview');

  const contextValue = {
    selectedEvent,
    selectedTrack,
    selectedSeries,
    eventId,
    organizationType,
    organizationId,
    seasonYear,
    dashboardContext,
    dashboardPermissions,
    isAdmin,
    user,
    requireAdminOverride,
    invalidateAfterOperation,
    eventWorkspacePanel,
    setEventWorkspacePanel,
    // Pass through protected-system callbacks untouched
    standingsDirty,
    standingsLastCalculatedAt,
    onSetStandingsDirty,
    onResultsProvisional,
    onResultsOfficial,
    onResultsLocked,
    // R7E: session/standings workspace fields
    sessions: sessions || [],
    onClearDirty,
    onStandingsCalculated,
    onShowOverrideDialog,
    // Legacy bridge
    onLegacyTabChange,
  };

  return (
    <EventWorkspaceProvider value={contextValue}>
      <EventWorkspaceShell panels={WORKSPACE_PANELS} />
    </EventWorkspaceProvider>
  );
}