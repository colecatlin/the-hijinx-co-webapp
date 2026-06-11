/**
 * R9CQ — EventWorkspaceShell (expanded)
 * Wires alert engine, expanded command header, closeout panel.
 * Three-zone layout: left nav rail, center content, right intel rail.
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { useEventWorkspace } from './EventWorkspaceContext';
import { useEventAlerts } from './useEventAlerts';
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
import DeferredModulePanel from './panels/DeferredModulePanel';
import EventCommandHeader from './EventCommandHeader';
import EventWorkspaceNav from './EventWorkspaceNav';
import EventIntelligenceRail from './EventIntelligenceRail';
import LiveStatusBar from './LiveStatusBar';
import EventAlertStack from './EventAlertStack';

const DQ = applyDefaultQueryOptions();

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
  closeout:     'canManageSettings', // admin only via isAdmin check in panel
};

const ALL_PANELS = [
  'overview','schedule','race_control','sessions','results','entries',
  'compliance','checkin','exports','imports','standings','media',
  'media_portal','activity','settings','closeout',
];

export default function EventWorkspaceShell({ panels }) {
  const [showIntelRail, setShowIntelRail] = useState(true);

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
    onResultsProvisional,
    onResultsOfficial,
    onResultsLocked,
    eventWorkspacePanel,
    setEventWorkspacePanel,
    eventPermissions,
  } = useEventWorkspace();

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

  // ── Core data queries ────────────────────────────────────────────────────
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', selectedEvent?.id],
    queryFn: () => selectedEvent?.id ? base44.entities.Session.filter({ event_id: selectedEvent.id }) : Promise.resolve([]),
    enabled: !!selectedEvent?.id, ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results', selectedEvent?.id],
    queryFn: () => selectedEvent?.id ? base44.entities.Results.filter({ event_id: selectedEvent.id }) : Promise.resolve([]),
    enabled: !!selectedEvent?.id, ...DQ,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['entries', selectedEvent?.id],
    queryFn: () => selectedEvent?.id ? base44.entities.Entry.filter({ event_id: selectedEvent.id }) : Promise.resolve([]),
    enabled: !!selectedEvent?.id, ...DQ,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['standings', selectedEvent?.series_id, selectedEvent?.season],
    queryFn: () =>
      selectedEvent?.series_id && selectedEvent?.season
        ? base44.entities.Standings.filter({ series_id: selectedEvent.series_id, season_year: selectedEvent.season })
        : Promise.resolve([]),
    enabled: !!selectedEvent?.series_id && !!selectedEvent?.season, ...DQ,
  });

  // ── Race control queries (for header + alerts) ───────────────────────────
  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents', selectedEvent?.id],
    queryFn: () => selectedEvent?.id ? base44.entities.Incident.filter({ event_id: selectedEvent.id }) : Promise.resolve([]),
    enabled: !!selectedEvent?.id, ...DQ,
  });

  const { data: penalties = [] } = useQuery({
    queryKey: ['penalties', selectedEvent?.id],
    queryFn: () => selectedEvent?.id ? base44.entities.Penalty.filter({ event_id: selectedEvent.id }) : Promise.resolve([]),
    enabled: !!selectedEvent?.id, ...DQ,
  });

  const { data: protests = [] } = useQuery({
    queryKey: ['protests', selectedEvent?.id],
    queryFn: () => selectedEvent?.id ? base44.entities.Protest.filter({ event_id: selectedEvent.id }) : Promise.resolve([]),
    enabled: !!selectedEvent?.id, ...DQ,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['operationLogs', selectedEvent?.id],
    queryFn: () =>
      selectedEvent?.id
        ? base44.entities.OperationLog.filter({ event_id: selectedEvent.id }, '-created_date', 20)
        : Promise.resolve([]),
    enabled: !!selectedEvent?.id, ...DQ,
  });

  // ── Alert engine ─────────────────────────────────────────────────────────
  const { alerts, dismiss } = useEventAlerts({
    entries,
    sessions,
    results,
    incidents,
    penalties,
    protests,
    standingsDirty: !!standingsDirty,
  });

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0B0D0D' }}>
      {/* ZONE 1: Command Header */}
      <EventCommandHeader
        selectedEvent={selectedEvent}
        selectedTrack={selectedTrack}
        selectedSeries={selectedSeries}
        eventWorkspacePanel={eventWorkspacePanel}
        sessions={sessions}
        results={results}
        entries={entries}
        incidents={incidents}
        penalties={penalties}
        protests={protests}
        standings={standings}
        standingsDirty={!!standingsDirty}
        isAdmin={isAdmin}
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

          {/* Alert stack — shown above all panel content when alerts exist */}
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
              onResultsProvisional={onResultsProvisional}
              onResultsOfficial={onResultsOfficial}
              onResultsLocked={onResultsLocked}
              alerts={alerts}
              onNavigate={setEventWorkspacePanel}
              standingsDirty={!!standingsDirty}
            />
          )}

          {isPanelPermitted && eventWorkspacePanel === 'schedule' && <EventSchedulePanel />}
          {isPanelPermitted && eventWorkspacePanel === 'race_control' && <EventRaceControlPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'activity' && <EventAuditLogPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'settings' && <EventSettingsPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'media' && <EventMediaPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'media_portal' && <EventMediaPortalPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'compliance' && <EventCompliancePanel />}
          {isPanelPermitted && eventWorkspacePanel === 'checkin' && <EventCheckInPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'exports' && <EventExportsPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'imports' && <EventImportsPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'entries' && <EventEntriesPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'sessions' && <EventSessionsPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'standings' && <EventStandingsPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'results' && <EventResultsPanel />}
          {isPanelPermitted && eventWorkspacePanel === 'closeout' && <EventCloseoutPanel />}
        </div>

        {/* Right: Intelligence Rail */}
        {showIntelRail && (
          <EventIntelligenceRail
            selectedEvent={selectedEvent}
            sessions={sessions}
            results={results}
            entries={entries}
            standings={standings}
            operationLogs={operationLogs}
          />
        )}
      </div>
    </div>
  );
}