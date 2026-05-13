import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { AlertCircle, Plus, FileText, Settings, Users, Users2, MapPin, Trophy, ChevronRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { QueryKeys } from '@/components/utils/queryKeys';

const DQ = applyDefaultQueryOptions();

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Live:            { label: 'LIVE',      color: 'text-red-300',   bg: 'bg-red-950/50 border-red-700/50',   dot: 'bg-red-500 animate-pulse' },
  Published:       { label: 'PUBLISHED', color: 'text-blue-300',  bg: 'bg-blue-950/40 border-blue-700/40', dot: 'bg-blue-400' },
  Completed:       { label: 'COMPLETED', color: 'text-green-300', bg: 'bg-green-950/30 border-green-700/40', dot: 'bg-green-500' },
  Cancelled:       { label: 'CANCELLED', color: 'text-gray-500',  bg: 'bg-gray-900/40 border-gray-700/30', dot: 'bg-gray-600' },
  Draft:           { label: 'DRAFT',     color: 'text-gray-400',  bg: 'bg-gray-900/30 border-gray-800',    dot: 'bg-gray-600' },
  PendingApproval: { label: 'PENDING',   color: 'text-amber-300', bg: 'bg-amber-950/30 border-amber-700/40', dot: 'bg-amber-400' },
};

function statusCfg(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.Draft;
}

