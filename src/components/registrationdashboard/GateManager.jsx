/**
 * Gate Manager
 * Validate entry, check-in, and track wristbands with search, filters, and detailed drawer.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { Search, AlertCircle, Save, Plus, Minus, Users } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function GateManager({
  selectedEvent,
  invalidateAfterOperation,
  dashboardContext,
}) {
  const eventId = selectedEvent?.id;
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [checkinFilter, setCheckinFilter] = useState('all');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: entries = [] } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => (eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: REG_QK.driverPrograms(eventId),
    queryFn: () => (eventId ? base44.entities.DriverProgram.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && entries.length === 0,
    ...DQ,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => (eventId ? base44.entities.EventClass.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['gateManager_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: REG_QK.operationLogs(eventId),
    queryFn: () => (eventId ? base44.entities.OperationLog.filter({ metadata: { event_id: eventId } }, '-created_date') : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const classMap = useMemo(() => Object.fromEntries(eventClasses.map((c) => [c.id, c])), [eventClasses]);

  // Use entries if available, else fallback to DriverProgram as proxy
  const listData = useMemo(() => {
    if (entries.length > 0) return entries;
    return driverPrograms.map((dp) => ({
      id: dp.id,
      event_id: dp.event_id,
      driver_id: dp.driver_id,
      event_class_id: dp.event_class_id,
      series_class_id: dp.series_class_id,
      team_id: dp.team_id,
      car_number: driverMap[dp.driver_id]?.primary_number,
      _from_driver_program: true,
    }));
  }, [entries, driverPrograms, driverMap]);

  // Latest gate state from OperationLog for each entry
  const gateStateMap = useMemo(() => {
    const map = {};
    listData.forEach((entry) => {
      const log = operationLogs.find(
        (log) => log.operation_type === 'gate_update' &&
                (log.metadata?.entry_id === entry.id || log.metadata?.driver_id === entry.driver_id)
      );
      if (log?.metadata) {
        map[entry.id] = log.metadata;
      }
    });
    return map;
  }, [listData, operationLogs]);

  // Filtered list
  const filteredEntries = useMemo(() => {
    let filtered = [...listData];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((e) => {
        const driver = driverMap[e.driver_id];
        const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
        const carNum = (e.car_number || '').toString();
        const transponder = (e.transponder_id || '').toString();
        return driverName.includes(term) || carNum.includes(term) || transponder.includes(term);
      });
    }

    if (classFilter !== 'all') {
      filtered = filtered.filter((e) => e.event_class_id === classFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter((e) => (e.payment_status || 'Unpaid') === paymentFilter);
    }

    if (checkinFilter !== 'all') {
      const isCheckedIn = checkinFilter === 'checked_in';
      filtered = filtered.filter((e) => (e.gate_checked_in === true) === isCheckedIn);
    }

    return filtered;
  }, [listData, searchTerm, classFilter, paymentFilter, checkinFilter, driverMap]);

  // Quick stats
  const stats = useMemo(() => {
    const checkedIn = listData.filter((e) => e.gate_checked_in === true).length;
    const unpaid = listData.filter((e) => (e.payment_status || 'Unpaid') === 'Unpaid').length;
    const missingWaiver = listData.filter((e) => !e.waiver_verified).length;
    return { checkedIn, unpaid, missingWaiver, total: listData.length };
  }, [listData]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const saveEntryChanges = useCallback(async () => {
    if (!editingEntry) return;

    try {
      // Try to update Entry if it exists and has the field
      if (editingEntry.id && !editingEntry._from_driver_program) {
        const updateData = {};
        if (typeof editingEntry.gate_checked_in !== 'undefined') updateData.gate_checked_in = editingEntry.gate_checked_in;
        if (typeof editingEntry.waiver_verified !== 'undefined') updateData.waiver_verified = editingEntry.waiver_verified;
        if (typeof editingEntry.payment_status !== 'undefined') updateData.payment_status = editingEntry.payment_status;
        if (typeof editingEntry.wristband_count !== 'undefined') updateData.wristband_count = editingEntry.wristband_count;
        if (updateData.notes !== undefined) updateData.notes = editingEntry.notes;

        if (Object.keys(updateData).length > 0) {
          await base44.entities.Entry.update(editingEntry.id, updateData);
        }
      }

      // Always log to OperationLog
      await base44.entities.OperationLog.create({
        operation_type: 'gate_update',
        source_type: 'RaceCore',
        entity_name: 'Entry',
        status: 'success',
        metadata: {
          event_id: eventId,
          driver_id: editingEntry.driver_id,
          entry_id: editingEntry.id,
          check_in_status: editingEntry.gate_checked_in,
          waiver_verified: editingEntry.waiver_verified,
          payment_status: editingEntry.payment_status,
          wristband_count: editingEntry.wristband_count,
          notes: editingEntry.notes,
          timestamp: new Date().toISOString(),
        },
      });

      invalidateAfterOperation('gate_updated', { eventId });
      toast.success('Entry saved');
      setSelectedEntry(editingEntry);
      setEditingEntry(null);
    } catch (err) {
      console.error('Failed to save entry:', err);
      toast.error('Failed to save entry');
    }
  }, [eventId, editingEntry, invalidateAfterOperation]);

  const bulkCheckIn = useCallback(async () => {
    if (selectedRows.size === 0) return;
    try {
      for (const entryId of selectedRows) {
        const entry = listData.find((e) => e.id === entryId);
        if (!entry) continue;

        if (entry.id && !entry._from_driver_program) {
          await base44.entities.Entry.update(entry.id, { gate_checked_in: true });
        }

        await base44.entities.OperationLog.create({
          operation_type: 'gate_update',
          source_type: 'RaceCore',
          entity_name: 'Entry',
          status: 'success',
          metadata: {
            event_id: eventId,
            driver_id: entry.driver_id,
            entry_id: entry.id,
            check_in_status: true,
            timestamp: new Date().toISOString(),
          },
        });
      }
      invalidateAfterOperation('gate_updated', { eventId });
      setSelectedRows(new Set());
      toast.success(`${selectedRows.size} entries checked in`);
    } catch (err) {
      console.error('Bulk check-in error:', err);
      toast.error('Bulk check-in failed');
    }
  }, [selectedRows, listData, eventId, invalidateAfterOperation]);

  const bulkVerifyWaiver = useCallback(async () => {
    if (selectedRows.size === 0) return;
    try {
      for (const entryId of selectedRows) {
        const entry = listData.find((e) => e.id === entryId);
        if (!entry) continue;

        if (entry.id && !entry._from_driver_program) {
          await base44.entities.Entry.update(entry.id, { waiver_verified: true });
        }

        await base44.entities.OperationLog.create({
          operation_type: 'gate_update',
          source_type: 'RaceCore',
          entity_name: 'Entry',
          status: 'success',
          metadata: {
            event_id: eventId,
            driver_id: entry.driver_id,
            entry_id: entry.id,
            waiver_verified: true,
            timestamp: new Date().toISOString(),
          },
        });
      }
      invalidateAfterOperation('gate_updated', { eventId });
      setSelectedRows(new Set());
      toast.success(`${selectedRows.size} waivers verified`);
    } catch (err) {
      console.error('Bulk waiver error:', err);
      toast.error('Bulk waiver verification failed');
    }
  }, [selectedRows, listData, eventId, invalidateAfterOperation]);

  const bulkMarkPaid = useCallback(async () => {
    if (selectedRows.size === 0) return;
    try {
      for (const entryId of selectedRows) {
        const entry = listData.find((e) => e.id === entryId);
        if (!entry) continue;

        if (entry.id && !entry._from_driver_program) {
          await base44.entities.Entry.update(entry.id, { payment_status: 'Paid' });
        }

        await base44.entities.OperationLog.create({
          operation_type: 'gate_update',
          source_type: 'RaceCore',
          entity_name: 'Entry',
          status: 'success',
          metadata: {
            event_id: eventId,
            driver_id: entry.driver_id,
            entry_id: entry.id,
            payment_status: 'Paid',
            timestamp: new Date().toISOString(),
          },
        });
      }
      invalidateAfterOperation('gate_updated', { eventId });
      setSelectedRows(new Set());
      toast.success(`${selectedRows.size} entries marked paid`);
    } catch (err) {
      console.error('Bulk payment error:', err);
      toast.error('Bulk payment marking failed');
    }
  }, [selectedRows, listData, eventId, invalidateAfterOperation]);

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Gate Manager</p>
          <p className="text-gray-400 text-sm">Select an event to manage gate operations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Summary Strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Event</p>
            <p className="text-lg font-bold text-white truncate">{selectedEvent.name}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#171717] border-gray-800 cursor-pointer hover:border-gray-700" onClick={() => stats.total > 0 && setCheckinFilter('all')}>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Entries</p>
            <p className="text-lg font-bold text-white">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#171717] border-gray-800 cursor-pointer hover:border-green-700" onClick={() => setCheckinFilter('checked_in')}>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Checked In</p>
            <p className="text-lg font-bold text-green-400">{stats.checkedIn}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#171717] border-gray-800 cursor-pointer hover:border-red-700" onClick={() => setPaymentFilter('Unpaid')}>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Unpaid</p>
            <p className="text-lg font-bold text-red-400">{stats.unpaid}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#171717] border-gray-800 cursor-pointer hover:border-yellow-700" onClick={() => checkinFilter !== 'all' && setCheckinFilter('all')}>
          <CardContent className="pt-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Missing Waiver</p>
            <p className="text-lg font-bold text-yellow-400">{stats.missingWaiver}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search driver name, car #, or transponder..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#262626] border-gray-700 text-white"
          />
        </div>

        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-44 bg-[#262626] border-gray-700 text-white">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent className="bg-[#262626] border-gray-700 text-white">
            <SelectItem value="all" className="text-white">All Classes</SelectItem>
            {eventClasses.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-white">
                {c.class_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-40 bg-[#262626] border-gray-700 text-white">
            <SelectValue placeholder="All Payment" />
          </SelectTrigger>
          <SelectContent className="bg-[#262626] border-gray-700 text-white">
            <SelectItem value="all" className="text-white">All Payment</SelectItem>
            <SelectItem value="Paid" className="text-white">Paid</SelectItem>
            <SelectItem value="Unpaid" className="text-white">Unpaid</SelectItem>
          </SelectContent>
        </Select>

        <Select value={checkinFilter} onValueChange={setCheckinFilter}>
          <SelectTrigger className="w-44 bg-[#262626] border-gray-700 text-white">
            <SelectValue placeholder="All Check-in" />
          </SelectTrigger>
          <SelectContent className="bg-[#262626] border-gray-700 text-white">
            <SelectItem value="all" className="text-white">All Check-in</SelectItem>
            <SelectItem value="checked_in" className="text-white">Checked In</SelectItem>
            <SelectItem value="not_checked_in" className="text-white">Not Checked In</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setBulkMode(!bulkMode)}
          className={`border-gray-700 ${bulkMode ? 'bg-blue-900/40 text-blue-300' : 'text-gray-300'}`}
        >
          Bulk {bulkMode ? 'On' : 'Off'}
        </Button>
      </div>

      {/* ── Bulk Actions ──────────────────────────────────────────────────── */}
      {bulkMode && selectedRows.size > 0 && (
        <Card className="bg-blue-900/20 border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-300">{selectedRows.size} selected</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={bulkCheckIn} className="bg-green-600 hover:bg-green-700 text-white">
                  Check In
                </Button>
                <Button size="sm" onClick={bulkVerifyWaiver} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                  Verify Waivers
                </Button>
                <Button size="sm" onClick={bulkMarkPaid} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Mark Paid
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Entries Table ─────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="p-0">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-400 text-sm">No entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-[#1a1a1a]">
                    {bulkMode && <th className="px-3 py-2 w-10" />}
                    {['Car', 'Driver', 'Class', 'Check-in', 'Waiver', 'Payment', 'Wristbands', 'Notes'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredEntries.map((entry) => {
                    const driver = driverMap[entry.driver_id];
                    const cls = classMap[entry.event_class_id];
                    const gateState = gateStateMap[entry.id] || {};
                    const checkedIn = entry.gate_checked_in || gateState.check_in_status || false;
                    const waiverVerified = entry.waiver_verified || gateState.waiver_verified || false;
                    const paymentStatus = entry.payment_status || gateState.payment_status || 'Unpaid';
                    const wristbandCount = entry.wristband_count || gateState.wristband_count || 0;

                    return (
                      <tr key={entry.id} className="hover:bg-[#1e1e1e] transition-colors">
                        {bulkMode && (
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(entry.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedRows);
                                if (e.target.checked) newSet.add(entry.id);
                                else newSet.delete(entry.id);
                                setSelectedRows(newSet);
                              }}
                              className="w-4 h-4"
                            />
                          </td>
                        )}
                        <td className="px-3 py-2 font-bold text-white">#{entry.car_number || driver?.primary_number || '—'}</td>
                        <td className="px-3 py-2 text-white">
                          {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}
                        </td>
                        <td className="px-3 py-2 text-gray-400 text-xs">{cls?.class_name || '—'}</td>
                        <td className="px-3 py-2">
                          <Badge className={`text-xs cursor-pointer ${checkedIn ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {checkedIn ? '✓ In' : 'Out'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={`text-xs ${waiverVerified ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {waiverVerified ? '✓' : '✗'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Badge className={`text-xs ${paymentStatus === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {paymentStatus}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-white font-semibold text-center">{wristbandCount}</td>
                        <td className="px-3 py-2 text-gray-400 text-xs max-w-xs truncate">{entry.notes || '—'}</td>
                        <td className="px-3 py-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedEntry(entry);
                              setEditingEntry({ ...entry, ...gateState });
                            }}
                            className="text-gray-400 hover:text-white h-7 px-2"
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail Drawer ─────────────────────────────────────────────────── */}
      <Drawer open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DrawerContent className="bg-[#171717] border-gray-800">
          {editingEntry && (
            <>
              <DrawerHeader>
                <DrawerTitle className="text-white">
                  {driverMap[editingEntry.driver_id]
                    ? `${driverMap[editingEntry.driver_id].first_name} ${driverMap[editingEntry.driver_id].last_name}`
                    : 'Entry'}
                </DrawerTitle>
                <DrawerDescription className="text-gray-400">
                  Car #{editingEntry.car_number || driverMap[editingEntry.driver_id]?.primary_number || '—'} • {classMap[editingEntry.event_class_id]?.class_name || 'Unknown Class'}
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-4 space-y-6 overflow-y-auto max-h-[60vh]">
                {/* Status Toggles */}
                <div className="space-y-3 p-3 bg-[#262626] rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Gate Operations</p>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Checked In</span>
                    <Button
                      size="sm"
                      onClick={() => setEditingEntry({ ...editingEntry, gate_checked_in: !editingEntry.gate_checked_in })}
                      className={`${editingEntry.gate_checked_in ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
                    >
                      {editingEntry.gate_checked_in ? '✓ Yes' : '✗ No'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Waiver Verified</span>
                    <Button
                      size="sm"
                      onClick={() => setEditingEntry({ ...editingEntry, waiver_verified: !editingEntry.waiver_verified })}
                      className={`${editingEntry.waiver_verified ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
                    >
                      {editingEntry.waiver_verified ? '✓ Yes' : '✗ No'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Payment</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setEditingEntry({ ...editingEntry, payment_status: 'Paid' })}
                        className={`${editingEntry.payment_status === 'Paid' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
                      >
                        Paid
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setEditingEntry({ ...editingEntry, payment_status: 'Unpaid' })}
                        className={`${editingEntry.payment_status === 'Unpaid' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
                      >
                        Unpaid
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Wristband Count */}
                <div className="p-3 bg-[#262626] rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Wristbands</p>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingEntry({ ...editingEntry, wristband_count: Math.max(0, (editingEntry.wristband_count || 0) - 1) })}
                      className="border-gray-700 text-gray-300 h-8 w-8 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-12 text-center font-bold text-white text-lg">{editingEntry.wristband_count || 0}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingEntry({ ...editingEntry, wristband_count: (editingEntry.wristband_count || 0) + 1 })}
                      className="border-gray-700 text-gray-300 h-8 w-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                <div className="p-3 bg-[#262626] rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Notes</p>
                  <Textarea
                    value={editingEntry.notes || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, notes: e.target.value })}
                    placeholder="Add notes..."
                    className="bg-[#1a1a1a] border-gray-700 text-white text-sm h-16 resize-none"
                  />
                </div>

                {/* Recent Activity */}
                {operationLogs.filter((log) => log.operation_type === 'gate_update' && (log.metadata?.entry_id === editingEntry.id || log.metadata?.driver_id === editingEntry.driver_id)).slice(0, 5).length > 0 && (
                  <div className="p-3 bg-[#262626] rounded-lg border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Recent Activity</p>
                    <div className="space-y-1 text-xs">
                      {operationLogs
                        .filter((log) => log.operation_type === 'gate_update' && (log.metadata?.entry_id === editingEntry.id || log.metadata?.driver_id === editingEntry.driver_id))
                        .slice(0, 5)
                        .map((log, idx) => (
                          <div key={idx} className="text-gray-400">
                            <p>{new Date(log.created_date).toLocaleString()}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <DrawerFooter>
                <div className="flex gap-2">
                  <Button
                    onClick={saveEntryChanges}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-1.5" /> Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingEntry(null)}
                    className="flex-1 border-gray-700 text-gray-300"
                  >
                    Close
                  </Button>
                </div>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}