import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isFuture } from 'date-fns';
import { AlertCircle, Plus, FileText, Settings, Users, Users2, MapPin, Trophy, ChevronRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RaceCoreHome({
  dashboardPermissions,
  isAdmin,
  user,
  allEvents = [],
  importLogs = [],
}) {
  const navigate = useNavigate();

  // Categorize events
  const eventsByStatus = useMemo(() => {
    const now = new Date();
    const active = allEvents.filter(e => e.event_date && !isPast(new Date(e.event_date)) && isFuture(new Date(e.event_date)));
    const upcoming = allEvents.filter(e => e.event_date && isFuture(new Date(e.event_date))).slice(0, 5);
    const recent = allEvents.sort((a, b) => new Date(b.event_date) - new Date(a.event_date)).slice(0, 10);
    return { active, upcoming, recent };
  }, [allEvents]);

  // Count recent operations
  const recentOpsCount = useMemo(() => {
    const last24h = new Date();
    last24h.setDate(last24h.getDate() - 1);
    return importLogs.filter(log => new Date(log.created_date) > last24h).length;
  }, [importLogs]);

  const handleOpenEvent = (eventId) => {
    navigate(`/race-control/events/${eventId}`);
  };

  // ─── ZONE 1: COMMAND STRIP ───────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Command Telemetry Strip */}
      <div className="bg-[#111111] border border-gray-800 rounded-lg p-4 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">OPERATIONS TELEMETRY</div>
        
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {/* Active Events */}
          <div className="bg-[#0A0A0A] border border-gray-700/50 rounded p-3 text-center">
            <div className="text-lg font-bold text-white">{eventsByStatus.active.length}</div>
            <div className="text-[10px] text-gray-400 mt-1">Active</div>
          </div>

          {/* Upcoming */}
          <div className="bg-[#0A0A0A] border border-gray-700/50 rounded p-3 text-center">
            <div className="text-lg font-bold text-white">{eventsByStatus.upcoming.length}</div>
            <div className="text-[10px] text-gray-400 mt-1">Upcoming</div>
          </div>

          {/* Recent Ops */}
          <div className="bg-[#0A0A0A] border border-gray-700/50 rounded p-3 text-center">
            <div className="text-lg font-bold text-white">{recentOpsCount}</div>
            <div className="text-[10px] text-gray-400 mt-1">Last 24h</div>
          </div>

          {/* Total Events */}
          <div className="bg-[#0A0A0A] border border-gray-700/50 rounded p-3 text-center">
            <div className="text-lg font-bold text-white">{allEvents.length}</div>
            <div className="text-[10px] text-gray-400 mt-1">Total Events</div>
          </div>

          {/* Admin Alert */}
          {isAdmin && (
            <div className="bg-[#0A0A0A] border border-amber-700/50 rounded p-3 text-center">
              <div className="text-lg font-bold text-amber-500">⚠</div>
              <div className="text-[10px] text-amber-400 mt-1">Admin Mode</div>
            </div>
          )}

          {/* Role */}
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
              const eventDate = event.event_date ? new Date(event.event_date) : null;
              const isActive = eventDate && !isPast(eventDate) && isFuture(eventDate);
              const isPassed = eventDate && isPast(eventDate);
              
              return (
                <div
                  key={event.id}
                  onClick={() => handleOpenEvent(event.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1a2a1a] border-green-700/50 hover:border-green-600/70'
                      : isPassed
                      ? 'bg-[#0a0a0a] border-gray-800/50 hover:border-gray-700/50'
                      : 'bg-[#111111] border-gray-700/50 hover:border-gray-600/70'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {event.name}
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-900/30 rounded text-[10px] text-green-400 font-mono whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          LIVE
                        </div>
                      )}
                      {isPassed && (
                        <div className="text-[10px] px-2 py-1 bg-gray-900/30 rounded text-gray-500 font-mono whitespace-nowrap">
                          COMPLETED
                        </div>
                      )}
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
          {/* Event Files */}
          <button
            onClick={() => navigate('/race-control/events')}
            className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500 group-hover:text-gray-400" />
              <span className="text-sm text-gray-300 group-hover:text-white">Event Files</span>
            </div>
            <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
          </button>

          {/* Create Event */}
          {isAdmin && (
            <button
              onClick={() => navigate('/racecore?tab=eventBuilder')}
              className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-gray-500 group-hover:text-gray-400" />
                <span className="text-sm text-gray-300 group-hover:text-white">Create Event</span>
              </div>
              <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
            </button>
          )}

          {/* Integrations */}
          <button
            onClick={() => navigate('/racecore?tab=integrations')}
            className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-500 group-hover:text-gray-400" />
              <span className="text-sm text-gray-300 group-hover:text-white">Integrations</span>
            </div>
            <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
          </button>

          {/* Drivers */}
          <button
            onClick={() => navigate('/ManageDrivers')}
            className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500 group-hover:text-gray-400" />
              <span className="text-sm text-gray-300 group-hover:text-white">Drivers</span>
            </div>
            <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
          </button>

          {/* Teams */}
          <button
            onClick={() => navigate('/ManageTeams')}
            className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group"
          >
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-gray-500 group-hover:text-gray-400" />
              <span className="text-sm text-gray-300 group-hover:text-white">Teams</span>
            </div>
            <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
          </button>

          {/* Series */}
          <button
            onClick={() => navigate('/ManageSeries')}
            className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gray-500 group-hover:text-gray-400" />
              <span className="text-sm text-gray-300 group-hover:text-white">Series</span>
            </div>
            <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
          </button>

          {/* Tracks */}
          <button
            onClick={() => navigate('/ManageTracks')}
            className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500 group-hover:text-gray-400" />
              <span className="text-sm text-gray-300 group-hover:text-white">Tracks</span>
            </div>
            <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
          </button>

          {/* Announcer Pack (Admin) */}
          {isAdmin && (
            <button
              onClick={() => navigate('/racecore?tab=announcer_pack')}
              className="flex items-center justify-between p-3 bg-[#111111] border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all group"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gray-500 group-hover:text-gray-400" />
                <span className="text-sm text-gray-300 group-hover:text-white">Announcer Pack</span>
              </div>
              <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* ─── ZONE 4: OPERATIONS FEED ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-300">Recent Operations</h2>
        
        {importLogs.length === 0 ? (
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 text-center">
            <div className="text-xs text-gray-500 font-mono">AWAITING OPS</div>
          </div>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {importLogs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-center justify-between p-2 bg-[#0a0a0a] border border-gray-800/50 rounded text-xs">
                <div className="flex-1 min-w-0">
                  <div className="text-gray-300 truncate">{log.operation_type || 'Operation'}</div>
                  <div className="text-gray-600 text-[10px]">{log.source_type || 'System'}</div>
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