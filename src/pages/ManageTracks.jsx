import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import { Plus, Trash2, AlertTriangle, X, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// RaceCore Records primitives
import RecordsPageShell   from '@/components/racecore/records/RecordsPageShell';
import RecordsFilterRail  from '@/components/racecore/records/RecordsFilterRail';
import RecordGrid         from '@/components/racecore/records/RecordGrid';
import RecordActivityRail from '@/components/racecore/records/RecordActivityRail';
import TrackRecordRow     from '@/components/tracks/TrackRecordRow';

const SURFACE_OPTIONS = ['Asphalt', 'Concrete', 'Dirt', 'Clay', 'Mixed'];
const STATUS_OPTIONS  = ['Active', 'Seasonal', 'Inactive'];
const REGION_OPTIONS  = ['USA', 'Canada', 'Europe', 'Australia', 'Other'];

const GRID_COLUMNS = [
  { label: 'Track / Location', className: 'flex-1' },
  { label: 'Surface',          className: 'hidden sm:block w-14 text-center' },
  { label: 'Length',           className: 'hidden md:block w-12 text-center' },
  { label: 'Updated',          className: 'hidden lg:block w-20 text-right' },
];

export default function ManageTracks({ embedded = false }) {
  const navigate = useNavigate();
  const [searchQuery,    setSearchQuery]    = useState('');
  const [filterSurface,  setFilterSurface]  = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterRegion,   setFilterRegion]   = useState('');
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [showActivity,   setShowActivity]   = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [trackToDelete,    setTrackToDelete]    = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    base44.functions.invoke('findDuplicateSourceEntities', { entity_type: 'track' })
      .then(res => { if (res?.data?.duplicate_count > 0) setDuplicateWarning(true); })
      .catch(() => {});
  }, [isAdmin]);

  // ── Data (unchanged) ──────────────────────────────────────────────────────────
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

  // ── Filtering (memoized, unchanged logic) ────────────────────────────────────
  const filteredTracks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return tracks.filter(t => {
      if (q && !t.name?.toLowerCase().includes(q) &&
               !t.location_city?.toLowerCase().includes(q) &&
               !t.location_state?.toLowerCase().includes(q)) return false;
      if (filterSurface && t.surface_type !== filterSurface) return false;
      if (filterStatus  && t.operational_status !== filterStatus) return false;
      if (filterRegion) {
        const country = t.location_country || '';
        if (filterRegion === 'USA'       && country !== 'USA' && country !== 'United States') return false;
        if (filterRegion === 'Canada'    && country !== 'Canada') return false;
        if (filterRegion === 'Europe'    && !['UK','France','Germany','Italy','Spain','Netherlands','Belgium','Austria'].includes(country)) return false;
        if (filterRegion === 'Australia' && country !== 'Australia') return false;
        if (filterRegion === 'Other'     && ['USA','United States','Canada','UK','France','Germany','Italy','Spain','Netherlands','Belgium','Austria','Australia'].includes(country)) return false;
      }
      return true;
    });
  }, [tracks, searchQuery, filterSurface, filterStatus, filterRegion]);

  const activeCount   = tracks.filter(t => t.operational_status === 'Active').length;
  const seasonalCount = tracks.filter(t => t.operational_status === 'Seasonal').length;
  const draftCount    = tracks.filter(t => t.visibility_status === 'draft').length;
  const hasActiveFilters = !!(searchQuery || filterSurface || filterStatus || filterRegion);

  // ── Selection ─────────────────────────────────────────────────────────────────
  const handleSelectAll   = (checked) => setSelectedTracks(checked ? filteredTracks.map(t => t.id) : []);
  const handleSelectTrack = (id) => setSelectedTracks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Actions (unchanged) ───────────────────────────────────────────────────────
  const handleDelete = (track) => { setTrackToDelete(track); setShowDeleteConfirm(true); };
  const confirmDelete = () => {
    if (!trackToDelete) return;
    setShowDeleteConfirm(false);
    deleteMutation.mutate({ id: trackToDelete.id, name: trackToDelete.name });
    setTrackToDelete(null);
  };
  const handleBulkDelete = () => setBulkDeleteConfirm(true);
  const confirmBulkDelete = () => {
    setBulkDeleteConfirm(false);
    const items = filteredTracks.filter(t => selectedTracks.includes(t.id));
    bulkDeleteMutation.mutate({ ids: selectedTracks, names: items.map(t => t.name) });
  };
  const clearFilters = () => { setSearchQuery(''); setFilterSurface(''); setFilterStatus(''); setFilterRegion(''); };

  // ── Composed slots ────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Total',    value: tracks.length },
    { label: 'Active',   value: activeCount,   accent: 'text-emerald-400' },
    { label: 'Seasonal', value: seasonalCount, accent: 'text-amber-400' },
    ...(draftCount > 0 ? [{ label: 'Draft', value: draftCount, accent: 'text-gray-500' }] : []),
  ];

  const headerActions = (
    <>
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
    </>
  );

  const alertStrip = duplicateWarning ? (
    <div className="flex items-center gap-3 px-5 py-2 border-b border-amber-800/40 bg-amber-900/20">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      <p className="text-xs text-amber-400 flex-1">
        Potential duplicate track records detected.{' '}
        <Link to={createPageUrl('Diagnostics')} className="underline font-semibold">Open Diagnostics</Link>
      </p>
      <button onClick={() => setDuplicateWarning(false)} className="text-amber-600 hover:text-amber-400">
        <X className="w-3 h-3" />
      </button>
    </div>
  ) : null;

  const filterRail = (
    <RecordsFilterRail
      search={searchQuery}
      onSearch={setSearchQuery}
      searchPlaceholder="Search tracks..."
      filters={[
        { key: 'surface', value: filterSurface, onChange: setFilterSurface, options: SURFACE_OPTIONS, placeholder: 'Surface' },
        { key: 'region',  value: filterRegion,  onChange: setFilterRegion,  options: REGION_OPTIONS,  placeholder: 'Region'  },
        { key: 'status',  value: filterStatus,  onChange: setFilterStatus,  options: STATUS_OPTIONS,  placeholder: 'Status'  },
      ]}
      hasActiveFilters={hasActiveFilters}
      onClearAll={clearFilters}
      resultCount={filteredTracks.length}
      totalCount={tracks.length}
    />
  );

  const bulkBar = isAdmin && selectedTracks.length > 0 ? (
    <div className="flex items-center gap-3 px-5 py-1.5 border-b border-red-900/40 bg-red-900/10">
      <span className="text-xs font-mono text-red-400">{selectedTracks.length} selected</span>
      <button
        onClick={() => setBulkDeleteConfirm(true)}
        disabled={bulkDeleteMutation.isPending}
        className="h-6 px-3 text-[11px] font-mono rounded border border-red-800/60 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-40 flex items-center gap-1.5"
      >
        <Trash2 className="w-3 h-3" />
        {bulkDeleteMutation.isPending ? 'Deleting…' : `Delete ${selectedTracks.length}`}
      </button>
      <button onClick={() => setSelectedTracks([])} className="text-[11px] font-mono text-gray-600 hover:text-gray-400">
        Cancel
      </button>
    </div>
  ) : null;

  return (
    <>
    <ManagementLayout currentPage="ManageTracks" embedded={embedded}>
      <RecordsPageShell
        icon={MapPin}
        title="Track Records"
        stats={stats}
        isLoading={isLoading}
        actions={headerActions}
        alert={alertStrip}
        filterRail={filterRail}
        bulkBar={bulkBar}
      >
        <RecordGrid
          isLoading={isLoading}
          isEmpty={filteredTracks.length === 0}
          emptyIcon={MapPin}
          emptyMessage={hasActiveFilters ? 'No tracks match filters' : 'No tracks found'}
          emptyAction={hasActiveFilters && (
            <button onClick={clearFilters} className="text-[11px] font-mono text-teal-600 hover:text-teal-400 underline">
              Clear filters
            </button>
          )}
          columns={GRID_COLUMNS}
          showSelectAll={isAdmin}
          allSelected={selectedTracks.length === filteredTracks.length && filteredTracks.length > 0}
          onSelectAll={handleSelectAll}
        >
          {filteredTracks.map(track => (
            <TrackRecordRow
              key={track.id}
              track={track}
              isAdmin={isAdmin}
              isSelected={selectedTracks.includes(track.id)}
              onSelect={handleSelectTrack}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </RecordGrid>

        {showActivity && (
          <RecordActivityRail entityName="Track" onClose={() => setShowActivity(false)} overlayOnMobile />
        )}
      </RecordsPageShell>
    </ManagementLayout>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete track?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{trackToDelete?.name}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Yes, delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {selectedTracks.length} track(s)?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{selectedTracks.length} selected tracks</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmBulkDelete} className="bg-red-600 hover:bg-red-700">Yes, delete all</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}