function StatusBadge({ status }) {
  const cfg = statusCfg(status);
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider border ${cfg.bg} ${cfg.color} whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function RaceCoreHome({
  dashboardPermissions,
  isAdmin,
  user,
  allEvents = [],
  importLogs = [],
}) {
  const navigate = useNavigate();

  // ── Operations Feed: OperationLog (global, last 30) ───────────────────────
  const { data: operationLogs = [] } = useQuery({
    queryKey: QueryKeys.operationLog.recent(30),
    queryFn: () => base44.entities.OperationLog.list('-created_date', 30),
    ...DQ,
  });

  // ── Telemetry metrics using event.status (not date math) ──────────────────
  const telemetry = useMemo(() => {
    const live      = allEvents.filter(e => e.status === 'Live').length;
    const upcoming  = allEvents.filter(e => ['Draft', 'PendingApproval', 'Published'].includes(e.status)).length;
    const completed = allEvents.filter(e => e.status === 'Completed').length;
    const total     = allEvents.length;

    const last24h = new Date();
    last24h.setDate(last24h.getDate() - 1);
    const recentImports = importLogs.filter(log => new Date(log.created_date) > last24h).length;

    return { live, upcoming, completed, total, recentImports };
  }, [allEvents, importLogs]);

  const handleOpenEvent = (eventId) => {
    navigate(`/race-control/events/${eventId}`);
  };

  // ─── ZONE 1: COMMAND STRIP ───────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Command Telemetry Strip */}
      <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
        <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">OPERATIONS TELEMETRY</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          <div className="bg-[#0A0A0A] border border-red-900/40 rounded p-3 text-center">
            <div className={`text-lg font-bold ${telemetry.live > 0 ? 'text-red-400' : 'text-white'}`}>{telemetry.live}</div>
            <div className="text-[10px] text-gray-400 mt-1">Live</div>
          </div>
          <div className="bg-[#0A0A0A] border border-gray-700/50 rounded p-3 text-center">
            <div className="text-lg font-bold text-white">{telemetry.upcoming}</div>
            <div className="text-[10px] text-gray-400 mt-1">Upcoming</div>
          </div>
          <div className="bg-[#0A0A0A] border border-gray-700/50 rounded p-3 text-center">
            <div className="text-lg font-bold text-white">{telemetry.completed}</div>
            <div className="text-[10px] text-gray-400 mt-1">Completed</div>
          </div>
          <div className="bg-[#0A0A0A] border border-gray-700/50 rounded p-3 text-center">
            <div className="text-lg font-bold text-white">{telemetry.total}</div>
            <div className="text-[10px] text-gray-400 mt-1">Total Events</div>
          </div>
          <div className="bg-[#0A0A0A] border border-gray-700/50 rounded p-3 text-center">
            <div className="text-lg font-bold text-white">{telemetry.recentImports}</div>
            <div className="text-[10px] text-gray-400 mt-1">Imports 24h</div>
          </div>
          <div className="bg-[#0A0A0A] border border-gray-700/50 rounded p-3 text-center">
            <div className="text-[10px] font-mono text-gray-300">{user?.role || 'user'}</div>
            <div className="text-[10px] text-gray-400 mt-1">Role</div>
          </div>
        </div>
      </div>

      {/* ─── ZONE 2: EVENT OPERATIONS BOARD ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Event Operations</h2>
          <Button
            onClick={() => navigate('/race-control/events')}
            size="sm"
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs gap-1"
          >
            <FileText className="w-3 h-3" />
            Event Files
          </Button>
        </div>

        {allEvents.length === 0 ? (
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-12 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-gray-600 mx-auto" />
            <p className="text-sm text-gray-400">NO EVENTS IN SCOPE</p>
            <p className="text-xs text-gray-500">Use Event Files or Create Event to begin building operations.</p>
            <Button
              onClick={() => navigate('/race-control/events')}
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 mx-auto mt-2"
            >
              Open Event Files
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {allEvents.slice(0, 15).map(event => {
              const isLive      = event.status === 'Live';
              const isCompleted = event.status === 'Completed';
              const isCancelled = event.status === 'Cancelled';
              const eventDate   = event.event_date ? new Date(event.event_date) : null;

              return (
                <div
                  key={event.id}
                  onClick={() => handleOpenEvent(event.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                    isLive
                      ? 'bg-[#1a1010] border-red-800/50 hover:border-red-700/70'
                      : isCompleted || isCancelled
                      ? 'bg-[#0a0a0a] border-gray-800/50 hover:border-gray-700/50'
                      : 'bg-[#111111] border-gray-700/50 hover:border-gray-600/70'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`text-sm font-semibold truncate ${isLive ? 'text-white' : 'text-gray-300'}`}>
                        {event.name}
                      </div>
                      <StatusBadge status={event.status || 'Draft'} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {event.series_name && <span>{event.series_name}</span>}
                      {event.series_name && event.location_note && <span> · </span>}
                      {event.location_note && <span>{event.location_note}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {eventDate && (
                      <div className="text-right">
                        <div className="text-xs font-mono text-gray-400">{format(eventDate, 'MMM d')}</div>
                        <div className="text-[10px] text-gray-600">{format(eventDate, 'EEE')}</div>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              );
            })}
            {allEvents.length > 15 && (
              <div className="text-center py-2">
                <Button
                  onClick={() => navigate('/race-control/events')}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-500 hover:text-gray-400"
                >
                  View all {allEvents.length} events →
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── ZONE 3: ROLE TOOLKIT ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Tools & Links</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <button onClick={() => navigate('/race-control/events')} className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group">
            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500 group-hover:text-gray-400" /><span className="text-sm text-gray-300 group-hover:text-white">Event Files</span></div>
            <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
          </button>
          {isAdmin && (
            <button onClick={() => navigate('/racecore?tab=eventBuilder')} className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group">
              <div className="flex items-center gap-2"><Plus className="w-4 h-4 text-gray-500 group-hover:text-gray-400" /><span className="text-sm text-gray-300 group-hover:text-white">Create Event</span></div>
              <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
            </button>
          )}
          <button onClick={() => navigate('/racecore?tab=integrations')} className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group">
            <div className="flex items-center gap-2"><Settings className="w-4 h-4 text-gray-500 group-hover:text-gray-400" /><span className="text-sm text-gray-300 group-hover:text-white">Integrations</span></div>
            <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
          </button>
          <button onClick={() => navigate('/ManageDrivers')} className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group">
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-500 group-hover:text-gray-400" /><span className="text-sm text-gray-300 group-hover:text-white">Drivers</span></div>
            <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
          </button>
          <button onClick={() => navigate('/ManageTeams')} className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group">
            <div className="flex items-center gap-2"><Users2 className="w-4 h-4 text-gray-500 group-hover:text-gray-400" /><span className="text-sm text-gray-300 group-hover:text-white">Teams</span></div>
            <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
          </button>
          <button onClick={() => navigate('/ManageSeries')} className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group">
            <div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-gray-500 group-hover:text-gray-400" /><span className="text-sm text-gray-300 group-hover:text-white">Series</span></div>
            <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
          </button>
          <button onClick={() => navigate('/ManageTracks')} className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-500 group-hover:text-gray-400" /><span className="text-sm text-gray-300 group-hover:text-white">Tracks</span></div>
            <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
          </button>
          {isAdmin && (
            <button onClick={() => navigate('/racecore?tab=announcer_pack')} className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group">
              <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-gray-500 group-hover:text-gray-400" /><span className="text-sm text-gray-300 group-hover:text-white">Announcer Pack</span></div>
              <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* ─── ZONE 4: OPERATIONS FEED (OperationLog) ──────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Recent Operations</h2>
        {operationLogs.length === 0 ? (
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 text-center">
            <div className="text-xs text-gray-500 font-mono">AWAITING OPS</div>
          </div>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {operationLogs.slice(0, 15).map(log => (
              <div key={log.id} className="flex items-center justify-between p-2 bg-[#0a0a0a] border border-gray-800/50 rounded text-xs">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-300 truncate">{log.operation_type || 'Operation'}</div>
                  <div className="text-gray-600 text-[10px]">{log.source_type || log.entity_name || 'System'}</div>
                </div>
                <div className="text-gray-600 text-[10px] whitespace-nowrap ml-2">
                  {log.created_date && format(new Date(log.created_date), 'HH:mm:ss')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}