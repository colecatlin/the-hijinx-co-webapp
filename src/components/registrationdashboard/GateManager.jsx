/**
 * Gate Manager
 * Check in, confirm entries, manage wristbands and payments.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
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
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, Link as LinkIcon, Plus, Minus, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { canTab, canAction } from '@/components/access/accessControl';

const DQ = applyDefaultQueryOptions();

export default function GateManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const hasAccess = canTab(dashboardPermissions, 'gate');
  const canEdit = canAction(dashboardPermissions, 'import_csv') || dashboardPermissions?.role === 'admin';

  // ── State ──────────────────────────────────────────────────────────────────

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [editData, setEditData] = useState({});

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: entries = [] } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => (eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && hasAccess,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['gateManager_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000,
    enabled: hasAccess,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['gateManager_teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 200),
    staleTime: 60_000,
    enabled: hasAccess,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['gateManager_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 500),
    staleTime: 60_000,
    enabled: hasAccess,
    ...DQ,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['gateManager_operationLogs'],
    queryFn: () => base44.entities.OperationLog.list('-created_date', 200),
    staleTime: 30_000,
    enabled: !!eventId && hasAccess,
    ...DQ,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateEntryMutation = useMutation({
    mutationFn: ({ entryId, data }) => base44.entities.Entry.update(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REG_QK.entries(eventId) });
      invalidateAfterOperation('entry_updated');
      toast.success('Entry updated');
    },
    onError: (err) => {
      console.error('Failed to update entry:', err);
      toast.error('Failed to update entry');
    },
  });

  const createOperationLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateManager_operationLogs'] });
      invalidateAfterOperation('operation_logged');
      toast.success('Change recorded');
    },
    onError: (err) => {
      console.error('Failed to log operation:', err);
      toast.error('Failed to log operation');
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const classMap = useMemo(
    () => Object.fromEntries(seriesClasses.map((c) => [c.id, c])),
    [seriesClasses]
  );

  // Get unique classes from entries
  const uniqueClasses = useMemo(() => {
    const classIds = new Set();
    entries.forEach((e) => {
      if (e.event_class_id) classIds.add(e.event_class_id);
    });
    return Array.from(classIds);
  }, [entries]);

  // Filter and search
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) => {
        const driver = driverMap[e.driver_id];
        const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
        const carNum = (e.car_number || '').toLowerCase();
        const transponder = (e.transponder_id || '').toLowerCase();
        return driverName.includes(q) || carNum.includes(q) || transponder.includes(q);
      });
    }

    if (classFilter !== 'all') {
      result = result.filter((e) => e.event_class_id === classFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((e) => e.entry_status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      result = result.filter((e) => e.payment_status === paymentFilter);
    }

    return result.sort((a, b) => {
      const aName = driverMap[a.driver_id]?.last_name || '';
      const bName = driverMap[b.driver_id]?.last_name || '';
      return aName.localeCompare(bName);
    });
  }, [entries, driverMap, search, classFilter, statusFilter, paymentFilter]);

  // Get selected entry and related logs
  const selectedEntry = useMemo(() => entries.find((e) => e.id === selectedEntryId), [entries, selectedEntryId]);

  const entryOperationLogs = useMemo(() => {
    if (!selectedEntry) return [];
    return operationLogs
      .filter((log) => {
        try {
          const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          return metadata?.entry_id === selectedEntry.id && log.operation_type === 'gate_update';
        } catch {
          return false;
        }
      })
      .slice(0, 10);
  }, [operationLogs, selectedEntry]);

  // Initialize edit data when entry selected
  React.useEffect(() => {
    if (selectedEntry) {
      setEditData({
        car_number: selectedEntry.car_number || '',
        transponder_id: selectedEntry.transponder_id || '',
        wristband_count: selectedEntry.wristband_count || 0,
        waiver_verified: selectedEntry.waiver_verified || false,
        payment_status: selectedEntry.payment_status || 'Unpaid',
        notes: selectedEntry.notes || '',
      });
    }
  }, [selectedEntry]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSaveUpdates = useCallback(() => {
    if (!selectedEntry || !canEdit) return;

    const updates = {};
    const changes = [];

    if (editData.car_number !== selectedEntry.car_number) {
      updates.car_number = editData.car_number;
      changes.push('car_number');
    }
    if (editData.transponder_id !== selectedEntry.transponder_id) {
      updates.transponder_id = editData.transponder_id;
      changes.push('transponder_id');
    }
    if (editData.wristband_count !== (selectedEntry.wristband_count || 0)) {
      updates.wristband_count = editData.wristband_count;
      changes.push('wristband_count');
    }
    if (editData.waiver_verified !== (selectedEntry.waiver_verified || false)) {
      updates.waiver_verified = editData.waiver_verified;
      changes.push('waiver_verified');
    }
    if (editData.payment_status !== (selectedEntry.payment_status || 'Unpaid')) {
      updates.payment_status = editData.payment_status;
      changes.push('payment_status');
    }
    if (editData.notes !== (selectedEntry.notes || '')) {
      updates.notes = editData.notes;
      changes.push('notes');
    }

    if (changes.length === 0) {
      toast.info('No changes');
      return;
    }

    // Log operation
    createOperationLogMutation.mutate({
      operation_type: 'gate_update',
      source_type: 'manual',
      entity_name: 'Entry',
      entity_id: selectedEntry.id,
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        entry_id: selectedEntry.id,
        driver_id: selectedEntry.driver_id,
        updates: changes,
      }),
    });

    // Update entry
    updateEntryMutation.mutate({
      entryId: selectedEntry.id,
      data: updates,
    });
  }, [selectedEntry, editData, canEdit, eventId, updateEntryMutation, createOperationLogMutation]);

  const handleCheckIn = useCallback(() => {
    if (!selectedEntry || !canEdit) return;
    createOperationLogMutation.mutate({
      operation_type: 'gate_update',
      source_type: 'manual',
      entity_name: 'Entry',
      entity_id: selectedEntry.id,
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        entry_id: selectedEntry.id,
        driver_id: selectedEntry.driver_id,
        updates: ['entry_status'],
      }),
    });
    updateEntryMutation.mutate({
      entryId: selectedEntry.id,
      data: { entry_status: 'Checked In' },
    });
  }, [selectedEntry, canEdit, eventId, updateEntryMutation, createOperationLogMutation]);

  const handleWithdraw = useCallback(() => {
    if (!selectedEntry || !canEdit) return;
    createOperationLogMutation.mutate({
      operation_type: 'gate_update',
      source_type: 'manual',
      entity_name: 'Entry',
      entity_id: selectedEntry.id,
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        entry_id: selectedEntry.id,
        driver_id: selectedEntry.driver_id,
        updates: ['entry_status'],
      }),
    });
    updateEntryMutation.mutate({
      entryId: selectedEntry.id,
      data: { entry_status: 'Withdrawn' },
    });
  }, [selectedEntry, canEdit, eventId, updateEntryMutation, createOperationLogMutation]);

  // ── Empty/No access state ──────────────────────────────────────────────────

  if (!hasAccess) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">You do not have access to Gate operations.</p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Gate</p>
          <p className="text-gray-400 text-sm">Select an event to access gate operations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white text-2xl">Gate</CardTitle>
              <p className="text-sm text-gray-400 mt-1">Confirm entries, wristbands, payments, gate notes</p>
            </div>
          </div>
        </CardHeader>

        {/* Controls */}
        <CardContent className="space-y-3 border-t border-gray-700 pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search driver, car number, transponder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#262626] border-gray-700 text-white text-sm h-9 flex-1"
            />
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: REG_QK.entries(eventId) })}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs h-9 px-3"
            >
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Class</label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="all" className="text-white">All Classes</SelectItem>
                  {uniqueClasses.map((classId) => (
                    <SelectItem key={classId} value={classId} className="text-white">
                      {classMap[classId]?.class_name || classId.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="all" className="text-white">All</SelectItem>
                  <SelectItem value="Registered" className="text-white">Registered</SelectItem>
                  <SelectItem value="Checked In" className="text-white">Checked In</SelectItem>
                  <SelectItem value="Withdrawn" className="text-white">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Payment</label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="all" className="text-white">All</SelectItem>
                  <SelectItem value="Paid" className="text-white">Paid</SelectItem>
                  <SelectItem value="Unpaid" className="text-white">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Two Column Layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Entries Table */}
        <div className="lg:col-span-2">
          <Card className="bg-[#171717] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-sm">Entries ({filteredEntries.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <p className="text-gray-500 text-sm py-6 text-center">No entries found</p>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {filteredEntries.map((entry) => {
                    const driver = driverMap[entry.driver_id];
                    const team = teamMap[entry.team_id];
                    const className = classMap[entry.event_class_id]?.class_name || '—';
                    const isSelected = selectedEntryId === entry.id;
                    const isPaid = entry.payment_status === 'Paid';
                    const isCheckedIn = entry.entry_status === 'Checked In';

                    return (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedEntryId(entry.id)}
                        className={`w-full text-left p-2 rounded border transition-colors ${
                          isSelected
                            ? 'bg-blue-900/30 border-blue-600'
                            : `bg-[#262626] border-gray-700 hover:border-gray-600 ${!isPaid ? 'border-red-700/50' : ''}`
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-semibold text-sm">#{entry.car_number || driver?.primary_number || '—'}</span>
                              {!isCheckedIn && <div className="w-2 h-2 rounded-full bg-yellow-500" />}
                            </div>
                            <p className="text-xs text-gray-300">{driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{className}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={`text-xs ${isCheckedIn ? 'bg-green-900/50 text-green-300' : 'bg-gray-700'}`}>
                              {entry.entry_status || 'Registered'}
                            </Badge>
                            {!isPaid && <Badge className="text-xs bg-red-900/50 text-red-300">Unpaid</Badge>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Entry Details */}
        {selectedEntry && (
          <div className="space-y-4">
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Entry Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Driver link */}
                {selectedEntry.driver_id && (
                  <a
                    href={createPageUrl(`DriverProfile?driverId=${selectedEntry.driver_id}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-semibold"
                  >
                    <LinkIcon className="w-3 h-3" /> View Profile
                  </a>
                )}

                {/* Team */}
                {selectedEntry.team_id && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Team</p>
                    <p className="text-white text-sm">{teamMap[selectedEntry.team_id]?.name || '—'}</p>
                  </div>
                )}

                {/* Car number */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Car Number</label>
                  <Input
                    value={editData.car_number}
                    onChange={(e) => setEditData((prev) => ({ ...prev, car_number: e.target.value }))}
                    disabled={!canEdit}
                    className="bg-[#262626] border-gray-700 text-white text-sm h-8"
                  />
                </div>

                {/* Transponder */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Transponder</label>
                  <Input
                    value={editData.transponder_id}
                    onChange={(e) => setEditData((prev) => ({ ...prev, transponder_id: e.target.value }))}
                    disabled={!canEdit}
                    className="bg-[#262626] border-gray-700 text-white text-sm h-8"
                  />
                </div>

                {/* Wristbands */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Wristbands</label>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setEditData((prev) => ({ ...prev, wristband_count: Math.max(0, prev.wristband_count - 1) }))}
                      disabled={!canEdit}
                      className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 h-8 w-8 p-0"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-white font-semibold text-center w-8">{editData.wristband_count}</span>
                    <Button
                      onClick={() => setEditData((prev) => ({ ...prev, wristband_count: prev.wristband_count + 1 }))}
                      disabled={!canEdit}
                      className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 h-8 w-8 p-0"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2 pt-2 border-t border-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editData.waiver_verified}
                      onChange={(e) => setEditData((prev) => ({ ...prev, waiver_verified: e.target.checked }))}
                      disabled={!canEdit}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs text-gray-300">Waiver Verified</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editData.payment_status === 'Paid'}
                      onChange={(e) => setEditData((prev) => ({ ...prev, payment_status: e.target.checked ? 'Paid' : 'Unpaid' }))}
                      disabled={!canEdit}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs text-gray-300">Payment Collected</span>
                  </label>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Notes</label>
                  <Textarea
                    value={editData.notes}
                    onChange={(e) => setEditData((prev) => ({ ...prev, notes: e.target.value }))}
                    disabled={!canEdit}
                    className="bg-[#262626] border-gray-700 text-white text-xs h-16"
                  />
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-2 pt-2 border-t border-gray-700">
                  <Button
                    onClick={handleSaveUpdates}
                    disabled={!canEdit}
                    className="w-full text-xs h-8 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    Save Updates
                  </Button>
                  <Button
                    onClick={handleCheckIn}
                    disabled={!canEdit || selectedEntry.entry_status === 'Checked In'}
                    className="w-full text-xs h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    ✓ Check In
                  </Button>
                  <Button
                    onClick={handleWithdraw}
                    disabled={!canEdit || selectedEntry.entry_status === 'Withdrawn'}
                    className="w-full text-xs h-8 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <LogOut className="w-3 h-3" /> Withdraw
                  </Button>
                </div>

                {/* Recent actions */}
                {entryOperationLogs.length > 0 && (
                  <div className="pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Recent Actions</p>
                    <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                      {entryOperationLogs.map((log) => (
                        <div key={log.id} className="bg-[#262626] rounded p-1.5">
                          <p className="text-gray-300">{new Date(log.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}