import React, { useState, useMemo, useEffect } from 'react';
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { Plus, Download, Eye, Trash2, LogOut, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import useDashboardMutation from './useDashboardMutation';
import ImportEntriesModal from './entries/ImportEntriesModal';
import DriverSelfServiceDrawer from './shared/DriverSelfServiceDrawer';

const DQ = applyDefaultQueryOptions();

// ── Status badge colors ────────────────────────────────────────────────────────
function entryStatusColor(status) {
  switch (status) {
    case 'Checked In': return 'bg-green-500/20 text-green-400';
    case 'Teched': return 'bg-purple-500/20 text-purple-400';
    case 'Withdrawn': return 'bg-gray-500/20 text-gray-400';
    default: return 'bg-blue-500/20 text-blue-400';
  }
}
function paymentStatusColor(status) {
  return status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';
}
function techStatusColor(status) {
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
  invalidateAfterOperation: invalidateAfterOperationProp,
}) {
  const queryClient = useQueryClient();
  const invalidateAfterOperation = invalidateAfterOperationProp ?? buildInvalidateAfterOperation(queryClient);

  const [searchParams] = useSearchParams();

  // ── UI state ──
  const [filters, setFilters] = useState({ class: 'all', entryStatus: 'all', paymentStatus: 'all', search: '' });
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showSelfService, setShowSelfService] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [addForm, setAddForm] = useState({});
  const [drawerForm, setDrawerForm] = useState({});
  const [showBulkTransponderModal, setShowBulkTransponderModal] = useState(false);
  const [bulkTransponderInput, setBulkTransponderInput] = useState('');
  const [showBulkClassModal, setShowBulkClassModal] = useState(false);
  const [bulkClassId, setBulkClassId] = useState('');

  // ── Queries ──
  const { data: entries = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('first_name', 500),
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name', 200),
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses', seriesId],
    queryFn: () => seriesId ? base44.entities.SeriesClass.filter({ series_id: seriesId }) : Promise.resolve([]),
    enabled: !!seriesId,
    ...DQ,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    ...DQ,
  });

  // ── Mutations ──
  const sharedOpts = {
    invalidateAfterOperation,
    dashboardContext: dashboardContext ?? { eventId },
    selectedEvent: selectedEvent ?? null,
  };

  const { mutateAsync: createEntry, isPending: creatingEntry } = useDashboardMutation({
    operationType: 'entry_created',
    entityName: 'Entry',
    mutationFn: (data) => base44.entities.Entry.create(data),
    successMessage: 'Entry created',
    ...sharedOpts,
  });

  const { mutateAsync: updateEntry, isPending: updatingEntry } = useDashboardMutation({
    operationType: 'entry_updated',
    entityName: 'Entry',
    mutationFn: ({ id, data }) => base44.entities.Entry.update(id, data),
    successMessage: 'Entry updated',
    ...sharedOpts,
  });

  const { mutateAsync: deleteEntry } = useDashboardMutation({
    operationType: 'entry_deleted',
    entityName: 'Entry',
    mutationFn: (id) => base44.entities.Entry.delete(id),
    successMessage: 'Entry deleted',
    ...sharedOpts,
  });

  const { mutateAsync: bulkUpdateEntries, isPending: bulkUpdating } = useDashboardMutation({
    operationType: 'entry_updated',
    entityName: 'Entry',
    mutationFn: (updates) => Promise.all(updates.map((u) => base44.entities.Entry.update(u.id, u.data))),
    successMessage: 'Bulk update complete',
    ...sharedOpts,
  });

  // ── Reset on event change ──
  useEffect(() => {
    setSelectedEntries(new Set());
    setShowAddDialog(false);
    setShowDetailDrawer(false);
    setSelectedEntry(null);
    setFilters({ class: 'all', entryStatus: 'all', paymentStatus: 'all', search: '' });
  }, [eventId]);

  // ── Sync filters from URL params ──
  useEffect(() => {
    const classId = searchParams.get('classId');
    const payment = searchParams.get('payment');
    const checkin = searchParams.get('checkin');
    const tech = searchParams.get('tech');

    if (!classId && !payment && !checkin && !tech) return;

    setFilters((prev) => {
      const next = { ...prev };
      if (classId) next.class = classId; // classId maps to series_class_id or 'unassigned'
      if (payment === 'paid') next.paymentStatus = 'Paid';
      else if (payment === 'unpaid') next.paymentStatus = 'Unpaid';
      if (checkin === 'checkedin') next.entryStatus = 'Checked In';
      else if (checkin === 'notcheckedin') next.entryStatus = 'Registered';
      // tech filter is handled separately below
      return next;
    });
  }, [searchParams]);

  // ── Lookups ──
  const getDriverName = (driverId) => {
    const d = drivers.find((x) => x.id === driverId);
    return d ? `${d.first_name} ${d.last_name}` : '—';
  };
  const getDriver = (driverId) => drivers.find((x) => x.id === driverId);
  const getClassName = (entry) => {
    if (entry.series_class_id) {
      const sc = seriesClasses.find((c) => c.id === entry.series_class_id);
      return sc?.class_name || entry.series_class_id;
    }
    return '—';
  };
  const hasFlags = (entry) => !!(entry.flags && entry.flags.trim().length > 0);

  // ── Filtering ──
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filters.class !== 'all' && getClassName(entry) !== filters.class) return false;
      if (filters.entryStatus !== 'all' && entry.entry_status !== filters.entryStatus) return false;
      if (filters.paymentStatus !== 'all' && entry.payment_status !== filters.paymentStatus) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const name = getDriverName(entry.driver_id).toLowerCase();
        const car = (entry.car_number || '').toLowerCase();
        const transponder = (entry.transponder_id || '').toLowerCase();
        if (!name.includes(s) && !car.includes(s) && !transponder.includes(s)) return false;
      }
      return true;
    });
  }, [entries, filters, drivers, seriesClasses]);

  const uniqueClasses = useMemo(() => {
    const s = new Set();
    entries.forEach((e) => { const c = getClassName(e); if (c !== '—') s.add(c); });
    return Array.from(s).sort();
  }, [entries, seriesClasses]);

  // ── Handlers ──
  const handleOpenDetail = (entry) => {
    setSelectedEntry(entry);
    setDrawerForm({ ...entry });
    setShowDetailDrawer(true);
  };

  const handleSaveEntry = async () => {
    await updateEntry({ id: selectedEntry.id, data: drawerForm });
    setShowDetailDrawer(false);
  };

  const handleAddEntry = async () => {
    if (!addForm.driver_id) { toast.error('Driver required'); return; }
    if (entries.some((e) => e.driver_id === addForm.driver_id)) {
      toast.error('Driver already entered for this event'); return;
    }
    await createEntry({
      event_id: eventId,
      series_id: selectedEvent?.series_id,
      driver_id: addForm.driver_id,
      team_id: addForm.team_id || undefined,
      series_class_id: addForm.series_class_id || undefined,
      car_number: addForm.car_number || undefined,
      transponder_id: addForm.transponder_id || undefined,
      entry_status: 'Registered',
      payment_status: 'Unpaid',
      tech_status: 'Not Inspected',
      waiver_verified: false,
    });
    setShowAddDialog(false);
    setAddForm({});
  };

  const handleBulkWithdraw = async () => {
    const updates = Array.from(selectedEntries).map((id) => ({ id, data: { entry_status: 'Withdrawn' } }));
    await bulkUpdateEntries(updates);
    setSelectedEntries(new Set());
  };

  const handleBulkClass = async () => {
    if (!bulkClassId) { toast.error('Select a class'); return; }
    const updates = Array.from(selectedEntries).map((id) => ({ id, data: { series_class_id: bulkClassId } }));
    await bulkUpdateEntries(updates);
    setShowBulkClassModal(false);
    setBulkClassId('');
    setSelectedEntries(new Set());
  };

  const handleBulkAssignTransponders = async () => {
    if (!bulkTransponderInput.trim()) { toast.error('Enter a starting value'); return; }
    const isNumeric = /^\d+$/.test(bulkTransponderInput.trim());
    const selectedList = Array.from(selectedEntries).map((id) => entries.find((e) => e.id === id)).filter(Boolean);
    const updates = selectedList.map((e, idx) => ({
      id: e.id,
      data: { transponder_id: isNumeric ? String(parseInt(bulkTransponderInput) + idx) : bulkTransponderInput.trim() },
    }));
    await bulkUpdateEntries(updates);
    setShowBulkTransponderModal(false);
    setBulkTransponderInput('');
    setSelectedEntries(new Set());
  };

  const handleExportCSV = () => {
    const headers = ['car_number', 'driver_name', 'class', 'transponder_id', 'entry_status', 'payment_status', 'tech_status', 'flags', 'notes'];
    const rows = filteredEntries.map((e) => [
      e.car_number || '',
      getDriverName(e.driver_id),
      getClassName(e),
      e.transponder_id || '',
      e.entry_status,
      e.payment_status,
      e.tech_status,
      e.flags || '',
      e.notes || '',
    ]);
    downloadCSV([headers, ...rows], `entries-${eventId}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // ── Empty / loading states ──
  if (!eventId) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to manage entries</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-11 bg-gray-800/50 rounded animate-pulse" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center space-y-3">
          <p className="text-red-400 text-sm">Failed to load entries</p>
          <Button size="sm" variant="outline" onClick={refetch} className="border-gray-700 text-gray-300">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const hasBulk = selectedEntries.size > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Entries</h2>
          <p className="text-sm text-gray-400 mt-1">Showing {filteredEntries.length} of {entries.length}</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button onClick={() => setShowImportModal(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white" size="sm">Import CSV</Button>
          <Button onClick={() => setShowSelfService(true)} className="bg-purple-600 hover:bg-purple-700 text-white" size="sm">My Registration</Button>
          <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add Entry
          </Button>
          <Button onClick={handleExportCSV} variant="outline" className="border-gray-700 text-gray-300" size="sm">
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Class</label>
            <Select value={filters.class} onValueChange={(v) => setFilters({ ...filters, class: v })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Entry Status</label>
            <Select value={filters.entryStatus} onValueChange={(v) => setFilters({ ...filters, entryStatus: v })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Registered">Registered</SelectItem>
                <SelectItem value="Checked In">Checked In</SelectItem>
                <SelectItem value="Teched">Teched</SelectItem>
                <SelectItem value="Withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Payment</label>
            <Select value={filters.paymentStatus} onValueChange={(v) => setFilters({ ...filters, paymentStatus: v })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Search</label>
            <Input
              placeholder="Driver, car #, transponder"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {hasBulk && (
        <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-blue-300">{selectedEntries.size} selected</p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowBulkTransponderModal(true)} size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white">Assign Transponders</Button>
            {seriesClasses.length > 0 && (
              <Button onClick={() => setShowBulkClassModal(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">Change Class</Button>
            )}
            <Button onClick={handleBulkWithdraw} size="sm" variant="outline" className="border-red-700 text-red-400">Withdraw</Button>
            <Button onClick={() => setSelectedEntries(new Set())} size="sm" variant="ghost" className="text-gray-400">Clear</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {filteredEntries.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <p className="text-gray-400 text-sm mb-4">No entries yet</p>
            <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#171717] border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEntries.size === filteredEntries.length && filteredEntries.length > 0}
                      onChange={(e) => setSelectedEntries(e.target.checked ? new Set(filteredEntries.map((e) => e.id)) : new Set())}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-gray-400 font-semibold">Car #</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-semibold">Driver</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-semibold">Class</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-semibold">Transponder</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-semibold">Entry</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-semibold">Payment</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-semibold">Tech</th>
                  <th className="px-3 py-2 text-left text-gray-400 font-semibold">Flags</th>
                  <th className="px-3 py-2 text-right text-gray-400 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-gray-800 ${hasFlags(entry) ? 'bg-yellow-900/10' : 'hover:bg-gray-800/30'}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={(e) => {
                          const s = new Set(selectedEntries);
                          e.target.checked ? s.add(entry.id) : s.delete(entry.id);
                          setSelectedEntries(s);
                        }}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-3 py-2 text-white font-mono text-xs">{entry.car_number || '—'}</td>
                    <td className="px-3 py-2 text-white">{getDriverName(entry.driver_id)}</td>
                    <td className="px-3 py-2 text-gray-300 text-xs">{getClassName(entry)}</td>
                    <td className="px-3 py-2 text-gray-300 text-xs font-mono">{entry.transponder_id || '—'}</td>
                    <td className="px-3 py-2">
                      <Badge className={`text-xs ${entryStatusColor(entry.entry_status)}`}>{entry.entry_status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={`text-xs ${paymentStatusColor(entry.payment_status)}`}>{entry.payment_status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={`text-xs ${techStatusColor(entry.tech_status)}`}>{entry.tech_status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {entry.flags ? (
                        <div className="flex gap-1 flex-wrap">
                          {entry.flags.split(',').slice(0, 2).map((f) => (
                            <Badge key={f} variant="outline" className="text-xs text-yellow-400 border-yellow-600">{f.trim()}</Badge>
                          ))}
                          {entry.flags.split(',').length > 2 && (
                            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-600">+{entry.flags.split(',').length - 2}</Badge>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button onClick={() => handleOpenDetail(entry)} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#262626] border-gray-700">
          <DialogHeader><DialogTitle className="text-white">Add Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Driver *</label>
              <Select value={addForm.driver_id || ''} onValueChange={(v) => setAddForm({ ...addForm, driver_id: v })}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue placeholder="Select driver..." /></SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700 max-h-64">
                  {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {teams.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Team</label>
                <Select value={addForm.team_id || ''} onValueChange={(v) => setAddForm({ ...addForm, team_id: v })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value={null}>None</SelectItem>
                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {seriesClasses.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Class</label>
                <Select value={addForm.series_class_id || ''} onValueChange={(v) => setAddForm({ ...addForm, series_class_id: v })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue placeholder="Select class..." /></SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {seriesClasses.map((sc) => <SelectItem key={sc.id} value={sc.id}>{sc.class_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Car #</label>
              <Input value={addForm.car_number || ''} onChange={(e) => setAddForm({ ...addForm, car_number: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="e.g. 42" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Transponder ID</label>
              <Input value={addForm.transponder_id || ''} onChange={(e) => setAddForm({ ...addForm, transponder_id: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button onClick={handleAddEntry} disabled={creatingEntry} className="bg-blue-600 hover:bg-blue-700">
              {creatingEntry ? 'Creating...' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entry Detail Drawer */}
      {selectedEntry && (
        <Sheet open={showDetailDrawer} onOpenChange={setShowDetailDrawer}>
          <SheetContent side="right" className="bg-[#262626] border-gray-700 w-full sm:w-[420px] overflow-y-auto">
            <SheetHeader><SheetTitle className="text-white">Entry Details</SheetTitle></SheetHeader>
            <div className="space-y-5 mt-6">
              {/* Driver link */}
              <div className="bg-gray-800/30 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">Driver</p>
                {(() => {
                  const driver = getDriver(selectedEntry.driver_id);
                  const href = createPageUrl(`DriverProfile?${driver?.slug ? `slug=${driver.slug}` : `id=${selectedEntry.driver_id}`}`);
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-medium flex items-center gap-1">
                      {getDriverName(selectedEntry.driver_id)} <ExternalLink className="w-3 h-3" />
                    </a>
                  );
                })()}
              </div>

              {/* Car & Transponder */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Car #</label>
                  <Input value={drawerForm.car_number || ''} onChange={(e) => setDrawerForm({ ...drawerForm, car_number: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Transponder ID</label>
                  <Input value={drawerForm.transponder_id || ''} onChange={(e) => setDrawerForm({ ...drawerForm, transponder_id: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Class</label>
                  {seriesClasses.length > 0 ? (
                    <Select value={drawerForm.series_class_id || ''} onValueChange={(v) => setDrawerForm({ ...drawerForm, series_class_id: v })}>
                      <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent className="bg-[#262626] border-gray-700">
                        {seriesClasses.map((sc) => <SelectItem key={sc.id} value={sc.id}>{sc.class_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-white">{getClassName(selectedEntry)}</p>
                  )}
                </div>
              </div>

              {/* Status fields */}
              <div className="space-y-3 border-t border-gray-700 pt-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Entry Status</label>
                  <Select value={drawerForm.entry_status || ''} onValueChange={(v) => setDrawerForm({ ...drawerForm, entry_status: v })}>
                    <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#262626] border-gray-700">
                      <SelectItem value="Registered">Registered</SelectItem>
                      <SelectItem value="Checked In">Checked In</SelectItem>
                      <SelectItem value="Teched">Teched</SelectItem>
                      <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Payment Status</label>
                  <Select value={drawerForm.payment_status || ''} onValueChange={(v) => setDrawerForm({ ...drawerForm, payment_status: v })}>
                    <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#262626] border-gray-700">
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Tech Status</label>
                  <Select value={drawerForm.tech_status || ''} onValueChange={(v) => setDrawerForm({ ...drawerForm, tech_status: v })}>
                    <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#262626] border-gray-700">
                      <SelectItem value="Not Inspected">Not Inspected</SelectItem>
                      <SelectItem value="Passed">Passed</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                      <SelectItem value="Recheck Required">Recheck Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Flags (comma-separated)</label>
                  <Input value={drawerForm.flags || ''} onChange={(e) => setDrawerForm({ ...drawerForm, flags: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" placeholder="e.g. missing_transponder, waiver_missing" />
                </div>
              </div>

              {/* Notes */}
              <div className="border-t border-gray-700 pt-4">
                <label className="text-xs text-gray-400 block mb-1">Notes</label>
                <Textarea value={drawerForm.notes || ''} onChange={(e) => setDrawerForm({ ...drawerForm, notes: e.target.value })} className="bg-[#1A1A1A] border-gray-600 text-white" rows={4} />
              </div>
            </div>

            <SheetFooter className="mt-6 flex gap-2 justify-between">
              <Button onClick={() => setShowDeleteConfirm(selectedEntry.id)} variant="ghost" className="text-red-400 hover:bg-red-900/20" size="sm">
                <Trash2 className="w-4 h-4" />
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => { updateEntry({ id: selectedEntry.id, data: { entry_status: 'Withdrawn' } }); setShowDetailDrawer(false); }}
                  variant="outline" className="border-yellow-700 text-yellow-400" size="sm"
                >
                  <LogOut className="w-4 h-4 mr-1" /> Withdraw
                </Button>
                <Button onClick={handleSaveEntry} disabled={updatingEntry} className="bg-blue-600 hover:bg-blue-700" size="sm">
                  <Check className="w-4 h-4 mr-1" /> Save
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <AlertDialogContent className="bg-[#262626] border-gray-700">
          <AlertDialogTitle className="text-white">Delete Entry</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">This will permanently delete this entry. Cannot be undone.</AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteEntry(showDeleteConfirm).then(() => { setShowDeleteConfirm(null); setShowDetailDrawer(false); })} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Transponder Modal */}
      <Dialog open={showBulkTransponderModal} onOpenChange={setShowBulkTransponderModal}>
        <DialogContent className="bg-[#262626] border-gray-700">
          <DialogHeader><DialogTitle className="text-white">Bulk Assign Transponders</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-gray-400">If numeric, auto-increments per entry. Otherwise applies as-is to all.</p>
            <Input
              placeholder="e.g. 1000 or TR-001"
              value={bulkTransponderInput}
              onChange={(e) => setBulkTransponderInput(e.target.value)}
              className="bg-[#1A1A1A] border-gray-600 text-white"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkTransponderModal(false)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button onClick={handleBulkAssignTransponders} disabled={bulkUpdating} className="bg-cyan-600 hover:bg-cyan-700">
              Assign {selectedEntries.size} Transponders
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Class Modal */}
      <Dialog open={showBulkClassModal} onOpenChange={setShowBulkClassModal}>
        <DialogContent className="bg-[#262626] border-gray-700">
          <DialogHeader><DialogTitle className="text-white">Change Class</DialogTitle></DialogHeader>
          <div>
            <label className="text-xs text-gray-400 block mb-2">Select new class for {selectedEntries.size} entries</label>
            <Select value={bulkClassId} onValueChange={setBulkClassId}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white"><SelectValue placeholder="Select class..." /></SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                {seriesClasses.map((sc) => <SelectItem key={sc.id} value={sc.id}>{sc.class_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkClassModal(false)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button onClick={handleBulkClass} disabled={bulkUpdating} className="bg-indigo-600 hover:bg-indigo-700">Apply</Button>
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