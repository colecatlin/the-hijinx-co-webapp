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

// ─── RACE STATE SYSTEM ────────────────────────────────────────────────────────
// Operational state language for live racing environments

const RACE_STATES = {
  LIVE:              { label: 'LIVE',              color: 'bg-red-950/50 text-red-300 border-red-800/60',       severity: 5 },
  ON_TRACK:          { label: 'ON TRACK',          color: 'bg-red-950/40 text-red-300 border-red-800/50',       severity: 5 },
  GRID:              { label: 'GRID',              color: 'bg-amber-950/40 text-amber-300 border-amber-800/50',  severity: 4 },
  HOT_PIT:           { label: 'HOT PIT',           color: 'bg-amber-950/40 text-amber-300 border-amber-800/50',  severity: 4 },
  CAUTION:           { label: 'CAUTION',           color: 'bg-amber-950/50 text-amber-300 border-amber-800/60',  severity: 4 },
  RED_FLAG:          { label: 'RED FLAG',          color: 'bg-red-950/60 text-red-300 border-red-800/70',        severity: 5 },
  RESULTS_PENDING:   { label: 'RESULTS PENDING',   color: 'bg-blue-950/40 text-blue-300 border-blue-800/50',     severity: 3 },
  RESULTS_LOCKED:    { label: 'RESULTS LOCKED',    color: 'bg-green-950/40 text-green-300 border-green-800/50',  severity: 2 },
  PUBLISHED:         { label: 'PUBLISHED',         color: 'bg-green-950/40 text-green-300 border-green-800/50',  severity: 2 },
  DIRTY:             { label: 'STANDINGS DIRTY',   color: 'bg-amber-950/40 text-amber-300 border-amber-800/50',  severity: 3 },
  DELAYED:           { label: 'DELAYED',           color: 'bg-amber-950/40 text-amber-300 border-amber-800/50',  severity: 3 },
  IMPORT_FAILED:     { label: 'IMPORT FAILED',     color: 'bg-red-950/40 text-red-300 border-red-800/50',        severity: 4 },
  READY:             { label: 'READY',             color: 'bg-green-950/40 text-green-300 border-green-800/50',  severity: 1 },
  OFFLINE:           { label: 'OFFLINE',           color: 'bg-gray-950/40 text-gray-400 border-gray-800/50',     severity: 2 },
};

