import React, { useState, useMemo } from 'react';
import AdminAccessDenied from '@/components/shared/AdminAccessDenied';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, AlertTriangle, X, CalendarDays, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// RaceCore Records primitives
import RaceCoreBreadcrumb from '@/components/racecore/RaceCoreBreadcrumb';
import RecordsPageShell   from '@/components/racecore/records/RecordsPageShell';
import RecordsFilterRail  from '@/components/racecore/records/RecordsFilterRail';
import RecordGrid         from '@/components/racecore/records/RecordGrid';
import RecordActivityRail from '@/components/racecore/records/RecordActivityRail';
import EventRecordRow     from '@/components/events/EventRecordRow';

// Bulk scheduler (preserved, moved to header-action panel)
import EventSchedulerForm from '@/components/management/EventScheduler/EventSchedulerForm';
import QuickAddEntityDialog from '@/components/management/QuickAddEntityDialog';

// ── Filter option sets (client-side only, preserved logic) ────────────────────
const STATUS_OPTIONS   = ['upcoming', 'finished'];
const APPROVAL_OPTIONS = [{ label: 'Pending', value: 'pending' }, { label: 'Both Approved', value: 'approved' }];
const PUBLISH_OPTIONS  = [{ label: 'Ready', value: 'ready' }, { label: 'Blocked', value: 'blocked' }];
const SORT_OPTIONS     = [
  { label: 'Date ↑', value: 'date_desc' },
  { label: 'Date ↓', value: 'date_asc' },
  { label: 'Name A–Z', value: 'name_asc' },
  { label: 'Name Z–A', value: 'name_desc' },
];

const GRID_COLUMNS = [
  { label: 'Event / Series',    className: 'flex-1' },
  { label: 'Date',              className: 'hidden sm:block w-24' },
  { label: 'Acceptance',        className: 'hidden md:block w-20' },
  { label: 'Season',            className: 'hidden lg:block w-12 text-center' },
  { label: 'Updated',           className: 'hidden xl:block w-20 text-right' },
];

