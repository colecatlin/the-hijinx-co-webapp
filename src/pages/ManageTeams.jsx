import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import { Plus, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// RaceCore Records primitives
import RecordsPageShell   from '@/components/racecore/records/RecordsPageShell';
import RecordsFilterRail  from '@/components/racecore/records/RecordsFilterRail';
import RecordGrid         from '@/components/racecore/records/RecordGrid';
import RecordActivityRail from '@/components/racecore/records/RecordActivityRail';
import TeamRecordRow      from '@/components/teams/TeamRecordRow';

const STATUS_OPTIONS     = ['Active', 'Part Time', 'Historic', 'Inactive'];
const DISCIPLINE_OPTIONS = ['Off Road', 'Snowmobile', 'Asphalt Oval', 'Road Racing', 'Rallycross', 'Drag Racing', 'Mixed'];
const LEVEL_OPTIONS      = ['Local', 'Regional', 'National', 'International'];

const GRID_COLUMNS = [
  { label: 'Team / Location',  className: 'flex-1' },
  { label: 'Discipline',       className: 'hidden sm:block w-16 text-center' },
  { label: 'Level',            className: 'hidden md:block w-12 text-center' },
  { label: 'Updated',          className: 'hidden lg:block w-20 text-right' },
];

export default function ManageTeams({ embedded = false }) {
  const navigate = useNavigate();
  const [searchQuery,    setSearchQuery]    = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterDisc,     setFilterDisc]     = useState('');
  const [filterLevel,    setFilterLevel]    = useState('');
  const [selectedTeams,  setSelectedTeams]  = useState([]);
  const [showActivity,   setShowActivity]   = useState(false);
  const [showDeleteConfirm,  setShowDeleteConfirm]  = useState(false);
  const [teamToDelete,       setTeamToDelete]       = useState(null);
  const [bulkDeleteConfirm,  setBulkDeleteConfirm]  = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  // Deep-link: ?teamId=xxx → route directly to Race Core canonical editor (preserved)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const teamId = params.get('teamId');
    if (teamId) navigate('/race-core/teams/' + teamId);
  }, []);

  // ── Data (unchanged) ──────────────────────────────────────────────────────────
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('-updated_date', 500),
  });

  // ── Mutations (unchanged) ─────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      await base44.entities.Team.delete(id);
      await base44.functions.invoke('logDeletion', { entityName: 'Team', recordIds: [id], recordNames: [name] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team deleted');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids, names }) => {
      for (const id of ids) await base44.entities.Team.delete(id);
      await base44.functions.invoke('logDeletion', { entityName: 'Team', recordIds: ids, recordNames: names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setSelectedTeams([]);
      toast.success('Teams deleted successfully');
    },
  });

  // ── Filtering ─────────────────────────────────────────────────────────────────
  const filteredTeams = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return teams.filter(t => {
      if (q && !t.name?.toLowerCase().includes(q) &&
               !t.headquarters_city?.toLowerCase().includes(q) &&
               !t.headquarters_state?.toLowerCase().includes(q)) return false;
      if (filterStatus && t.racing_status !== filterStatus) return false;
      if (filterDisc   && t.primary_discipline !== filterDisc) return false;
      if (filterLevel  && t.team_level !== filterLevel) return false;
      return true;
    });
  }, [teams, searchQuery, filterStatus, filterDisc, filterLevel]);

  const activeCount   = teams.filter(t => t.racing_status === 'Active').length;
  const partTimeCount = teams.filter(t => t.racing_status === 'Part Time').length;
  const inactiveCount = teams.filter(t => t.racing_status === 'Inactive' || t.racing_status === 'Historic').length;
  const hasActiveFilters = !!(searchQuery || filterStatus || filterDisc || filterLevel);

  // ── Selection ─────────────────────────────────────────────────────────────────
  const handleSelectAll  = (checked) => setSelectedTeams(checked ? filteredTeams.map(t => t.id) : []);
  const handleSelectTeam = (id) => setSelectedTeams(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Delete handlers (unchanged logic, AlertDialog flow preserved) ─────────────
  const handleDelete = (team) => { setTeamToDelete(team); setShowDeleteConfirm(true); };
  const confirmDelete = () => {
    if (!teamToDelete) return;
    setShowDeleteConfirm(false);
    deleteMutation.mutate({ id: teamToDelete.id, name: teamToDelete.name });
    setTeamToDelete(null);
  };
  const confirmBulkDelete = () => {
    setBulkDeleteConfirm(false);
    const selectedItems = filteredTeams.filter(t => selectedTeams.includes(t.id));
    bulkDeleteMutation.mutate({ ids: selectedTeams, names: selectedItems.map(t => t.name) });
  };

  const clearFilters = () => { setSearchQuery(''); setFilterStatus(''); setFilterDisc(''); setFilterLevel(''); };

  // ── Composed slots ────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Total',     value: teams.length },
    { label: 'Active',    value: activeCount,   accent: 'text-emerald-400' },
    { label: 'Part Time', value: partTimeCount, accent: 'text-amber-400' },
    ...(inactiveCount > 0 ? [{ label: 'Inactive', value: inactiveCount, accent: 'text-gray-500' }] : []),
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
        onClick={() => navigate('/race-core/teams/new')}
        className="h-7 px-3 text-[11px] font-mono font-semibold rounded border border-teal-600/60 bg-teal-600/10 text-teal-300 hover:bg-teal-600/20 transition-colors flex items-center gap-1.5"
      >
        <Plus className="w-3 h-3" />
        Add Team
      </button>
    </>
  );

  const filterRail = (
    <RecordsFilterRail
      search={searchQuery}
      onSearch={setSearchQuery}
      searchPlaceholder="Search teams..."
      filters={[
        { key: 'status', value: filterStatus, onChange: setFilterStatus, options: STATUS_OPTIONS,     placeholder: 'Status'     },
        { key: 'disc',   value: filterDisc,   onChange: setFilterDisc,   options: DISCIPLINE_OPTIONS, placeholder: 'Discipline' },
        { key: 'level',  value: filterLevel,  onChange: setFilterLevel,  options: LEVEL_OPTIONS,      placeholder: 'Level'      },
      ]}
      hasActiveFilters={hasActiveFilters}
      onClearAll={clearFilters}
      resultCount={filteredTeams.length}
      totalCount={teams.length}
    />
  );

  const bulkBar = isAdmin && selectedTeams.length > 0 ? (
    <div className="flex items-center gap-3 px-5 py-1.5 border-b border-red-900/40 bg-red-900/10">
      <span className="text-xs font-mono text-red-400">{selectedTeams.length} selected</span>
      <button
        onClick={() => setBulkDeleteConfirm(true)}
        disabled={bulkDeleteMutation.isPending}
        className="h-6 px-3 text-[11px] font-mono rounded border border-red-800/60 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-40 flex items-center gap-1.5"
      >
        <Trash2 className="w-3 h-3" />
        {bulkDeleteMutation.isPending ? 'Deleting…' : `Delete ${selectedTeams.length}`}
      </button>
      <button onClick={() => setSelectedTeams([])} className="text-[11px] font-mono text-gray-600 hover:text-gray-400">
        Cancel
      </button>
    </div>
  ) : null;

  return (
    <>
      <ManagementLayout currentPage="ManageTeams" embedded={embedded}>
        <RecordsPageShell
          icon={Users}
          title="Team Records"
          stats={stats}
          isLoading={isLoading}
          actions={headerActions}
          filterRail={filterRail}
          bulkBar={bulkBar}
        >
          <RecordGrid
            isLoading={isLoading}
            isEmpty={filteredTeams.length === 0}
            emptyIcon={Users}
            emptyMessage={hasActiveFilters ? 'No teams match filters' : 'No teams found'}
            emptyAction={hasActiveFilters && (
              <button onClick={clearFilters} className="text-[11px] font-mono text-teal-600 hover:text-teal-400 underline">
                Clear filters
              </button>
            )}
            columns={GRID_COLUMNS}
            showSelectAll={isAdmin}
            allSelected={selectedTeams.length === filteredTeams.length && filteredTeams.length > 0}
            onSelectAll={handleSelectAll}
          >
            {filteredTeams.map(team => (
              <TeamRecordRow
                key={team.id}
                team={team}
                isAdmin={isAdmin}
                isSelected={selectedTeams.includes(team.id)}
                onSelect={handleSelectTeam}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </RecordGrid>

          {showActivity && (
            <RecordActivityRail entityName="Team" onClose={() => setShowActivity(false)} overlayOnMobile />
          )}
        </RecordsPageShell>
      </ManagementLayout>

      {/* Single delete confirm (AlertDialog flow unchanged) */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{teamToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm (AlertDialog flow unchanged) */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedTeams.length} team(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedTeams.length} selected teams</strong>? This action cannot be undone.
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