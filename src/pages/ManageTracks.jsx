import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search, Plus, Trash2, AlertTriangle, X, MapPin,
  SlidersHorizontal, ChevronDown
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import ActivityTab from '@/components/management/ActivityTab';
import TrackRecordRow from '@/components/tracks/TrackRecordRow';
import { cn } from '@/lib/utils';

// ─── Filter options ────────────────────────────────────────────────────────────
const SURFACE_OPTIONS = ['Asphalt', 'Concrete', 'Dirt', 'Clay', 'Mixed'];
const STATUS_OPTIONS  = ['Active', 'Seasonal', 'Inactive'];
const REGION_OPTIONS  = ['USA', 'Canada', 'Europe', 'Australia', 'Other'];

function CompactSelect({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'appearance-none h-7 pl-2.5 pr-6 text-[11px] font-mono rounded border transition-colors outline-none',
          'bg-gray-900 border-gray-700 text-gray-300',
          'hover:border-gray-500 focus:border-teal-600/70',
          value ? 'text-teal-300 border-teal-700/50' : ''
        )}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-500 pointer-events-none" />
    </div>
  );
}

// ─── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, accent }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={cn('text-lg font-black font-mono tabular-nums', accent || 'text-gray-100')}>{value}</span>
      <span className="text-[10px] font-mono tracking-widest text-gray-600 uppercase">{label}</span>
    </div>
  );
}