export default function ManageEvents() {
  const navigate = useNavigate();

  // ── Filter / UI state ─────────────────────────────────────────────────────────
  const [searchQuery,      setSearchQuery]      = useState('');
  const [statusFilter,     setStatusFilter]     = useState('');
  const [approvalFilter,   setApprovalFilter]   = useState('');
  const [publishFilter,    setPublishFilter]    = useState('');
  const [sortBy,           setSortBy]           = useState('date_desc');
  const [selectedEvents,   setSelectedEvents]   = useState([]);
  const [showActivity,     setShowActivity]     = useState(false);
  const [showScheduler,    setShowScheduler]    = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedSeriesForScheduler, setSelectedSeriesForScheduler] = useState(null);

  // ── Delete confirm state ──────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete,     setEventToDelete]     = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [deletingEventId,   setDeletingEventId]   = useState(null);

  const queryClient = useQueryClient();

  // ── Auth (unchanged query key) ────────────────────────────────────────────────
  const { data: user, isLoading: userLoading } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  // ── Data queries (unchanged keys + fetch params) ──────────────────────────────
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-event_date', 500),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  // ── Mutations (unchanged logic, keys, callbacks) ──────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async ({ id, event }) => {
      await base44.entities.Event.delete(id);
      await base44.functions.invoke('logDeletion', { entityName: 'Event', recordIds: [id], recordNames: [event?.name] });
    },
    onSuccess: () => {
      setDeletingEventId(null);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      alert('Event deleted successfully');
    },
    onError: (error) => {
      setDeletingEventId(null);
      alert(`Error deleting event: ${error.message}`);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids, selectedItems }) => {
      for (const id of ids) {
        await base44.entities.Event.delete(id);
      }
      const names = selectedItems?.map(e => e.name) || [];
      await base44.functions.invoke('logDeletion', { entityName: 'Event', recordIds: ids, recordNames: names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedEvents([]);
      alert('Events deleted successfully');
    },
    onError: (error) => {
      alert(`Error deleting events: ${error.message}`);
    },
  });

  // ── Filtering (client-side, memoized — logic preserved exactly as before) ─────
  const filteredEvents = useMemo(() => {
    let result = events.filter(event =>
      event.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    // statusFilter — aligned to schema enum values (Title Case)
    if (statusFilter === 'upcoming') {
      result = result.filter(e => e.status === 'Draft' || e.status === 'PendingApproval' || e.status === 'Published');
    } else if (statusFilter === 'finished') {
      result = result.filter(e => e.status === 'Completed' || e.status === 'Cancelled');
    }
    // approvalFilter logic preserved as-is (includes pre-existing field name mismatch)
    if (approvalFilter === 'pending') {
      result = result.filter(e => e.track_approval_status === 'pending' || e.series_approval_status === 'pending');
    } else if (approvalFilter === 'approved') {
      result = result.filter(e => e.track_approval_status === 'approved' && e.series_approval_status === 'approved');
    }
    if (publishFilter === 'ready') {
      result = result.filter(e => e.publish_ready === true);
    } else if (publishFilter === 'blocked') {
      result = result.filter(e => e.publish_ready === false);
    }
    result = [...result].sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date + 'T12:00:00') : new Date(0);
      const dateB = b.event_date ? new Date(b.event_date + 'T12:00:00') : new Date(0);
      if (sortBy === 'date_desc') return dateA - dateB;
      if (sortBy === 'date_asc')  return dateB - dateA;
      if (sortBy === 'name_asc')  return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });
    return result;
  }, [events, searchQuery, sortBy, statusFilter, approvalFilter, publishFilter]);

  // ── Selection ─────────────────────────────────────────────────────────────────
  const handleSelectAll   = (checked) => setSelectedEvents(checked ? filteredEvents.map(e => e.id) : []);
  const handleSelectEvent = (id) => setSelectedEvents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Delete handlers ───────────────────────────────────────────────────────────
  const handleDelete = (event) => { setEventToDelete(event); setShowDeleteConfirm(true); };
  const confirmDelete = () => {
    if (!eventToDelete) return;
    setShowDeleteConfirm(false);
    setDeletingEventId(eventToDelete.id);
    deleteMutation.mutate({ id: eventToDelete.id, event: eventToDelete });
    setEventToDelete(null);
  };
  const confirmBulkDelete = () => {
    setBulkDeleteConfirm(false);
    const selectedItems = filteredEvents.filter(e => selectedEvents.includes(e.id));
    bulkDeleteMutation.mutate({ ids: selectedEvents, selectedItems });
  };

  const clearFilters = () => {
    setSearchQuery(''); setStatusFilter(''); setApprovalFilter(''); setPublishFilter(''); setSortBy('date_desc');
  };

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const publishedCount  = events.filter(e => e.status === 'Published').length;
  const liveCount       = events.filter(e => e.status === 'Live').length;
  const completedCount  = events.filter(e => e.status === 'Completed').length;
  const pendingCount    = events.filter(e => e.status === 'PendingApproval').length;
  const hasActiveFilters = !!(searchQuery || statusFilter || approvalFilter || publishFilter);

  // ── Composed slots ────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Total',     value: events.length },
    { label: 'Published', value: publishedCount,  accent: 'text-motion' },
    { label: 'Live',      value: liveCount,        accent: 'text-emerald-500' },
    { label: 'Completed', value: completedCount,   accent: 'text-foreground-quiet' },
    ...(pendingCount > 0 ? [{ label: 'Pending', value: pendingCount, accent: 'text-amber-500' }] : []),
  ];

  const headerActions = (
    <>
      {/* Bulk Scheduler toggle */}
      <button
        onClick={() => { setShowScheduler(v => !v); setSelectedSeriesForScheduler(null); }}
        className={cn(
          'h-7 px-3 text-[11px] font-mono rounded border transition-colors flex items-center gap-1.5',
          showScheduler
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-600'
            : 'bg-transparent border-divider text-foreground-quiet hover:border-foreground-quiet hover:text-foreground'
        )}
      >
        <CalendarDays className="w-3 h-3" />
        Bulk Scheduler
      </button>

      {/* Activity toggle */}
      <button
        onClick={() => setShowActivity(v => !v)}
        className={cn(
          'h-7 px-3 text-[11px] font-mono rounded border transition-colors',
          showActivity
            ? 'bg-surface-interactive border-divider text-foreground'
            : 'bg-transparent border-divider text-foreground-quiet hover:border-foreground-quiet hover:text-foreground'
        )}
      >
        Activity
      </button>

      {/* Add Event */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className="h-7 px-3 text-[11px] font-mono font-semibold rounded border border-motion/40 bg-motion/10 text-motion hover:bg-motion/20 transition-colors flex items-center gap-1.5"
      >
        <Plus className="w-3 h-3" />
        Add Event
      </button>
    </>
  );

  // ── Filter rail ───────────────────────────────────────────────────────────────
  const filterRail = (
    <RecordsFilterRail
      search={searchQuery}
      onSearch={setSearchQuery}
      searchPlaceholder="Search events..."
      filters={[
        {
          key: 'status',
          value: statusFilter,
          onChange: setStatusFilter,
          options: STATUS_OPTIONS,
          placeholder: 'Status',
        },
        {
          key: 'approval',
          value: approvalFilter,
          onChange: setApprovalFilter,
          options: APPROVAL_OPTIONS.map(o => o.value),
          placeholder: 'Approval',
        },
        {
          key: 'publish',
          value: publishFilter,
          onChange: setPublishFilter,
          options: PUBLISH_OPTIONS.map(o => o.value),
          placeholder: 'Publish',
        },
        {
          key: 'sort',
          value: sortBy,
          onChange: setSortBy,
          options: SORT_OPTIONS.map(o => o.value),
          placeholder: 'Sort',
        },
      ]}
      hasActiveFilters={hasActiveFilters}
      onClearAll={clearFilters}
      resultCount={filteredEvents.length}
      totalCount={events.length}
    />
  );

  // ── Bulk bar (admin only, selection-driven) ───────────────────────────────────
  const bulkBar = isAdmin && selectedEvents.length > 0 ? (
    <div className="flex items-center gap-3 px-5 py-1.5 border-b border-danger/30 bg-danger/5">
      <span className="text-xs font-mono text-danger">{selectedEvents.length} selected</span>
      <button
        onClick={() => setBulkDeleteConfirm(true)}
        disabled={bulkDeleteMutation.isPending}
        className="h-6 px-3 text-[11px] font-mono rounded border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
      >
        <Trash2 className="w-3 h-3" />
        {bulkDeleteMutation.isPending ? 'Deleting…' : `Delete ${selectedEvents.length}`}
      </button>
      <button onClick={() => setSelectedEvents([])} className="text-[11px] font-mono text-foreground-quiet hover:text-foreground">
        Cancel
      </button>
    </div>
  ) : null;

  // ── Bulk Scheduler panel (collapsible, below the grid header) ─────────────────
  const schedulerPanel = showScheduler ? (
    <div className="border-b border-amber-500/20 bg-amber-500/5">
      <div className="px-5 py-3 flex items-center justify-between border-b border-amber-500/15">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-mono font-semibold text-amber-600 tracking-wider">BULK EVENT SCHEDULER</span>
          <span className="text-[10px] text-foreground-quiet">Create multiple events with sessions for a series</span>
        </div>
        <button
          onClick={() => { setShowScheduler(false); setSelectedSeriesForScheduler(null); }}
          className="text-foreground-quiet hover:text-amber-500 transition-colors"
          aria-label="Close bulk scheduler"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-5 py-4">
        {selectedSeriesForScheduler ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setSelectedSeriesForScheduler(null)}
                className="text-[11px] font-mono text-foreground-quiet hover:text-foreground flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Back to series
              </button>
              <span className="text-xs font-semibold text-foreground">{selectedSeriesForScheduler.name}</span>
            </div>
            <EventSchedulerForm
              seriesId={selectedSeriesForScheduler.id}
              onSuccess={() => {
                setSelectedSeriesForScheduler(null);
                setShowScheduler(false);
                queryClient.invalidateQueries({ queryKey: ['events'] });
              }}
            />
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-mono text-foreground-quiet mb-3">Select a series to create events:</p>
            {series.length === 0 ? (
              <p className="text-xs text-foreground-quiet">No series found. Create a series first.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {series.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSeriesForScheduler(s)}
                    className="text-left px-3 py-2.5 rounded border border-divider hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors"
                  >
                    <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-foreground-quiet mt-0.5 truncate">{s.sanctioning_body || s.discipline || '—'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null;

  if (userLoading) return null;
  if (!user) { base44.auth.redirectToLogin(); return null; }
  if (!isAdmin) return <AdminAccessDenied />;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <RaceCoreBreadcrumb crumbs={[
        { label: 'RaceCore', href: '/racecore' },
        { label: 'Records', href: '/racecore/records/events' },
        { label: 'Events' },
      ]} noBorder />
      <RecordsPageShell
        icon={CalendarDays}
        title="Event Records"
        stats={stats}
        isLoading={isLoading}
        actions={headerActions}
        filterRail={filterRail}
        bulkBar={bulkBar}
        panel={schedulerPanel}
      >
        <RecordGrid
          isLoading={isLoading}
          isEmpty={filteredEvents.length === 0}
          emptyIcon={CalendarDays}
          emptyMessage={hasActiveFilters ? 'No events match filters' : 'No events found'}
          emptyAction={hasActiveFilters && (
            <button onClick={clearFilters} className="text-[11px] font-mono text-motion hover:text-motion-hover underline">
              Clear filters
            </button>
          )}
          columns={GRID_COLUMNS}
          showSelectAll={isAdmin}
          allSelected={selectedEvents.length === filteredEvents.length && filteredEvents.length > 0}
          onSelectAll={handleSelectAll}
        >
          {filteredEvents.map(event => (
            <EventRecordRow
              key={event.id}
              event={event}
              isAdmin={isAdmin}
              isSelected={selectedEvents.includes(event.id)}
              onSelect={handleSelectEvent}
              onDelete={handleDelete}
              isDeleting={deletingEventId === event.id}
            />
          ))}
        </RecordGrid>

        {showActivity && (
          <RecordActivityRail entityName="Event" onClose={() => setShowActivity(false)} overlayOnMobile />
        )}
      </RecordsPageShell>

      {/* Quick-add dialog */}
      <QuickAddEntityDialog
        entityType="Event"
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
      />

      {/* Single delete confirm (AlertDialog) */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{eventToDelete?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm (AlertDialog) */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedEvents.length} event(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedEvents.length} selected events</strong>? This action cannot be undone.
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