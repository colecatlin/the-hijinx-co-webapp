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

function MetricCard({ label, value, color = 'text-white', sub, icon: Icon, urgent = false }) {
  return (
    <div className={`border rounded-lg px-2.5 py-2 min-w-0 transition-all ${
      urgent 
        ? 'bg-red-950/25 border-red-800/50' 
        : 'bg-[#0F0F0F] border-gray-800'
    }`}>
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-[8px] font-bold uppercase tracking-widest text-gray-600">{label}</p>
        {Icon && <Icon className={`w-2.5 h-2.5 ${urgent ? 'text-red-600' : 'text-gray-700'}`} />}
      </div>
      <p className={`text-lg font-black ${color}`}>{value}</p>
      {sub && <p className="text-[9px] text-gray-600 mt-1 truncate">{sub}</p>}
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
    <div className="space-y-0 max-w-full bg-[#0A0A0A]">

      {/* ── COMMAND HEADER + OPERATIONAL TELEMETRY ─────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-800/50">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-white tracking-tight">RaceCore</h1>
        </div>
        
        {/* Compact telemetry strip */}
        <div className="flex items-center gap-3 text-[9px] text-gray-500 font-mono uppercase tracking-widest shrink-0">
          {liveEvents.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-950/30 border border-red-800/40 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-300">{liveEvents.length} LIVE</span>
            </div>
          )}
          {actionQueue.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-950/30 border border-amber-800/40 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-amber-300">{actionQueue.length} ALERT</span>
            </div>
          )}
          {standingsDirty && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-950/30 border border-blue-800/40 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-blue-300">STANDINGS DIRTY</span>
            </div>
          )}
          {pendingApprovalCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-900 border border-gray-700/50 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <span className="text-gray-400">{pendingApprovalCount} PENDING</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedEvent && (
            <button
              onClick={() => navigate(`/race-control/events/${selectedEvent.id}`)}
              className="text-[10px] px-2.5 py-1.5 border border-gray-700 text-gray-400 hover:text-teal-300 hover:border-teal-700/50 rounded transition-colors"
            >
              EVENT
            </button>
          )}
          <button
            onClick={() => navigate('/race-control/events')}
            className="text-[10px] px-2.5 py-1.5 bg-teal-900/30 border border-teal-700/50 text-teal-300 hover:bg-teal-900/50 rounded font-bold transition-colors"
          >
            OPS
          </button>
        </div>
      </div>

      {/* ── LIVE EVENTS DOMINANT ZONE (moved to top) ─────────────────────────── */}
      {liveEvents.length > 0 && (
        <div className="mb-4 border-l-4 border-red-500 bg-red-950/15 rounded-r-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-red-800/40 bg-red-950/25">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-300">ACTIVE RACES</p>
              <span className="text-[9px] text-red-400 font-mono">{liveEvents.length}</span>
            </div>
          </div>
          <div className="divide-y divide-red-800/30">
            {liveEvents.map(ev => (
              <div key={ev.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-red-950/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{ev.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[9px] text-gray-400">
                    <span>{ev.series_name || '—'}</span>
                    <span className="text-gray-700">·</span>
                    <span className="font-mono">{ev.event_date || '—'}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/race-control/events/${ev.id}`)}
                  className="shrink-0 text-[10px] px-2.5 py-1 bg-red-900/40 border border-red-700/60 text-red-300 hover:bg-red-900/60 rounded font-semibold transition-colors opacity-0 group-hover:opacity-100"
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GLOBAL STATUS STRIP (compact metrics) ─────────────────────────── */}
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        <MetricCard
          label="Live Now"
          value={liveEvents.length}
          color={liveEvents.length > 0 ? 'text-red-500' : 'text-gray-600'}
          sub={liveEvents.length > 0 ? liveEvents[0].name : 'Standby'}
          icon={Radio}
          urgent={liveEvents.length > 0}
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
      <div className="grid grid-cols-3 gap-3">

        {/* ── LEFT COLUMN (2/3 - operations focus) ─────────────────────── */}
        <div className="col-span-2 space-y-3">

          {/* ACTION REQUIRED (promoted priority) */}
          {actionQueue.length > 0 && (
            <div className="border-l-4 border-amber-500 bg-amber-950/15 rounded-r-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-950/30 border-b border-amber-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">ALERTS</p>
                <span className="text-[9px] text-amber-400 font-mono">{actionQueue.length}</span>
              </div>
              <div className="divide-y divide-amber-800/25 max-h-32 overflow-y-auto">
                {actionQueue.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-amber-950/25 transition-colors group">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className={`w-1 h-1 rounded-full shrink-0 ${
                        item.severity === 'critical' ? 'bg-red-500' : 'bg-amber-400'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] text-gray-300 truncate">{item.eventName}</p>
                        <p className={`text-[8px] ${
                          item.severity === 'critical' ? 'text-red-300' : 'text-amber-300'
                        } truncate`}>{item.issue}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(item.panel ? `/race-control/events/${item.eventId}/${item.panel}` : `/race-control/events/${item.eventId}`)}
                      className="shrink-0 text-[8px] px-1.5 py-0.5 bg-gray-900 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Fix
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UPCOMING EVENTS */}

          {/* UPCOMING EVENTS (compact density) */}
          <div className="bg-[#0F0F0F] border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <PanelLabel>Upcoming Events</PanelLabel>
              <button
                onClick={() => navigate('/race-control/events')}
                className="text-[9px] text-gray-600 hover:text-teal-400 transition-colors flex items-center gap-1"
              >
                All Events <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-800/50 max-h-40 overflow-y-auto">
              {upcomingEvents.length === 0 ? (
                <div className="px-3 py-3 text-center text-[10px] text-gray-600">Standby</div>
              ) : (
                upcomingEvents.map(ev => {
                  const daysUntil = Math.ceil((new Date(ev.event_date) - today) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={ev.id} className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-[#161616] transition-colors text-[9px]">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{ev.name}</p>
                        <p className="text-gray-500 truncate">{new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {daysUntil}d</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <StatusBadge status={ev.status} />
                        <button onClick={() => navigate(`/race-control/events/${ev.id}`)} className="text-gray-600 hover:text-teal-400">
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN (1/3 - operations rail) ─────────────────────────── */}
        <div className="col-span-1 space-y-3">

          {/* OPERATIONS FEED (compact, live) */}
          <div className="bg-[#0F0F0F] border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-[#0A0A0A]">
              <Activity className="w-3 h-3 text-gray-500" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 flex-1">Ops Feed</p>
              <button onClick={() => navigate(selectedEvent ? `/race-control/events/${selectedEvent.id}/activity` : '/race-control/events')} className="text-[8px] text-gray-600 hover:text-teal-400">
                More
              </button>
            </div>
            <div className="divide-y divide-gray-800/50 max-h-40 overflow-y-auto">
              {recentLogs.length === 0 ? (
                <div className="px-3 py-2 text-center text-[9px] text-gray-700">Awaiting ops</div>
              ) : (
                recentLogs.map(log => {
                  const isErr = log.status === 'error';
                  const isOk  = log.status === 'success';
                  const timeStr = log.created_date ? new Date(log.created_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
                  return (
                    <div key={log.id} className="flex items-center gap-1.5 px-2.5 py-1 text-[8px] hover:bg-gray-800/30">
                      <span className={`w-1 h-1 rounded-full shrink-0 ${isErr ? 'bg-red-500' : isOk ? 'bg-green-500' : 'bg-gray-600'}`} />
                      <span className="text-gray-400 flex-1 truncate font-mono">{log.operation_type?.split('_').slice(0,2).join('_').toLowerCase() || 'op'}</span>
                      <span className="text-gray-700 shrink-0">{timeStr}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SYSTEM HEALTH (telemetry) */}
          <div className="bg-[#0F0F0F] border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-[#0A0A0A]">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">Telemetry</p>
            </div>
            <div className="px-2.5 py-2 space-y-1.5">
              {[
                { label: 'Results',   state: systemHealth.results   },
                { label: 'Standings', state: systemHealth.standings  },
                { label: 'Imports',   state: systemHealth.imports    },
                { label: 'Media',     state: systemHealth.media      },
                { label: 'Timing',    state: systemHealth.timing     },
              ].map(({ label, state }) => {
                const stateLabel = state === 'ok' ? '✓' : state === 'warn' ? '!' : state === 'error' ? 'ERR' : '—';
                const stateColor = state === 'ok' ? 'text-green-400' : state === 'warn' ? 'text-amber-400' : state === 'error' ? 'text-red-500' : 'text-gray-600';
                return (
                  <div key={label} className="flex items-center justify-between text-[8px]">
                    <span className="text-gray-600 uppercase font-mono">{label}</span>
                    <div className="flex items-center gap-1">
                      <HealthDot state={state} />
                      <span className={`font-bold ${stateColor}`}>{stateLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* QUICK ACTIONS (compact vertical) */}
          <div className="bg-[#0F0F0F] border border-gray-800 rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-800 bg-[#0A0A0A]">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600">Actions</p>
            </div>
            <div className="p-1.5 space-y-0.5">
              {canAction(dashboardPermissions, 'create_event') && (
                <button onClick={() => onCreateEvent?.()} className="w-full text-left px-2 py-1.5 text-[8px] text-gray-400 hover:text-blue-300 hover:bg-blue-950/30 rounded transition-colors font-mono">
                  + Event
                </button>
              )}
              {isAdmin && (
                <button onClick={() => onOpenImportEntries?.()} className="w-full text-left px-2 py-1.5 text-[8px] text-gray-400 hover:text-amber-300 hover:bg-amber-950/30 rounded transition-colors font-mono">
                  ↑ Import
                </button>
              )}
              <button onClick={() => navigate('/race-control/events')} className="w-full text-left px-2 py-1.5 text-[8px] text-gray-400 hover:text-teal-300 hover:bg-teal-950/30 rounded transition-colors font-mono">
                → Ops
              </button>
            </div>
          </div>



        </div>
      </div>

    </div>
  );
}