import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Plus,
  Download,
  Eye,
  Trash2,
  LogOut,
  X,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { QueryKeys } from '@/components/utils/queryKeys';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';

const DQ = applyDefaultQueryOptions();

export default function EntriesManager({ eventId, seriesId, selectedEvent }) {
  const queryClient = useQueryClient();
  const invalidateAfterOperation = buildInvalidateAfterOperation(queryClient);
  const tableScrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  // State
  const [filters, setFilters] = useState({
    class: 'all',
    entryStatus: 'all',
    paymentStatus: 'all',
    techStatus: 'all',
    search: '',
  });
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [addFormData, setAddFormData] = useState({});
  const [drawerFormData, setDrawerFormData] = useState({});

  // Queries
  const { data: entries = [], isLoading: entriesLoading, isError: entriesError, refetch: refetchEntries } = useQuery({
    queryKey: QueryKeys.entries.listByEvent(eventId),
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const driverIds = useMemo(() => [...new Set(entries.map((e) => e.driver_id))], [entries]);

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => base44.entities.Driver.list('first_name', 500),
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: QueryKeys.series.classes(seriesId),
    queryFn: () => (seriesId ? base44.entities.SeriesClass.filter({ series_id: seriesId }) : Promise.resolve([])),
    enabled: !!seriesId,
    ...DQ,
  });

  const { data: allDrivers = [] } = useQuery({
    queryKey: ['allDrivers'],
    queryFn: () => base44.entities.Driver.list('first_name', 200),
    ...DQ,
  });

  // Duplicate car number check (application-level uniqueness guard)
  const checkDuplicateEntry = (driverId) => {
    return entries.some((e) => e.driver_id === driverId);
  };

  // Mutations
  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.create(data),
    onSuccess: () => {
      invalidateAfterOperation('entry_created');
      setShowAddDialog(false);
      setAddFormData({});
      toast.success('Entry created');
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Entry.update(id, data),
    onSuccess: () => {
      invalidateAfterOperation('entry_updated');
      setShowDetailDrawer(false);
      toast.success('Entry updated');
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.Entry.delete(id),
    onSuccess: () => {
      invalidateAfterOperation('entry_deleted');
      setShowDeleteConfirm(null);
      toast.success('Entry deleted');
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (updates) => Promise.all(updates.map((u) => base44.entities.Entry.update(u.id, u.data))),
    onSuccess: () => {
      invalidateAfterOperation('entry_bulk_updated');
      setSelectedEntries(new Set());
      toast.success('Bulk update complete');
    },
  });

  // Helpers
  const getDriverName = (driverId) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : '—';
  };

  const getClassName = (entry) => {
    if (entry.series_class_id) {
      const sc = seriesClasses.find((c) => c.id === entry.series_class_id);
      return sc?.class_name || entry.series_class_id;
    }
    return entry.class_name || '—';
  };

  const getComplianceFlags = (entry) => {
    const flags = entry.compliance_flags || [];
    const hasFlags = [];
    if (entry.waiver_status === 'Missing') hasFlags.push('Waiver');
    if (entry.payment_status === 'Unpaid') hasFlags.push('Unpaid');
    if (entry.license_status === 'Expired') hasFlags.push('Expired');
    if (!entry.transponder_id) hasFlags.push('No Transponder');
    return [...hasFlags, ...flags];
  };

  const needsWarning = (entry) => {
    return (
      entry.waiver_status === 'Missing' ||
      entry.payment_status === 'Unpaid' ||
      entry.license_status === 'Expired' ||
      (entry.compliance_flags && entry.compliance_flags.length > 0)
    );
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Data integrity check: if event_id matches but series_id doesn't, filter it out
      if (selectedEvent && entry.event_id === selectedEvent.id && entry.series_id !== selectedEvent.series_id) {
        console.warn('Series mismatch detected for event-linked record.');
        return false;
      }

      if (filters.class !== 'all') {
        const entryClass = getClassName(entry);
        if (entryClass !== filters.class) return false;
      }

      if (filters.entryStatus !== 'all' && entry.entry_status !== filters.entryStatus) return false;
      if (filters.paymentStatus !== 'all' && entry.payment_status !== filters.paymentStatus) return false;
      if (filters.techStatus !== 'all' && entry.tech_status !== filters.techStatus) return false;

      if (filters.search) {
        const search = filters.search.toLowerCase();
        const driverName = getDriverName(entry.driver_id).toLowerCase();
        const carNum = (entry.car_number || '').toLowerCase();
        const transponder = (entry.transponder_id || '').toLowerCase();
        if (!driverName.includes(search) && !carNum.includes(search) && !transponder.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [entries, filters, drivers, seriesClasses, selectedEvent]);

  // Get unique classes for filter
  const uniqueClasses = useMemo(() => {
    const classes = new Set();
    entries.forEach((e) => {
      const className = getClassName(e);
      if (className !== '—') classes.add(className);
    });
    return Array.from(classes).sort();
  }, [entries, seriesClasses]);

  // Memoize entry-by-class grouping
  const entriesByClass = useMemo(() => {
    const grouped = {};
    entries.forEach((e) => {
      const cls = getClassName(e);
      if (!grouped[cls]) grouped[cls] = [];
      grouped[cls].push(e);
    });
    return grouped;
  }, [entries, seriesClasses]);

  // Handlers
  const handleOpenDetail = (entry) => {
    setSelectedEntry(entry);
    setDrawerFormData({ ...entry });
    setShowDetailDrawer(true);
  };

  const handleSaveEntry = () => {
    updateEntryMutation.mutate({
      id: selectedEntry.id,
      data: drawerFormData,
    });
  };

  const handleWithdrawEntry = () => {
    updateEntryMutation.mutate({
      id: selectedEntry.id,
      data: { entry_status: 'Withdrawn' },
    });
  };

  const handleAddEntry = () => {
    if (!addFormData.driver_id) {
      toast.error('Driver required');
      return;
    }

    // Application-level duplicate guard
    if (checkDuplicateEntry(addFormData.driver_id)) {
      toast.error('This driver is already entered in this event');
      return;
    }

    const data = {
      event_id: eventId,
      series_id: selectedEvent?.series_id,
      driver_id: addFormData.driver_id,
      series_class_id: addFormData.series_class_id || undefined,
      class_name: addFormData.class_name || undefined,
      car_number: addFormData.car_number || undefined,
      transponder_id: addFormData.transponder_id || undefined,
      payment_status: addFormData.payment_status || 'Unpaid',
      waiver_status: addFormData.waiver_status || 'Missing',
    };

    createEntryMutation.mutate(data);
  };

  const handleBulkAction = (action) => {
    if (selectedEntries.size === 0) return;

    const selectedList = Array.from(selectedEntries)
      .map((id) => entries.find((e) => e.id === id))
      .filter(Boolean);

    if (action === 'withdraw') {
      const updates = selectedList.map((e) => ({
        id: e.id,
        data: { entry_status: 'Withdrawn' },
      }));
      bulkUpdateMutation.mutate(updates);
    } else if (action === 'checkin') {
      const updates = selectedList.map((e) => ({
        id: e.id,
        data: { entry_status: 'Checked In' },
      }));
      bulkUpdateMutation.mutate(updates);
    } else if (action === 'teched') {
      const updates = selectedList.map((e) => ({
        id: e.id,
        data: { entry_status: 'Teched', tech_status: 'Passed' },
      }));
      bulkUpdateMutation.mutate(updates);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'event_id',
      'series_id',
      'series_class_id',
      'class_name',
      'driver_id',
      'driver_name',
      'team_id',
      'car_number',
      'transponder_id',
      'entry_status',
      'payment_status',
      'tech_status',
      'waiver_status',
      'license_status',
      'compliance_flags',
      'notes',
    ];

    const rows = filteredEntries.map((e) => [
      e.event_id,
      e.series_id || '',
      e.series_class_id || '',
      e.class_name || '',
      e.driver_id,
      getDriverName(e.driver_id),
      e.team_id || '',
      e.car_number || '',
      e.transponder_id || '',
      e.entry_status,
      e.payment_status,
      e.tech_status,
      e.waiver_status,
      e.license_status,
      (e.compliance_flags || []).join(';'),
      e.notes || '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entries-${eventId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  // Reset local UI state when eventId changes to prevent stale data bleed
  React.useEffect(() => {
    setSelectedEntries(new Set());
    setShowAddDialog(false);
    setShowDetailDrawer(false);
    setSelectedEntry(null);
    setFilters({ class: 'all', entryStatus: 'all', paymentStatus: 'all', techStatus: 'all', search: '' });
  }, [eventId]);

  if (!eventId) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to manage entries</p>
        </CardContent>
      </Card>
    );
  }

  if (entriesLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-11 bg-gray-800/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (entriesError) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center space-y-3">
          <p className="text-red-400 text-sm">Failed to load entries</p>
          <Button size="sm" variant="outline" onClick={() => refetchEntries()} className="border-gray-700 text-gray-300">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasBulkSelection = selectedEntries.size > 0;

  // Table windowing: only render rows in visible range when dataset is large
  const ROW_HEIGHT = 44; // approximate height in pixels
  const WINDOW_HEIGHT = 600;
  const BUFFER = 10; // render 10 rows above/below visible area
  const shouldWindow = filteredEntries.length > 75;
  
  let visibleStartIdx = 0;
  let visibleEndIdx = filteredEntries.length;
  
  if (shouldWindow) {
    visibleStartIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
    visibleEndIdx = Math.min(filteredEntries.length, Math.ceil((scrollTop + WINDOW_HEIGHT) / ROW_HEIGHT) + BUFFER);
  }
  
  const windowedEntries = filteredEntries.slice(visibleStartIdx, visibleEndIdx);
  const topSpacerHeight = visibleStartIdx * ROW_HEIGHT;
  const bottomSpacerHeight = (filteredEntries.length - visibleEndIdx) * ROW_HEIGHT;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Entries</h2>
          <p className="text-sm text-gray-400 mt-1">
            Showing {filteredEntries.length} of {entries.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Entry
          </Button>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-gray-700 text-gray-300"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Class</label>
            <Select value={filters.class} onValueChange={(val) => setFilters({ ...filters, class: val })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Entry Status</label>
            <Select value={filters.entryStatus} onValueChange={(val) => setFilters({ ...filters, entryStatus: val })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8">
                <SelectValue />
              </SelectTrigger>
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
            <Select value={filters.paymentStatus} onValueChange={(val) => setFilters({ ...filters, paymentStatus: val })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Tech Status</label>
            <Select value={filters.techStatus} onValueChange={(val) => setFilters({ ...filters, techStatus: val })}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Not Inspected">Not Inspected</SelectItem>
                <SelectItem value="Passed">Passed</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Recheck Required">Recheck Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Search</label>
            <Input
              placeholder="Driver, #, transponder"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {hasBulkSelection && (
        <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-blue-300">{selectedEntries.size} selected</p>
          <div className="flex gap-2">
            <Button
              onClick={() => handleBulkAction('checkin')}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Mark Checked In
            </Button>
            <Button
              onClick={() => handleBulkAction('teched')}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Mark Teched
            </Button>
            <Button
              onClick={() => handleBulkAction('withdraw')}
              size="sm"
              variant="outline"
              className="border-red-700 text-red-400"
            >
              Withdraw
            </Button>
            <Button
              onClick={() => setSelectedEntries(new Set())}
              size="sm"
              variant="ghost"
              className="text-gray-400"
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Entries Table */}
      {filteredEntries.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <p className="text-gray-400 text-sm mb-4">No entries yet</p>
            <Button
              onClick={() => setShowAddDialog(true)}
              variant="outline"
              className="border-gray-700 text-gray-300"
              size="sm"
            >
              Add Entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#171717] border-gray-800 overflow-hidden">
          <div className={shouldWindow ? `overflow-x-auto overflow-y-auto h-[${WINDOW_HEIGHT}px]` : 'overflow-x-auto'} 
               ref={tableScrollRef}
               onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
               style={shouldWindow ? { height: `${WINDOW_HEIGHT}px` } : {}}>
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50 border-b border-gray-800 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEntries.size === filteredEntries.length && filteredEntries.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEntries(new Set(filteredEntries.map((e) => e.id)));
                        } else {
                          setSelectedEntries(new Set());
                        }
                      }}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-gray-400 font-semibold">#</th>
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
                {shouldWindow && topSpacerHeight > 0 && (
                  <tr style={{ height: `${topSpacerHeight}px` }}>
                    <td colSpan="10" />
                  </tr>
                )}
                {windowedEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-gray-800 ${needsWarning(entry) ? 'bg-yellow-900/10' : 'hover:bg-gray-800/30'}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedEntries);
                          if (e.target.checked) {
                            newSet.add(entry.id);
                          } else {
                            newSet.delete(entry.id);
                          }
                          setSelectedEntries(newSet);
                        }}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-3 py-2 text-white font-mono text-xs">{entry.car_number || '—'}</td>
                    <td className="px-3 py-2 text-white">{getDriverName(entry.driver_id)}</td>
                    <td className="px-3 py-2 text-gray-300 text-xs">{getClassName(entry)}</td>
                    <td className="px-3 py-2 text-gray-300 text-xs font-mono">{entry.transponder_id || '—'}</td>
                    <td className="px-3 py-2">
                      <Badge className="bg-blue-500/20 text-blue-400 text-xs">{entry.entry_status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        className={`text-xs ${
                          entry.payment_status === 'Paid'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {entry.payment_status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className="bg-purple-500/20 text-purple-400 text-xs">{entry.tech_status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {getComplianceFlags(entry).slice(0, 2).map((flag) => (
                          <Badge key={flag} variant="outline" className="text-xs text-yellow-400 border-yellow-600">
                            {flag}
                          </Badge>
                        ))}
                        {getComplianceFlags(entry).length > 2 && (
                          <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-600">
                            +{getComplianceFlags(entry).length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        onClick={() => handleOpenDetail(entry)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {shouldWindow && bottomSpacerHeight > 0 && (
                  <tr style={{ height: `${bottomSpacerHeight}px` }}>
                    <td colSpan="10" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#262626] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Driver</label>
              <Select value={addFormData.driver_id || ''} onValueChange={(val) => setAddFormData({ ...addFormData, driver_id: val })}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                  <SelectValue placeholder="Select driver..." />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700 max-h-64">
                  {allDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {seriesClasses.length > 0 && (
              <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Class</label>
                <Select value={addFormData.series_class_id || ''} onValueChange={(val) => setAddFormData({ ...addFormData, series_class_id: val, class_name: '' })}>
                  <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                    <SelectValue placeholder="Select class..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {seriesClasses.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>
                        {sc.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Car #</label>
              <Input
                placeholder="Car number"
                value={addFormData.car_number || ''}
                onChange={(e) => setAddFormData({ ...addFormData, car_number: e.target.value })}
                className="bg-[#1A1A1A] border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Transponder ID</label>
              <Input
                placeholder="Optional"
                value={addFormData.transponder_id || ''}
                onChange={(e) => setAddFormData({ ...addFormData, transponder_id: e.target.value })}
                className="bg-[#1A1A1A] border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Payment Status</label>
              <Select value={addFormData.payment_status || 'Unpaid'} onValueChange={(val) => setAddFormData({ ...addFormData, payment_status: val })}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 uppercase block mb-1">Waiver Status</label>
              <Select value={addFormData.waiver_status || 'Missing'} onValueChange={(val) => setAddFormData({ ...addFormData, waiver_status: val })}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="Missing">Missing</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddEntry} className="bg-blue-600 hover:bg-blue-700">
              Create Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entry Detail Drawer */}
      {selectedEntry && (
        <Sheet open={showDetailDrawer} onOpenChange={setShowDetailDrawer}>
          <SheetContent side="right" className="bg-[#262626] border-gray-700 w-full sm:w-[400px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-white">Entry Details</SheetTitle>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Driver Link */}
              <div className="bg-gray-800/30 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">Driver</p>
                <a
                  href={createPageUrl(`DriverProfile?id=${selectedEntry.driver_id}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline font-medium"
                >
                  {getDriverName(selectedEntry.driver_id)} ↗
                </a>
              </div>

              {/* Core Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase block mb-1">Car #</label>
                  <Input
                    value={drawerFormData.car_number || ''}
                    onChange={(e) => setDrawerFormData({ ...drawerFormData, car_number: e.target.value })}
                    className="bg-[#1A1A1A] border-gray-600 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase block mb-1">Transponder ID</label>
                  <Input
                    value={drawerFormData.transponder_id || ''}
                    onChange={(e) => setDrawerFormData({ ...drawerFormData, transponder_id: e.target.value })}
                    className="bg-[#1A1A1A] border-gray-600 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase block mb-1">Class</label>
                  <p className="text-sm text-white">{getClassName(selectedEntry)}</p>
                </div>
              </div>

              {/* Status Fields */}
              <div className="space-y-3 border-t border-gray-700 pt-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase block mb-1">Entry Status</label>
                  <Select value={drawerFormData.entry_status} onValueChange={(val) => setDrawerFormData({ ...drawerFormData, entry_status: val })}>
                    <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#262626] border-gray-700">
                      <SelectItem value="Registered">Registered</SelectItem>
                      <SelectItem value="Checked In">Checked In</SelectItem>
                      <SelectItem value="Teched">Teched</SelectItem>
                      <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase block mb-1">Payment Status</label>
                  <Select value={drawerFormData.payment_status} onValueChange={(val) => setDrawerFormData({ ...drawerFormData, payment_status: val })}>
                    <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#262626] border-gray-700">
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase block mb-1">Tech Status</label>
                  <Select value={drawerFormData.tech_status} onValueChange={(val) => setDrawerFormData({ ...drawerFormData, tech_status: val })}>
                    <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#262626] border-gray-700">
                      <SelectItem value="Not Inspected">Not Inspected</SelectItem>
                      <SelectItem value="Passed">Passed</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                      <SelectItem value="Recheck Required">Recheck Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase block mb-1">Waiver Status</label>
                  <Select value={drawerFormData.waiver_status} onValueChange={(val) => setDrawerFormData({ ...drawerFormData, waiver_status: val })}>
                    <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#262626] border-gray-700">
                      <SelectItem value="Missing">Missing</SelectItem>
                      <SelectItem value="Verified">Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase block mb-1">License Status</label>
                  <Select value={drawerFormData.license_status || 'Unknown'} onValueChange={(val) => setDrawerFormData({ ...drawerFormData, license_status: val })}>
                    <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#262626] border-gray-700">
                      <SelectItem value="Unknown">Unknown</SelectItem>
                      <SelectItem value="Valid">Valid</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div className="border-t border-gray-700 pt-4">
                <label className="text-xs text-gray-400 uppercase block mb-1">Notes</label>
                <Textarea
                  value={drawerFormData.notes || ''}
                  onChange={(e) => setDrawerFormData({ ...drawerFormData, notes: e.target.value })}
                  className="bg-[#1A1A1A] border-gray-600 text-white"
                  rows={4}
                />
              </div>
            </div>

            <SheetFooter className="mt-6 flex gap-2 justify-between">
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowDeleteConfirm(selectedEntry.id);
                  }}
                  variant="ghost"
                  className="text-red-400 hover:bg-red-900/20"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    handleWithdrawEntry();
                    setShowDetailDrawer(false);
                  }}
                  variant="outline"
                  className="border-yellow-700 text-yellow-400"
                  size="sm"
                >
                  <LogOut className="w-4 h-4 mr-1" /> Withdraw
                </Button>
                <Button onClick={handleSaveEntry} className="bg-blue-600 hover:bg-blue-700" size="sm">
                  <Check className="w-4 h-4 mr-1" /> Save
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <AlertDialogContent className="bg-[#262626] border-gray-700">
          <AlertDialogTitle className="text-white">Delete Entry</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            This will permanently delete this entry. This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (showDeleteConfirm) deleteEntryMutation.mutate(showDeleteConfirm);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}