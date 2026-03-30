import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Download } from 'lucide-react';
import { toast } from 'sonner';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import useDashboardMutation from './useDashboardMutation';
import ImportEntriesModal from './entries/ImportEntriesModal';
import DriverSelfServiceDrawer from './shared/DriverSelfServiceDrawer';
import EntryDetailDrawer from './EntryDetailDrawer';
import EntryCreateDrawer from './EntryCreateDrawer';
import EntryEditDrawer from './EntryEditDrawer';
import { useEntriesData } from './useEntriesData';
import {
  DEFAULT_FILTERS,
  filtersFromParams,
  applyFiltersToParams,
  applyFilters,
  rowNeedsAttention,
} from './entriesFilters';
import { buildEntryPayload, getEntryFieldValue } from './entryFieldSupport';

// ── Badge helpers ─────────────────────────────────────────────────────────────
function entryStatusBadge(status) {
  switch (status) {
    case 'Checked In': return 'bg-green-500/20 text-green-400';
    case 'Teched': return 'bg-purple-500/20 text-purple-400';
    case 'Withdrawn': return 'bg-gray-500/20 text-gray-400';
    default: return 'bg-blue-500/20 text-blue-400';
  }
}
function paymentBadge(status) {
  return status === 'Paid' ? 'bg-green-500/20 text-green-400'
    : status === 'Refunded' ? 'bg-yellow-500/20 text-yellow-400'
    : 'bg-red-500/20 text-red-400';
}
function techBadge(status) {
  if (status === 'Passed') return 'bg-green-500/20 text-green-400';
  if (status === 'Failed' || status === 'Recheck Required') return 'bg-red-500/20 text-red-400';
  return 'bg-gray-500/20 text-gray-400';
}

