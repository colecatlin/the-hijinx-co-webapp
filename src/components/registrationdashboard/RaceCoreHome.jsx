/**
 * RaceCoreHome — Global Command Surface
 * R8Y Part 1: Tactical UX refinement
 * - Event Operations board dominates
 * - Role-aware Operations panel
 * - Dense operational rows
 * - Live event emphasis
 * - OperationLog feed with severity
 * - Compressed telemetry strip
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import {
  AlertCircle, Plus, FileText, ChevronRight,
  Radio, BookOpen, Flag, BarChart2, Users,
  Shield, Mic, Camera, ArrowRight,
} from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { QueryKeys } from '@/components/utils/queryKeys';

const DQ = applyDefaultQueryOptions();

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Live:            { label: 'LIVE',      color: 'text-red-300',    bg: 'bg-red-950/60 border-red-700/60',    dot: 'bg-red-500 animate-pulse' },
  Published:       { label: 'PUBLISHED', color: 'text-teal-300',   bg: 'bg-teal-950/40 border-teal-700/40',  dot: 'bg-teal-400' },
  Completed:       { label: 'DONE',      color: 'text-gray-500',   bg: 'bg-gray-900/30 border-gray-700/30',  dot: 'bg-gray-600' },
  Cancelled:       { label: 'CANCLD',    color: 'text-gray-600',   bg: 'bg-gray-900/20 border-gray-800/30',  dot: 'bg-gray-700' },
  Draft:           { label: 'DRAFT',     color: 'text-gray-400',   bg: 'bg-gray-900/30 border-gray-800',     dot: 'bg-gray-600' },
  PendingApproval: { label: 'PENDING',   color: 'text-amber-300',  bg: 'bg-amber-950/30 border-amber-700/40', dot: 'bg-amber-400' },
};

function statusCfg(s) { return STATUS_CONFIG[s] || STATUS_CONFIG.Draft; }

function StatusTag({ status }) {
  const cfg = statusCfg(status);
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-px rounded-sm text-[10px] font-mono font-bold tracking-widest border ${cfg.bg} ${cfg.color} whitespace-nowrap`}>
      <span className={`w-1 h-1 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Severity config for ops feed ──────────────────────────────────────────────
function opSeverity(type = '') {
  const t = type.toUpperCase();
  if (t.includes('FAIL') || t.includes('ERROR'))  return { color: 'text-red-400',    dot: 'bg-red-500' };
  if (t.includes('WARN') || t.includes('DIRTY'))  return { color: 'text-amber-400',  dot: 'bg-amber-500' };
  if (t.includes('LOCK') || t.includes('PUBLISH') || t.includes('OFFICIAL')) return { color: 'text-teal-400', dot: 'bg-teal-500' };
  return { color: 'text-gray-400', dot: 'bg-gray-600' };
}

// ── Role-aware operation shortcuts ────────────────────────────────────────────
function buildRoleActions(isAdmin, role, navigate) {
  if (isAdmin) {
    return [
      { label: 'Event Files',          sub: 'All events',              icon: FileText,  action: () => navigate('/race-control/events') },
      { label: 'Create Event',         sub: 'New event file',          icon: Plus,      action: () => navigate('/racecore?tab=eventBuilder') },
      { label: 'Announcer Pack',       sub: 'Pre-race assets',         icon: Mic,       action: () => navigate('/racecore?tab=announcer_pack') },
      { label: 'Integrations',         sub: 'Sync & connections',      icon: BookOpen,  action: () => navigate('/racecore?tab=integrations') },
      { label: 'Standings Review',     sub: 'Recalculate & publish',   icon: BarChart2, action: () => navigate('/race-control/events') },
      { label: 'Media Governance',     sub: 'Credentials & requests',  icon: Camera,    action: () => navigate('/race-control/events') },
    ];
  }
  if (role === 'entity_owner' || role === 'entity_editor') {
    return [
      { label: 'Event Files',     sub: 'Your assigned events',  icon: FileText,  action: () => navigate('/race-control/events') },
      { label: 'Gate Queue',      sub: 'Check-in & tech',       icon: Shield,    action: () => navigate('/race-control/events') },
      { label: 'Session Control', sub: 'Sessions & results',    icon: Flag,      action: () => navigate('/race-control/events') },
      { label: 'Results Review',  sub: 'Pending publish',       icon: BarChart2, action: () => navigate('/race-control/events') },
    ];
  }
  // default user / media
  return [
    { label: 'Event Files',      sub: 'Browse events',         icon: FileText, action: () => navigate('/race-control/events') },
    { label: 'Credential Queue', sub: 'Media access',          icon: Camera,   action: () => navigate('/race-control/events') },
  ];
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ value, label, dim = false }) {
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs tracking-widest whitespace-nowrap ${dim ? 'text-gray-700' : 'text-gray-500'}`}>
      <span className={`font-bold ${dim ? 'text-gray-600' : 'text-gray-300'}`}>{value}</span>
      {label}
    </span>
  );
}

// ── Telemetry cell ────────────────────────────────────────────────────────────
function TelCell({ value, label, hot = false }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-r border-gray-800/60 last:border-r-0">
      <span className={`text-base font-black font-mono tabular-nums ${hot && value > 0 ? 'text-red-400' : 'text-gray-200'}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-gray-600 leading-tight">{label}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RaceCoreHome({
  dashboardPermissions,
  isAdmin,
  user,
  allEvents = [],
  importLogs = [],
}) {
  const navigate = useNavigate();

  const { data: operationLogs = [] } = useQuery({
    queryKey: QueryKeys.operationLog.recent(30),
    queryFn: () => base44.entities.OperationLog.list('-created_date', 30),
    ...DQ,
  });

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // compare by day
    const upcoming = [];
    const past = [];

    allEvents.forEach(event => {
      const eventDate = event.event_date ? new Date(event.event_date) : null;
      // Live events always go in upcoming regardless of date
      if (event.status === 'Live' || (eventDate && eventDate >= now)) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    });

    // Upcoming: Live first, then soonest date first
    upcoming.sort((a, b) => {
      if (a.status === 'Live' && b.status !== 'Live') return -1;
      if (b.status === 'Live' && a.status !== 'Live') return 1;
      return new Date(a.event_date || 0) - new Date(b.event_date || 0);
    });

    // Past: most recent first
    past.sort((a, b) => new Date(b.event_date || 0) - new Date(a.event_date || 0));

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [allEvents]);

  const telemetry = useMemo(() => {
    const live = upcomingEvents.filter(e => e.status === 'Live').length;
    const upcoming = upcomingEvents.length;
    const last24h = new Date(); last24h.setDate(last24h.getDate() - 1);
    const imports24h = importLogs.filter(l => new Date(l.created_date) > last24h).length;
    return { live, upcoming, total: allEvents.length, imports24h };
  }, [allEvents, importLogs, upcomingEvents]);

  const roleActions = useMemo(() => buildRoleActions(isAdmin, user?.role, navigate), [isAdmin, user?.role, navigate]);

  return (
    <div className="flex flex-col gap-0 max-w-5xl mx-auto w-full">

      {/* ── TELEMETRY STRIP — tertiary, compact, inline ────────────────────── */}
      <div className="flex items-center border border-gray-800/70 rounded-lg overflow-hidden mb-5" style={{ background: '#0d0d0d' }}>
        <div className="px-3 py-1.5 border-r border-gray-800/60">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600">TELEMETRY</span>
        </div>
        <TelCell value={telemetry.live} label="LIVE" hot />
        <TelCell value={telemetry.upcoming} label="UPCOMING" />
        <TelCell value={telemetry.total} label="TOTAL" />
        <TelCell value={telemetry.imports24h} label="IMPORTS 24H" />
      </div>

      {/* ── EVENT OPERATIONS — PRIMARY SURFACE ────────────────────────────── */}
      <div className="mb-6">
        {/* Section header */}
         <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-2">
             <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400">EVENT OPERATIONS</span>
             <span className="text-[10px] font-mono text-gray-700 border border-gray-800 px-1.5 py-px rounded-sm">{upcomingEvents.length}</span>
           </div>
           <button
             onClick={() => navigate('/race-control/events')}
             className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors"
           >
            ALL FILES <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Board */}
        {upcomingEvents.length === 0 ? (
           <div className="border border-gray-800/60 rounded-lg px-5 py-10 text-center" style={{ background: '#0d0d0d' }}>
             <AlertCircle className="w-5 h-5 text-gray-700 mx-auto mb-2" />
             <p className="text-xs font-mono tracking-widest text-gray-600">NO EVENTS IN SCOPE</p>
             <button
               onClick={() => navigate('/race-control/events')}
               className="mt-3 text-[10px] font-mono text-teal-600 hover:text-teal-400 transition-colors uppercase tracking-widest"
             >
              Open Event Files →
            </button>
          </div>
        ) : (
          <div className="border border-gray-800/60 rounded-lg overflow-hidden" style={{ background: '#0d0d0d' }}>
            {upcomingEvents.slice(0, 20).map((event, idx) => {
              const isLive      = event.status === 'Live';
              const isCompleted = event.status === 'Completed' || event.status === 'Cancelled';
              const eventDate   = event.event_date ? new Date(event.event_date) : null;

              return (
                <div
                  key={event.id}
                  onClick={() => navigate(`/race-control/events/${event.id}`)}
                  className={`
                    flex items-center gap-3 px-3 py-2 cursor-pointer transition-all border-b border-gray-800/40 last:border-b-0 group
                    ${isLive
                      ? 'bg-red-950/20 hover:bg-red-950/30'
                      : isCompleted
                      ? 'opacity-50 hover:opacity-70'
                      : 'hover:bg-gray-800/30'
                    }
                  `}
                >
                  {/* Live indicator or index */}
                  <div className="w-4 flex-shrink-0 flex items-center justify-center">
                    {isLive
                      ? <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      : <span className="text-[9px] font-mono text-gray-700 tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
                    }
                  </div>

                  {/* LEFT: Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold truncate leading-snug ${isLive ? 'text-white' : isCompleted ? 'text-gray-600' : 'text-gray-200'}`}>
                        {event.name}
                      </span>
                      <StatusTag status={event.status || 'Draft'} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {event.series_name && (
                        <span className="text-[9px] font-mono text-gray-600 truncate">{event.series_name}</span>
                      )}
                      {event.location_note && (
                        <span className="text-[9px] font-mono text-gray-700 truncate">{event.location_note}</span>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: date + action */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {eventDate && (
                     <div className="text-right hidden sm:block">
                       <div className="text-xs font-mono text-gray-500 tabular-nums">{format(eventDate, 'MMM dd')}</div>
                       <div className="text-[10px] font-mono text-gray-700">{format(eventDate, 'yyyy')}</div>
                     </div>
                    )}
                    <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-colors ${isLive ? 'text-red-600 group-hover:text-red-400' : 'text-gray-700 group-hover:text-gray-500'}`} />
                  </div>
                </div>
              );
            })}

            {upcomingEvents.length > 20 && (
               <button
                 onClick={() => navigate('/race-control/events')}
                 className="w-full px-3 py-2 text-[10px] font-mono tracking-widest text-gray-700 hover:text-gray-500 transition-colors border-t border-gray-800/40 text-center"
                 style={{ background: '#0a0a0a' }}
               >
                 + {upcomingEvents.length - 20} MORE — OPEN EVENT FILES
               </button>
             )}
          </div>
        )}
      </div>

      {/* ── PAST EVENTS ────────────────────────────────────────────────────── */}
      {pastEvents.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-600">PAST EVENTS</span>
              <span className="text-[10px] font-mono text-gray-700 border border-gray-800 px-1.5 py-px rounded-sm">{pastEvents.length}</span>
            </div>
            <button
              onClick={() => navigate('/race-control/events')}
              className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors"
            >
              ALL FILES <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="border border-gray-800/40 rounded-lg overflow-hidden" style={{ background: '#0a0a0a' }}>
            {pastEvents.slice(0, 10).map((event, idx) => {
              const eventDate = event.event_date ? new Date(event.event_date) : null;
              return (
                <div
                  key={event.id}
                  onClick={() => navigate(`/race-control/events/${event.id}`)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-gray-800/30 last:border-b-0 hover:bg-gray-800/20 transition-all group opacity-55 hover:opacity-75"
                >
                  <div className="w-4 flex-shrink-0 flex items-center justify-center">
                    <span className="text-[9px] font-mono text-gray-700 tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500 truncate leading-snug">{event.name}</span>
                      <StatusTag status={event.status || 'Draft'} />
                    </div>
                    {event.series_name && (
                      <span className="text-[9px] font-mono text-gray-700 truncate block">{event.series_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {eventDate && (
                      <div className="text-right hidden sm:block">
                        <div className="text-[10px] font-mono text-gray-600 tabular-nums">{format(eventDate, 'MMM dd')}</div>
                        <div className="text-[9px] font-mono text-gray-700">{format(eventDate, 'yyyy')}</div>
                      </div>
                    )}
                    <ChevronRight className="w-3 h-3 text-gray-800 group-hover:text-gray-600 flex-shrink-0" />
                  </div>
                </div>
              );
            })}
            {pastEvents.length > 10 && (
              <button
                onClick={() => navigate('/race-control/events')}
                className="w-full px-3 py-2 text-[10px] font-mono tracking-widest text-gray-700 hover:text-gray-500 transition-colors border-t border-gray-800/30 text-center"
                style={{ background: '#080808' }}
              >
                + {pastEvents.length - 10} MORE PAST EVENTS
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── TWO-COLUMN LOWER SECTION ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ROLE ACTIONS — secondary */}
         <div>
           <div className="flex items-center gap-2 mb-2">
             <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-600">OPERATIONS</span>
             <span className="text-[10px] font-mono text-gray-700 border border-gray-800 px-1.5 py-px rounded-sm">{user?.role || 'user'}</span>
           </div>
          <div className="border border-gray-800/60 rounded-lg overflow-hidden" style={{ background: '#0d0d0d' }}>
            {roleActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={action.action}
                  className="w-full flex items-center gap-3 px-3 py-2 border-b border-gray-800/40 last:border-b-0 hover:bg-gray-800/30 transition-colors text-left group"
                >
                  <Icon className="w-3 h-3 text-gray-600 flex-shrink-0 group-hover:text-gray-400" />
                  <div className="flex-1 min-w-0">
                     <div className="text-sm text-gray-300 group-hover:text-white transition-colors">{action.label}</div>
                     <div className="text-xs font-mono text-gray-700">{action.sub}</div>
                   </div>
                  <ChevronRight className="w-2.5 h-2.5 text-gray-700 group-hover:text-gray-500 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* OPERATIONS FEED — secondary */}
         <div>
           <div className="flex items-center gap-2 mb-2">
             <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-600">OPS FEED</span>
             <span className="text-[10px] font-mono text-gray-700 border border-gray-800 px-1.5 py-px rounded-sm">{operationLogs.length}</span>
           </div>
          <div className="border border-gray-800/60 rounded-lg overflow-hidden" style={{ background: '#0d0d0d' }}>
            {operationLogs.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <span className="text-[10px] font-mono tracking-widest text-gray-700">STANDBY — NO RECENT OPS</span>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                {operationLogs.slice(0, 20).map(log => {
                  const sev = opSeverity(log.operation_type);
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800/30 last:border-b-0"
                    >
                      <span className={`w-1 h-1 rounded-full flex-shrink-0 ${sev.dot}`} />
                      <div className="flex-1 min-w-0">
                        <span className={`text-[10px] font-mono font-bold truncate block ${sev.color}`}>
                          {(log.operation_type || 'OPERATION').toUpperCase()}
                        </span>
                        {log.source_type && (
                          <span className="text-[9px] font-mono text-gray-700 truncate block">{log.source_type}</span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-gray-700 whitespace-nowrap tabular-nums flex-shrink-0">
                        {log.created_date ? format(new Date(log.created_date), 'HH:mm:ss') : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}