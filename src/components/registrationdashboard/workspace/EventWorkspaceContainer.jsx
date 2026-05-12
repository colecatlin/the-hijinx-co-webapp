/**
 * REVISION R7E PART 3 — EventWorkspaceContainer
 * Shell component that wraps a selected event's operational workspace.
 * Provides EventWorkspaceContext to all child panels.
 * R7E Part 3: Added selectedSessionId state for Results panel targeting.
 */
import React, { useState, useEffect } from 'react';
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
  // R7H: deep-linking support
  pendingWorkspacePanel,
  onPendingPanelApplied,
  // R8B: route support
  initialPanel = null,
  routeMode = false,
  // R8G Part 3: event-scoped permissions (null when called from RegistrationDashboard)
  eventPermissions = null,
}) {
  // R8C: Validate panel against known ids — defense-in-depth for route mode
  const VALID_PANEL_IDS = new Set(WORKSPACE_PANELS.map(p => p.id));
  const toSafePanel = (raw) => (raw && VALID_PANEL_IDS.has(raw) ? raw : 'overview');

  // R8B/R8C: initialPanel (route mode) takes precedence over pendingWorkspacePanel (dashboard redirect)
  const startPanel = toSafePanel(initialPanel || pendingWorkspacePanel || 'overview');
  const [eventWorkspacePanel, setEventWorkspacePanel] = useState(startPanel);
  const [lastWorkspacePanel, setLastWorkspacePanel] = useState(startPanel);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // R7H: Apply pending panel when it changes
  useEffect(() => {
    if (pendingWorkspacePanel) {
      setEventWorkspacePanel(pendingWorkspacePanel);
      setLastWorkspacePanel(pendingWorkspacePanel);
      onPendingPanelApplied?.();
    }
  }, [pendingWorkspacePanel, onPendingPanelApplied]);

  const handleSetEventWorkspacePanel = (panel) => {
    setEventWorkspacePanel(panel);
    setLastWorkspacePanel(panel);
  };

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
    setEventWorkspacePanel: handleSetEventWorkspacePanel,
    lastWorkspacePanel,
    // R7E Part 3: Session targeting for Results panel
    selectedSessionId,
    setSelectedSessionId,
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
    // R8G Part 3: event-scoped permissions from RaceControlProvider (null in embedded mode)
    eventPermissions,
    // Permission check for Results actions
    canAction: dashboardPermissions ? (action) => {
      if (isAdmin) return true;
      return dashboardPermissions[action] === true || (Array.isArray(dashboardPermissions[action]) && dashboardPermissions[action].length > 0);
    } : undefined,
  };

  return (
    <EventWorkspaceProvider value={contextValue}>
      <EventWorkspaceShell panels={WORKSPACE_PANELS} />
    </EventWorkspaceProvider>
  );
}