// ── CSV export ─────────────────────────────────────────────────────────────────
function downloadCSV(rows, filename) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  URL.revokeObjectURL(url); a.remove();
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function EntriesManager({
  eventId,
  seriesId,
  selectedEvent,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation: invalidateAfterOperationProp,
}) {
  const queryClient = useQueryClient();
  const invalidateAfterOperation = invalidateAfterOperationProp ?? buildInvalidateAfterOperation(queryClient);
  const canEdit = dashboardPermissions
    ? ['admin', 'entity_owner', 'entity_editor'].includes(dashboardPermissions.role)
    : true;
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState(() => filtersFromParams(searchParams));

  useEffect(() => {
    setFilters(filtersFromParams(searchParams));
  }, [searchParams.toString()]);

  const updateFilters = useCallback((partial) => {
    setFilters((prev) => {
      const next = { ...prev, ...partial };
      setSearchParams(applyFiltersToParams(searchParams, next), { replace: true });
      return next;
    });
  }, [searchParams, setSearchParams]);

  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [editingEntry, setEditingEntry] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showSelfService, setShowSelfService] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showBulkTransponderModal, setShowBulkTransponderModal] = useState(false);
  const [bulkTransponderInput, setBulkTransponderInput] = useState('');
  const [showBulkClassModal, setShowBulkClassModal] = useState(false);
  const [bulkClassId, setBulkClassId] = useState('');

  const {
    entries = [],
    drivers = [],
    teams = [],
    classes: seriesClasses = [],
    isLoading,
    refetchAll,
    entryEntityError,
  } = useEntriesData({
    selectedEventId: eventId,
    seriesId,
    enabled: !!eventId,
  });

  const driversMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const classesMap = useMemo(() => Object.fromEntries(seriesClasses.map((c) => [c.id, c])), [seriesClasses]);

  const getDriverName = (id) => {
    const d = driversMap[id];
    return d ? `${d.first_name} ${d.last_name}` : '—';
  };
  const getClassName = (entry) => {
    if (entry.series_class_id) return classesMap[entry.series_class_id]?.class_name || entry.series_class_id;
    return '—';
  };

  const filteredEntries = useMemo(
    () => applyFilters(entries, filters, driversMap),
    [entries, filters, driversMap]
  );

  const sharedOpts = {
    invalidateAfterOperation,
    dashboardContext: dashboardContext ?? { eventId },
    selectedEvent: selectedEvent ?? null,
  };

  const { mutateAsync: createEntry, isPending: creatingEntry } = useDashboardMutation({
    operationType: 'entry_created', entityName: 'Entry',
    mutationFn: (data) => base44.entities.Entry.create(data),
    successMessage: 'Entry created', ...sharedOpts,
  });

  const { mutateAsync: updateEntry, isPending: updatingEntry } = useDashboardMutation({
    operationType: 'entry_updated', entityName: 'Entry',
    mutationFn: ({ id, data }) => base44.entities.Entry.update(id, data),
    successMessage: 'Entry updated', ...sharedOpts,
  });

  const { mutateAsync: deleteEntry } = useDashboardMutation({
    operationType: 'entry_deleted', entityName: 'Entry',
    mutationFn: (id) => base44.entities.Entry.delete(id),
    successMessage: 'Entry deleted', ...sharedOpts,
  });

  const { mutateAsync: bulkUpdateEntries, isPending: bulkUpdating } = useDashboardMutation({
    operationType: 'entry_bulk_updated', entityName: 'Entry',
    mutationFn: (updates) => Promise.all(updates.map((u) => base44.entities.Entry.update(u.id, u.data))),
    successMessage: 'Bulk update complete', ...sharedOpts,
  });

  useEffect(() => {
    setSelectedEntries(new Set());
    setEditingEntry(null);
  }, [eventId]);

  const stats = useMemo(() => ({
    total: entries.length,
    registered: entries.filter((e) => e.entry_status === 'Registered').length,
    checkedIn: entries.filter((e) => e.entry_status === 'Checked In').length,
    teched: entries.filter((e) => e.entry_status === 'Teched').length,
    unpaid: entries.filter((e) => e.payment_status === 'Unpaid').length,
    noTransponder: entries.filter((e) => !e.transponder_id).length,
  }), [entries]);

  const handleSaveEntry = async (id, data) => {
    await updateEntry({ id, data });
    setEditingEntry(null);
    setDetailEntry(null);
  };

  const handleDeleteEntry = async (id) => {
    await deleteEntry(id);
    setDetailEntry(null);
    setEditingEntry(null);
    setShowDeleteConfirm(null);
  };

  const handleEntryCreated = async () => {
    setShowCreateDrawer(false);
    refetchAll();
    invalidateAfterOperation('entry_created', { eventId });
  };

  const handleEntryUpdated = async () => {
    setEditingEntry(null);
    refetchAll();
    invalidateAfterOperation('entry_updated', { eventId });
  };

  const handleBulkWithdraw = async () => {
    const updates = Array.from(selectedEntries).map((id) => ({ id, data: { entry_status: 'Withdrawn' } }));
    await bulkUpdateEntries(updates);
    setSelectedEntries(new Set());
    refetchAll();
    invalidateAfterOperation('entry_bulk_withdraw', { eventId });
  };

  const handleBulkClass = async () => {
    if (!bulkClassId) { toast.error('Select a class'); return; }
    const updates = Array.from(selectedEntries).map((id) => ({ id, data: { series_class_id: bulkClassId } }));
    await bulkUpdateEntries(updates);
    setShowBulkClassModal(false);
    setBulkClassId('');
    setSelectedEntries(new Set());
    refetchAll();
    invalidateAfterOperation('entry_bulk_class_change', { eventId });
  };

  const handleBulkTransponders = async () => {
    const lines = bulkTransponderInput.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { toast.error('Enter at least one transponder ID'); return; }
    const selectedList = Array.from(selectedEntries)
      .map((id) => entries.find((e) => e.id === id))
      .filter(Boolean)
      .sort((a, b) => {
        const na = parseInt(a.car_number) || 0;
        const nb = parseInt(b.car_number) || 0;
        return na - nb || (a.car_number || '').localeCompare(b.car_number || '');
      });
    const updates = selectedList.map((e, idx) => ({
      id: e.id,
      data: { transponder_id: lines[idx] || lines[lines.length - 1] },
    }));
    await bulkUpdateEntries(updates);
    setShowBulkTransponderModal(false);
    setBulkTransponderInput('');
    setSelectedEntries(new Set());
    refetchAll();
    invalidateAfterOperation('entry_bulk_transponder', { eventId });
  };

  const handleExportCSV = () => {
    const headers = ['entry_id', 'event_id', 'driver_id', 'team_id', 'series_id', 'series_class_id', 'car_number', 'transponder_id', 'entry_status', 'payment_status', 'tech_status', 'notes'];
    const rows = filteredEntries.map((e) => [
      e.id, e.event_id, e.driver_id, e.team_id || '', e.series_id || '',
      e.series_class_id || '', e.car_number || '', e.transponder_id || '',
      e.entry_status || '', e.payment_status || '', e.tech_status || '', e.notes || '',
    ]);
    const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
    downloadCSV([headers, ...rows], `entries-${eventId}-${ts}.csv`);
  };

  if (!eventId) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select a Track or Series, Season, and Event to manage entries</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-800/40 rounded animate-pulse" />)}
      </div>
    );
  }

  if (entryEntityError) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-red-400 text-sm">{entryEntityError}</p>
        </CardContent>
      </Card>
    );
  }

  const hasBulk = selectedEntries.size > 0;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-3 grid grid-cols-2 md:grid-cols-6 gap-2">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Registered', value: stats.registered, color: 'text-blue-400' },
          { label: 'Checked In', value: stats.checkedIn, color: 'text-green-400' },
          { label: 'Teched', value: stats.teched, color: 'text-purple-400' },
          { label: 'Unpaid', value: stats.unpaid, color: 'text-yellow-400' },
          { label: 'No Transponder', value: stats.noTransponder, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Entries</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {filteredEntries.length} of {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
            {stats.unpaid > 0 && <span className="text-amber-400 ml-2">· {stats.unpaid} unpaid</span>}
            {stats.noTransponder > 0 && <span className="text-red-400 ml-2">· {stats.noTransponder} missing transponder</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {canEdit && (
            <Button onClick={() => setShowImportModal(true)} size="sm" className="bg-cyan-700 hover:bg-cyan-600 text-white">Import CSV</Button>
          )}
          {canEdit && (
            <Button onClick={() => setShowSelfService(true)} size="sm" className="bg-purple-700 hover:bg-purple-600 text-white">My Registration</Button>
          )}
          {canEdit && (
            <Button onClick={() => setShowCreateDrawer(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Entry
            </Button>
          )}
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="border-gray-700 text-gray-300">
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Class</label>
            <Select value={filters.classId} onValueChange={(v) => updateFilters({ classId: v })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All Classes</SelectItem>
                {seriesClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Status</label>
            <Select value={filters.status} onValueChange={(v) => updateFilters({ status: v })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="checkedin">Checked In</SelectItem>
                <SelectItem value="teched">Teched</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Payment</label>
            <Select value={filters.payment} onValueChange={(v) => updateFilters({ payment: v })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <label className="text-xs text-gray-400 block mb-1">Search</label>
            <Input
              placeholder="Driver, car #, transponder…"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {hasBulk && (
        <div className="bg-blue-950/30 border border-blue-800/50 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-blue-300">{selectedEntries.size} selected</p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowBulkTransponderModal(true)} size="sm" className="bg-cyan-700 hover:bg-cyan-600 text-white">Assign Transponders</Button>
            {seriesClasses.length > 0 && (
              <Button onClick={() => setShowBulkClassModal(true)} size="sm" className="bg-indigo-700 hover:bg-indigo-600 text-white">Change Class</Button>
            )}
            <Button onClick={handleBulkWithdraw} size="sm" variant="outline" className="border-red-700 text-red-400 hover:bg-red-900/20">Withdraw</Button>
            <Button onClick={handleExportCSV} size="sm" variant="outline" className="border-gray-600 text-gray-300">
              <Download className="w-4 h-4 mr-1" /> Export Selected
            </Button>
            <Button onClick={() => setSelectedEntries(new Set())} size="sm" variant="ghost" className="text-gray-500">Clear</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {filteredEntries.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <p className="text-gray-400 text-sm mb-4">
              {entries.length === 0 ? 'No entries yet for this event.' : 'No entries match the current filters.'}
            </p>
            {entries.length === 0 && (
              <Button onClick={() => setShowCreateDrawer(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Add First Entry
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#171717] border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/60 border-b border-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selectedEntries.size === filteredEntries.length && filteredEntries.length > 0}
                      onChange={(e) =>
                        setSelectedEntries(e.target.checked ? new Set(filteredEntries.map((e) => e.id)) : new Set())
                      }
                      className="w-4 h-4 accent-blue-500"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Car #</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Driver</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Class</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Transponder</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Entry</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Payment</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Tech</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Flags</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setEditingEntry(entry)}
                    className={`border-b border-gray-800 cursor-pointer transition-colors ${
                      rowNeedsAttention(entry) ? 'bg-amber-950/20 hover:bg-amber-950/30' : 'hover:bg-gray-800/40'
                    }`}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={(e) => {
                          const s = new Set(selectedEntries);
                          e.target.checked ? s.add(entry.id) : s.delete(entry.id);
                          setSelectedEntries(s);
                        }}
                        className="w-4 h-4 accent-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-white font-mono text-xs">{entry.car_number || '—'}</td>
                    <td className="px-3 py-2 text-white text-xs">{getDriverName(entry.driver_id)}</td>
                    <td className="px-3 py-2 text-gray-300 text-xs">{getClassName(entry)}</td>
                    <td className={`px-3 py-2 font-mono text-xs ${!entry.transponder_id ? 'text-red-400' : 'text-gray-300'}`}>
                      {entry.transponder_id || '⚠ missing'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={`text-xs ${entryStatusBadge(entry.entry_status)}`}>{entry.entry_status || '—'}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={`text-xs ${paymentBadge(entry.payment_status)}`}>{entry.payment_status || 'Unpaid'}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={`text-xs ${techBadge(entry.tech_status)}`}>{entry.tech_status || '—'}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {entry.flags ? (
                        <div className="flex gap-1 flex-wrap">
                          {entry.flags.split(',').slice(0, 2).map((f) => (
                            <Badge key={f} variant="outline" className="text-xs text-yellow-400 border-yellow-700">{f.trim()}</Badge>
                          ))}
                          {entry.flags.split(',').length > 2 && (
                            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-700">+{entry.flags.split(',').length - 2}</Badge>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Drawers */}
      <EntryCreateDrawer
        open={showCreateDrawer}
        onOpenChange={setShowCreateDrawer}
        selectedEvent={selectedEvent}
        drivers={drivers}
        teams={teams}
        classes={seriesClasses}
        onCreated={handleEntryCreated}
      />
      <EntryEditDrawer
        open={!!editingEntry}
        onOpenChange={(open) => { if (!open) setEditingEntry(null); }}
        entry={editingEntry}
        drivers={drivers}
        teams={teams}
        classes={seriesClasses}
        onUpdated={handleEntryUpdated}
      />

      {/* Bulk Transponder Modal */}
      <Dialog open={showBulkTransponderModal} onOpenChange={setShowBulkTransponderModal}>
        <DialogContent className="bg-[#262626] border-gray-700">
          <DialogHeader><DialogTitle className="text-white">Assign Transponders ({selectedEntries.size} entries)</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-gray-400">
              Paste one transponder ID per line. Assigned sequentially to selected entries sorted by car number.
            </p>
            <Textarea
              placeholder={"1001\n1002\n1003"}
              value={bulkTransponderInput}
              onChange={(e) => setBulkTransponderInput(e.target.value)}
              className="bg-[#1A1A1A] border-gray-600 text-white font-mono text-xs"
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkTransponderModal(false)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button onClick={handleBulkTransponders} disabled={bulkUpdating} className="bg-cyan-700 hover:bg-cyan-600">
              {bulkUpdating ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Class Modal */}
      <Dialog open={showBulkClassModal} onOpenChange={setShowBulkClassModal}>
        <DialogContent className="bg-[#262626] border-gray-700">
          <DialogHeader><DialogTitle className="text-white">Change Class ({selectedEntries.size} entries)</DialogTitle></DialogHeader>
          <div>
            <label className="text-xs text-gray-400 block mb-2">Select new class</label>
            <Select value={bulkClassId} onValueChange={setBulkClassId}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue placeholder="Select class…" /></SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                {seriesClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkClassModal(false)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button onClick={handleBulkClass} disabled={bulkUpdating || !seriesClasses.length} className="bg-indigo-700 hover:bg-indigo-600">
              {bulkUpdating ? 'Applying…' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <ImportEntriesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        selectedEvent={selectedEvent}
        invalidateAfterOperation={invalidateAfterOperation}
        existingEntries={entries}
      />

      {/* Self Service Drawer */}
      <DriverSelfServiceDrawer
        open={showSelfService}
        onOpenChange={setShowSelfService}
        selectedEvent={selectedEvent}
        dashboardContext={dashboardContext}
        invalidateAfterOperation={invalidateAfterOperation}
      />
    </div>
  );
}