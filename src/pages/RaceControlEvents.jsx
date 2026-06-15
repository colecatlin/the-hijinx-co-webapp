/**
 * REVISION R8D — RaceControlEvents
 * Event Directory: /race-control/events
 * Lists all events as operational event files.
 * Entry point into the Event-First RaceCore flow.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import {
  Flag, Calendar, MapPin, ChevronRight, Search, Filter,
  Loader2, AlertTriangle, FolderOpen, ArrowRight, Radio,
  CheckCircle2, Clock, XCircle, Layers, Plus,
} from 'lucide-react';
import { QueryKeys } from '@/components/utils/queryKeys';

const DQ = applyDefaultQueryOptions();

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Live:       { label: 'Live',      color: 'text-red-300',   bg: 'bg-red-950/50 border-red-700/50',   dot: 'bg-red-500 animate-pulse' },
  Published:  { label: 'Published', color: 'text-blue-300',  bg: 'bg-blue-950/40 border-blue-700/40', dot: 'bg-blue-400' },
  Completed:  { label: 'Completed', color: 'text-green-300', bg: 'bg-green-950/30 border-green-700/40', dot: 'bg-green-500' },
  Cancelled:  { label: 'Cancelled', color: 'text-gray-500',  bg: 'bg-gray-900/40 border-gray-700/30', dot: 'bg-gray-600' },
  Draft:      { label: 'Draft',     color: 'text-gray-400',  bg: 'bg-gray-900/30 border-gray-800',    dot: 'bg-gray-600' },
  PendingApproval: { label: 'Pending', color: 'text-amber-300', bg: 'bg-amber-950/30 border-amber-700/40', dot: 'bg-amber-400' },
};

function statusCfg(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.Draft;
}

// ── Status chip ───────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const cfg = statusCfg(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────
function EventFileCard({ event, track, series, onClick }) {
  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const endStr = event.end_date && event.end_date !== event.event_date
    ? ` – ${new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : '';

  const isLive = event.status === 'Live';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border transition-all duration-150 group
        ${isLive
          ? 'bg-red-950/20 border-red-800/50 hover:border-red-600/60 hover:bg-red-950/30'
          : 'bg-[#111]/80 border-gray-800/80 hover:border-teal-700/50 hover:bg-[#141414]'
        }`}
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <div className="px-4 py-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isLive && <Radio className="w-3 h-3 text-red-400 animate-pulse flex-shrink-0" />}
              <span className="text-sm font-bold text-white truncate leading-snug group-hover:text-teal-100 transition-colors">
                {event.name}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
              {track && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {track.name}
                </span>
              )}
              {series && (
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 flex-shrink-0" />
                  {series.name}
                </span>
              )}
              {event.season && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  {event.season}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <StatusChip status={event.status || 'Draft'} />
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800/50">
          <div className="text-[11px] text-gray-600">
            {dateStr
              ? <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateStr}{endStr}</span>
              : <span className="text-gray-700">No date set</span>
            }
          </div>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 group-hover:text-teal-400 transition-colors">
            Open Event File <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({ filters, onChange, seasons, seriesList, tracks }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
        <input
          type="text"
          placeholder="Search event files..."
          value={filters.search}
          onChange={e => onChange('search', e.target.value)}
          className="w-full bg-[#111] border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-teal-700/60"
        />
      </div>

      {/* Status */}
      <select
        value={filters.status}
        onChange={e => onChange('status', e.target.value)}
        className="bg-[#111] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-teal-700/60"
      >
        <option value="">All Status</option>
        {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Season */}
      {seasons.length > 0 && (
        <select
          value={filters.season}
          onChange={e => onChange('season', e.target.value)}
          className="bg-[#111] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-teal-700/60"
        >
          <option value="">All Seasons</option>
          {seasons.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}

      {/* Series */}
      {seriesList.length > 0 && (
        <select
          value={filters.series}
          onChange={e => onChange('series', e.target.value)}
          className="bg-[#111] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-teal-700/60"
        >
          <option value="">All Series</option>
          {seriesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {/* Track */}
      {tracks.length > 0 && (
        <select
          value={filters.track}
          onChange={e => onChange('track', e.target.value)}
          className="bg-[#111] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 focus:outline-none focus:border-teal-700/60"
        >
          <option value="">All Tracks</option>
          {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionDivider({ label, count }) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{label}</span>
      {count > 0 && (
        <span className="text-[10px] font-mono text-gray-700 bg-gray-900 px-1.5 py-0.5 rounded">{count}</span>
      )}
      <div className="flex-1 border-t border-gray-800/50" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RaceControlEvents() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ search: '', status: '', season: '', series: '', track: '' });

  const updateFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  // Auth
  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    ...DQ,
  });

  // Data
  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: QueryKeys.events.list(),
    queryFn: () => base44.entities.Event.list('-event_date', 200),
    enabled: !!isAuthenticated,
    ...DQ,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks-directory'],
    queryFn: () => base44.entities.Track.list('name', 200),
    enabled: !!isAuthenticated,
    ...DQ,
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series-directory'],
    queryFn: () => base44.entities.Series.list('name', 200),
    enabled: !!isAuthenticated,
    ...DQ,
  });

  // Build lookup maps
  const trackMap = useMemo(() => Object.fromEntries(tracks.map(t => [t.id, t])), [tracks]);
  const seriesMap = useMemo(() => Object.fromEntries(seriesList.map(s => [s.id, s])), [seriesList]);

  // Derived filter options
  const seasons = useMemo(() => {
    const set = new Set(events.map(e => e.season).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const name = (e.name || '').toLowerCase();
        const trackName = (trackMap[e.track_id]?.name || '').toLowerCase();
        const seriesName = (seriesMap[e.series_id]?.name || '').toLowerCase();
        if (!name.includes(q) && !trackName.includes(q) && !seriesName.includes(q)) return false;
      }
      if (filters.status && e.status !== filters.status) return false;
      if (filters.season && e.season !== filters.season) return false;
      if (filters.series && e.series_id !== filters.series) return false;
      if (filters.track && e.track_id !== filters.track) return false;
      return true;
    });
  }, [events, filters, trackMap, seriesMap]);

  // Group by lifecycle
  const liveEvents = filteredEvents.filter(e => e.status === 'Live');
  const upcomingEvents = filteredEvents.filter(e => ['Draft', 'PendingApproval', 'Published'].includes(e.status));
  const completedEvents = filteredEvents.filter(e => e.status === 'Completed');
  const cancelledEvents = filteredEvents.filter(e => e.status === 'Cancelled');

  const isLoading = authLoading || eventsLoading;

  // ── Auth guard ──────────────────────────────────────────────────────────────
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Flag className="w-8 h-8 text-gray-700 mx-auto" />
          <p className="text-sm text-gray-400 font-semibold">Login required</p>
          <button
            onClick={() => base44.auth.redirectToLogin(window.location.href)}
            className="text-xs px-4 py-2 bg-teal-900/40 border border-teal-700/50 text-teal-300 rounded-lg hover:bg-teal-900/60 transition-colors"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div
        className="border-b border-gray-800/70 px-6 py-4"
        style={{ background: 'rgba(8,10,12,0.96)' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-[10px] text-gray-600 mb-2 font-mono tracking-widest">
            <Link to="/racecore" className="hover:text-gray-400 transition-colors">RACECORE</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-500">EVENTS</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Event Files</h1>
              <p className="text-xs text-gray-600 mt-0.5">Operational event control board</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-black text-white font-mono">{events.length}</p>
                <p className="text-[10px] text-gray-600 font-mono">TOTAL EVENTS</p>
              </div>
              <button
                onClick={() => navigate('/racecore?tab=eventBuilder')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
                style={{ background: 'rgba(29,161,161,0.15)', color: '#1DA1A1', border: '1px solid rgba(29,161,161,0.3)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                New Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-5">

        {/* Filters */}
        <FilterBar
          filters={filters}
          onChange={updateFilter}
          seasons={seasons}
          seriesList={seriesList.slice(0, 50)}
          tracks={tracks.slice(0, 50)}
        />

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center gap-2 py-16 justify-center text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-mono tracking-widest">LOADING EVENT FILES...</span>
          </div>
        )}

        {/* Error */}
        {eventsError && !isLoading && (
          <div className="py-16 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-red-500/50 mx-auto" />
            <p className="text-xs text-gray-600 font-mono">UNABLE TO LOAD EVENT FILES</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !eventsError && filteredEvents.length === 0 && (
        <div className="py-16 text-center space-y-3">
          <FolderOpen className="w-7 h-7 text-gray-800 mx-auto" />
          <p className="text-xs text-gray-600 font-mono">
            {events.length === 0 ? 'NO EVENT FILES FOUND' : 'NO EVENTS MATCH YOUR FILTERS'}
          </p>
          {events.length === 0 && (
            <button
              onClick={() => navigate('/racecore?tab=eventBuilder')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors mt-2"
              style={{ background: 'rgba(29,161,161,0.15)', color: '#1DA1A1', border: '1px solid rgba(29,161,161,0.3)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Event
            </button>
          )}
          {events.length > 0 && (
            <button
              onClick={() => setFilters({ search: '', status: '', season: '', series: '', track: '' })}
              className="text-xs text-gray-600 hover:text-gray-400 underline mt-1"
            >
              Clear filters
            </button>
          )}
        </div>
        )}

        {/* Live events — always first */}
        {!isLoading && liveEvents.length > 0 && (
          <>
            <SectionDivider label="Live Now" count={liveEvents.length} />
            <div className="space-y-2">
              {liveEvents.map(event => (
                <EventFileCard
                  key={event.id}
                  event={event}
                  track={trackMap[event.track_id]}
                  series={seriesMap[event.series_id]}
                  onClick={() => navigate(`/race-control/events/${event.id}`)}
                />
              ))}
            </div>
          </>
        )}

        {/* Upcoming / active */}
        {!isLoading && upcomingEvents.length > 0 && (
          <>
            <SectionDivider label="Upcoming & Active" count={upcomingEvents.length} />
            <div className="space-y-2">
              {upcomingEvents.map(event => (
                <EventFileCard
                  key={event.id}
                  event={event}
                  track={trackMap[event.track_id]}
                  series={seriesMap[event.series_id]}
                  onClick={() => navigate(`/race-control/events/${event.id}`)}
                />
              ))}
            </div>
          </>
        )}

        {/* Completed */}
        {!isLoading && completedEvents.length > 0 && (
          <>
            <SectionDivider label="Completed" count={completedEvents.length} />
            <div className="space-y-2">
              {completedEvents.map(event => (
                <EventFileCard
                  key={event.id}
                  event={event}
                  track={trackMap[event.track_id]}
                  series={seriesMap[event.series_id]}
                  onClick={() => navigate(`/race-control/events/${event.id}`)}
                />
              ))}
            </div>
          </>
        )}

        {/* Cancelled — collapsed at bottom */}
        {!isLoading && cancelledEvents.length > 0 && (
          <>
            <SectionDivider label="Cancelled" count={cancelledEvents.length} />
            <div className="space-y-2 opacity-50">
              {cancelledEvents.map(event => (
                <EventFileCard
                  key={event.id}
                  event={event}
                  track={trackMap[event.track_id]}
                  series={seriesMap[event.series_id]}
                  onClick={() => navigate(`/race-control/events/${event.id}`)}
                />
              ))}
            </div>
          </>
        )}

        {/* Bottom spacer */}
        <div className="h-12" />
      </div>
    </div>
  );
}