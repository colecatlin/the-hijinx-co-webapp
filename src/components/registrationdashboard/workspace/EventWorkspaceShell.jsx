/**
 * REVISION 7B — EventWorkspaceShell
 * RaceCore Command Center Visual System
 * Three-zone layout: left nav rail, center content, right intelligence rail.
 * Read-only command header + module nav + operational state widgets.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { useEventWorkspace } from './EventWorkspaceContext';
import OpsEventDashboard from '../ops/OpsEventDashboard';
import EventSchedulePanel from './panels/EventSchedulePanel';
import EventActivityPanel from './panels/EventActivityPanel';
import EventAuditLogPanel from './panels/EventAuditLogPanel';
import EventMediaPanel from './panels/EventMediaPanel';
import EventCompliancePanel from './panels/EventCompliancePanel';
import EventEntriesPanel from './panels/EventEntriesPanel';
import EventSettingsPanel from './panels/EventSettingsPanel';
import DeferredModulePanel from './panels/DeferredModulePanel';
import EventCommandHeader from './EventCommandHeader';
import EventWorkspaceNav from './EventWorkspaceNav';
import EventIntelligenceRail from './EventIntelligenceRail';
import LiveStatusBar from './LiveStatusBar';

const DQ = applyDefaultQueryOptions();





// ─── Main shell — Command Center Layout (3-zone) ────────────────────────────
export default function EventWorkspaceShell({ panels }) {
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
    onSetStandingsDirty,
    onResultsProvisional,
    onResultsOfficial,
    onResultsLocked,
    eventWorkspacePanel,
    setEventWorkspacePanel,
  } = useEventWorkspace();

  // Fetch operational data for intelligence rail
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id ? base44.entities.Session.filter({ event_id: selectedEvent.id }) : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id ? base44.entities.Results.filter({ event_id: selectedEvent.id }) : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['entries', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id ? base44.entities.Entry.filter({ event_id: selectedEvent.id }) : Promise.resolve([])),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['standings', selectedEvent?.series_id, selectedEvent?.season],
    queryFn: () =>
      selectedEvent?.series_id && selectedEvent?.season
        ? base44.entities.Standings.filter({
            series_id: selectedEvent.series_id,
            season_year: selectedEvent.season,
          })
        : Promise.resolve([]),
    enabled: !!selectedEvent?.series_id && !!selectedEvent?.season,
    ...DQ,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['operationLogs', selectedEvent?.id],
    queryFn: () =>
      selectedEvent?.id
        ? base44.entities.OperationLog.filter({ event_id: selectedEvent.id }, '-created_date', 20)
        : Promise.resolve([]),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'rgba(8,10,12,0.82)' }}>
      {/* ZONE 1: Persistent Command Header (top) */}
      <EventCommandHeader
        selectedEvent={selectedEvent}
        selectedTrack={selectedTrack}
        selectedSeries={selectedSeries}
        eventWorkspacePanel={eventWorkspacePanel}
        sessions={sessions}
        results={results}
        entries={entries}
      />

      {/* ZONE 1B: Live Operations Status Bar */}
      <LiveStatusBar sessions={sessions} results={results} entries={entries} standings={standings} />

      {/* ZONE 2: 3-Column Layout (nav + content + intel) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Module Navigation Rail */}
        <EventWorkspaceNav activePanel={eventWorkspacePanel} onPanelChange={setEventWorkspacePanel} />

        {/* Center: Main Content Panel */}
        <div className="flex-1 overflow-y-auto border-r border-gray-800/60 p-5">
          {/* ── WIRED: Overview — OpsEventDashboard ── */}
          {eventWorkspacePanel === 'overview' && (
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
              sessions={sessions}
              results={results}
              standings={standings}
              entries={entries}
              operationLogs={operationLogs}
            />
          )}

          {/* ── WIRED: Schedule ── */}
          {eventWorkspacePanel === 'schedule' && <EventSchedulePanel />}

          {/* ── WIRED: Activity ── */}
          {eventWorkspacePanel === 'activity' && <EventAuditLogPanel />}

          {/* ── WIRED: Settings ── */}
          {eventWorkspacePanel === 'settings' && <EventSettingsPanel />}

          {/* ── WIRED: Media ── */}
          {eventWorkspacePanel === 'media' && <EventMediaPanel />}

          {/* ── WIRED: Compliance ── */}
          {eventWorkspacePanel === 'compliance' && <EventCompliancePanel />}

          {/* ── WIRED: Entries ── */}
          {eventWorkspacePanel === 'entries' && <EventEntriesPanel />}

          {/* ── DEFERRED: Sessions / Results / Standings ── */}
          {['sessions', 'results', 'standings'].includes(eventWorkspacePanel) && (
            <DeferredModulePanel panelId={eventWorkspacePanel} />
          )}
        </div>

        {/* Right: Event Intelligence Rail */}
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
  );
}