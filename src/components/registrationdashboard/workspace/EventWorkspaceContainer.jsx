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

  // R8G Part 5C: action → eventPermissions key map
  // Only canonical, known action strings. Unknown actions → false (no silent allow).
  const ACTION_TO_PERMISSION = {
    results_save_draft:        'canManageResults',
    results_mark_provisional:  'canManageResults',
    results_publish_official:  'canPublishResults',
    results_lock_session:      'canLockSession',
    results_unlock_session:    'canOverrideSession',

    entries_edit:              'canEditEntries',
    entries_create:            'canEditEntries',
    entries_delete:            'canEditEntries',

    media_upload:              'canEditMedia',
    media_delete:              'canEditMedia',
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
    // R8G Part 5C: canAction resolution order:
    //   1. isAdmin → true always
    //   2. eventPermissions present → use ACTION_TO_PERMISSION map (EventFile / route mode)
    //   3. eventPermissions null → legacy dashboardPermissions path (embedded RegistrationDashboard)
    canAction: (action) => {
      if (isAdmin) return true;

      // Event-first mode: eventPermissions is canonical source of truth
      if (eventPermissions) {
        const permKey = ACTION_TO_PERMISSION[action];
        if (!permKey) return false; // unknown action → deny, do NOT silently allow
        return !!eventPermissions[permKey];
      }

      // Legacy embedded mode: preserve existing dashboardPermissions behavior exactly
      if (dashboardPermissions) {
        return (
          dashboardPermissions[action] === true ||
          (Array.isArray(dashboardPermissions[action]) && dashboardPermissions[action].length > 0)
        );
      }

      return false;
    },
  };

  return (
    <EventWorkspaceProvider value={contextValue}>
      <EventWorkspaceShell panels={WORKSPACE_PANELS} />
    </EventWorkspaceProvider>
  );
}