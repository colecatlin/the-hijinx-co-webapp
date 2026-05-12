import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { canAction } from '@/components/access/accessControl';
import {
  Plus,
  Upload,
  ArrowRight,
  Calendar,
  Activity,
  Flag,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Zap,
  Users,
  BarChart2,
  ExternalLink,
  MonitorPlay,
  Circle,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PanelLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2.5">
      {children}
    </p>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    Live:      'bg-red-900/60 text-red-300 border-red-700/50',
    Published: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
    Completed: 'bg-green-900/30 text-green-400 border-green-700/30',
    Draft:     'bg-gray-800 text-gray-500 border-gray-700',
    PendingApproval: 'bg-amber-900/30 text-amber-300 border-amber-700/30',
    Cancelled: 'bg-red-950/40 text-red-600 border-red-900/40',
  };
  const cls = cfg[status] || cfg.Draft;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${cls}`}>
      {status === 'Live' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mr-1" />}
      {status || 'Draft'}
    </span>
  );
}

function MetricCard({ label, value, color = 'text-white', sub, icon: Icon }) {
  return (
    <div className="bg-[#111] border border-gray-800 rounded-lg px-3 py-2.5 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{label}</p>
        {Icon && <Icon className="w-3 h-3 text-gray-700" />}
      </div>
      <p className={`text-xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function ActionItem({ severity, eventName, issue, panel, eventId }) {
  const navigate = useNavigate();
  const cfg = {
    critical: { dot: 'bg-red-500',   text: 'text-red-300',   badge: 'bg-red-900/30 text-red-300 border-red-800/40' },
    warning:  { dot: 'bg-amber-400', text: 'text-amber-300', badge: 'bg-amber-900/20 text-amber-300 border-amber-800/30' },
    info:     { dot: 'bg-blue-400',  text: 'text-blue-300',  badge: 'bg-blue-900/20 text-blue-300 border-blue-800/30' },
  };
  const s = cfg[severity] || cfg.info;
  const href = panel ? `/race-control/events/${eventId}/${panel}` : `/race-control/events/${eventId}`;

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 bg-[#0F0F0F] border border-gray-800 rounded-lg">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-300 truncate">{eventName}</p>
        <p className={`text-[10px] ${s.text}`}>{issue}</p>
      </div>
      <button
        onClick={() => navigate(href)}
        className="shrink-0 flex items-center gap-1 text-[10px] text-gray-500 hover:text-teal-300 transition-colors"
      >
        Fix <ArrowRight className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

function HealthDot({ state }) {
  if (state === 'ok')      return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />;
  if (state === 'warn')    return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />;
  if (state === 'error')   return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-gray-700 inline-block" />;
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
  // all events for global view — passed from parent
  allEvents = [],
  // import logs for health signal
  importLogs = [],
}) {
  const navigate = useNavigate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Global operations feed ─────────────────────────────────────────────
  const { data: globalOperationLogs = [] } = useQuery({
    queryKey: ['operationLogs_global'],
    queryFn: async () => {
      try {
        const allLogs = await base44.entities.OperationLog.list('-created_date', 30);
        return allLogs || [];
      } catch {
        return [];
      }
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // ── Global event metrics ─────────────────────────────────────────────────
  const { liveEvents, upcomingEvents } = useMemo(() => {
    const live = allEvents.filter(e =>
      e.status === 'Live' ||
      (e.status === 'Published' && e.event_date && new Date(e.event_date) <= new Date() && (!e.end_date || new Date(e.end_date) >= today))
    );
    const upcoming = allEvents
      .filter(e => e.event_date && new Date(e.event_date) > today && e.status !== 'Cancelled' && e.status !== 'Completed')
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
      .slice(0, 5);
    return { liveEvents: live, upcomingEvents: upcoming };
  }, [allEvents, today]);

  // ── Action Required queue (from selected event data only — no global sessions/results yet) ──
  const actionQueue = useMemo(() => {
    const items = [];

    // Build from selected event context
    if (selectedEvent) {
      const hasNoSessions = sessions.length === 0;
      const sessionsNoResults = sessions.filter(s => {
        const hasResult = results.some(r => r.session_id === s.id);
        return !hasResult && (s.status === 'Draft' || s.status === 'Provisional');
      });
      const draftSessions = sessions.filter(s => s.status === 'Draft');
      const officialSessions = sessions.filter(s => s.status === 'Official' || s.status === 'Locked');

      if (selectedEvent.status === 'Live' || selectedEvent.status === 'Published') {
        if (hasNoSessions) {
          items.push({ severity: 'critical', eventName: selectedEvent.name, issue: 'No sessions set up — operations blocked', panel: 'sessions', eventId: selectedEvent.id });
        }
        if (sessionsNoResults.length > 0) {
          items.push({ severity: 'warning', eventName: selectedEvent.name, issue: `${sessionsNoResults.length} session${sessionsNoResults.length > 1 ? 's' : ''} missing results`, panel: 'results', eventId: selectedEvent.id });
        }
        if (draftSessions.length > 0 && officialSessions.length === 0) {
          items.push({ severity: 'warning', eventName: selectedEvent.name, issue: `${draftSessions.length} session${draftSessions.length > 1 ? 's' : ''} still Draft — not published`, panel: 'results', eventId: selectedEvent.id });
        }
      }
      if (standingsDirty) {
        items.push({ severity: 'warning', eventName: selectedEvent.name, issue: 'Championship standings need recalculation', panel: 'standings', eventId: selectedEvent.id });
      }
      if (selectedEvent.track_acceptance_status === 'Pending') {
        items.push({ severity: 'info', eventName: selectedEvent.name, issue: 'Pending track acceptance', panel: null, eventId: selectedEvent.id });
      }
      if (selectedEvent.series_acceptance_status === 'Pending') {
        items.push({ severity: 'info', eventName: selectedEvent.name, issue: 'Pending series acceptance', panel: null, eventId: selectedEvent.id });
      }
    }

    // PendingApproval events from all events
    allEvents
      .filter(e => e.status === 'PendingApproval' && e.id !== selectedEvent?.id)
      .slice(0, 3)
      .forEach(e => items.push({ severity: 'info', eventName: e.name, issue: 'Awaiting approval to publish', panel: null, eventId: e.id }));

    return items;
  }, [selectedEvent, sessions, results, standingsDirty, allEvents]);

  // ── Recent operation logs — use global if available, fallback to parent ────
  const recentLogs = useMemo(() => {
    const logsToUse = globalOperationLogs.length > 0 ? globalOperationLogs : operationLogs;
    return [...logsToUse]
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 8);
  }, [globalOperationLogs, operationLogs]);

  // ── System health derivations ─────────────────────────────────────────────
  const systemHealth = useMemo(() => {
    const hasResults = results.length > 0;
    const hasStandings = standings.length > 0;
    const failedImports = importLogs.filter(l => l.status === 'failed' || l.status === 'error').length > 0;
    const pendingImports = importLogs.filter(l => l.status === 'pending' || l.status === 'processing').length > 0;

    return {
      results:    hasResults ? 'ok' : 'standby',
      standings:  standingsDirty ? 'warn' : hasStandings ? 'ok' : 'standby',
      imports:    failedImports ? 'error' : pendingImports ? 'warn' : importLogs.length > 0 ? 'ok' : 'standby',
      media:      'standby',
      timing:     'standby',
    };
  }, [results, standings, standingsDirty, importLogs]);

  // ── Global metrics ────────────────────────────────────────────────────────
  const pendingApprovalCount = allEvents.filter(e => e.status === 'PendingApproval').length;
  const draftCount           = allEvents.filter(e => e.status === 'Draft').length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0 max-w-full">

      {/* ── COMMAND HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">RaceCore Dashboard</h1>
          <p className="text-xs text-gray-600 mt-1">
            Command center — live events, alerts, and operations.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedEvent && (
            <button
              onClick={() => navigate(`/race-control/events/${selectedEvent.id}`)}
              className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 border border-gray-700 text-gray-400 hover:text-teal-300 hover:border-teal-700/50 rounded-lg transition-colors"
            >
              <Circle className="w-2.5 h-2.5 shrink-0" />
              Current Event
            </button>
          )}
          <button
            onClick={() => navigate('/race-control/events')}
            className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 bg-teal-900/30 border border-teal-700/50 text-teal-300 hover:bg-teal-900/50 rounded-lg transition-colors font-semibold"
          >
            <MonitorPlay className="w-3 h-3 shrink-0" />
            Event Operations
          </button>
        </div>
      </div>

      {/* ── GLOBAL STATUS STRIP ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        <MetricCard
          label="Live Now"
          value={liveEvents.length}
          color={liveEvents.length > 0 ? 'text-red-400' : 'text-gray-600'}
          sub={liveEvents.length > 0 ? liveEvents[0].name : 'No live events'}
          icon={Radio}
        />
        <MetricCard
          label="Upcoming"
          value={upcomingEvents.length}
          color="text-blue-300"
          sub={upcomingEvents.length > 0 ? upcomingEvents[0].name : 'None scheduled'}
          icon={Calendar}
        />
        <MetricCard
          label="Action Required"
          value={actionQueue.length}
          color={actionQueue.length > 0 ? 'text-amber-400' : 'text-gray-600'}
          sub={
            selectedEvent
              ? (actionQueue.length === 0 ? 'No critical issues' : `${actionQueue.filter(a => a.severity === 'critical').length} critical`)
              : 'Select event for deep scan'
          }
          icon={AlertTriangle}
        />
        <MetricCard
          label="Pending Publish"
          value={pendingApprovalCount}
          color={pendingApprovalCount > 0 ? 'text-amber-300' : 'text-gray-600'}
          sub={pendingApprovalCount === 0 ? 'All clear' : 'awaiting approval'}
          icon={Flag}
        />
        <MetricCard
          label="Total Events"
          value={allEvents.length}
          color="text-gray-300"
          sub={`${draftCount} draft`}
          icon={BarChart2}
        />
      </div>

      {/* ── MAIN GRID ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4">

        {/* ── LEFT COLUMN (3/5) ─────────────────────────────────────────── */}
        <div className="col-span-3 space-y-4">

          {/* LIVE EVENTS BOARD */}
          <div className="bg-[#111] border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <PanelLabel>Live Events</PanelLabel>
              {liveEvents.length > 0 && (
                <span className="flex items-center gap-1 text-[9px] text-red-400 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {liveEvents.length} Active
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-800/60">
              {liveEvents.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <Radio className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-medium">No live events right now</p>
                  <p className="text-[10px] text-gray-700 mt-0.5">Standby — next event will appear here when active</p>
                  <button
                    onClick={() => navigate('/race-control/events')}
                    className="mt-3 text-[10px] text-teal-500 hover:text-teal-300 flex items-center gap-1 mx-auto transition-colors"
                  >
                    View Event Schedule <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                liveEvents.map(ev => (
                  <div key={ev.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#161616] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-white truncate">{ev.name}</p>
                        <StatusBadge status={ev.status} />
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">
                        {ev.series_name || '—'} · {ev.event_date || '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/race-control/events/${ev.id}`)}
                      className="shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 bg-teal-900/30 border border-teal-800/40 text-teal-300 hover:bg-teal-900/50 rounded transition-colors font-medium"
                    >
                      Open <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ACTION REQUIRED QUEUE */}
          <div className="bg-[#111] border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <PanelLabel>Action Required</PanelLabel>
              {actionQueue.length > 0 && (
                <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">{actionQueue.length} item{actionQueue.length > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="p-2 space-y-1.5">
              {actionQueue.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <CheckCircle2 className="w-5 h-5 text-green-700 mx-auto mb-1.5" />
                  <p className="text-xs text-gray-600 font-medium">No critical issues</p>
                  <p className="text-[10px] text-gray-700 mt-0.5">All tracked events are clear</p>
                </div>
              ) : (
                actionQueue.map((item, i) => (
                  <ActionItem key={i} {...item} />
                ))
              )}
            </div>
          </div>

          {/* UPCOMING EVENTS */}
          <div className="bg-[#111] border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <PanelLabel>Upcoming Events</PanelLabel>
              <button
                onClick={() => navigate('/race-control/events')}
                className="text-[9px] text-gray-600 hover:text-teal-400 transition-colors flex items-center gap-1"
              >
                All Events <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-800/60">
              {upcomingEvents.length === 0 ? (
                <div className="px-3 py-5 text-center">
                  <Calendar className="w-5 h-5 text-gray-700 mx-auto mb-1.5" />
                  <p className="text-xs text-gray-600">No upcoming events scheduled</p>
                </div>
              ) : (
                upcomingEvents.map(ev => {
                  const daysUntil = Math.ceil((new Date(ev.event_date) - today) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={ev.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#161616] transition-colors">
                      <div className="shrink-0 text-center w-9">
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide">
                          {new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-sm font-black text-gray-300 leading-none">
                          {new Date(ev.event_date).getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{ev.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{ev.series_name || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] text-gray-600">{daysUntil}d</span>
                        <StatusBadge status={ev.status} />
                        <button
                          onClick={() => navigate(`/race-control/events/${ev.id}`)}
                          className="text-gray-600 hover:text-teal-400 transition-colors"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN (2/5) ────────────────────────────────────────── */}
        <div className="col-span-2 space-y-4">

          {/* CURRENT EVENT CONTEXT (compact) */}
          {selectedEvent ? (
            <div className="bg-[#111] border border-gray-800 rounded-lg p-3">
              <PanelLabel>Current Context</PanelLabel>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{selectedEvent.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                    {selectedTrack?.name || selectedSeries?.name || '—'}
                    {selectedEvent.event_date && ` · ${selectedEvent.event_date}`}
                  </p>
                </div>
                <StatusBadge status={selectedEvent.status} />
              </div>
              <div className="flex gap-2 flex-wrap text-[10px]">
                <span className="text-gray-600">{sessions.length} sessions</span>
                <span className="text-gray-700">·</span>
                <span className="text-gray-600">{results.length} results</span>
                {standingsDirty && <span className="text-amber-400">· standings dirty</span>}
              </div>
              <button
                onClick={() => navigate(`/race-control/events/${selectedEvent.id}`)}
                className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-[10px] py-1.5 bg-teal-900/25 border border-teal-800/40 text-teal-300 hover:bg-teal-900/40 rounded transition-colors font-semibold"
              >
                <Zap className="w-2.5 h-2.5" /> Open Event Operations
              </button>
            </div>
          ) : (
            <div className="bg-[#111] border border-gray-800 rounded-lg p-3">
              <PanelLabel>Current Context</PanelLabel>
              <p className="text-xs text-gray-600 italic">No event selected in context bar</p>
            </div>
          )}

          {/* OPERATIONS FEED */}
          <div className="bg-[#111] border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <PanelLabel>Operations Feed</PanelLabel>
              <button
                onClick={() => navigate(selectedEvent ? `/race-control/events/${selectedEvent.id}/activity` : '/race-control/events')}
                className="text-[9px] text-gray-600 hover:text-teal-400 transition-colors flex items-center gap-1"
              >
                View Activity <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-800/50">
              {recentLogs.length === 0 ? (
                <div className="px-3 py-5 text-center">
                  <Activity className="w-5 h-5 text-gray-700 mx-auto mb-1.5" />
                  <p className="text-xs text-gray-600">No recent operations yet</p>
                </div>
              ) : (
                recentLogs.map(log => {
                  const isErr = log.status === 'error';
                  const isOk  = log.status === 'success';
                  const timeStr = log.created_date
                    ? new Date(log.created_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    : '—';
                  return (
                    <div key={log.id} className="flex items-center gap-2 px-3 py-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isErr ? 'bg-red-500' : isOk ? 'bg-green-500' : 'bg-gray-600'}`} />
                      <span className="text-[10px] text-gray-400 flex-1 truncate">
                        {log.operation_type?.replace(/_/g, ' ') || 'operation'}
                      </span>
                      <span className="text-[9px] text-gray-700 shrink-0">{timeStr}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SYSTEM HEALTH */}
          <div className="bg-[#111] border border-gray-800 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-800">
              <PanelLabel>System Health</PanelLabel>
            </div>
            <div className="px-3 py-2 space-y-1.5">
              {[
                { label: 'Results',   state: systemHealth.results   },
                { label: 'Standings', state: systemHealth.standings  },
                { label: 'Imports',   state: systemHealth.imports    },
                { label: 'Media',     state: systemHealth.media      },
                { label: 'Timing',    state: systemHealth.timing     },
              ].map(({ label, state }) => {
                const stateLabel = state === 'ok' ? 'Ready' : state === 'warn' ? 'Attention' : state === 'error' ? 'Error' : 'Standby';
                const stateColor = state === 'ok' ? 'text-green-400' : state === 'warn' ? 'text-amber-400' : state === 'error' ? 'text-red-400' : 'text-gray-600';
                return (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <HealthDot state={state} />
                      <span className={`text-[9px] font-semibold ${stateColor}`}>{stateLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="bg-[#111] border border-gray-800 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-800">
              <PanelLabel>Quick Actions</PanelLabel>
            </div>
            <div className="p-2 space-y-1">
              {canAction(dashboardPermissions, 'create_event') && (
                <button
                  onClick={() => onCreateEvent?.()}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-gray-400 hover:text-blue-300 hover:bg-blue-950/20 rounded transition-colors text-left"
                >
                  <Plus className="w-3 h-3 text-blue-400 shrink-0" /> Create Event
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => onOpenImportEntries?.()}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-gray-400 hover:text-amber-300 hover:bg-amber-950/20 rounded transition-colors text-left"
                >
                  <Upload className="w-3 h-3 text-amber-400 shrink-0" /> Import Data
                </button>
              )}
              <button
                onClick={() => navigate('/race-control/events')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-gray-400 hover:text-teal-300 hover:bg-teal-950/20 rounded transition-colors text-left"
              >
                <MonitorPlay className="w-3 h-3 text-teal-400 shrink-0" /> Open Event Operations
              </button>
              {isAdmin && (
                <button
                  onClick={() => onTabChange('media_portal')}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-gray-400 hover:text-purple-300 hover:bg-purple-950/20 rounded transition-colors text-left"
                >
                  <Users className="w-3 h-3 text-purple-400 shrink-0" /> Open Media Portal
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => onTabChange('auditLog')}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded transition-colors text-left"
                >
                  <Activity className="w-3 h-3 text-gray-500 shrink-0" /> View Audit Log
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => onOpenQuickCreate?.('Driver')}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded transition-colors text-left"
                >
                  <Plus className="w-3 h-3 text-gray-500 shrink-0" /> Quick Create Entity
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}