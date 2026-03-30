import React, { useMemo } from 'react';
import { createPageUrl } from '@/components/utils';
import { useNavigate } from 'react-router-dom';
import { canTab, canAction } from '@/components/access/accessControl';
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Flag,
  Users,
  ClipboardCheck,
  Trophy,
  Upload,
  Clock,
  Car,
  LayoutDashboard,
  Calendar,
  ArrowRight,
} from 'lucide-react';

/**
 * Race Core Home — true workspace home page.
 * Replaces the old OverviewGrid as the default landing for Race Core.
 * Shows: context status, alerts, role-aware quick actions, recent activity.
 */
export default function RaceCoreHome({
  dashboardContext,
  dashboardPermissions,
  selectedEvent,
  selectedTrack,
  selectedSeries,
  sessions = [],
  results = [],
  standings = [],
  operationLogs = [],
  standingsDirty,
  isAdmin,
  user,
  onTabChange,
  onCreateEvent,
  onOpenImportEntries,
}) {
  const navigate = useNavigate();
  const isOwnerOrEditor = isAdmin || ['entity_owner', 'entity_editor'].includes(user?.role);

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list = [];

    if (!dashboardContext.orgId) {
      list.push({ id: 'no_org', type: 'warning', message: 'No organization selected. Choose a Track or Series above to begin.' });
    } else if (!selectedEvent) {
      list.push({ id: 'no_event', type: 'info', message: 'No event selected. Choose or create an event to enable operations.' });
    } else {
      if (sessions.length === 0) {
        list.push({ id: 'no_sessions', type: 'warning', message: `${selectedEvent.name} has no sessions yet. Set up classes and sessions to begin operations.` });
      }

      const unpublishedResults = results.filter(r => !r.published && r.status === 'Running');
      if (unpublishedResults.length > 0) {
        list.push({ id: 'unpublished_results', type: 'warning', message: `${unpublishedResults.length} result${unpublishedResults.length > 1 ? 's' : ''} are not yet published.` });
      }

      if (standingsDirty) {
        list.push({ id: 'standings_dirty', type: 'warning', message: 'Standings may be out of date. Recalculate to reflect recent results.' });
      }

      if (selectedEvent.status === 'Live') {
        list.push({ id: 'live', type: 'live', message: `${selectedEvent.name} is LIVE.` });
      }
    }

    return list;
  }, [dashboardContext.orgId, selectedEvent, sessions, results, standingsDirty]);

  // ── Quick actions (role-aware) ─────────────────────────────────────────────
  const quickActions = useMemo(() => {
    const actions = [];

    if (canAction(dashboardPermissions, 'create_event')) {
      actions.push({ id: 'create_event', label: 'Create Event', icon: Plus, color: 'text-blue-400', onClick: () => onCreateEvent?.() });
    }
    if (selectedEvent && canTab(dashboardPermissions, 'classes_sessions')) {
      actions.push({ id: 'classes', label: 'Classes & Sessions', icon: ClipboardCheck, color: 'text-purple-400', onClick: () => onTabChange('classesSessions') });
    }
    if (selectedEvent && canTab(dashboardPermissions, 'entries')) {
      actions.push({ id: 'entries', label: 'Entries', icon: Users, color: 'text-green-400', onClick: () => onTabChange('entries') });
    }
    if (selectedEvent && canAction(dashboardPermissions, 'import_csv')) {
      actions.push({ id: 'import_entries', label: 'Import Entries', icon: Upload, color: 'text-amber-400', onClick: () => onOpenImportEntries?.() });
    }
    if (canTab(dashboardPermissions, 'results')) {
      actions.push({ id: 'results', label: 'Results', icon: Flag, color: 'text-red-400', onClick: () => onTabChange('results') });
    }
    if (selectedEvent && canTab(dashboardPermissions, 'checkin')) {
      actions.push({ id: 'checkin', label: 'Check In', icon: Car, color: 'text-cyan-400', onClick: () => onTabChange('checkIn') });
    }
    if (canTab(dashboardPermissions, 'points_standings')) {
      actions.push({ id: 'standings', label: 'Points & Standings', icon: Trophy, color: 'text-yellow-400', onClick: () => onTabChange('pointsStandings') });
    }

    return actions;
  }, [dashboardPermissions, selectedEvent, onTabChange, onCreateEvent, onOpenImportEntries]);

  // ── Recent activity ────────────────────────────────────────────────────────
  const recentLogs = operationLogs.slice(0, 6);

  // ── Event status summary ───────────────────────────────────────────────────
  const eventSummary = selectedEvent ? [
    { label: 'Sessions', value: sessions.length, action: () => onTabChange('classesSessions'), canTabKey: 'classes_sessions' },
    { label: 'Results', value: results.length, action: () => onTabChange('results'), canTabKey: 'results' },
    { label: 'Standings', value: standings.length, action: () => onTabChange('pointsStandings'), canTabKey: 'points_standings' },
  ] : [];

  return (
    <div className="space-y-6">

      {/* Context header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <LayoutDashboard className="w-4 h-4 text-gray-500" />
          <h1 className="text-lg font-bold text-white">
            {selectedEvent ? selectedEvent.name : (selectedSeries?.name || selectedTrack?.name || 'Race Core')}
          </h1>
        </div>
        <p className="text-xs text-gray-500">
          {selectedEvent
            ? `${selectedEvent.event_date}${selectedEvent.end_date ? ` – ${selectedEvent.end_date}` : ''} · ${selectedEvent.status || 'Draft'}`
            : 'Select an event to begin operations'}
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                alert.type === 'live'
                  ? 'bg-red-950/40 border-red-800/50 text-red-200'
                  : alert.type === 'warning'
                  ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                  : 'bg-gray-900/40 border-gray-700 text-gray-400'
              }`}
            >
              {alert.type === 'live' ? (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              )}
              <span>{alert.message}</span>
              {alert.type === 'live' && (
                <button
                  onClick={() => onTabChange('results')}
                  className="ml-auto shrink-0 text-red-400 hover:text-red-200 flex items-center gap-1"
                >
                  Results <ArrowRight className="w-3 h-3" />
                </button>
              )}
              {alert.id === 'standings_dirty' && (
                <button
                  onClick={() => onTabChange('pointsStandings')}
                  className="ml-auto shrink-0 text-amber-400 hover:text-amber-200 flex items-center gap-1"
                >
                  Recalculate <ArrowRight className="w-3 h-3" />
                </button>
              )}
              {alert.id === 'no_sessions' && (
                <button
                  onClick={() => onTabChange('classesSessions')}
                  className="ml-auto shrink-0 text-amber-400 hover:text-amber-200 flex items-center gap-1"
                >
                  Set up <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No alerts — all clear */}
      {alerts.length === 0 && selectedEvent && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-950/20 border border-green-800/30 text-xs text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>No outstanding items. Event operations are running.</span>
        </div>
      )}

      {/* Event summary stats */}
      {selectedEvent && eventSummary.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {eventSummary.map((stat) => (
            <button
              key={stat.label}
              onClick={stat.action}
              className="bg-[#171717] border border-gray-800 rounded-lg p-3 text-left hover:border-gray-700 transition-colors"
            >
              <p className="text-xl font-black text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="flex items-center gap-2 px-3 py-2.5 bg-[#171717] border border-gray-800 rounded-lg text-xs text-gray-300 hover:border-gray-600 hover:text-white transition-colors text-left"
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${action.color}`} />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recentLogs.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Recent Activity</p>
          <div className="space-y-1">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-2 px-3 py-2 bg-[#171717] border border-gray-800/50 rounded text-xs text-gray-500">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  log.status === 'success' ? 'bg-green-500' : log.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`} />
                <span className="text-gray-400 truncate flex-1">{log.operation_type || 'Operation'}</span>
                <span className="text-gray-600 shrink-0">{log.entity_name}</span>
              </div>
            ))}
          </div>
          {isAdmin && (
            <button
              onClick={() => onTabChange('auditLog')}
              className="mt-2 text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1"
            >
              View full audit log <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Empty state — no context */}
      {!dashboardContext.orgId && (
        <div className="py-8 text-center">
          <Calendar className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Select a Track or Series above</p>
          <p className="text-xs text-gray-600 mt-1">Once you pick an organization and season, you can select events and begin operations.</p>
        </div>
      )}

      {/* Context set but no event */}
      {dashboardContext.orgId && !selectedEvent && alerts.filter(a => a.id === 'no_event').length > 0 && (
        <div className="pt-2">
          {canAction(dashboardPermissions, 'create_event') && (
            <button
              onClick={() => onCreateEvent?.()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/30 border border-blue-800/50 text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-900/50 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create an Event
            </button>
          )}
        </div>
      )}
    </div>
  );
}