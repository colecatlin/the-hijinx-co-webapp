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
} from 'lucide-react';

// ─── TELEMETRY HELPERS ────────────────────────────────────────────────────────

function HealthDot({ state }) {
  if (state === 'ok')      return <span className="w-1.5 h-1.5 rounded-full bg-green-500" />;
  if (state === 'warn')    return <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />;
  if (state === 'error')   return <span className="w-1.5 h-1.5 rounded-full bg-red-500" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />;
}

function StatusIndicator({ type = 'neutral' }) {
  const cfg = {
    live:     'w-2 h-2 rounded-full bg-red-500 animate-pulse',
    active:   'w-2 h-2 rounded-full bg-amber-500',
    warning:  'w-2 h-2 rounded-full bg-amber-500',
    ok:       'w-2 h-2 rounded-full bg-green-500',
    standby:  'w-2 h-2 rounded-full bg-gray-600',
  };
  return <span className={cfg[type] || cfg.standby} />;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

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
  allEvents = [],
  importLogs = [],
}) {
  const navigate = useNavigate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Global operations feed ─────────────────────────────────────────────────
  const { data: globalOperationLogs = [] } = useQuery({
    queryKey: ['operationLogs_global'],
    queryFn: async () => {
      try {
        const allLogs = await base44.entities.OperationLog.list('-created_date', 50);
        return allLogs || [];
      } catch {
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  // ── Live event detection ──────────────────────────────────────────────────
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

  // ── Incident queue (left column priority) ──────────────────────────────────
  const incidents = useMemo(() => {
    const items = [];

    // Critical: no sessions
    if (selectedEvent && sessions.length === 0 && (selectedEvent.status === 'Live' || selectedEvent.status === 'Published')) {
      items.push({
        severity: 'critical',
        label: 'NO SESSIONS',
        desc: `${selectedEvent.name} — operations blocked`,
        eventId: selectedEvent.id,
        panel: 'sessions',
      });
    }

    // Critical: blocking sessions missing results
    if (selectedEvent && sessions.length > 0 && selectedEvent.status === 'Live') {
      const sessionsNoResults = sessions.filter(s => {
        const hasResult = results.some(r => r.session_id === s.id);
        return !hasResult && (s.status !== 'Draft');
      });
      if (sessionsNoResults.length > 0) {
        items.push({
          severity: 'critical',
          label: `${sessionsNoResults.length} SESSION${sessionsNoResults.length > 1 ? 'S' : ''} MISSING RESULTS`,
          desc: selectedEvent.name,
          eventId: selectedEvent.id,
          panel: 'results',
        });
      }
    }

    // Warning: standings dirty
    if (standingsDirty && selectedEvent) {
      items.push({
        severity: 'warning',
        label: 'STANDINGS DIRTY',
        desc: `${selectedEvent.name} — recalculation pending`,
        eventId: selectedEvent.id,
        panel: 'standings',
      });
    }

    // Warning: import failures
    const failedImports = importLogs.filter(l => l.status === 'failed' || l.status === 'error');
    if (failedImports.length > 0) {
      items.push({
        severity: 'warning',
        label: `IMPORT FAIL (${failedImports.length})`,
        desc: selectedEvent?.name || 'Global imports',
        eventId: selectedEvent?.id,
        panel: 'imports',
      });
    }

    // Info: pending approvals
    allEvents
      .filter(e => e.status === 'PendingApproval')
      .slice(0, 2)
      .forEach(e => {
        items.push({
          severity: 'info',
          label: 'PENDING APPROVAL',
          desc: e.name,
          eventId: e.id,
          panel: null,
        });
      });

    return items;
  }, [selectedEvent, sessions, results, standingsDirty, importLogs, allEvents]);

  // ── Telemetry state ───────────────────────────────────────────────────────
  const telemetry = useMemo(() => {
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

  // ── Ops feed (compact) ────────────────────────────────────────────────────
  const opsFeed = useMemo(() => {
    return [...globalOperationLogs]
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 12);
  }, [globalOperationLogs]);

  // ─────────────────────────────────────────────────────────────────────────────

  const dashboardSubtitle = isAdmin
    ? 'Live ops center | global command'
    : 'Live ops center | assigned events';

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ────────────────────────────────────────────────────────────────────────
          HEADER + OPERATIONAL TELEMETRY BAR
          ──────────────────────────────────────────────────────────────────────── */}

      <div className="border-b border-gray-800/50 bg-[#0A0A0A] px-4 py-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-3">
          <div>
            <h1 className="text-lg font-black tracking-tight">RACECORE</h1>
            <p className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-widest">{dashboardSubtitle}</p>
          </div>

          {/* ── Operational Telemetry Strip (compact, always visible) ── */}
          <div className="flex flex-wrap items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest">
            {liveEvents.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-950/40 border border-red-800/60 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-300">LIVE {liveEvents.length}</span>
              </div>
            )}
            {incidents.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-950/40 border border-amber-800/60 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-amber-300">ALERTS {incidents.length}</span>
              </div>
            )}
            {standingsDirty && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-950/40 border border-blue-800/60 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-blue-300">STANDINGS DIRTY</span>
              </div>
            )}
            {opsFeed.filter(l => l.status === 'error' || l.status === 'failed').length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-950/40 border border-red-800/60 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-red-300">IMPORT ERR</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          MAIN OPERATIONAL GRID: 3-COLUMN LAYOUT
          LEFT (25%): INCIDENTS
          CENTER (50%): LIVE OPERATIONS
          RIGHT (25%): TELEMETRY + FEED
          ──────────────────────────────────────────────────────────────────────── */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 p-4 max-w-full">

        {/* ── LEFT COLUMN: INCIDENT QUEUE ────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-2">

          {/* CRITICAL INCIDENTS */}
          {incidents.filter(i => i.severity === 'critical').length > 0 && (
            <div className="border-l-4 border-red-600 bg-red-950/30 rounded-r overflow-hidden">
              <div className="px-2 py-1.5 bg-red-950/50 border-b border-red-900/50">
                <p className="text-[8px] font-bold uppercase tracking-widest text-red-300">🔴 CRITICAL</p>
              </div>
              <div className="space-y-0.5 p-1">
                {incidents.filter(i => i.severity === 'critical').map((incident, i) => (
                  <div
                    key={i}
                    onClick={() => incident.panel && navigate(`/race-control/events/${incident.eventId}/${incident.panel}`)}
                    className="px-2 py-1 bg-red-950/20 border border-red-900/40 rounded cursor-pointer hover:bg-red-950/35 transition-colors"
                  >
                    <p className="text-[7.5px] font-mono font-bold text-red-300 uppercase">{incident.label}</p>
                    <p className="text-[7px] text-red-400/70 mt-0.5">{incident.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WARNINGS */}
          {incidents.filter(i => i.severity === 'warning').length > 0 && (
            <div className="border-l-4 border-amber-600 bg-amber-950/20 rounded-r overflow-hidden">
              <div className="px-2 py-1.5 bg-amber-950/40 border-b border-amber-900/40">
                <p className="text-[8px] font-bold uppercase tracking-widest text-amber-300">⚠️  WARNING</p>
              </div>
              <div className="space-y-0.5 p-1">
                {incidents.filter(i => i.severity === 'warning').map((incident, i) => (
                  <div
                    key={i}
                    onClick={() => incident.panel && navigate(`/race-control/events/${incident.eventId}/${incident.panel}`)}
                    className="px-2 py-1 bg-amber-950/20 border border-amber-900/40 rounded cursor-pointer hover:bg-amber-950/30 transition-colors"
                  >
                    <p className="text-[7.5px] font-mono font-bold text-amber-300 uppercase">{incident.label}</p>
                    <p className="text-[7px] text-amber-400/70 mt-0.5">{incident.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INFO */}
          {incidents.filter(i => i.severity === 'info').length > 0 && (
            <div className="border-l-4 border-blue-600 bg-blue-950/15 rounded-r overflow-hidden">
              <div className="px-2 py-1.5 bg-blue-950/30 border-b border-blue-900/30">
                <p className="text-[8px] font-bold uppercase tracking-widest text-blue-300">ℹ️  INFO</p>
              </div>
              <div className="space-y-0.5 p-1">
                {incidents.filter(i => i.severity === 'info').map((incident, i) => (
                  <div key={i} className="px-2 py-1 bg-blue-950/20 border border-blue-900/40 rounded">
                    <p className="text-[7.5px] font-mono font-bold text-blue-300 uppercase">{incident.label}</p>
                    <p className="text-[7px] text-blue-400/70 mt-0.5">{incident.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STANDBY STATE */}
          {incidents.length === 0 && (
            <div className="px-2 py-4 text-center text-[8px] text-gray-600 uppercase tracking-widest font-mono">
              ○ NO INCIDENTS
            </div>
          )}

        </div>

        {/* ── CENTER COLUMN: LIVE OPERATIONS (DOMINANT ZONE) ───────────────── */}
        <div className="lg:col-span-2 space-y-2">

          {/* LIVE RACES (highest priority) */}
          {liveEvents.length > 0 && (
            <div className="border-l-4 border-red-600 bg-red-950/25 rounded-r overflow-hidden">
              <div className="px-2 py-1.5 bg-red-950/40 border-b border-red-900/50">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-[8px] font-bold uppercase tracking-widest text-red-300">LIVE RACES</p>
                  <span className="text-[8px] text-red-400 font-mono">{liveEvents.length}</span>
                </div>
              </div>
              <div className="divide-y divide-red-900/30">
                {liveEvents.map(ev => (
                  <div key={ev.id} className="px-2 py-1.5 hover:bg-red-950/35 transition-colors group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold text-white truncate">{ev.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[7px] text-gray-400 font-mono">
                          <span>{ev.series_name || '—'}</span>
                          <span className="text-gray-700">·</span>
                          <span>{ev.track_id ? 'at track' : '—'}</span>
                          <span className="text-gray-700">·</span>
                          <span>{ev.event_date ? new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/race-control/events/${ev.id}`)}
                        className="shrink-0 px-1.5 py-0.5 text-[7px] bg-red-900/40 border border-red-700/60 text-red-300 hover:bg-red-900/60 rounded font-mono uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UPCOMING EVENTS */}
          <div className="bg-[#0F0F0F] border border-gray-800/60 rounded overflow-hidden">
            <div className="px-2 py-1.5 bg-[#161616] border-b border-gray-800/60">
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Upcoming Events</p>
                <button
                  onClick={() => navigate('/race-control/events')}
                  className="text-[7px] text-gray-600 hover:text-teal-400 transition-colors"
                >
                  View All →
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-800/40">
              {upcomingEvents.length === 0 ? (
                <div className="px-2 py-3 text-center text-[8px] text-gray-700 uppercase tracking-widest font-mono">○ Standby</div>
              ) : (
                upcomingEvents.map(ev => {
                  const daysUntil = Math.ceil((new Date(ev.event_date) - today) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={ev.id} className="px-2 py-1 hover:bg-gray-800/30 transition-colors group cursor-pointer">
                      <div className="flex items-center justify-between gap-1.5 text-[8px]">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-semibold text-gray-300 truncate">{ev.name}</p>
                          <p className="text-[7px] text-gray-600 mt-0.5">
                            {new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })} ({daysUntil}d)
                          </p>
                        </div>
                        <span className={`text-[7px] font-mono font-bold uppercase px-1 py-0.5 rounded border ${
                          ev.status === 'Published' ? 'bg-blue-950/40 text-blue-300 border-blue-800/50' : 'bg-gray-900 text-gray-500 border-gray-800'
                        }`}>
                          {ev.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: TELEMETRY + OPS FEED ────────────────────────────── */}
        <div className="lg:col-span-1 space-y-2">

          {/* TELEMETRY STRIP (compact, technical) */}
          <div className="bg-[#0F0F0F] border border-gray-800/60 rounded overflow-hidden">
            <div className="px-2 py-1.5 bg-[#161616] border-b border-gray-800/60">
              <p className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Telemetry</p>
            </div>
            <div className="px-2 py-1.5 space-y-1">
              {[
                { label: 'Results',   state: telemetry.results   },
                { label: 'Standings', state: telemetry.standings  },
                { label: 'Imports',   state: telemetry.imports    },
                { label: 'Media',     state: telemetry.media      },
                { label: 'Timing',    state: telemetry.timing     },
              ].map(({ label, state }) => {
                const stateSymbol = state === 'ok' ? '✓' : state === 'warn' ? '!' : state === 'error' ? '✕' : '○';
                const stateColor = state === 'ok' ? 'text-green-500' : state === 'warn' ? 'text-amber-500' : state === 'error' ? 'text-red-500' : 'text-gray-600';
                return (
                  <div key={label} className="flex items-center justify-between text-[7px] font-mono">
                    <span className="text-gray-600 uppercase">{label}</span>
                    <div className="flex items-center gap-1">
                      <HealthDot state={state} />
                      <span className={`font-bold ${stateColor}`}>{stateSymbol}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OPS FEED (live ticker) */}
          <div className="bg-[#0F0F0F] border border-gray-800/60 rounded overflow-hidden">
            <div className="px-2 py-1.5 bg-[#161616] border-b border-gray-800/60">
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Ops Feed</p>
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
            <div className="divide-y divide-gray-800/40 max-h-32 overflow-y-auto">
              {opsFeed.length === 0 ? (
                <div className="px-2 py-2 text-center text-[7px] text-gray-700 uppercase tracking-widest font-mono">○ Awaiting ops</div>
              ) : (
                opsFeed.map(log => {
                  const isErr = log.status === 'error' || log.status === 'failed';
                  const isOk  = log.status === 'success';
                  const timeStr = log.created_date ? new Date(log.created_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
                  const opType = log.operation_type?.split('_').slice(0, 2).join('_').toLowerCase() || 'op';
                  return (
                    <div key={log.id} className="px-2 py-1 hover:bg-gray-800/20 transition-colors">
                      <div className="flex items-center gap-1 text-[7px]">
                        <span className={`w-1 h-1 rounded-full shrink-0 ${isErr ? 'bg-red-500' : isOk ? 'bg-green-500' : 'bg-gray-600'}`} />
                        <span className="text-gray-500 flex-1 truncate font-mono">{opType}</span>
                        <span className="text-gray-700 shrink-0 font-mono">{timeStr}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="bg-[#0F0F0F] border border-gray-800/60 rounded overflow-hidden">
            <div className="px-2 py-1.5 bg-[#161616] border-b border-gray-800/60">
              <p className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Actions</p>
            </div>
            <div className="p-1 space-y-0.5">
              {canAction(dashboardPermissions, 'create_event') && (
                <button
                  onClick={() => onCreateEvent?.()}
                  className="w-full text-left px-1.5 py-1 text-[7px] text-gray-500 hover:text-blue-400 hover:bg-blue-950/30 rounded transition-colors font-mono uppercase tracking-wider"
                >
                  + Create Event
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => onOpenImportEntries?.()}
                  className="w-full text-left px-1.5 py-1 text-[7px] text-gray-500 hover:text-amber-400 hover:bg-amber-950/30 rounded transition-colors font-mono uppercase tracking-wider"
                >
                  ↑ Import Data
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}