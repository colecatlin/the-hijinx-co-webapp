/**
 * R9CR — EventWorkspaceShell
 * SINGLE SOURCE OF TRUTH: all event data loaded here once via useEventWorkspaceData.
 * Distributed to panels via EventWorkspaceContext (wsData field).
 * Panels must NOT fetch their own event-level queries.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace, EventWorkspaceProvider } from './EventWorkspaceContext';
import { useEventAlerts } from './useEventAlerts';
import { useEventWorkspaceData } from '@/hooks/useEventWorkspaceData';
import OpsEventDashboard from '../ops/OpsEventDashboard';
import EventSchedulePanel from './panels/EventSchedulePanel';
import EventActivityPanel from './panels/EventActivityPanel';
import EventAuditLogPanel from './panels/EventAuditLogPanel';
import EventCheckInPanel from './panels/EventCheckInPanel';
import EventExportsPanel from './panels/EventExportsPanel';
import EventImportsPanel from './panels/EventImportsPanel';
import EventMediaPanel from './panels/EventMediaPanel';
import EventMediaPortalPanel from './panels/EventMediaPortalPanel';
import EventCompliancePanel from './panels/EventCompliancePanel';
import EventEntriesPanel from './panels/EventEntriesPanel';
import EventSettingsPanel from './panels/EventSettingsPanel';
import EventSessionsPanel from './panels/EventSessionsPanel';
import EventStandingsPanel from './panels/EventStandingsPanel';
import EventResultsPanel from './panels/EventResultsPanel';
import EventRaceControlPanel from './panels/EventRaceControlPanel';
import EventCloseoutPanel from './panels/EventCloseoutPanel';
import EventOfficialsPanel from './panels/EventOfficialsPanel';
import EventGridPanel from './panels/EventGridPanel';
import EventCommandHeader from './EventCommandHeader';
import EventWorkspaceNav from './EventWorkspaceNav';
import EventIntelligenceRail from './EventIntelligenceRail';
import LiveStatusBar from './LiveStatusBar';
import EventAlertStack from './EventAlertStack';

// Panel permission key map
const PANEL_PERM_KEY = {
  overview:     'canViewOverview',
  schedule:     'canViewSchedule',
  sessions:     'canManageSessions',
  results:      'canManageResults',
  entries:      'canManageEntries',
  compliance:   'canManageCompliance',
  checkin:      'canManageCheckIn',
  exports:      'canViewExports',
  imports:      'canViewImports',
  standings:    'canManageStandings',
  race_control: 'canViewRaceControl',
  media:        'canManageMedia',
  media_portal: 'canManageMedia',
  activity:     'canViewActivity',
  settings:     'canManageSettings',
  closeout:     'canManageSettings',
  officials:    'canManageSettings',
  grid:         'canManageResults',
};

const ALL_PANELS = [
  'overview','schedule','race_control','sessions','results','entries',
  'compliance','checkin','exports','imports','standings','media',
  'media_portal','officials','grid','activity','settings','closeout',
];

export default function EventWorkspaceShell() {
  const {
    selectedEvent,
    selectedTrack,
    selectedSeries,
    dashboardContext,
    dashboardPermissions,
    isAdmin,
    user,
    invalidateAfterOperation,
    standingsLastCalculatedAt,
    standingsDirty,
    onSetStandingsDirty,
    eventWorkspacePanel,
    setEventWorkspacePanel,
    eventPermissions,
  } = useEventWorkspace();

  // ── SINGLE SOURCE OF TRUTH ────────────────────────────────────────────────
  const wsData = useEventWorkspaceData(
    selectedEvent?.id,
    selectedEvent?.series_id,
    selectedEvent?.season,
  );

  const eventId = selectedEvent?.id;

  // R9CX Phase 6 — Results lifecycle callbacks: trigger targeted invalidations
  const handleResultsProvisional = useCallback(() => {
    if (!eventId) return;
    wsData.refetchResults?.();
    wsData.refetchSessions?.();
  }, [eventId, wsData]);

  const handleResultsOfficial = useCallback(() => {
    if (!eventId) return;
    wsData.refetchResults?.();
    wsData.refetchSessions?.();
    wsData.refetchAll?.();
    // Trigger public data sync
    base44.functions.invoke('syncPublicData', {
      event_id: eventId,
      trigger: 'results_official_callback',
    }).catch(() => {});
  }, [eventId, wsData]);

  const handleResultsLocked = useCallback(() => {
    if (!eventId) return;
    wsData.refetchResults?.();
    wsData.refetchSessions?.();
  }, [eventId, wsData]);

  // Permitted panels
  const permittedPanels = useMemo(() => {
    if (!eventPermissions) return ALL_PANELS;
    return ALL_PANELS.filter(id => {
      const key = PANEL_PERM_KEY[id];
      if (!key) return true;
      return !!eventPermissions[key];
    });
  }, [eventPermissions]);

  const isPanelPermitted = permittedPanels.includes(eventWorkspacePanel);

  const { entries, sessions, results, incidents, penalties, protests, officials, standings, gridLineups, operationLogs } = wsData;

  // ── Alert engine ─────────────────────────────────────────────────────────
  const { alerts, dismiss } = useEventAlerts({
    entries,
    sessions,
    results,
    incidents,
    penalties,
    protests,
    officials,
    standingsDirty: !!standingsDirty,
  });

  // Enrich context with wsData + real lifecycle callbacks so all child panels share the single source of truth
  const parentCtx = useEventWorkspace();
  const enrichedCtxValue = React.useMemo(() => ({
    ...parentCtx,
    wsData,
    onResultsProvisional: handleResultsProvisional,
    onResultsOfficial: handleResultsOfficial,
    onResultsLocked: handleResultsLocked,
  }), [parentCtx, wsData, handleResultsProvisional, handleResultsOfficial, handleResultsLocked]);

  return (
    <EventWorkspaceProvider value={enrichedCtxValue}>
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0B0D0D' }}>
      {/* ZONE 1: Command Header */}
      <EventCommandHeader
        selectedEvent={selectedEvent}
        selectedTrack={selectedTrack}
        selectedSeries={selectedSeries}
        sessions={sessions}
        results={results}
        entries={entries}
        incidents={incidents}
        penalties={penalties}
        protests={protests}
        standings={standings}
        officials={officials}
        standingsDirty={!!standingsDirty}
        isAdmin={isAdmin}
        onNavigate={setEventWorkspacePanel}
      />

      {/* ZONE 1B: Live Status Bar */}
      <LiveStatusBar
        sessions={sessions}
        results={results}
        entries={entries}
        standings={standings}
        alerts={alerts}
        onNavigate={setEventWorkspacePanel}
      />

      {/* ZONE 2: 3-Column Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Nav Rail */}
        <EventWorkspaceNav activePanel={eventWorkspacePanel} onPanelChange={setEventWorkspacePanel} compact={false} />

        {/* Center: Panel Content */}
        <div className="flex-1 overflow-y-auto p-5" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
          {!isPanelPermitted && (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
              <p className="text-gray-400 text-sm">Your access does not include the requested module.</p>
            </div>
          )}

          {isPanelPermitted && alerts.length > 0 && (
            <EventAlertStack
              alerts={alerts}
              onDismiss={dismiss}
              onNavigate={setEventWorkspacePanel}
            />
          )}

          {isPanelPermitted && eventWorkspacePanel === 'overview' && (
            <OpsEventDashboard
              selectedEvent={selectedEvent}
              selectedTrack={selectedTrack}
              selectedSeries={selectedSeries}
              dashboardContext={dashboardContext}
              dashboardPermissions={dashboardPermissions}
              isAdmin={isAdmin}
              user={user}
              invalidateAfterOperation={invalidateAfterOperation}
              standingsLastCalculatedAt={standingsLastCalculatedAt}
              onSetStandingsDirty={onSetStandingsDirty}
              onResultsProvisional={handleResultsProvisional}
              onResultsOfficial={handleResultsOfficial}
              onResultsLocked={handleResultsLocked}
              alerts={alerts}
              onNavigate={setEventWorkspacePanel}
              standingsDirty={!!standingsDirty}
              wsData={wsData}
            />
          )}

          {isPanelPermitted && eventWorkspacePanel === 'schedule'      && <EventSchedulePanel wsData={wsData} />}
          {isPanelPermitted && eventWorkspacePanel === 'race_control'  && <EventRaceControlPanel wsData={wsData} />}
          {isPanelPermitted && eventWorkspacePanel === 'activity'      && <EventAuditLogPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'settings'      && <EventSettingsPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'media'         && <EventMediaPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'media_portal'  && <EventMediaPortalPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'compliance'    && <EventCompliancePanel wsData={wsData} />}
          {isPanelPermitted && eventWorkspacePanel === 'checkin'       && <EventCheckInPanel wsData={wsData} />}
          {isPanelPermitted && eventWorkspacePanel === 'exports'       && <EventExportsPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'imports'       && <EventImportsPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'entries'       && <EventEntriesPanel wsData={wsData} />}
          {isPanelPermitted && eventWorkspacePanel === 'sessions'      && <EventSessionsPanel wsData={wsData} />}
          {isPanelPermitted && eventWorkspacePanel === 'standings'     && <EventStandingsPanel wsData={wsData} />}
          {isPanelPermitted && eventWorkspacePanel === 'results'       && <EventResultsPanel wsData={wsData} onResultsProvisional={handleResultsProvisional} onResultsOfficial={handleResultsOfficial} onResultsLocked={handleResultsLocked} />}
          {isPanelPermitted && eventWorkspacePanel === 'officials'     && <EventOfficialsPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'grid'          && <EventGridPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'closeout'      && (
            <EventCloseoutPanel wsData={wsData} onNavigate={setEventWorkspacePanel} />
          )}
        </div>

        {/* Right: Intelligence Rail */}
        <EventIntelligenceRail
          selectedEvent={selectedEvent}
          sessions={sessions}
          results={results}
          entries={entries}
          standings={standings}
          operationLogs={operationLogs}
        />
      </div>
    </div>
    </EventWorkspaceProvider>
  );
}