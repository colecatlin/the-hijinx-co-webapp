import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { canAction } from '@/components/access/accessControl';
import { ChevronRight, AlertTriangle, Clock } from 'lucide-react';

// ─── SESSION PROGRESSION ──────────────────────────────────────────────────────
const SESSION_ORDER = {
  Practice: 0,
  Qualifying: 1,
  Heat: 2,
  LCQ: 3,
  Feature: 4,
  Final: 5,
};

function SessionProgressionStrip({ sessions = [] }) {
  const ordered = [...sessions].sort((a, b) => (SESSION_ORDER[a.session_type] ?? 99) - (SESSION_ORDER[b.session_type] ?? 99));
  
  return (
    <div className="flex items-center gap-1 text-[7px] font-mono">
      {ordered.map((sess, i) => {
        const isActive = sess.status === 'Live' || sess.status === 'InProgress';
        const isDone = sess.status === 'Official' || sess.status === 'Locked';
        const color = isActive ? 'bg-red-600 text-white' : isDone ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400';
        return (
          <div key={sess.id} className="flex items-center">
            <span className={`px-1 py-0.5 rounded-sm ${color}`}>{sess.session_type[0]}</span>
            {i < ordered.length - 1 && <span className="mx-0.5 text-gray-700">→</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── ESCALATION QUEUE ─────────────────────────────────────────────────────────
function IncidentSeverityBadge({ severity }) {
  const config = {
    5: { label: 'BLOCKING', bg: 'bg-red-950', text: 'text-red-300', border: 'border-red-800' },
    4: { label: 'CRITICAL', bg: 'bg-red-900', text: 'text-red-200', border: 'border-red-700' },
    3: { label: 'WARNING', bg: 'bg-amber-950', text: 'text-amber-300', border: 'border-amber-800' },
    2: { label: 'INFO', bg: 'bg-blue-950', text: 'text-blue-300', border: 'border-blue-800' },
  };
  const cfg = config[severity] || config[2];
  return (
    <span className={`inline-block px-1 py-0.5 text-[6.5px] font-mono font-bold uppercase ${cfg.bg} ${cfg.text} border ${cfg.border} rounded`}>
      {cfg.label}
    </span>
  );
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

  // ── Global operations logs ────────────────────────────────────────────────
  const { data: globalOperationLogs = [] } = useQuery({
    queryKey: ['operationLogs_global'],
    queryFn: async () => {
      try {
        const allLogs = await base44.entities.OperationLog.list('-created_date', 100);
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
      .slice(0, 3);
    return { liveEvents: live, upcomingEvents: upcoming };
  }, [allEvents, today]);

  // ── Real operational telemetry ────────────────────────────────────────────
  const operationalTelemetry = useMemo(() => {
    const pendingResults = results.filter(r => r.status_state === 'Draft' || r.status_state === 'Provisional').length;
    const dirtyStandings = standingsDirty ? 1 : 0;
    const failedImports = importLogs.filter(l => l.status === 'failed' || l.status === 'error').length;
    const activeSessions = sessions.filter(s => s.status === 'Live' || s.status === 'InProgress').length;
    const waitingToPublish = results.filter(r => r.status_state === 'Official' && !r.published).length;
    
    return {
      pendingResults,
      dirtyStandings,
      failedImports,
      activeSessions,
      waitingToPublish,
    };
  }, [results, standings, standingsDirty, sessions, importLogs]);

  // ── Escalation queue (operational blockers) ──────────────────────────────
  const escalationQueue = useMemo(() => {
    const items = [];

    // BLOCKING
    if (selectedEvent && sessions.length > 0 && selectedEvent.status === 'Live') {
      const activeSessions = sessions.filter(s => s.status !== 'Draft');
      const sessionsNoResults = activeSessions.filter(s => !results.some(r => r.session_id === s.id));
      if (sessionsNoResults.length > 0) {
        items.push({
          severity: 5,
          title: 'RESULTS BLOCKED',
          desc: `${sessionsNoResults.length} session(s) missing results`,
          event: selectedEvent?.name,
          eventId: selectedEvent?.id,
          action: 'Review Results',
          panel: 'results',
        });
      }
    }

    if (selectedEvent && sessions.length === 0 && (selectedEvent.status === 'Live' || selectedEvent.status === 'Published')) {
      items.push({
        severity: 5,
        title: 'NO SESSIONS',
        desc: 'Event has no sessions created',
        event: selectedEvent?.name,
        eventId: selectedEvent?.id,
        action: 'Create Sessions',
        panel: 'sessions',
      });
    }

    // CRITICAL
    const failedImports = importLogs.filter(l => l.status === 'failed' || l.status === 'error');
    if (failedImports.length > 0) {
      items.push({
        severity: 4,
        title: 'IMPORT FAILED',
        desc: `${failedImports.length} import(s) failed`,
        event: selectedEvent?.name || 'Global',
        eventId: selectedEvent?.id,
        action: 'Review Imports',
        panel: 'imports',
      });
    }

    // WARNING
    if (standingsDirty && selectedEvent) {
      items.push({
        severity: 3,
        title: 'STANDINGS OUTDATED',
        desc: 'Standings need recalculation',
        event: selectedEvent.name,
        eventId: selectedEvent.id,
        action: 'Recalculate',
        panel: 'standings',
      });
    }

    const waitingToPublish = results.filter(r => r.status_state === 'Official' && !r.published);
    if (waitingToPublish.length > 0) {
      items.push({
        severity: 3,
        title: 'PUBLISH PENDING',
        desc: `${waitingToPublish.length} result(s) waiting to publish`,
        event: selectedEvent?.name,
        eventId: selectedEvent?.id,
        action: 'Publish Results',
        panel: 'results',
      });
    }

    return items.sort((a, b) => b.severity - a.severity).slice(0, 6);
  }, [selectedEvent, sessions, results, standingsDirty, importLogs]);

  // ── Next actions queue ───────────────────────────────────────────────────
  const nextActionsQueue = useMemo(() => {
    const actions = [];

    // Derive next logical actions from live events
    liveEvents.forEach(ev => {
      const evSessions = sessions.filter(s => s.event_id === ev.id);
      const evResults = results.filter(r => r.event_id === ev.id);
      
      if (evSessions.length === 0) {
        actions.push({
          event: ev.name,
          action: 'Create Sessions',
          priority: 5,
          eventId: ev.id,
        });
      } else {
        const activeSess = evSessions.find(s => s.status === 'Live' || s.status === 'InProgress');
        if (activeSess && !evResults.some(r => r.session_id === activeSess.id)) {
          actions.push({
            event: ev.name,
            action: `Review ${activeSess.name || activeSess.session_type} Results`,
            priority: 5,
            eventId: ev.id,
          });
        } else if (evResults.length > 0) {
          const unofficialResults = evResults.filter(r => r.status_state !== 'Official');
          if (unofficialResults.length > 0) {
            actions.push({
              event: ev.name,
              action: 'Approve Results',
              priority: 4,
              eventId: ev.id,
            });
          }
        }
      }
    });

    return actions.slice(0, 5);
  }, [liveEvents, sessions, results]);

  const dashboardSubtitle = isAdmin ? 'LIVE OPERATIONS CENTER' : 'ASSIGNED EVENTS';

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen font-sans flex flex-col">

      {/* ────────────────────────────────────────────────────────────────────────
          HEADER + OPERATIONAL STATUS STRIP
          ──────────────────────────────────────────────────────────────────────── */}

      <div className="border-b border-gray-800/40 bg-[#0A0A0A] px-3 py-2">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 mb-1.5">
          <div>
            <h1 className="text-xs font-black tracking-tight uppercase">RACECORE</h1>
            <p className="text-[7px] text-gray-600 mt-0.5 uppercase tracking-widest font-mono">{dashboardSubtitle}</p>
          </div>
          
          {/* Real telemetry display */}
          <div className="flex flex-wrap items-center gap-2 text-[7px] font-mono shrink-0">
            {operationalTelemetry.activeSessions > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-950/50 border border-red-800/60 rounded">
                <span className="w-0.5 h-0.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-300">LIVE {operationalTelemetry.activeSessions}</span>
              </span>
            )}
            {operationalTelemetry.pendingResults > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-950/40 border border-blue-800/50 rounded">
                <span className="text-blue-300">{operationalTelemetry.pendingResults} PENDING</span>
              </span>
            )}
            {operationalTelemetry.failedImports > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-950/40 border border-red-800/50 rounded">
                <span className="text-red-300">{operationalTelemetry.failedImports} FAILED</span>
              </span>
            )}
            {operationalTelemetry.dirtyStandings > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-950/40 border border-amber-800/50 rounded">
                <span className="text-amber-300">STANDINGS DIRTY</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          MAIN OPERATIONAL GRID
          ──────────────────────────────────────────────────────────────────────── */}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-2 p-3 max-w-full overflow-hidden">

        {/* ── LEFT COLUMN: ESCALATION QUEUE ──────────────────────────────────── */}
        <div className="lg:col-span-1 flex flex-col min-h-0">
          <div className="bg-[#0F0F0F] border border-gray-800/50 rounded overflow-hidden flex flex-col flex-1">
            <div className="px-2 py-1.5 bg-[#161616] border-b border-gray-800/40 shrink-0">
              <p className="text-[8px] font-mono font-bold uppercase tracking-wider text-gray-600">Escalation Queue</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-800/30">
              {escalationQueue.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center px-2 py-4 text-[7px] text-gray-700 uppercase tracking-widest font-mono">
                  ○ NO BLOCKERS
                </div>
              ) : (
                escalationQueue.map((incident, i) => (
                  <div
                    key={i}
                    onClick={() => incident.panel && navigate(`/race-control/events/${incident.eventId}/${incident.panel}`)}
                    className="px-2 py-1.5 hover:bg-gray-800/20 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <IncidentSeverityBadge severity={incident.severity} />
                      <span className="text-[6.5px] text-gray-600 truncate">{incident.event}</span>
                    </div>
                    <p className="text-[7px] font-mono font-bold text-white mb-0.5">{incident.title}</p>
                    <p className="text-[6.5px] text-gray-500 mb-1">{incident.desc}</p>
                    <button className="text-[6.5px] px-1 py-0.5 bg-gray-800/50 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors font-mono opacity-0 group-hover:opacity-100">
                      {incident.action} →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── CENTER COLUMN: LIVE OPERATIONS (DOMINANT) ──────────────────────── */}
        <div className="lg:col-span-1 flex flex-col min-h-0">
          <div className="bg-[#0F0F0F] border border-gray-800/50 rounded overflow-hidden flex flex-col flex-1">
            <div className="px-2 py-1.5 bg-[#161616] border-b border-gray-800/40 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-mono font-bold uppercase tracking-wider text-gray-600">Live Operations</p>
                {liveEvents.length > 0 && <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-800/30">
              {liveEvents.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center px-2 py-4 text-[7px] text-gray-700 uppercase tracking-widest font-mono">
                  ○ STANDBY
                </div>
              ) : (
                liveEvents.map(ev => {
                  const evSessions = sessions.filter(s => s.event_id === ev.id);
                  const evResults = results.filter(r => r.event_id === ev.id);
                  const activeSess = evSessions.find(s => s.status === 'Live' || s.status === 'InProgress');
                  const hasBlockers = escalationQueue.filter(i => i.eventId === ev.id).length > 0;
                  const pendingResults = evResults.filter(r => r.status_state !== 'Official').length;
                  const dirtyStandings = standingsDirty ? 1 : 0;
                  
                  return (
                    <div
                      key={ev.id}
                      onClick={() => navigate(`/race-control/events/${ev.id}`)}
                      className="px-2 py-1.5 hover:bg-red-950/30 transition-colors cursor-pointer group border-l-2 border-red-600"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-mono font-bold text-white truncate">{ev.name}</p>
                        </div>
                        <button className="shrink-0 text-[6.5px] px-1 py-0.5 bg-red-900/50 border border-red-700/60 text-red-300 hover:bg-red-900/70 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                          Open
                        </button>
                      </div>
                      
                      {/* Session progression */}
                      {evSessions.length > 0 && (
                        <div className="mb-1">
                          <SessionProgressionStrip sessions={evSessions} />
                        </div>
                      )}
                      
                      {/* Operational state */}
                      <div className="flex flex-wrap items-center gap-1 text-[6.5px] font-mono text-gray-500 mb-1">
                        {activeSess && <span className="px-1 py-0.5 bg-red-950/40 text-red-300 rounded">SESSION: {activeSess.name || activeSess.session_type}</span>}
                        {pendingResults > 0 && <span className="px-1 py-0.5 bg-blue-950/40 text-blue-300 rounded">{pendingResults} RESULTS</span>}
                        {dirtyStandings > 0 && <span className="px-1 py-0.5 bg-amber-950/40 text-amber-300 rounded">STANDINGS DIRTY</span>}
                        {hasBlockers && <span className="px-1 py-0.5 bg-red-950/40 text-red-300 rounded">⚠ ALERT</span>}
                      </div>

                      {/* Next action */}
                      {activeSess && (
                        <div className="text-[6.5px] text-gray-600 font-mono">
                          NEXT: Review {activeSess.name || activeSess.session_type} results
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: NEXT ACTIONS + UPCOMING ────────────────────────── */}
        <div className="lg:col-span-1 flex flex-col min-h-0 space-y-2">
          
          {/* NEXT ACTIONS QUEUE */}
          <div className="bg-[#0F0F0F] border border-gray-800/50 rounded overflow-hidden flex flex-col flex-1">
            <div className="px-2 py-1.5 bg-[#161616] border-b border-gray-800/40 shrink-0">
              <p className="text-[8px] font-mono font-bold uppercase tracking-wider text-gray-600">Next Actions</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-800/30">
              {nextActionsQueue.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center px-2 py-3 text-[7px] text-gray-700 uppercase tracking-widest font-mono">
                  ○ CLEAR
                </div>
              ) : (
                nextActionsQueue.map((action, i) => (
                  <div key={i} className="px-2 py-1 hover:bg-gray-800/20 transition-colors cursor-pointer group">
                    <p className="text-[7px] font-mono font-bold text-gray-300 truncate mb-0.5">{action.event}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[6.5px] text-gray-500">{action.action}</p>
                      <ChevronRight className="w-3 h-3 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* UPCOMING EVENTS (compact) */}
          <div className="bg-[#0F0F0F] border border-gray-800/50 rounded overflow-hidden">
            <div className="px-2 py-1 bg-[#161616] border-b border-gray-800/40 flex items-center justify-between">
              <p className="text-[7.5px] font-mono font-bold uppercase tracking-wider text-gray-600">Upcoming</p>
              <button onClick={() => navigate('/race-control/events')} className="text-[6.5px] text-gray-600 hover:text-teal-400 transition-colors">
                View →
              </button>
            </div>
            <div className="divide-y divide-gray-800/30 max-h-24 overflow-y-auto">
              {upcomingEvents.length === 0 ? (
                <div className="px-2 py-1.5 text-center text-[7px] text-gray-700 uppercase tracking-widest font-mono">○ None</div>
              ) : (
                upcomingEvents.map(ev => {
                  const daysUntil = Math.ceil((new Date(ev.event_date) - today) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={ev.id} className="px-2 py-0.75 hover:bg-gray-800/15 transition-colors">
                      <p className="text-[6.5px] font-mono font-bold text-gray-300 truncate">{ev.name}</p>
                      <p className="text-[6px] text-gray-600 mt-0.25">{new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {daysUntil}d</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}