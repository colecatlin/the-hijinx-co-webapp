/**
 * REVISION 7A Part 2 — EventWorkspaceShell
 * Wires all workspace panels: Overview (OpsEventDashboard), Schedule, Activity,
 * Settings, and deferred module stubs for Results/Sessions/Entries/Compliance/Standings/Media.
 */
import React from 'react';
import { useEventWorkspace } from './EventWorkspaceContext';
import OpsEventDashboard from '../ops/OpsEventDashboard';
import EventSchedulePanel from './panels/EventSchedulePanel';
import EventActivityPanel from './panels/EventActivityPanel';
import EventAuditLogPanel from './panels/EventAuditLogPanel';
import EventMediaPanel from './panels/EventMediaPanel';
import EventTechPanel from './panels/EventTechPanel';
import EventSettingsPanel from './panels/EventSettingsPanel';
import DeferredModulePanel from './panels/DeferredModulePanel';
import {
  Calendar,
  MapPin,
  Layers,
  ExternalLink,
} from 'lucide-react';

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Live:        'bg-red-900/60 text-red-300 border-red-700/50',
    Completed:   'bg-green-900/40 text-green-300 border-green-800/40',
    Published:   'bg-blue-900/40 text-blue-300 border-blue-800/40',
    Draft:       'bg-gray-800 text-gray-400 border-gray-700',
    PendingApproval: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
    Cancelled:   'bg-red-950/40 text-red-500 border-red-900/40',
  };
  const cls = map[status] || map.Draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status === 'Live' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1.5" />}
      {status || 'Draft'}
    </span>
  );
}

// ─── Compact event header ─────────────────────────────────────────────────────
function WorkspaceEventHeader({ selectedEvent, selectedTrack, selectedSeries, isAdmin }) {
  if (!selectedEvent) return null;

  const dateStr = selectedEvent.event_date
    ? selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date
      ? `${selectedEvent.event_date} – ${selectedEvent.end_date}`
      : selectedEvent.event_date
    : null;

  return (
    <div
      className="px-5 py-3 border-b border-gray-800/60 flex items-center gap-4 flex-wrap"
      style={{ background: 'rgba(10,12,14,0.85)' }}
    >
      {/* Event name + status */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white truncate">{selectedEvent.name}</span>
            <StatusBadge status={selectedEvent.status} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {selectedTrack && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <MapPin className="w-3 h-3" /> {selectedTrack.name}
              </span>
            )}
            {selectedSeries && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Layers className="w-3 h-3" /> {selectedSeries.name}
              </span>
            )}
            {dateStr && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Calendar className="w-3 h-3" /> {dateStr}
              </span>
            )}
            {selectedEvent.season && (
              <span className="text-[11px] text-gray-600">Season {selectedEvent.season}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: permission scope + public links */}
      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        {isAdmin && (
          <span className="text-[10px] px-2 py-1 bg-teal-900/30 text-teal-400 border border-teal-800/40 rounded font-bold uppercase tracking-wider">
            Admin
          </span>
        )}
        {selectedEvent.published_flag && (
          <a
            href={`/EventProfile?id=${selectedEvent.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-teal-400 transition-colors"
          >
            <ExternalLink className="w-3 h-3" /> Public Page
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Horizontal workspace nav ─────────────────────────────────────────────────
function WorkspaceNav({ panels, activePanel, onPanelChange }) {
  return (
    <div
      className="flex items-center gap-0.5 px-4 border-b border-gray-800/60 overflow-x-auto scrollbar-hide"
      style={{ background: 'rgba(8,10,12,0.7)' }}
    >
      {panels.map(p => {
        const isActive = activePanel === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onPanelChange(p.id)}
            className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
              isActive
                ? 'border-teal-500 text-teal-300'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main shell ───────────────────────────────────────────────────────────────
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

  return (
    <div
      className="rounded-xl overflow-hidden border border-gray-800/70"
      style={{
        background: 'rgba(8,10,12,0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Compact event header */}
      <WorkspaceEventHeader
        selectedEvent={selectedEvent}
        selectedTrack={selectedTrack}
        selectedSeries={selectedSeries}
        isAdmin={isAdmin}
      />

      {/* Horizontal panel nav */}
      <WorkspaceNav
        panels={panels}
        activePanel={eventWorkspacePanel}
        onPanelChange={setEventWorkspacePanel}
      />

      {/* Panel content */}
      <div className="p-5">
        {/* ── WIRED: Overview — OpsEventDashboard black box ── */}
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
          />
        )}

        {/* ── WIRED: Schedule — read-only WeekendProgressionTimeline ── */}
        {eventWorkspacePanel === 'schedule' && <EventSchedulePanel />}

        {/* ── WIRED: Activity — AuditLogManager (black box, admin-guarded) ── */}
        {eventWorkspacePanel === 'activity' && <EventAuditLogPanel />}

        {/* ── WIRED: Settings — placeholder / future config ── */}
        {eventWorkspacePanel === 'settings' && <EventSettingsPanel />}

        {/* ── WIRED: Media — MediaTabContent black box ── */}
        {eventWorkspacePanel === 'media' && <EventMediaPanel />}

        {/* ── WIRED: Compliance / Tech — TechManager black box ── */}
        {eventWorkspacePanel === 'compliance' && <EventTechPanel />}

        {/* ── DEFERRED: Operational panels — bridge to legacy tabs ── */}
        {['sessions', 'results', 'entries', 'standings'].includes(eventWorkspacePanel) && (
          <DeferredModulePanel panelId={eventWorkspacePanel} />
        )}
      </div>
    </div>
  );
}