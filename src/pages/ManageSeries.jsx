import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminAccessDenied from '@/components/shared/AdminAccessDenied';
import { Plus, Trash2, AlertTriangle, X, Activity, Download, Upload } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { downloadTemplate } from '@/components/shared/downloadTemplate';

// RaceCore Records primitives
import RaceCoreBreadcrumb from '@/components/racecore/RaceCoreBreadcrumb';
import RecordsPageShell   from '@/components/racecore/records/RecordsPageShell';
import RecordsFilterRail  from '@/components/racecore/records/RecordsFilterRail';
import RecordGrid         from '@/components/racecore/records/RecordGrid';
import RecordActivityRail from '@/components/racecore/records/RecordActivityRail';
import SeriesRecordRow    from '@/components/series/SeriesRecordRow';

const STATUS_OPTIONS     = ['Active', 'Inactive', 'Upcoming'];
const DISCIPLINE_OPTIONS = [
  'Stock Car', 'Off Road', 'Dirt Oval', 'Snowmobile', 'Dirt Bike',
  'Open Wheel', 'Sports Car', 'Touring Car', 'Rally', 'Drag', 'Motorcycle', 'Karting', 'Water', 'Alternative',
];
const SCOPE_OPTIONS = ['Local', 'Regional', 'National', 'International', 'Global'];

const GRID_COLUMNS = [
  { label: 'Series / Sanctioning Body', className: 'flex-1' },
  { label: 'Discipline',                className: 'hidden sm:block w-12 text-center' },
  { label: 'Season',                    className: 'hidden md:block w-14 text-center' },
  { label: 'Updated',                   className: 'hidden lg:block w-20 text-right' },
];

