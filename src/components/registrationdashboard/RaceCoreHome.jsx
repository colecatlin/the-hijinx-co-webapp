import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { canTab, canAction } from '@/components/access/accessControl';
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Database,
  Flag,
  Users,
  ClipboardCheck,
  Trophy,
  Upload,
  Clock,
  Car,
  Radio,
  Wrench,
  ArrowRight,
  Calendar,
  MapPin,
  Layers,
  Activity,
  TrendingUp,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function AlertBanner({ type, message, action, onAction }) {
  const styles = {
    live:    'bg-red-950/50 border-red-700/60 text-red-200',
    error:   'bg-red-950/40 border-red-800/40 text-red-300',
    warning: 'bg-amber-950/35 border-amber-700/40 text-amber-200',
    info:    'bg-blue-950/30 border-blue-800/40 text-blue-200',
  };
  const dotStyles = {
    live:    'bg-red-500 animate-pulse',
    error:   'bg-red-400',
    warning: 'bg-amber-400',
    info:    'bg-blue-400',
  };

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-xs ${styles[type] || styles.info}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${dotStyles[type] || dotStyles.info}`} />
      <span className="flex-1 leading-relaxed">{message}</span>
      {action && (
        <button
          onClick={onAction}
          className="shrink-0 flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity ml-1 whitespace-nowrap"
        >
          {action} <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function QuickActionButton({ icon: Icon, label, color, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Select an event first' : undefined}
      className={`flex items-center gap-2.5 px-3 py-3 bg-[#1A1A1A] border rounded-lg text-xs text-left transition-all
        ${disabled
          ? 'border-gray-800 text-gray-700 cursor-not-allowed'
          : 'border-gray-800 text-gray-300 hover:border-gray-600 hover:text-white hover:bg-[#222]'
        }`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${disabled ? 'text-gray-700' : color}`} />
      <span className="font-medium leading-tight">{label}</span>
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">
      {children}
    </p>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function RaceCoreHome({
  dashboardContext = {},
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
  onOpenQuickCreate,
}) {
  const navigate = useNavigate();

  // ── Role resolution ──────────────────────────────────────────────────────
  const isOwnerOrEditor = isAdmin || ['entity_owner', 'entity_editor'].includes(user?.role);
  const isTrack  = dashboardContext.orgType === 'track';
  const isSeries = dashboardContext.orgType === 'series';
  const hasOrg   = !!dashboardContext.orgId;
  const hasEvent = !!selectedEvent;

  // ── Derived operational data ─────────────────────────────────────────────
  const {
    unpublishedSessions,
    sessionsWithNoResults,
    draftSessions,
    officialSessions,
  } = useMemo(() => {
    const unpublished = sessions.filter(s => s.status === 'Draft' || s.status === 'Provisional');
    const noResults   = sessions.filter(s => {
      const hasResult = results.some(r => r.session_id === s.id);
      return !hasResult && (s.status === 'Draft' || s.status === 'Provisional');
    });
    const draft    = sessions.filter(s => s.status === 'Draft');
    const official = sessions.filter(s => s.status === 'Official' || s.status === 'Locked');
    return {
      unpublishedSessions: unpublished,
      sessionsWithNoResults: noResults,
      draftSessions: draft,
      officialSessions: official,
    };
  }, [sessions, results]);

  const recentLogs = useMemo(() =>
    [...operationLogs]
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 5),
    [operationLogs]
  );

  // ── Alerts (priority-ordered, role/context filtered) ─────────────────────
  const alerts = useMemo(() => {
    const list = [];

    if (!hasOrg) {
      list.push({ id: 'no_org', type: 'info', message: 'No organization selected. Choose a Track or Series in the context bar above to begin.' });
      return list;
    }

    if (!hasEvent) {
      list.push({ id: 'no_event', type: 'info', message: 'No event selected. Select or create an event to enable operations.', action: 'Create Event', onAction: () => onCreateEvent?.() });
      return list;
    }

    if (selectedEvent.status === 'Live') {
      list.push({ id: 'live', type: 'live', message: `${selectedEvent.name} is LIVE.`, action: 'Go to Results', onAction: () => onTabChange('results') });
    }

    if (sessions.length === 0 && canTab(dashboardPermissions, 'classes_sessions')) {
      list.push({ id: 'no_sessions', type: 'warning', message: 'No sessions set up for this event. Add classes and sessions before operations can begin.', action: 'Set Up', onAction: () => onTabChange('classesSessions') });
    }

    if (sessionsWithNoResults.length > 0 && canTab(dashboardPermissions, 'results')) {
      list.push({ id: 'sessions_no_results', type: 'warning', message: `${sessionsWithNoResults.length} session${sessionsWithNoResults.length > 1 ? 's' : ''} have no results entered yet.`, action: 'Enter Results', onAction: () => onTabChange('results') });
    }

    if (draftSessions.length > 0 && officialSessions.length === 0 && canTab(dashboardPermissions, 'results')) {
      list.push({ id: 'no_official', type: 'warning', message: `${draftSessions.length} session${draftSessions.length > 1 ? 's' : ''} are still in Draft — results are not yet published.`, action: 'Publish', onAction: () => onTabChange('results') });
    }

    if (standingsDirty && canTab(dashboardPermissions, 'points_standings')) {
      list.push({ id: 'standings_dirty', type: 'warning', message: 'Championship standings may be out of date. Recalculate to reflect recent results.', action: 'Recalculate', onAction: () => onTabChange('pointsStandings') });
    }

    if (selectedEvent.track_acceptance_status === 'Pending' && isTrack && isOwnerOrEditor) {
      list.push({ id: 'pending_track_accept', type: 'warning', message: 'This event is pending your track acceptance.', action: 'Review', onAction: () => onTabChange('eventBuilder') });
    }

    if (selectedEvent.series_acceptance_status === 'Pending' && isSeries && isOwnerOrEditor) {
      list.push({ id: 'pending_series_accept', type: 'warning', message: 'This event is pending your series acceptance.', action: 'Review', onAction: () => onTabChange('eventBuilder') });
    }

    return list;
  }, [hasOrg, hasEvent, selectedEvent, sessions, sessionsWithNoResults, draftSessions, officialSessions, standingsDirty, dashboardPermissions, isTrack, isSeries, isOwnerOrEditor, onTabChange, onCreateEvent]);

  const allClear = hasEvent && alerts.filter(a => a.id !== 'live').length === 0;

  // ── Quick actions (role + context filtered, max 8) ───────────────────────
  const quickActions = useMemo(() => {
    const actions = [];

    if (canAction(dashboardPermissions, 'create_event')) {
      actions.push({ id: 'create_event', label: 'Create Event', icon: Plus, color: 'text-blue-400', onClick: () => onCreateEvent?.(), disabled: false });
    }

    if (canTab(dashboardPermissions, 'classes_sessions') && hasEvent) {
      actions.push({ id: 'classes', label: 'Classes & Sessions', icon: ClipboardCheck, color: 'text-purple-400', onClick: () => onTabChange('classesSessions'), disabled: false });
    }

    if (canTab(dashboardPermissions, 'entries')) {
      actions.push({ id: 'entries', label: 'Entries', icon: Users, color: 'text-green-400', onClick: () => onTabChange('entries'), disabled: !hasEvent });
    }

    if (canAction(dashboardPermissions, 'import_csv') && isOwnerOrEditor) {
      actions.push({ id: 'import', label: 'Import Entries', icon: Upload, color: 'text-amber-400', onClick: () => onOpenImportEntries?.(), disabled: !hasEvent });
    }

    if (canTab(dashboardPermissions, 'checkin') && (isTrack || isAdmin)) {
      actions.push({ id: 'checkin', label: 'Check In', icon: Car, color: 'text-cyan-400', onClick: () => onTabChange('checkIn'), disabled: !hasEvent });
    }

    if (canTab(dashboardPermissions, 'results')) {
      actions.push({ id: 'results', label: 'Results', icon: Flag, color: 'text-red-400', onClick: () => onTabChange('results'), disabled: !hasEvent });
    }

    if (canTab(dashboardPermissions, 'points_standings') && isSeries) {
      actions.push({ id: 'standings', label: 'Points & Standings', icon: Trophy, color: 'text-yellow-400', onClick: () => onTabChange('pointsStandings'), disabled: false });
    }

    if (canTab(dashboardPermissions, 'tech') && isOwnerOrEditor) {
      actions.push({ id: 'tech', label: 'Tech Inspection', icon: Wrench, color: 'text-orange-400', onClick: () => onTabChange('tech'), disabled: !hasEvent });
    }

    return actions.slice(0, 8);
  }, [dashboardPermissions, hasEvent, isTrack, isSeries, isAdmin, isOwnerOrEditor, onTabChange, onCreateEvent, onOpenImportEntries]);

  // ── Operational status modules (role-specific) ───────────────────────────
  const showEventOps     = hasEvent && (isTrack || isAdmin) && canTab(dashboardPermissions, 'entries');
  const showChampionship = hasOrg && (isSeries || isAdmin) && canTab(dashboardPermissions, 'points_standings');
  const showTrackOps     = hasEvent && (isTrack || isAdmin) && canTab(dashboardPermissions, 'checkin');

  // ── No context at all ────────────────────────────────────────────────────
  if (!hasOrg) {
    return (
      <div className="py-12 text-center space-y-3">
        <Calendar className="w-10 h-10 text-gray-700 mx-auto" />
        <p className="text-sm font-semibold text-gray-400">Select a Track or Series to begin</p>
        <p className="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
          Use the context bar above to pick an organization and season. Your workspace will load automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── A. Context Status ─────────────────────────────────────────────── */}
      <div className="bg-[#161616] border border-gray-800 rounded-lg px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
              {dashboardContext.orgType === 'track' ? 'Track Workspace' : 'Series Workspace'}
            </p>
            <p className="text-sm font-bold text-white truncate">
              {selectedTrack?.name || selectedSeries?.name || '—'}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              {dashboardContext.season && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {dashboardContext.season}
                </span>
              )}
              {hasEvent ? (
                <span className="flex items-center gap-1 text-gray-300">
                  <Calendar className="w-3 h-3" />
                  {selectedEvent.name}
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    selectedEvent.status === 'Live'      ? 'bg-red-900/50 text-red-300' :
                    selectedEvent.status === 'Completed' ? 'bg-green-900/40 text-green-300' :
                    selectedEvent.status === 'Published' ? 'bg-blue-900/40 text-blue-300' :
                    'bg-gray-800 text-gray-400'
                  }`}>
                    {selectedEvent.status || 'Draft'}
                  </span>
                </span>
              ) : (
                <span className="text-gray-600 italic">No event selected</span>
              )}
            </div>
          </div>
          {hasEvent && sessions.length > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xl font-black text-white">{sessions.length}</p>
              <p className="text-[10px] text-gray-600">Sessions</p>
            </div>
          )}
        </div>

        {/* Event date strip */}
        {hasEvent && selectedEvent.event_date && (
          <div className="mt-2 pt-2 border-t border-gray-800 text-xs text-gray-500 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            {selectedTrack?.name || 'Venue TBD'}
            <span className="mx-1 text-gray-700">·</span>
            {selectedEvent.event_date}
            {selectedEvent.end_date && ` – ${selectedEvent.end_date}`}
          </div>
        )}
      </div>

      {/* ── B. Alerts / Attention Needed ──────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          <SectionLabel>Needs Attention</SectionLabel>
          {alerts.map(a => (
            <AlertBanner key={a.id} type={a.type} message={a.message} action={a.action} onAction={a.onAction} />
          ))}
        </div>
      )}

      {allClear && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-950/20 border border-green-800/30 text-xs text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>No outstanding items — event operations are running.</span>
        </div>
      )}

      {/* ── Admin Quick Create ─────────────────────────────────────────── */}
      {isAdmin && (
        <div>
          <SectionLabel>Quick Create</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {['Driver','Team','Track','Series','Event'].map((type) => (
              <button
                key={type}
                onClick={() => onOpenQuickCreate?.(type)}
                className="flex items-center gap-2 px-3 py-2.5 bg-[#1A1A1A] border border-gray-800 hover:border-blue-700/60 hover:bg-blue-950/20 rounded-lg text-xs text-gray-400 hover:text-blue-300 transition-all text-left"
              >
                <Plus className="w-3 h-3 shrink-0" />
                <span className="font-medium">{type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── C. Quick Actions ──────────────────────────────────────────────── */}
      {quickActions.length > 0 && (
        <div>
          <SectionLabel>Quick Actions</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(a => (
              <QuickActionButton key={a.id} icon={a.icon} label={a.label} color={a.color} onClick={a.onClick} disabled={a.disabled} />
            ))}
          </div>
        </div>
      )}

      {/* ── E. Role-Relevant Operational Modules ─────────────────────────── */}

      {/* Event Ops summary — Track or Admin */}
      {showEventOps && (
        <div>
          <SectionLabel>Event Operations</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Sessions', value: sessions.length, sub: draftSessions.length > 0 ? `${draftSessions.length} draft` : 'all published', warn: draftSessions.length > 0, tab: 'classesSessions', can: canTab(dashboardPermissions, 'classes_sessions') },
              { label: 'Results', value: results.length, sub: unpublishedSessions.length > 0 ? `${unpublishedSessions.length} unpublished` : 'up to date', warn: unpublishedSessions.length > 0, tab: 'results', can: canTab(dashboardPermissions, 'results') },
              { label: 'Official', value: officialSessions.length, sub: `of ${sessions.length} sessions`, warn: false, tab: 'results', can: canTab(dashboardPermissions, 'results') },
            ].map(stat => (
              <button
                key={stat.label}
                onClick={() => stat.can && onTabChange(stat.tab)}
                disabled={!stat.can}
                className={`bg-[#171717] border rounded-lg p-3 text-left transition-colors ${stat.can ? 'border-gray-800 hover:border-gray-700 cursor-pointer' : 'border-gray-800/50 cursor-default'}`}
              >
                <p className={`text-2xl font-black ${stat.warn ? 'text-amber-300' : 'text-white'}`}>{stat.value}</p>
                <p className="text-[11px] font-medium text-gray-400 mt-0.5">{stat.label}</p>
                <p className={`text-[10px] mt-0.5 ${stat.warn ? 'text-amber-500' : 'text-gray-600'}`}>{stat.sub}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Championship module — Series or Admin */}
      {showChampionship && (
        <div>
          <SectionLabel>Championship</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onTabChange('pointsStandings')}
              className="flex items-center gap-3 bg-[#171717] border border-gray-800 hover:border-gray-700 rounded-lg px-3 py-3 text-left transition-colors"
            >
              <Trophy className={`w-4 h-4 shrink-0 ${standingsDirty ? 'text-amber-400' : 'text-yellow-500'}`} />
              <div>
                <p className="text-xs font-semibold text-gray-200">Points &amp; Standings</p>
                <p className={`text-[10px] mt-0.5 ${standingsDirty ? 'text-amber-400' : 'text-gray-600'}`}>
                  {standingsDirty ? 'Recalculation needed' : `${standings.length} entries`}
                </p>
              </div>
            </button>
            {hasEvent && canTab(dashboardPermissions, 'event_builder') && (
              <button
                onClick={() => onTabChange('eventBuilder')}
                className="flex items-center gap-3 bg-[#171717] border border-gray-800 hover:border-gray-700 rounded-lg px-3 py-3 text-left transition-colors"
              >
                <Layers className="w-4 h-4 shrink-0 text-blue-400" />
                <div>
                  <p className="text-xs font-semibold text-gray-200">Event Setup</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {selectedEvent?.track_acceptance_status === 'Pending' ? 'Pending acceptance' : 'Edit structure'}
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Track venue ops — Check-in / Compliance / Tech strip */}
      {showTrackOps && (
        <div>
          <SectionLabel>Venue Operations</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Check In',   icon: UserCheck, tab: 'checkIn',    can: canTab(dashboardPermissions, 'checkin'),    color: 'text-cyan-400' },
              { label: 'Compliance', icon: AlertTriangle, tab: 'compliance', can: canTab(dashboardPermissions, 'compliance'), color: 'text-amber-400' },
              { label: 'Tech',       icon: Wrench,    tab: 'tech',       can: canTab(dashboardPermissions, 'tech'),        color: 'text-orange-400' },
              { label: 'Race Ctrl',  icon: Radio,     tab: 'raceControlConsole', can: canTab(dashboardPermissions, 'race_control'), color: 'text-purple-400' },
            ].filter(i => i.can).map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.tab}
                  onClick={() => onTabChange(item.tab)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-gray-800 hover:border-gray-700 rounded-lg text-xs text-gray-300 hover:text-white transition-colors"
                >
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── D. Recent Activity ────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Recent Activity</SectionLabel>
        {recentLogs.length === 0 ? (
          <div className="px-3 py-5 bg-[#161616] border border-gray-800/50 rounded-lg text-center">
            <Activity className="w-5 h-5 text-gray-700 mx-auto mb-1.5" />
            <p className="text-xs text-gray-600">No recent activity in this workspace.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {recentLogs.map(log => {
              const isSuccess = log.status === 'success';
              const isError   = log.status === 'error';
              const timeAgo = log.created_date
                ? new Date(log.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—';
              return (
                <div key={log.id} className="flex items-center gap-2.5 px-3 py-2 bg-[#161616] border border-gray-800/50 rounded text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSuccess ? 'bg-green-500' : isError ? 'bg-red-500' : 'bg-gray-600'}`} />
                  <span className="text-gray-300 truncate flex-1">{log.operation_type?.replace(/_/g, ' ') || 'Operation'}</span>
                  <span className="text-gray-600 shrink-0 text-[10px]">{log.entity_name || ''}</span>
                  <span className="text-gray-700 shrink-0 text-[10px]">{timeAgo}</span>
                </div>
              );
            })}
            {isAdmin && (
              <button
                onClick={() => onTabChange('auditLog')}
                className="mt-1 text-[11px] text-gray-600 hover:text-gray-400 flex items-center gap-1 transition-colors"
              >
                View full audit log <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── No event CTA (below activity, only when relevant) ─────────────── */}
      {hasOrg && !hasEvent && canAction(dashboardPermissions, 'create_event') && (
        <div className="pt-1">
          <button
            onClick={() => onCreateEvent?.()}
            className="flex items-center gap-2 px-4 py-3 bg-blue-900/20 border border-blue-800/40 text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-900/35 transition-colors w-full justify-center"
          >
            <Plus className="w-4 h-4" /> Create an Event to Begin
          </button>
        </div>
      )}

    </div>
  );
}