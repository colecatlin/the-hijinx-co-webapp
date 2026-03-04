import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertCircle, Search, X, Plus, Minus } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { toast } from 'sonner';
import { createPageUrl } from '@/components/utils';

const DQ = applyDefaultQueryOptions();

const ENTRY_STATUS_OPTIONS = ['Registered', 'Checked In', 'Teched', 'Withdrawn'];
const PAYMENT_STATUS_OPTIONS = ['Unpaid', 'Paid', 'Refunded', 'Comped'];

export default function GateManager({
  selectedEvent,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [entryMode, setEntryMode] = useState('entry');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerNotes, setDrawerNotes] = useState('');
  const [drawerWristbands, setDrawerWristbands] = useState(0);

  // Try to load Entry entity
  const { data: entries = [], error: entryError, isLoading: entryLoading } = useQuery({
    queryKey: ['racecore', 'gate', 'entries', selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return [];
      try {
        return await base44.entities.Entry.filter({ event_id: selectedEvent.id });
      } catch (err) {
        setEntryMode('proxy');
        return [];
      }
    },
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Load DriverProgram as fallback
  const { data: programs = [] } = useQuery({
    queryKey: ['racecore', 'gate', 'programs', selectedEvent?.id],
    queryFn: () => (selectedEvent?.id 
      ? base44.entities.DriverProgram.filter({ event_id: selectedEvent.id })
      : Promise.resolve([])),
    enabled: !!selectedEvent?.id && entryMode === 'proxy',
    ...DQ,
  });

  // Load drivers for lookup
  const { data: drivers = [] } = useQuery({
    queryKey: ['racecore', 'gate', 'drivers'],
    queryFn: () => base44.entities.Driver.list(),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  // Determine actual display mode
  const isProxyMode = entryError || entryMode === 'proxy' || (!entryLoading && entries.length === 0 && programs.length > 0);
  
  // Build driver lookup
  const driverMap = useMemo(() => {
    const map = {};
    drivers.forEach(d => map[d.id] = d);
    return map;
  }, [drivers]);

  // Get selected entry/program
  const selectedItem = useMemo(() => {
    if (isProxyMode) {
      return programs.find(p => p.id === selectedEntryId);
    }
    return entries.find(e => e.id === selectedEntryId);
  }, [selectedEntryId, entries, programs, isProxyMode]);

  // Get driver for selected item
  const selectedDriver = useMemo(() => {
    if (!selectedItem) return null;
    const driverId = selectedItem.driver_id;
    return driverMap[driverId] || null;
  }, [selectedItem, driverMap]);

  // Filter and search
  const filteredItems = useMemo(() => {
    let results = isProxyMode ? programs : entries;

    // Search filter
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      results = results.filter(item => {
        const driver = driverMap[item.driver_id];
        const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
        const carNum = (item.car_number || '').toLowerCase();
        const transponder = (item.transponder_id || '').toLowerCase();
        return driverName.includes(q) || carNum.includes(q) || transponder.includes(q);
      });
    }

    // Status filter
    if (filterStatus !== 'all' && !isProxyMode) {
      results = results.filter(e => e.entry_status === filterStatus);
    }

    // Payment filter
    if (filterPayment !== 'all' && !isProxyMode) {
      results = results.filter(e => e.payment_status === filterPayment);
    }

    return results.sort((a, b) => (a.car_number || '').localeCompare(b.car_number || ''));
  }, [entries, programs, searchText, filterStatus, filterPayment, driverMap, isProxyMode]);

  // Mutations
  const updateEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.update(data.id, data.updates),
    onSuccess: (result, { id, updates }) => {
      queryClient.invalidateQueries({ queryKey: ['racecore', 'gate', 'entries'] });
      invalidateAfterOperation('entry_updated', { eventId: selectedEvent.id, entryId: id });
      toast.success('Entry updated');
    },
    onError: () => toast.error('Failed to update entry'),
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operationLogs'] });
    },
  });

  // Handlers
  const handleToggleCheckin = async (entry) => {
    const newStatus = entry.entry_status === 'Checked In' ? 'Registered' : 'Checked In';
    
    try {
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        updates: { entry_status: newStatus },
      });

      await createLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'gate_update',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          entry_id: entry.id,
          field_changed: 'entry_status',
          before: entry.entry_status,
          after: newStatus,
        }),
        notes: `Check-in toggled: ${entry.entry_status} → ${newStatus}`,
      });
    } catch (error) {
      console.error('Failed to toggle check-in:', error);
    }
  };

  const handleTogglePayment = async (entry) => {
    const newStatus = entry.payment_status === 'Paid' ? 'Unpaid' : 'Paid';
    
    try {
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        updates: { payment_status: newStatus },
      });

      await createLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'gate_update',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          entry_id: entry.id,
          field_changed: 'payment_status',
          before: entry.payment_status,
          after: newStatus,
        }),
        notes: `Payment toggled: ${entry.payment_status} → ${newStatus}`,
      });
    } catch (error) {
      console.error('Failed to toggle payment:', error);
    }
  };

  const handleSaveNotes = async (entry) => {
    try {
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        updates: { notes: drawerNotes },
      });

      await createLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'gate_update',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          entry_id: entry.id,
          field_changed: 'notes',
        }),
        notes: `Gate notes updated`,
      });

      setDrawerOpen(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  const handleWristbandChange = async (entry, value) => {
    setDrawerWristbands(value);
    
    try {
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        updates: { wristband_count: value },
      });

      await createLogMutation.mutateAsync({
        event_id: selectedEvent.id,
        operation_type: 'gate_update',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: JSON.stringify({
          event_id: selectedEvent.id,
          entry_id: entry.id,
          field_changed: 'wristband_count',
          before: entry.wristband_count || 0,
          after: value,
        }),
        notes: `Wristbands updated to ${value}`,
      });
    } catch (error) {
      console.error('Failed to update wristbands:', error);
    }
  };

  const openDrawer = (item) => {
    setSelectedEntryId(item.id);
    setDrawerNotes(item.notes || '');
    setDrawerWristbands(item.wristband_count || 0);
    setDrawerOpen(true);
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to access Gate</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Gate Check-In</CardTitle>
          <p className="text-xs text-gray-400 mt-1">Quick entry lookup and status management</p>
        </CardHeader>
      </Card>

      {/* Proxy mode warning */}
      {isProxyMode && (
        <div className="bg-yellow-950/40 border border-yellow-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-300 mb-1">Entry Entity Not Found</p>
            <p className="text-xs text-yellow-200">
              Gate actions are disabled. Create an Entry entity to enable check-in, payment, and wristband management. Currently showing DriverProgram data in read-only mode.
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="pt-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search driver name, car number, or transponder…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-800 text-white placeholder-gray-500"
            />
          </div>

          {/* Filters */}
          {!isProxyMode && (
            <div className="grid grid-cols-2 gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-gray-900 border-gray-800 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  <SelectItem value="all">All Status</SelectItem>
                  {ENTRY_STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger className="bg-gray-900 border-gray-800 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800">
                  <SelectItem value="all">All Payment</SelectItem>
                  {PAYMENT_STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="pt-6">
          {filteredItems.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No entries found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-900/50">
                  <TableRow className="border-gray-800">
                    <TableHead className="text-xs text-gray-400">Car</TableHead>
                    <TableHead className="text-xs text-gray-400">Driver</TableHead>
                    <TableHead className="text-xs text-gray-400">Class</TableHead>
                    <TableHead className="text-xs text-gray-400">Transponder</TableHead>
                    {!isProxyMode && (
                      <>
                        <TableHead className="text-xs text-gray-400">Status</TableHead>
                        <TableHead className="text-xs text-gray-400">Payment</TableHead>
                        <TableHead className="text-xs text-gray-400">Wristbands</TableHead>
                      </>
                    )}
                    <TableHead className="text-xs text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => {
                    const driver = driverMap[item.driver_id];
                    const isCheckedIn = item.entry_status === 'Checked In';
                    const isPaid = item.payment_status === 'Paid';

                    return (
                      <TableRow key={item.id} className="border-gray-800 hover:bg-gray-900/30">
                        <TableCell className="text-white font-semibold">{item.car_number || '—'}</TableCell>
                        <TableCell className="text-white text-sm">
                          {driver ? `${driver.first_name} ${driver.last_name}` : '—'}
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">{item.series_class_id || '—'}</TableCell>
                        <TableCell className="text-gray-400 text-sm font-mono">{item.transponder_id || '—'}</TableCell>
                        {!isProxyMode && (
                          <>
                            <TableCell>
                              <Badge className={isCheckedIn ? 'bg-green-900/40 text-green-300' : 'bg-gray-800 text-gray-300'}>
                                {item.entry_status || 'Registered'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={isPaid ? 'bg-blue-900/40 text-blue-300' : 'bg-orange-900/40 text-orange-300'}>
                                {item.payment_status || 'Unpaid'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white text-sm">{item.wristband_count || 0}</TableCell>
                          </>
                        )}
                        <TableCell className="text-right">
                          {!isProxyMode && (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleCheckin(item)}
                                className={`h-7 px-2 text-xs ${isCheckedIn ? 'bg-green-900/40 text-green-300 hover:bg-green-900/60' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                                disabled={updateEntryMutation.isPending}
                              >
                                {isCheckedIn ? '✓ In' : 'Check In'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleTogglePayment(item)}
                                className={`h-7 px-2 text-xs ${isPaid ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-900/60' : 'bg-orange-900/40 text-orange-300 hover:bg-orange-900/60'}`}
                                disabled={updateEntryMutation.isPending}
                              >
                                {isPaid ? '✓ Paid' : 'Pay'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openDrawer(item)}
                                className="h-7 px-2 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700"
                              >
                                Details
                              </Button>
                            </div>
                          )}
                          {isProxyMode && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDrawer(item)}
                              className="h-7 px-2 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 opacity-50 cursor-not-allowed"
                              disabled
                            >
                              View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Drawer */}
      {selectedItem && selectedDriver && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="bg-[#262626] border-gray-800">
            <DrawerHeader className="border-b border-gray-800">
              <DrawerTitle className="text-white">
                {selectedDriver.first_name} {selectedDriver.last_name} • #{selectedItem.car_number}
              </DrawerTitle>
              <DrawerClose className="text-gray-400 hover:text-white" />
            </DrawerHeader>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Driver Profile Link */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Driver Profile</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(createPageUrl('DriverProfile', `id=${selectedDriver.id}`), '_blank')}
                  className="border-gray-700 text-blue-400 hover:bg-blue-900/20"
                >
                  View Profile
                </Button>
              </div>

              {/* Entry Details */}
              {!isProxyMode && (
                <>
                  {/* Car Number */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Car Number</p>
                    <p className="text-white font-mono">{selectedItem.car_number}</p>
                  </div>

                  {/* Transponder */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Transponder</p>
                    <p className="text-white font-mono">{selectedItem.transponder_id || '—'}</p>
                  </div>

                  {/* Wristbands */}
                  <div>
                    <p className="text-xs text-gray-400 mb-3">Wristbands</p>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleWristbandChange(selectedItem, Math.max(0, drawerWristbands - 1))}
                        className="bg-gray-800 hover:bg-gray-700 text-white h-8 w-8 p-0"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-white font-semibold w-8 text-center">{drawerWristbands}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleWristbandChange(selectedItem, drawerWristbands + 1)}
                        className="bg-gray-800 hover:bg-gray-700 text-white h-8 w-8 p-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Waiver */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Waiver</p>
                    <Badge className={selectedItem.waiver_verified ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}>
                      {selectedItem.waiver_verified ? 'Verified' : 'Not Verified'}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Entry Status</p>
                    <Badge className="bg-gray-800 text-gray-300">
                      {selectedItem.entry_status || 'Registered'}
                    </Badge>
                  </div>

                  {/* Payment */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Payment</p>
                    <Badge className={selectedItem.payment_status === 'Paid' ? 'bg-blue-900/40 text-blue-300' : 'bg-orange-900/40 text-orange-300'}>
                      {selectedItem.payment_status || 'Unpaid'}
                    </Badge>
                  </div>

                  {/* Notes */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Gate Notes</p>
                    <Textarea
                      placeholder="Add gate notes…"
                      value={drawerNotes}
                      onChange={(e) => setDrawerNotes(e.target.value)}
                      className="bg-gray-900 border-gray-800 text-white text-sm h-20"
                    />
                    <Button
                      onClick={() => handleSaveNotes(selectedItem)}
                      disabled={updateEntryMutation.isPending}
                      className="mt-2 w-full bg-blue-700 hover:bg-blue-600 text-white h-8 text-xs"
                    >
                      Save Notes
                    </Button>
                  </div>
                </>
              )}

              {/* Proxy mode info */}
              {isProxyMode && (
                <div className="bg-gray-900/50 p-4 rounded text-xs text-gray-400">
                  <p>Driver Program data (read-only). Create Entry entity for full gate functionality.</p>
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}