// ─── Column header ─────────────────────────────────────────────────────────────
function ColHeader({ children, className }) {
  return (
    <div className={cn('text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-gray-700', className)}>
      {children}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function ManageTracks() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery]         = useState('');
  const [filterSurface, setFilterSurface]     = useState('');
  const [filterStatus, setFilterStatus]       = useState('');
  const [filterRegion, setFilterRegion]       = useState('');
  const [selectedTracks, setSelectedTracks]   = useState([]);
  const [showActivity, setShowActivity]       = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    base44.functions.invoke('findDuplicateSourceEntities', { entity_type: 'track' })
      .then(res => { if (res?.data?.duplicate_count > 0) setDuplicateWarning(true); })
      .catch(() => {});
  }, [isAdmin]);

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('-updated_date', 500),
  });

  // ── Mutations (unchanged) ─────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      await base44.entities.Track.delete(id);
      await base44.functions.invoke('logDeletion', { entityName: 'Track', recordIds: [id], recordNames: [name] });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tracks'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids, names }) => {
      await Promise.all(ids.map(id => base44.entities.Track.delete(id)));
      await base44.functions.invoke('logDeletion', { entityName: 'Track', recordIds: ids, recordNames: names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      setSelectedTracks([]);
    },
  });

  // ── Filtering (memoized) ──────────────────────────────────────────────────────
  const filteredTracks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return tracks.filter(t => {
      if (q && !t.name?.toLowerCase().includes(q) &&
               !t.location_city?.toLowerCase().includes(q) &&
               !t.location_state?.toLowerCase().includes(q)) return false;
      if (filterSurface && t.surface_type !== filterSurface) return false;
      if (filterStatus  && t.operational_status !== filterStatus)  return false;
      if (filterRegion) {
        const country = t.location_country || '';
        if (filterRegion === 'USA'       && country !== 'USA' && country !== 'United States') return false;
        if (filterRegion === 'Canada'    && country !== 'Canada')    return false;
        if (filterRegion === 'Europe'    && !['UK','France','Germany','Italy','Spain','Netherlands','Belgium','Austria'].includes(country)) return false;
        if (filterRegion === 'Australia' && country !== 'Australia') return false;
        if (filterRegion === 'Other'     && ['USA','United States','Canada','UK','France','Germany','Italy','Spain','Netherlands','Belgium','Austria','Australia'].includes(country)) return false;
      }
      return true;
    });
  }, [tracks, searchQuery, filterSurface, filterStatus, filterRegion]);

  const activeCount    = tracks.filter(t => t.operational_status === 'Active').length;
  const seasonalCount  = tracks.filter(t => t.operational_status === 'Seasonal').length;
  const draftCount     = tracks.filter(t => t.visibility_status === 'draft').length;
  const hasActiveFilters = searchQuery || filterSurface || filterStatus || filterRegion;

  // ── Selection ─────────────────────────────────────────────────────────────────
  const handleSelectAll = (checked) => {
    setSelectedTracks(checked ? filteredTracks.map(t => t.id) : []);
  };
  const handleSelectTrack = (id) => {
    setSelectedTracks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // ── Actions ───────────────────────────────────────────────────────────────────
  const handleDelete = (track) => {
    if (window.confirm(`Delete ${track.name}?`)) {
      deleteMutation.mutate({ id: track.id, name: track.name });
    }
  };
  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedTracks.length} selected track(s)?`)) {
      const items = filteredTracks.filter(t => selectedTracks.includes(t.id));
      bulkDeleteMutation.mutate({ ids: selectedTracks, names: items.map(t => t.name) });
    }
  };
  const clearFilters = () => {
    setSearchQuery(''); setFilterSurface(''); setFilterStatus(''); setFilterRegion('');
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <ManagementLayout currentPage="ManageTracks">
      <div className="flex flex-col h-full min-h-screen" style={{ background: '#0a0a0a' }}>

        {/* ── Duplicate warning ─────────────────────────────────────────────── */}
        {duplicateWarning && (
          <div className="flex items-center gap-3 px-5 py-2 border-b border-amber-800/40 bg-amber-900/20 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-400 flex-1">
              Potential duplicate track records detected.{' '}
              <Link to={createPageUrl('Diagnostics')} className="underline font-semibold">Open Diagnostics</Link>
            </p>
            <button onClick={() => setDuplicateWarning(false)} className="text-amber-600 hover:text-amber-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ── Header strip ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-800/80 shrink-0">
          {/* Left: identity + stats */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-gray-300">
                Track Records
              </span>
            </div>
            {!isLoading && (
              <div className="hidden sm:flex items-center gap-5 pl-3 border-l border-gray-800">
                <StatPill label="Total"    value={tracks.length} />
                <StatPill label="Active"   value={activeCount}   accent="text-emerald-400" />
                <StatPill label="Seasonal" value={seasonalCount} accent="text-amber-400" />
                {draftCount > 0 && (
                  <StatPill label="Draft" value={draftCount} accent="text-gray-500" />
                )}
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowActivity(v => !v)}
              className={cn(
                'h-7 px-3 text-[11px] font-mono rounded border transition-colors',
                showActivity
                  ? 'bg-gray-800 border-gray-600 text-gray-200'
                  : 'bg-transparent border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400'
              )}
            >
              Activity
            </button>
            <button
              onClick={() => navigate('/race-core/tracks/new')}
              className="h-7 px-3 text-[11px] font-mono font-semibold rounded border border-teal-600/60 bg-teal-600/10 text-teal-300 hover:bg-teal-600/20 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3 h-3" />
              Add Track
            </button>
          </div>
        </div>

        {/* ── Filter rail ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-2 border-b border-gray-800/60 shrink-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-[260px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-7 pl-7 pr-3 text-[11px] font-mono rounded border bg-gray-900 border-gray-700 text-gray-300 placeholder-gray-600 outline-none hover:border-gray-600 focus:border-teal-600/70 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Selects */}
          <CompactSelect value={filterSurface} onChange={setFilterSurface} options={SURFACE_OPTIONS} placeholder="Surface" />
          <CompactSelect value={filterRegion}  onChange={setFilterRegion}  options={REGION_OPTIONS}  placeholder="Region"  />
          <CompactSelect value={filterStatus}  onChange={setFilterStatus}  options={STATUS_OPTIONS}  placeholder="Status"  />

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="h-7 px-2.5 text-[10px] font-mono rounded border border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors flex items-center gap-1"
            >
              <X className="w-2.5 h-2.5" /> Clear
            </button>
          )}

          {/* Result count */}
          <div className="ml-auto text-[10px] font-mono text-gray-700">
            {filteredTracks.length} / {tracks.length}
          </div>
        </div>

        {/* ── Bulk action bar ────────────────────────────────────────────────── */}
        {isAdmin && selectedTracks.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-1.5 border-b border-red-900/40 bg-red-900/10 shrink-0">
            <span className="text-xs font-mono text-red-400">{selectedTracks.length} selected</span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="h-6 px-3 text-[11px] font-mono rounded border border-red-800/60 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              {bulkDeleteMutation.isPending ? 'Deleting…' : `Delete ${selectedTracks.length}`}
            </button>
            <button
              onClick={() => setSelectedTracks([])}
              className="text-[11px] font-mono text-gray-600 hover:text-gray-400"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Records panel */}
          <div className="flex-1 overflow-y-auto">

            {/* Column headers */}
            <div className="flex items-center gap-3 px-4 py-1.5 border-b border-gray-800/40 sticky top-0 z-10" style={{ background: '#0e0e0e' }}>
              {isAdmin && (
                <div className="shrink-0 w-4">
                  <Checkbox
                    checked={selectedTracks.length === filteredTracks.length && filteredTracks.length > 0}
                    onCheckedChange={handleSelectAll}
                    className="border-gray-700 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 w-3.5 h-3.5"
                  />
                </div>
              )}
              <ColHeader className="flex-1">Track / Location</ColHeader>
              <ColHeader className="hidden sm:block w-14 text-center">Surface</ColHeader>
              <ColHeader className="hidden md:block w-12 text-center">Length</ColHeader>
              <ColHeader className="hidden lg:block w-20 text-right">Updated</ColHeader>
              <div className="w-20 shrink-0" /> {/* actions spacer */}
            </div>

            {/* Rows */}
            {isLoading ? (
              <div className="p-4 space-y-1.5">
                {[...Array(12)].map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full rounded" style={{ background: '#1a1a1a' }} />
                ))}
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <MapPin className="w-8 h-8 text-gray-800" />
                <p className="text-xs font-mono text-gray-700 uppercase tracking-widest">
                  {hasActiveFilters ? 'No tracks match filters' : 'No tracks found'}
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-[11px] font-mono text-teal-600 hover:text-teal-400 underline">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              filteredTracks.map(track => (
                <TrackRecordRow
                  key={track.id}
                  track={track}
                  isAdmin={isAdmin}
                  isSelected={selectedTracks.includes(track.id)}
                  onSelect={handleSelectTrack}
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending}
                />
              ))
            )}
          </div>

          {/* Activity sidebar (toggleable) */}
          {showActivity && (
            <div
              className="w-72 shrink-0 border-l border-gray-800/60 overflow-y-auto"
              style={{ background: '#0c0c0c' }}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/60">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600">Activity Log</span>
                <button onClick={() => setShowActivity(false)} className="text-gray-700 hover:text-gray-400">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="p-3">
                <ActivityTab entityName="Track" />
              </div>
            </div>
          )}
        </div>

      </div>
    </ManagementLayout>
  );
}