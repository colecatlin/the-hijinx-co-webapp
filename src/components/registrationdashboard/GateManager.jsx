import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { canTab } from '@/components/access/accessControl';
import { createPageUrl } from '@/components/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Plus, Minus, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function GateManager({
  selectedEvent,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [entryStatusFilter, setEntryStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [techFilter, setTechFilter] = useState('all');
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wristbandCount, setWristbandCount] = useState(0);
  const [gateNotes, setGateNotes] = useState('');

  const canEdit = canTab(dashboardPermissions, 'gate');

  // Load entries
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['racecore', 'gate', 'entries', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.Entry.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  // Load drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['racecore', 'gate', 'drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  // Load classes
  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['racecore', 'gate', 'classes'],
    queryFn: () => base44.entities.SeriesClass.list(),
  });

  // Build maps
  const driverMap = useMemo(
    () => new Map(drivers.map(d => [d.id, d])),
    [drivers]
  );

  const classMap = useMemo(
    () => new Map(seriesClasses.map(c => [c.id, c])),
    [seriesClasses]
  );

  // Mutations
  const updateEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['racecore', 'gate', 'entries', selectedEvent.id],
      });
    },
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.OperationLog.create(data),
  });

  // Filter and search
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Search by driver name, car number, transponder
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(e => {
        const driver = driverMap.get(e.driver_id);
        const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
        const carNum = (e.car_number || '').toLowerCase();
        const transponder = (e.transponder_id || '').toLowerCase();
        return driverName.includes(q) || carNum.includes(q) || transponder.includes(q);
      });
    }

    // Class filter
    if (classFilter !== 'all') {
      filtered = filtered.filter(e => e.event_class_id === classFilter || e.series_class_id === classFilter);
    }

    // Entry status filter
    if (entryStatusFilter !== 'all') {
      filtered = filtered.filter(e => e.entry_status === entryStatusFilter);
    }

    // Payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(e => e.payment_status === paymentFilter);
    }

    // Tech filter
    if (techFilter !== 'all') {
      filtered = filtered.filter(e => e.tech_status === techFilter);
    }

    return filtered;
  }, [entries, search, classFilter, entryStatusFilter, paymentFilter, techFilter, driverMap]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: entries.length,
      gateChecked: entries.filter(e => e.gate_checked_in === true).length,
      flagged: entries.filter(e => 
        e.payment_status === 'Unpaid' || 
        !e.waiver_verified || 
        e.tech_status === 'Not Inspected'
      ).length,
    };
  }, [entries]);

  // Handle gate check toggle
  const handleGateCheck = async (entry) => {
    if (!canEdit) return;

    try {
      const nextValue = !entry.gate_checked_in;
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        gate_checked_in: nextValue,
      });

      await createLogMutation.mutateAsync({
        operation_type: 'gate_check_updated',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          entry_id: entry.id,
          gate_checked_in: nextValue,
        },
      });

      invalidateAfterOperation('entry_updated', { eventId: selectedEvent.id });
      toast.success(nextValue ? 'Entry marked as gate checked' : 'Gate check removed');
    } catch (error) {
      toast.error('Failed to update gate status');
      console.error(error);
    }
  };

  // Handle wristband update
  const handleWristbandUpdate = async (entry, delta) => {
    if (!canEdit) return;

    try {
      const nextCount = Math.max(0, (entry.wristband_count || 0) + delta);
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        wristband_count: nextCount,
      });

      await createLogMutation.mutateAsync({
        operation_type: 'wristbands_updated',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          entry_id: entry.id,
          wristband_count: nextCount,
        },
      });

      invalidateAfterOperation('entry_updated', { eventId: selectedEvent.id });
      toast.success(`Wristbands updated to ${nextCount}`);
    } catch (error) {
      toast.error('Failed to update wristbands');
      console.error(error);
    }
  };

  // Handle notes save
  const handleSaveNotes = async (entry) => {
    if (!canEdit) return;

    try {
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        gate_notes: gateNotes,
      });

      await createLogMutation.mutateAsync({
        operation_type: 'gate_notes_saved',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          entry_id: entry.id,
          note_length: gateNotes.length,
        },
      });

      invalidateAfterOperation('entry_updated', { eventId: selectedEvent.id });
      setDrawerOpen(false);
      toast.success('Notes saved');
    } catch (error) {
      toast.error('Failed to save notes');
      console.error(error);
    }
  };

  // Open drawer
  const openDrawer = (entry) => {
    setSelectedEntryId(entry.id);
    setWristbandCount(entry.wristband_count || 0);
    setGateNotes(entry.gate_notes || '');
    setDrawerOpen(true);
  };

  const selectedEntry = entries.find(e => e.id === selectedEntryId);
  const selectedDriver = selectedEntry ? driverMap.get(selectedEntry.driver_id) : null;

  // Helper to determine row highlight
  const hasFlag = (entry) => 
    entry.payment_status === 'Unpaid' || 
    !entry.waiver_verified || 
    entry.tech_status === 'Not Inspected';

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">Select an event to access gate tools</p>
        </CardContent>
      </Card>
    );
  }

  if (!canEdit) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-gray-400">You don't have access to Gate tools</p>
        </CardContent>
      </Card>
    );
  }

  if (entriesLoading) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Loading entries...</p>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-blue-500 mx-auto mb-3" />
          <p className="text-gray-400">No entries exist yet</p>
          <p className="text-sm text-gray-500 mt-2">Gate tools activate once entries are created</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-400 mb-1">Total Entries</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-400 mb-1">Gate Checked</p>
            <p className="text-2xl font-bold text-green-400">{stats.gateChecked}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-400 mb-1">Flagged</p>
            <p className="text-2xl font-bold text-red-400">{stats.flagged}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search driver, car number, transponder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Class</label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all" className="text-white">All Classes</SelectItem>
                  {Array.from(classMap.values()).map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-white">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Entry Status</label>
              <Select value={entryStatusFilter} onValueChange={setEntryStatusFilter}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all" className="text-white">All</SelectItem>
                  <SelectItem value="Registered" className="text-white">Registered</SelectItem>
                  <SelectItem value="Checked In" className="text-white">Checked In</SelectItem>
                  <SelectItem value="Teched" className="text-white">Teched</SelectItem>
                  <SelectItem value="Withdrawn" className="text-white">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Payment</label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all" className="text-white">All</SelectItem>
                  <SelectItem value="Paid" className="text-white">Paid</SelectItem>
                  <SelectItem value="Unpaid" className="text-white">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Tech Status</label>
              <Select value={techFilter} onValueChange={setTechFilter}>
                <SelectTrigger className="bg-gray-900 border-gray-700 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="all" className="text-white">All</SelectItem>
                  <SelectItem value="Passed" className="text-white">Passed</SelectItem>
                  <SelectItem value="Not Inspected" className="text-white">Not Inspected</SelectItem>
                  <SelectItem value="Failed" className="text-white">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">
            Entries ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Car #</TableHead>
                  <TableHead className="text-gray-400">Driver</TableHead>
                  <TableHead className="text-gray-400">Class</TableHead>
                  <TableHead className="text-gray-400">Entry Status</TableHead>
                  <TableHead className="text-gray-400">Payment</TableHead>
                  <TableHead className="text-gray-400">Tech</TableHead>
                  <TableHead className="text-gray-400">Gate</TableHead>
                  <TableHead className="text-gray-400">Wristbands</TableHead>
                  <TableHead className="text-gray-400">Flags</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => {
                  const driver = driverMap.get(entry.driver_id);
                  const eventClass = classMap.get(entry.series_class_id);

                  return (
                    <TableRow
                      key={entry.id}
                      className={`border-gray-800 cursor-pointer hover:bg-gray-900/50 ${
                        hasFlag(entry) ? 'bg-red-950/20' : ''
                      }`}
                      onClick={() => openDrawer(entry)}
                    >
                      <TableCell className="text-white font-semibold text-sm">
                        {entry.car_number || '-'}
                      </TableCell>
                      <TableCell className="text-white text-sm">
                        {driver ? `${driver.first_name} ${driver.last_name}` : '-'}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {eventClass?.name || '-'}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {entry.entry_status || 'Registered'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            entry.payment_status === 'Paid'
                              ? 'bg-green-900/30 text-green-300'
                              : 'bg-red-900/30 text-red-300'
                          }`}
                        >
                          {entry.payment_status || 'Unpaid'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            entry.tech_status === 'Passed'
                              ? 'bg-green-900/30 text-green-300'
                              : 'bg-yellow-900/30 text-yellow-300'
                          }`}
                        >
                          {entry.tech_status || 'Not Inspected'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGateCheck(entry);
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            entry.gate_checked_in
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                          }`}
                        >
                          {entry.gate_checked_in ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-white text-sm font-semibold">
                        {entry.wristband_count || 0}
                      </TableCell>
                      <TableCell>
                        {hasFlag(entry) && (
                          <Badge className="bg-red-900/40 text-red-300 text-xs">
                            ⚠ Flag
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDrawer(entry);
                          }}
                          className="text-gray-400 hover:text-white hover:bg-gray-800 text-xs"
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Entry Details Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="bg-[#262626] border-gray-700 w-full sm:w-96">
          <SheetHeader>
            <SheetTitle className="text-white">Entry Details</SheetTitle>
            <SheetDescription className="text-gray-400">
              Gate management for this entry
            </SheetDescription>
          </SheetHeader>
          {selectedEntry && (
            <div className="space-y-6 py-6">
              {/* Driver Info */}
              <div className="space-y-3 border-b border-gray-700 pb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Driver</p>
                  <p className="text-sm font-semibold text-white">
                    {selectedDriver
                      ? `${selectedDriver.first_name} ${selectedDriver.last_name}`
                      : 'Unknown'}
                  </p>
                  {selectedDriver && (
                    <a
                      href={createPageUrl('DriverProfile', `id=${selectedDriver.id}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      View Profile →
                    </a>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Car Number</p>
                  <p className="text-sm font-semibold text-white">{selectedEntry.car_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Transponder</p>
                  <p className="text-sm font-semibold text-white">
                    {selectedEntry.transponder_id || 'Not assigned'}
                  </p>
                </div>
              </div>

              {/* Gate Check */}
              <div>
                <p className="text-xs text-gray-400 mb-3">Gate Check</p>
                <Button
                  onClick={() => handleGateCheck(selectedEntry)}
                  className={`w-full ${
                    selectedEntry.gate_checked_in
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {selectedEntry.gate_checked_in ? 'Checked In ✓' : 'Mark as Gate Complete'}
                </Button>
              </div>

              {/* Wristbands */}
              <div>
                <p className="text-xs text-gray-400 mb-3">Wristbands</p>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleWristbandUpdate(selectedEntry, -1)}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <p className="text-2xl font-bold text-white">{wristbandCount}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleWristbandUpdate(selectedEntry, 1)}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Gate Notes</p>
                <Textarea
                  placeholder="Add gate-related notes..."
                  value={gateNotes}
                  onChange={(e) => setGateNotes(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white text-sm h-24"
                />
                <Button
                  onClick={() => handleSaveNotes(selectedEntry)}
                  className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                >
                  Save Notes
                </Button>
              </div>

              {/* Flags Summary */}
              {hasFlag(selectedEntry) && (
                <div className="bg-red-900/20 border border-red-800/50 rounded p-3">
                  <p className="text-xs font-semibold text-red-300 mb-2">⚠ Flags</p>
                  <ul className="text-xs text-red-200 space-y-1">
                    {selectedEntry.payment_status === 'Unpaid' && (
                      <li>• Unpaid</li>
                    )}
                    {!selectedEntry.waiver_verified && (
                      <li>• Waiver not verified</li>
                    )}
                    {selectedEntry.tech_status === 'Not Inspected' && (
                      <li>• Tech inspection pending</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}