function RaceStateTag({ state, size = 'sm' }) {
  const cfg = RACE_STATES[state] || RACE_STATES.OFFLINE;
  const sizeClass = size === 'sm' ? 'text-[7px] px-1.5 py-0.5' : 'text-[8px] px-2 py-1';
  return (
    <span className={`inline-flex items-center rounded border font-mono font-bold uppercase tracking-wider ${sizeClass} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function HealthDot({ state }) {
  if (state === 'ok')      return <span className="w-1.5 h-1.5 rounded-full bg-green-500" />;
  if (state === 'warn')    return <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />;
  if (state === 'error')   return <span className="w-1.5 h-1.5 rounded-full bg-red-500" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />;
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

  // ── Global operations feed ────────────────────────────────────────────────
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

  // ── Live event detection & operational state ──────────────────────────────
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

  // ── Compute race states for live events ────────────────────────────────────
  const liveEventStates = useMemo(() => {
    const states = {};
    liveEvents.forEach(ev => {
      const evSessions = sessions.filter(s => s.event_id === ev.id);
      const evResults = results.filter(r => r.event_id === ev.id);
      
      // Determine primary state
      if (ev.status === 'Live') {
        if (evSessions.length === 0) states[ev.id] = 'LIVE';
        else {
          const activeSess = evSessions.find(s => s.status === 'Live' || s.status === 'InProgress');
          if (activeSess) {
            if (activeSess.session_type === 'Heat' || activeSess.session_type === 'Feature') {
              states[ev.id] = 'ON_TRACK';
            } else if (activeSess.session_type === 'Qualifying') {
              states[ev.id] = 'ON_TRACK';
            } else {
              states[ev.id] = 'GRID';
            }
          } else {
            states[ev.id] = 'GRID';
          }
        }
      } else {
        states[ev.id] = 'READY';
      }
    });
    return states;
  }, [liveEvents, sessions]);

  // ── Incident queue (tactical priority) ─────────────────────────────────────
  const incidents = useMemo(() => {
    const items = [];

    // Critical: no sessions on live event
    if (selectedEvent && sessions.length === 0 && (selectedEvent.status === 'Live' || selectedEvent.status === 'Published')) {
      items.push({
        severity: 5,
        label: 'NO SESSIONS CREATED',
        desc: selectedEvent.name,
        eventId: selectedEvent.id,
        panel: 'sessions',
      });
    }

    // Critical: live event with missing results
    if (selectedEvent && sessions.length > 0 && selectedEvent.status === 'Live') {
      const activeSessions = sessions.filter(s => s.status !== 'Draft');
      const sessionsNoResults = activeSessions.filter(s => !results.some(r => r.session_id === s.id));
      if (sessionsNoResults.length > 0) {
        items.push({
          severity: 5,
          label: `RESULTS BLOCKED (${sessionsNoResults.length})`,
          desc: selectedEvent.name,
          eventId: selectedEvent.id,
          panel: 'results',
        });
      }
    }

    // Critical: import failures
    const failedImports = importLogs.filter(l => l.status === 'failed' || l.status === 'error');
    if (failedImports.length > 0) {
      items.push({
        severity: 4,
        label: `IMPORT FAILED (${failedImports.length})`,
        desc: selectedEvent?.name || 'Global',
        eventId: selectedEvent?.id,
        panel: 'imports',
      });
    }

    // Warning: standings dirty
    if (standingsDirty && selectedEvent) {
      items.push({
        severity: 3,
        label: 'STANDINGS OUT OF DATE',
        desc: selectedEvent.name,
        eventId: selectedEvent.id,
        panel: 'standings',
      });
    }

    // Info: pending approvals
    allEvents
      .filter(e => e.status === 'PendingApproval')
      .slice(0, 2)
      .forEach(e => {
        items.push({
          severity: 2,
          label: 'PENDING APPROVAL',
          desc: e.name,
          eventId: e.id,
          panel: null,
        });
      });

    return items.sort((a, b) => b.severity - a.severity);
  }, [selectedEvent, sessions, results, standingsDirty, importLogs, allEvents]);

  // ── Telemetry state ──────────────────────────────────────────────────────
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

  // ── Ops feed (monospace ticker) ───────────────────────────────────────────
  const opsFeed = useMemo(() => {
    return [...globalOperationLogs]
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 12);
  }, [globalOperationLogs]);

  // ─────────────────────────────────────────────────────────────────────────────

  const dashboardSubtitle = isAdmin ? 'Global command center' : 'Assigned events';

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen font-sans">

      {/* ────────────────────────────────────────────────────────────────────────
          HEADER + OPERATIONAL TELEMETRY
          ──────────────────────────────────────────────────────────────────────── */}

      <div className="border-b border-gray-800/40 bg-[#0A0A0A] px-3 py-2.5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-2">
          <div>
            <h1 className="text-sm font-black tracking-tight">RACECORE</h1>
            <p className="text-[8px] text-gray-600 mt-0.5 uppercase tracking-widest">{dashboardSubtitle}</p>
          </div>

          {/* Operational Telemetry Strip */}
          <div className="flex flex-wrap items-center gap-1 text-[7px] font-mono uppercase tracking-wider shrink-0">
            {liveEvents.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-950/50 border border-red-800/60 rounded">
                <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-300">LIVE {liveEvents.length}</span>
              </span>
            )}
            {incidents.length > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-950/50 border border-amber-800/60 rounded">
                <span className="w-1 h-1 rounded-full bg-amber-500" />
                <span className="text-amber-300">ALERT {incidents.length}</span>
              </span>
            )}
            {standingsDirty && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-950/40 border border-blue-800/50 rounded">
                <span className="w-1 h-1 rounded-full bg-blue-500" />
                <span className="text-blue-300">DIRTY</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          MAIN OPERATIONAL GRID
          ──────────────────────────────────────────────────────────────────────── */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 p-3 max-w-full">

        {/* ── LEFT COLUMN: INCIDENTS (TACTICAL PRIORITY) ──────────────────────── */}
        <div className="lg:col-span-1 space-y-1.5">

          {incidents.length > 0 ? (
            incidents.map((incident, i) => {
              const severityColor = incident.severity >= 5 ? 'border-l-red-600 bg-red-950/35' :
                                    incident.severity >= 4 ? 'border-l-amber-600 bg-amber-950/25' :
                                    incident.severity >= 3 ? 'border-l-blue-600 bg-blue-950/20' :
                                    'border-l-gray-600 bg-gray-950/20';
              const textColor = incident.severity >= 5 ? 'text-red-300' :
                                incident.severity >= 4 ? 'text-amber-300' :
                                incident.severity >= 3 ? 'text-blue-300' :
                                'text-gray-400';
              return (
                <div
                  key={i}
                  onClick={() => incident.panel && navigate(`/race-control/events/${incident.eventId}/${incident.panel}`)}
                  className={`border-l-2 ${severityColor} rounded-r px-2 py-1.5 cursor-pointer hover:opacity-90 transition-opacity group`}
                >
                  <p className={`text-[7px] font-mono font-bold uppercase tracking-wider ${textColor}`}>{incident.label}</p>
                  <p className={`text-[7px] ${textColor} opacity-75 mt-0.5 truncate`}>{incident.desc}</p>
                </div>
              );
            })
          ) : (
            <div className="text-center text-[7px] text-gray-700 uppercase tracking-widest font-mono py-3">
              ○ NO INCIDENTS
            </div>
          )}

        </div>

        {/* ── CENTER COLUMN: LIVE OPERATIONS (DOMINANT) ──────────────────────── */}
        <div className="lg:col-span-2 space-y-1.5">

          {/* LIVE EVENTS with full operational intelligence */}
          {liveEvents.length > 0 && (
            <div className="border-l-2 border-red-600 bg-red-950/30 rounded-r overflow-hidden">
              <div className="px-2 py-1.5 bg-red-950/50 border-b border-red-900/40">
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                  <p className="text-[8px] font-mono font-bold uppercase tracking-wider text-red-300">Live Races</p>
                  <span className="text-[7px] text-red-400 font-mono">{liveEvents.length}</span>
                </div>
              </div>
              <div className="divide-y divide-red-900/20">
                {liveEvents.map(ev => {
                  const evSessions = sessions.filter(s => s.event_id === ev.id);
                  const evResults = results.filter(r => r.event_id === ev.id);
                  const raceState = liveEventStates[ev.id] || 'LIVE';
                  const hasIssues = incidents.filter(i => i.eventId === ev.id).length > 0;
                  return (
                    <div
                      key={ev.id}
                      className="px-2 py-1.5 hover:bg-red-950/40 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-mono font-bold text-white truncate">{ev.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <RaceStateTag state={raceState} size="sm" />
                            {evSessions.length > 0 && (
                              <span className="text-[7px] text-gray-500 font-mono">
                                {evSessions.length} session{evSessions.length !== 1 ? 's' : ''} • {evResults.length} result{evResults.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {hasIssues && (
                              <span className="text-[7px] text-amber-400 font-mono font-bold">⚠ {incidents.filter(i => i.eventId === ev.id).length} ALERT</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/race-control/events/${ev.id}`)}
                          className="shrink-0 px-1.5 py-0.5 text-[7px] bg-red-900/50 border border-red-700/60 text-red-300 hover:bg-red-900/70 rounded font-mono uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* UPCOMING EVENTS */}
          <div className="bg-[#0F0F0F] border border-gray-800/50 rounded overflow-hidden">
            <div className="px-2 py-1.5 bg-[#161616] border-b border-gray-800/40">
              <div className="flex items-center justify-between text-[8px]">
                <p className="font-mono font-bold uppercase tracking-wider text-gray-600">Upcoming</p>
                <button
                  onClick={() => navigate('/race-control/events')}
                  className="text-[7px] text-gray-600 hover:text-teal-400 transition-colors"
                >
                  View →
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-800/30">
              {upcomingEvents.length === 0 ? (
                <div className="px-2 py-2 text-center text-[7px] text-gray-700 uppercase tracking-widest font-mono">○ Standby</div>
              ) : (
                upcomingEvents.map(ev => {
                  const daysUntil = Math.ceil((new Date(ev.event_date) - today) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={ev.id} className="px-2 py-1 hover:bg-gray-800/20 transition-colors cursor-pointer group">
                      <div className="flex items-center justify-between gap-1 text-[7px]">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-bold text-gray-300 truncate">{ev.name}</p>
                          <p className="text-[6.5px] text-gray-600 mt-0.5">
                            {new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({daysUntil}d)
                          </p>
                        </div>
                        <span className="text-[6.5px] font-mono text-gray-600">{ev.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: TELEMETRY + FEED ────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-1.5">

          {/* TELEMETRY (technical, compact) */}
          <div className="bg-[#0F0F0F] border border-gray-800/50 rounded overflow-hidden">
            <div className="px-2 py-1.5 bg-[#161616] border-b border-gray-800/40">
              <p className="text-[7px] font-mono font-bold uppercase tracking-wider text-gray-600">Systems</p>
            </div>
            <div className="px-2 py-1 space-y-0.5 text-[7px] font-mono">
              {[
                { label: 'RESULTS',   state: telemetry.results   },
                { label: 'STANDINGS', state: telemetry.standings  },
                { label: 'IMPORTS',   state: telemetry.imports    },
                { label: 'MEDIA',     state: telemetry.media      },
                { label: 'TIMING',    state: telemetry.timing     },
              ].map(({ label, state }) => {
                const stateSymbol = state === 'ok' ? '✓' : state === 'warn' ? '!' : state === 'error' ? '✕' : '○';
                const stateColor = state === 'ok' ? 'text-green-500' : state === 'warn' ? 'text-amber-500' : state === 'error' ? 'text-red-500' : 'text-gray-600';
                return (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-gray-600">{label}</span>
                    <div className="flex items-center gap-0.5">
                      <HealthDot state={state} />
                      <span className={`font-bold ${stateColor} w-3 text-center`}>{stateSymbol}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* OPS FEED (live ticker) */}
          <div className="bg-[#0F0F0F] border border-gray-800/50 rounded overflow-hidden">
            <div className="px-2 py-1.5 bg-[#161616] border-b border-gray-800/40">
              <div className="flex items-center justify-between">
                <p className="text-[7px] font-mono font-bold uppercase tracking-wider text-gray-600">Ops Feed</p>
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
            <div className="divide-y divide-gray-800/30 max-h-28 overflow-y-auto">
              {opsFeed.length === 0 ? (
                <div className="px-2 py-1.5 text-center text-[7px] text-gray-700 uppercase tracking-widest font-mono">○ Awaiting</div>
              ) : (
                opsFeed.map(log => {
                  const isErr = log.status === 'error' || log.status === 'failed';
                  const isOk  = log.status === 'success';
                  const timeStr = log.created_date ? new Date(log.created_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
                  const opType = log.operation_type?.split('_').slice(0, 2).join('_').toLowerCase() || 'op';
                  return (
                    <div key={log.id} className="px-2 py-0.5 hover:bg-gray-800/15 transition-colors">
                      <div className="flex items-center gap-1 text-[6.5px] font-mono">
                        <span className={`w-0.5 h-0.5 rounded-full shrink-0 ${isErr ? 'bg-red-500' : isOk ? 'bg-green-500' : 'bg-gray-600'}`} />
                        <span className="text-gray-500 flex-1 truncate">{opType}</span>
                        <span className="text-gray-700 shrink-0">{timeStr}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="bg-[#0F0F0F] border border-gray-800/50 rounded overflow-hidden">
            <div className="px-2 py-1.5 bg-[#161616] border-b border-gray-800/40">
              <p className="text-[7px] font-mono font-bold uppercase tracking-wider text-gray-600">Actions</p>
            </div>
            <div className="px-1 py-0.5 space-y-0.5">
              {canAction(dashboardPermissions, 'create_event') && (
                <button
                  onClick={() => onCreateEvent?.()}
                  className="w-full text-left px-1.5 py-0.5 text-[7px] text-gray-500 hover:text-blue-400 hover:bg-blue-950/30 rounded transition-colors font-mono uppercase tracking-wider"
                >
                  + Event
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => onOpenImportEntries?.()}
                  className="w-full text-left px-1.5 py-0.5 text-[7px] text-gray-500 hover:text-amber-400 hover:bg-amber-950/30 rounded transition-colors font-mono uppercase tracking-wider"
                >
                  ↑ Import
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}