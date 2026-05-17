import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import { Plus, Trash2, AlertTriangle, X, User, Upload, Download, Hash, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// RaceCore Records primitives
import RecordsPageShell   from '@/components/racecore/records/RecordsPageShell';
import RecordsFilterRail  from '@/components/racecore/records/RecordsFilterRail';
import RecordGrid         from '@/components/racecore/records/RecordGrid';
import RecordActivityRail from '@/components/racecore/records/RecordActivityRail';
import DriverRecordRow    from '@/components/drivers/DriverRecordRow';

// Driver-specific tools (preserved)
import DriverDuplicateFinder from '@/components/management/DriverDuplicateFinder';
import { downloadTemplate } from '@/components/shared/downloadTemplate';

// ── Filter option sets ────────────────────────────────────────────────────────
const RACING_STATUS_OPTIONS  = ['Active', 'Part Time', 'Inactive'];
const VISIBILITY_OPTIONS     = ['live', 'draft'];
const DISCIPLINE_OPTIONS     = ['Off Road', 'Snowmobile', 'Asphalt Oval', 'Road Racing', 'Rallycross', 'Drag Racing', 'Mixed'];
const CAREER_STATUS_OPTIONS  = ['Novice', 'Amateur', 'Semi-Professional', 'Professional'];

const GRID_COLUMNS = [
  { label: 'Driver / Location', className: 'flex-1' },
  { label: 'Discipline',        className: 'hidden sm:block w-16 text-center' },
  { label: 'Career',            className: 'hidden md:block w-16 text-center' },
  { label: 'Updated',           className: 'hidden lg:block w-20 text-right' },
];

export default function ManageDrivers() {
  const navigate = useNavigate();

  // ── Filter / UI state ─────────────────────────────────────────────────────────
  const [searchQuery,      setSearchQuery]      = useState('');
  const [filterStatus,     setFilterStatus]     = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [filterDisc,       setFilterDisc]       = useState('');
  const [filterCareer,     setFilterCareer]     = useState('');
  const [selectedDrivers,  setSelectedDrivers]  = useState([]);
  const [showActivity,     setShowActivity]     = useState(false);
  const [showDuplicateFinder, setShowDuplicateFinder] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null); // duplicate_count number

  // ── Bulk edit state (preserved) ───────────────────────────────────────────────
  const [bulkStatus,        setBulkStatus]        = useState('');
  const [bulkProfileStatus, setBulkProfileStatus] = useState('');
  const [bulkDiscipline,    setBulkDiscipline]    = useState('');
  const [applyingBulk,      setApplyingBulk]      = useState(false);
  const [backfillingIds,    setBackfillingIds]    = useState(false);

  // ── Delete confirm state (preserved) ─────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [driverToDelete,    setDriverToDelete]    = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const queryClient = useQueryClient();

  // ── Auth (unchanged query key) ────────────────────────────────────────────────
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  // ── Deep-link: ?driverId=xxx (preserved) ─────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const driverId = params.get('driverId');
    if (driverId) navigate('/race-core/drivers/' + driverId);
  }, []);

  // ── Background duplicate check (preserved) ───────────────────────────────────
  useEffect(() => {
    base44.functions.invoke('findDuplicateSourceEntities', { entity_type: 'driver' })
      .then(res => { if (res?.data?.duplicate_count > 0) setDuplicateWarning(res.data.duplicate_count); })
      .catch(() => {});
  }, []);

  // ── Data queries (unchanged keys + fetch params) ──────────────────────────────
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('-updated_date', 500),
  });

  const { data: allPrograms = [] } = useQuery({
    queryKey: ['driverPrograms'],
    queryFn: () => base44.entities.DriverProgram.list(),
  });

  const { data: allMedia = [] } = useQuery({
    queryKey: ['driverMedia'],
    queryFn: () => base44.entities.DriverMedia.list(),
  });

  // ── Derived maps (unchanged logic) ───────────────────────────────────────────
  const programsByDriver = useMemo(() => {
    const map = {};
    allPrograms.forEach(p => {
      if (!map[p.driver_id]) map[p.driver_id] = [];
      map[p.driver_id].push(p);
    });
    return map;
  }, [allPrograms]);

  const mediaByDriver = useMemo(() => {
    const map = {};
    allMedia.forEach(m => { map[m.driver_id] = m; });
    return map;
  }, [allMedia]);

  // ── Profile readiness (unchanged logic) ──────────────────────────────────────
  const getProfileReadiness = (driver) => {
    const missing = [];
    if (!driver.first_name || !driver.last_name) missing.push('Name');
    const media = mediaByDriver[driver.id];
    if (!media?.headshot_url) missing.push('Headshot');
    if (!driver.date_of_birth) missing.push('Age (DOB)');
    if (!driver.hometown_country) missing.push('Nationality');
    const programs = programsByDriver[driver.id] || [];
    if (programs.length === 0) missing.push('1 Program (Series)');
    return { isReady: missing.length === 0, missing };
  };

  // ── Mutations (unchanged logic, keys, callbacks) ──────────────────────────────
  const toggleProfileStatusMutation = useMutation({
    mutationFn: ({ id, visibility_status }) => base44.entities.Driver.update(id, { visibility_status }),
    onSuccess: (_, { visibility_status }) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success(`Profile set to ${visibility_status}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id, driver) => {
      await base44.entities.Driver.delete(id);
      await base44.functions.invoke('logDeletion', {
        entityName: 'Driver',
        recordIds: [id],
        recordNames: [driver?.display_name || `${driver?.first_name} ${driver?.last_name}`],
      });
      await new Promise(r => setTimeout(r, 150));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver deleted');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids, selectedItems) => {
      for (const id of ids) {
        await base44.entities.Driver.delete(id);
        await new Promise(r => setTimeout(r, 100));
      }
      const names = selectedItems?.map(d => d.display_name || `${d.first_name} ${d.last_name}`) || [];
      await base44.functions.invoke('logDeletion', { entityName: 'Driver', recordIds: ids, recordNames: names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setSelectedDrivers([]);
      toast.success('Drivers deleted successfully');
    },
  });

  // ── Filtering (client-side, memoized) ─────────────────────────────────────────
  const filteredDrivers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return drivers.filter(d => {
      if (q && !d.first_name?.toLowerCase().includes(q) &&
               !d.last_name?.toLowerCase().includes(q) &&
               !d.display_name?.toLowerCase().includes(q)) return false;
      if (filterStatus     && d.racing_status !== filterStatus)         return false;
      if (filterVisibility && d.visibility_status !== filterVisibility)  return false;
      if (filterDisc       && d.primary_discipline !== filterDisc)       return false;
      if (filterCareer     && d.career_status !== filterCareer)          return false;
      return true;
    });
  }, [drivers, searchQuery, filterStatus, filterVisibility, filterDisc, filterCareer]);

  // ── Selection (unchanged) ─────────────────────────────────────────────────────
  const handleSelectAll    = (checked) => setSelectedDrivers(checked ? filteredDrivers.map(d => d.id) : []);
  const handleSelectDriver = (id) => setSelectedDrivers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Delete handlers (unchanged) ───────────────────────────────────────────────
  const handleDelete = (driver) => { setDriverToDelete(driver); setShowDeleteConfirm(true); };
  const confirmDelete = () => {
    if (!driverToDelete) return;
    setShowDeleteConfirm(false);
    deleteMutation.mutate(driverToDelete.id, driverToDelete);
    setDriverToDelete(null);
  };
  const confirmBulkDelete = () => {
    setBulkDeleteConfirm(false);
    const selectedItems = drivers.filter(d => selectedDrivers.includes(d.id));
    bulkDeleteMutation.mutate(selectedDrivers, selectedItems);
  };

  // ── Bulk apply (unchanged) ────────────────────────────────────────────────────
  const handleBulkApply = async () => {
    if (!bulkStatus && !bulkProfileStatus && !bulkDiscipline) return;
    if (!window.confirm(`Apply changes to ${selectedDrivers.length} selected driver(s)?`)) return;
    setApplyingBulk(true);
    const updates = {};
    if (bulkStatus)        updates.racing_status     = bulkStatus;
    if (bulkProfileStatus) updates.visibility_status = bulkProfileStatus;
    if (bulkDiscipline)    updates.primary_discipline = bulkDiscipline;
    for (const id of selectedDrivers) {
      await base44.entities.Driver.update(id, updates);
    }
    queryClient.invalidateQueries({ queryKey: ['drivers'] });
    toast.success(`Updated ${selectedDrivers.length} driver(s)`);
    setBulkStatus(''); setBulkProfileStatus(''); setBulkDiscipline('');
    setApplyingBulk(false);
  };

  // ── JSON Export (unchanged) ───────────────────────────────────────────────────
  const handleExport = () => {
    const dataStr = JSON.stringify(drivers, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drivers-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── JSON Import (unchanged) ───────────────────────────────────────────────────
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        const dataArray = Array.isArray(importedData) ? importedData : [importedData];
        let created = 0, updated = 0;
        for (const { id: _id, created_date, updated_date, created_by, ...rest } of dataArray) {
          const res = await base44.functions.invoke('syncSourceAndEntityRecord', {
            entity_type: 'driver',
            payload: rest,
            triggered_from: 'driver_json_import',
          });
          if (res?.data?.action === 'created') created++;
          else updated++;
        }
        queryClient.invalidateQueries({ queryKey: ['drivers'] });
        alert(`Import complete: ${created} created, ${updated} updated`);
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const clearFilters = () => {
    setSearchQuery(''); setFilterStatus(''); setFilterVisibility('');
    setFilterDisc(''); setFilterCareer('');
  };

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const activeCount   = drivers.filter(d => d.racing_status === 'Active').length;
  const partTimeCount = drivers.filter(d => d.racing_status === 'Part Time').length;
  const liveCount     = drivers.filter(d => d.visibility_status === 'live').length;
  const draftCount    = drivers.filter(d => d.visibility_status !== 'live').length;
  const hasActiveFilters = !!(searchQuery || filterStatus || filterVisibility || filterDisc || filterCareer);

  // ── Composed slots ────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Total',     value: drivers.length },
    { label: 'Active',    value: activeCount,   accent: 'text-emerald-400' },
    { label: 'Part Time', value: partTimeCount, accent: 'text-amber-400' },
    { label: 'Live',      value: liveCount,     accent: 'text-teal-400' },
    ...(draftCount > 0 ? [{ label: 'Draft', value: draftCount, accent: 'text-gray-500' }] : []),
  ];

  const headerActions = (
    <>
      {/* Hidden import input */}
      <input id="import-drivers" type="file" accept=".json" onChange={handleImport} className="hidden" />

      {/* Admin-only utilities */}
      {isAdmin && (
        <>
          <button
            onClick={() => downloadTemplate('driver', 'Driver')}
            title="Download import template"
            className="h-7 px-2 text-[11px] font-mono rounded border border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400 transition-colors"
          >
            <Download className="w-3 h-3" />
          </button>
          <button
            onClick={handleExport}
            title="Export JSON"
            className="h-7 px-2 text-[11px] font-mono rounded border border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
          <button
            onClick={() => document.getElementById('import-drivers').click()}
            title="Import JSON"
            className="h-7 px-2 text-[11px] font-mono rounded border border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
          >
            <Upload className="w-3 h-3" />
            Import
          </button>
          <button
            onClick={async () => {
              setBackfillingIds(true);
              try {
                const res = await base44.functions.invoke('assignDriverNumericIds');
                toast.success(`Assigned IDs to ${res.data?.driversUpdated ?? 0} drivers`);
                queryClient.invalidateQueries({ queryKey: ['drivers'] });
              } catch (e) {
                toast.error('Failed to assign IDs: ' + e.message);
              } finally {
                setBackfillingIds(false);
              }
            }}
            disabled={backfillingIds}
            title="Assign numeric IDs"
            className="h-7 px-2 text-[11px] font-mono rounded border border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1 disabled:opacity-40"
          >
            <Hash className="w-3 h-3" />
            {backfillingIds ? 'Assigning…' : 'IDs'}
          </button>
          <button
            onClick={() => setShowDuplicateFinder(true)}
            title="Find duplicate drivers"
            className={cn(
              'h-7 px-2 text-[11px] font-mono rounded border transition-colors flex items-center gap-1',
              duplicateWarning
                ? 'border-amber-700/60 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40'
                : 'border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400'
            )}
          >
            <AlertCircle className="w-3 h-3" />
            Dupes{duplicateWarning ? ` (${duplicateWarning})` : ''}
          </button>
        </>
      )}

      {/* Activity toggle */}
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

      {/* Add Driver */}
      <button
        onClick={() => navigate('/race-core/drivers/new')}
        className="h-7 px-3 text-[11px] font-mono font-semibold rounded border border-teal-600/60 bg-teal-600/10 text-teal-300 hover:bg-teal-600/20 transition-colors flex items-center gap-1.5"
      >
        <Plus className="w-3 h-3" />
        Add Driver
      </button>
    </>
  );

  // ── Duplicate warning alert strip ────────────────────────────────────────────
  const alertStrip = duplicateWarning ? (
    <div className="flex items-center gap-3 px-5 py-2 border-b border-amber-800/40 bg-amber-900/20">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      <p className="text-xs text-amber-400 flex-1">
        {duplicateWarning} potential duplicate driver group{duplicateWarning > 1 ? 's' : ''} detected.{' '}
        <button onClick={() => setShowDuplicateFinder(true)} className="underline font-semibold">
          Open Duplicate Finder
        </button>{' '}or{' '}
        <Link to={createPageUrl('Diagnostics')} className="underline font-semibold">Diagnostics</Link>
      </p>
      <button onClick={() => setDuplicateWarning(null)} className="text-amber-600 hover:text-amber-400">
        <X className="w-3 h-3" />
      </button>
    </div>
  ) : null;

  // ── Filter rail ───────────────────────────────────────────────────────────────
  const filterRail = (
    <RecordsFilterRail
      search={searchQuery}
      onSearch={setSearchQuery}
      searchPlaceholder="Search drivers..."
      filters={[
        { key: 'status',     value: filterStatus,     onChange: setFilterStatus,     options: RACING_STATUS_OPTIONS, placeholder: 'Status'     },
        { key: 'visibility', value: filterVisibility, onChange: setFilterVisibility, options: VISIBILITY_OPTIONS,    placeholder: 'Profile'    },
        { key: 'disc',       value: filterDisc,       onChange: setFilterDisc,       options: DISCIPLINE_OPTIONS,   placeholder: 'Discipline' },
        { key: 'career',     value: filterCareer,     onChange: setFilterCareer,     options: CAREER_STATUS_OPTIONS, placeholder: 'Career'    },
      ]}
      hasActiveFilters={hasActiveFilters}
      onClearAll={clearFilters}
      resultCount={filteredDrivers.length}
      totalCount={drivers.length}
    />
  );

  // ── Bulk bar (selection-driven, admin only) ───────────────────────────────────
  const bulkBar = isAdmin && selectedDrivers.length > 0 ? (
    <div className="flex items-center gap-3 px-5 py-1.5 border-b border-blue-900/40 bg-blue-900/10 flex-wrap">
      <span className="text-xs font-mono text-blue-400">{selectedDrivers.length} selected</span>

      {/* Bulk racing status */}
      <select
        value={bulkStatus}
        onChange={e => setBulkStatus(e.target.value)}
        className="h-6 px-2 text-[11px] font-mono rounded border border-gray-800 bg-gray-900 text-gray-400 focus:outline-none"
      >
        <option value="">Status…</option>
        {RACING_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Bulk visibility */}
      <select
        value={bulkProfileStatus}
        onChange={e => setBulkProfileStatus(e.target.value)}
        className="h-6 px-2 text-[11px] font-mono rounded border border-gray-800 bg-gray-900 text-gray-400 focus:outline-none"
      >
        <option value="">Profile…</option>
        <option value="live">Live</option>
        <option value="draft">Draft</option>
      </select>

      {/* Bulk discipline */}
      <select
        value={bulkDiscipline}
        onChange={e => setBulkDiscipline(e.target.value)}
        className="h-6 px-2 text-[11px] font-mono rounded border border-gray-800 bg-gray-900 text-gray-400 focus:outline-none"
      >
        <option value="">Discipline…</option>
        {DISCIPLINE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      <button
        onClick={handleBulkApply}
        disabled={applyingBulk || (!bulkStatus && !bulkProfileStatus && !bulkDiscipline)}
        className="h-6 px-3 text-[11px] font-mono rounded border border-blue-800/60 bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 transition-colors disabled:opacity-40"
      >
        {applyingBulk ? 'Applying…' : 'Apply'}
      </button>

      <button
        onClick={() => setBulkDeleteConfirm(true)}
        disabled={bulkDeleteMutation.isPending}
        className="h-6 px-3 text-[11px] font-mono rounded border border-red-800/60 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-40 flex items-center gap-1.5"
      >
        <Trash2 className="w-3 h-3" />
        {bulkDeleteMutation.isPending ? 'Deleting…' : `Delete ${selectedDrivers.length}`}
      </button>

      <button onClick={() => setSelectedDrivers([])} className="text-[11px] font-mono text-gray-600 hover:text-gray-400">
        Cancel
      </button>
    </div>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <ManagementLayout currentPage="ManageDrivers">
        <RecordsPageShell
          icon={User}
          title="Driver Records"
          stats={stats}
          isLoading={isLoading}
          actions={headerActions}
          alert={alertStrip}
          filterRail={filterRail}
          bulkBar={bulkBar}
        >
          <RecordGrid
            isLoading={isLoading}
            isEmpty={filteredDrivers.length === 0}
            emptyIcon={User}
            emptyMessage={hasActiveFilters ? 'No drivers match filters' : 'No drivers found'}
            emptyAction={hasActiveFilters && (
              <button onClick={clearFilters} className="text-[11px] font-mono text-teal-600 hover:text-teal-400 underline">
                Clear filters
              </button>
            )}
            columns={GRID_COLUMNS}
            showSelectAll={isAdmin}
            allSelected={selectedDrivers.length === filteredDrivers.length && filteredDrivers.length > 0}
            onSelectAll={handleSelectAll}
          >
            {filteredDrivers.map(driver => (
              <DriverRecordRow
                key={driver.id}
                driver={driver}
                isAdmin={isAdmin}
                isSelected={selectedDrivers.includes(driver.id)}
                onSelect={handleSelectDriver}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
                onToggleVisibility={toggleProfileStatusMutation.mutate}
                getProfileReadiness={getProfileReadiness}
              />
            ))}
          </RecordGrid>

          {showActivity && (
            <RecordActivityRail entityName="Driver" onClose={() => setShowActivity(false)} overlayOnMobile />
          )}
        </RecordsPageShell>
      </ManagementLayout>

      {/* Duplicate finder dialog (preserved) */}
      <DriverDuplicateFinder
        drivers={drivers}
        open={showDuplicateFinder}
        onOpenChange={setShowDuplicateFinder}
      />

      {/* Single delete confirm (AlertDialog flow preserved) */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete driver?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{driverToDelete?.first_name} {driverToDelete?.last_name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm (AlertDialog flow preserved) */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedDrivers.length} driver(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedDrivers.length} selected drivers</strong>? This action cannot be undone.
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