export default function ManageSeries() {
  const navigate = useNavigate();
  const [searchQuery,     setSearchQuery]     = useState('');
  const [filterStatus,    setFilterStatus]    = useState('');
  const [filterDisc,      setFilterDisc]      = useState('');
  const [filterScope,     setFilterScope]     = useState('');
  const [selectedSeries,  setSelectedSeries]  = useState([]);
  const [showActivity,    setShowActivity]    = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [showDeleteConfirm,  setShowDeleteConfirm]  = useState(false);
  const [seriesToDelete,     setSeriesToDelete]     = useState(null);
  const [bulkDeleteConfirm,  setBulkDeleteConfirm]  = useState(false);
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  // Duplicate warning on load (unchanged)
  useEffect(() => {
    if (!isAdmin) return;
    base44.functions.invoke('findDuplicateSourceEntities', { entity_type: 'series' })
      .then(res => { if (res?.data?.duplicate_count > 0) setDuplicateWarning(true); })
      .catch(() => {});
  }, [isAdmin]);

  // Navigation helpers (unchanged)
  const handleNavigateToDriver = (driver) => navigate('/race-core/drivers/' + driver.id);
  const handleNavigateToTeam   = (team)   => navigate('/race-core/teams/'  + team.id);

  // ── Data (unchanged) ──────────────────────────────────────────────────────────
  const { data: series = [], isLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list('-created_date', 500),
  });

  // ── Mutations (byte-for-byte identical) ───────────────────────────────────────
  const deleteSeriesMutation = useMutation({
    mutationFn: async (id, ser) => {
      await base44.entities.Series.delete(id);
      await base44.functions.invoke('logDeletion', { entityName: 'Series', recordIds: [id], recordNames: [ser?.name] });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['series'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids, selectedItems) => {
      await Promise.all(ids.map(id => base44.entities.Series.delete(id)));
      const names = selectedItems?.map(s => s.name) || [];
      await base44.functions.invoke('logDeletion', { entityName: 'Series', recordIds: ids, recordNames: names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setSelectedSeries([]);
    },
  });

  // ── Filtering (memoized) ──────────────────────────────────────────────────────
  const filteredSeries = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return series.filter(s => {
      if (q && !s.name?.toLowerCase().includes(q) &&
               !s.sanctioning_body?.toLowerCase().includes(q)) return false;
      if (filterStatus && s.operational_status !== filterStatus) return false;
      if (filterDisc   && s.discipline !== filterDisc) return false;
      if (filterScope  && s.geographic_scope !== filterScope) return false;
      return true;
    });
  }, [series, searchQuery, filterStatus, filterDisc, filterScope]);

  const activeCount   = series.filter(s => s.operational_status === 'Active').length;
  const upcomingCount = series.filter(s => s.operational_status === 'Upcoming').length;
  const inactiveCount = series.filter(s => s.operational_status === 'Inactive').length;
  const hasActiveFilters = !!(searchQuery || filterStatus || filterDisc || filterScope);

  // ── Handlers (unchanged logic) ────────────────────────────────────────────────
  const handleDelete = (id) => {
    const ser = series.find(s => s.id === id);
    setSeriesToDelete(ser);
    setShowDeleteConfirm(true);
  };
  const confirmDelete = () => {
    if (!seriesToDelete) return;
    setShowDeleteConfirm(false);
    deleteSeriesMutation.mutate(seriesToDelete.id, seriesToDelete);
    setSeriesToDelete(null);
  };

  const handleBulkDelete = () => setBulkDeleteConfirm(true);
  const confirmBulkDelete = () => {
    setBulkDeleteConfirm(false);
    const selectedItems = filteredSeries.filter(s => selectedSeries.includes(s.id));
    bulkDeleteMutation.mutate(selectedSeries, selectedItems);
  };

  const handleSelectAll        = (checked) => setSelectedSeries(checked ? filteredSeries.map(s => s.id) : []);
  const handleSelectSeriesItem = (id) => setSelectedSeries(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const handleExport = () => {
    const dataStr  = JSON.stringify(series, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url  = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `series-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        const dataArray = Array.isArray(importedData) ? importedData : [importedData];
        let imported = 0;
        for (const { id: _id, created_date: _cd, updated_date: _ud, created_by: _cb, ...rest } of dataArray) {
          await base44.functions.invoke('syncSourceAndEntityRecord', {
            entity_type: 'series',
            payload: rest,
            triggered_from: 'series_json_import',
          }).catch(() => {});
          imported++;
        }
        queryClient.invalidateQueries({ queryKey: ['series'] });
        alert(`Successfully imported ${imported} series`);
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const clearFilters = () => { setSearchQuery(''); setFilterStatus(''); setFilterDisc(''); setFilterScope(''); };

  // ── Composed slots ────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Total',    value: series.length },
    { label: 'Active',   value: activeCount,   accent: 'text-emerald-400' },
    { label: 'Upcoming', value: upcomingCount, accent: 'text-sky-400' },
    ...(inactiveCount > 0 ? [{ label: 'Inactive', value: inactiveCount, accent: 'text-gray-500' }] : []),
  ];

  const alertStrip = duplicateWarning ? (
    <div className="flex items-center gap-3 px-5 py-2 border-b border-amber-800/40 bg-amber-900/20">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      <p className="text-xs text-amber-400 flex-1">
        Potential duplicate series records detected.{' '}
        <Link to={createPageUrl('Diagnostics')} className="underline font-semibold">Open Diagnostics</Link>
      </p>
      <button onClick={() => setDuplicateWarning(false)} className="text-amber-600 hover:text-amber-400">
        <X className="w-3 h-3" />
      </button>
    </div>
  ) : null;

  const headerActions = (
    <>
      {/* Import/Export — preserved from original Data tab actions */}
      <input id="import-series" type="file" accept=".json" onChange={handleImport} className="hidden" />
      <button
        onClick={() => downloadTemplate('series', 'Series')}
        title="Download template"
        className="h-7 w-7 flex items-center justify-center rounded border border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400 transition-colors"
      >
        <Download className="w-3 h-3" />
      </button>
      <button
        onClick={handleExport}
        title="Export JSON"
        className="h-7 px-2.5 text-[11px] font-mono rounded border border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1.5"
      >
        <Download className="w-3 h-3" /> Export
      </button>
      <button
        onClick={() => document.getElementById('import-series').click()}
        title="Import JSON"
        className="h-7 px-2.5 text-[11px] font-mono rounded border border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1.5"
      >
        <Upload className="w-3 h-3" /> Import
      </button>
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
        onClick={() => navigate('/race-core/series/new')}
        className="h-7 px-3 text-[11px] font-mono font-semibold rounded border border-teal-600/60 bg-teal-600/10 text-teal-300 hover:bg-teal-600/20 transition-colors flex items-center gap-1.5"
      >
        <Plus className="w-3 h-3" />
        Add Series
      </button>
    </>
  );

  const filterRail = (
    <RecordsFilterRail
      search={searchQuery}
      onSearch={setSearchQuery}
      searchPlaceholder="Search series..."
      filters={[
        { key: 'status', value: filterStatus, onChange: setFilterStatus, options: STATUS_OPTIONS,     placeholder: 'Status'     },
        { key: 'disc',   value: filterDisc,   onChange: setFilterDisc,   options: DISCIPLINE_OPTIONS, placeholder: 'Discipline' },
        { key: 'scope',  value: filterScope,  onChange: setFilterScope,  options: SCOPE_OPTIONS,      placeholder: 'Scope'      },
      ]}
      hasActiveFilters={hasActiveFilters}
      onClearAll={clearFilters}
      resultCount={filteredSeries.length}
      totalCount={series.length}
    />
  );

  const bulkBar = isAdmin && selectedSeries.length > 0 ? (
    <div className="flex items-center gap-3 px-5 py-1.5 border-b border-red-900/40 bg-red-900/10">
      <span className="text-xs font-mono text-red-400">{selectedSeries.length} selected</span>
      <button
        onClick={handleBulkDelete}
        disabled={bulkDeleteMutation.isPending}
        className="h-6 px-3 text-[11px] font-mono rounded border border-red-800/60 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-40 flex items-center gap-1.5"
      >
        <Trash2 className="w-3 h-3" />
        {bulkDeleteMutation.isPending ? 'Deleting…' : `Delete ${selectedSeries.length}`}
      </button>
      <button onClick={() => setSelectedSeries([])} className="text-[11px] font-mono text-gray-600 hover:text-gray-400">
        Cancel
      </button>
    </div>
  ) : null;

  if (userLoading) return null;
  if (!user) { base44.auth.redirectToLogin(); return null; }
  if (!isAdmin) return <AdminAccessDenied />;

  return (
    <>
    <RaceCoreBreadcrumb crumbs={[
      { label: 'RaceCore', href: '/racecore' },
      { label: 'Records', href: '/racecore/records/series' },
      { label: 'Series' },
    ]} noBorder />
    <RecordsPageShell
      icon={Activity}
      title="Series Records"
      stats={stats}
      isLoading={isLoading}
      actions={headerActions}
      alert={alertStrip}
      filterRail={filterRail}
      bulkBar={bulkBar}
    >
      <RecordGrid
        isLoading={isLoading}
        isEmpty={filteredSeries.length === 0}
        emptyIcon={Activity}
        emptyMessage={hasActiveFilters ? 'No series match filters' : 'No series found'}
        emptyAction={hasActiveFilters && (
          <button onClick={clearFilters} className="text-[11px] font-mono text-teal-600 hover:text-teal-400 underline">
            Clear filters
          </button>
        )}
        columns={GRID_COLUMNS}
        showSelectAll={isAdmin}
        allSelected={selectedSeries.length === filteredSeries.length && filteredSeries.length > 0}
        onSelectAll={handleSelectAll}
      >
        {filteredSeries.map(s => (
          <SeriesRecordRow
            key={s.id}
            series={s}
            isAdmin={isAdmin}
            isSelected={selectedSeries.includes(s.id)}
            onSelect={handleSelectSeriesItem}
            onDelete={handleDelete}
            isDeleting={deleteSeriesMutation.isPending}
          />
        ))}
      </RecordGrid>

      {showActivity && (
        <RecordActivityRail entityName="Series" onClose={() => setShowActivity(false)} overlayOnMobile />
      )}
    </RecordsPageShell>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete series?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{seriesToDelete?.name}</strong>? This action cannot be undone.
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
          <AlertDialogTitle>Delete {selectedSeries.length} series?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{selectedSeries.length} selected series</strong>? This action cannot be undone.
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