/**
 * Gate Manager
 * Fast entry validation and wristband tracking for gate attendants.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, Search, QrCode, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

// Parse gate JSON from Entry.notes
function parseGateData(notesStr) {
  if (!notesStr) return { gate_wristbands: 0, gate_notes: '', waiver_verified: false, payment_collected: false };
  try {
    const data = JSON.parse(notesStr);
    if (data.gate_wristbands !== undefined) return data;
  } catch (e) {
    // notesStr is legacy notes, not JSON
    return { gate_wristbands: 0, gate_notes: notesStr || '', waiver_verified: false, payment_collected: false };
  }
  return { gate_wristbands: 0, gate_notes: '', waiver_verified: false, payment_collected: false };
}

// Serialize gate data to JSON string
function serializeGateData(gateData) {
  return JSON.stringify(gateData);
}

export default function GateManagerRefactored({
  selectedEvent,
  selectedTrack,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [scanInput, setScanInput] = useState('');

  // Check if user can mutate
  const canMutate = ['admin', 'entity_owner', 'entity_editor'].includes(dashboardPermissions?.role);

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

  const { data: drivers = [] } = useQuery({
    queryKey: ['gateManager_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['gateManager_teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 200),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['gateManager_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateEntryMutation = useMutation({
    mutationFn: ({ entryId, data }) => base44.entities.Entry.update(entryId, data),
    onSuccess: () => {
      invalidateAfterOperation('entry_updated');
      queryClient.invalidateQueries({ queryKey: REG_QK.entries(eventId) });
      setSelectedEntry(null);
      toast.success('Entry updated');
    },
    onError: (err) => {
      console.error('Failed to update entry:', err);
      toast.error('Failed to update entry');
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const classMap = useMemo(() => Object.fromEntries(seriesClasses.map((c) => [c.id, c])), [seriesClasses]);

  // Use entries if available, fallback to DriverProgram
  const hasEntries = entries.length > 0;
  const listData = useMemo(() => {
    if (entries.length > 0) return entries;
    return driverPrograms;
  }, [entries, driverPrograms]);

  // Get unique classes
  const uniqueClasses = useMemo(() => {
    const classIds = new Set();
    listData.forEach((e) => {
      if (e.series_class_id || e.event_class_id) {
        classIds.add(e.series_class_id || e.event_class_id);
      }
    });
    return Array.from(classIds);
  }, [listData]);

  // Filter and search
  const filteredEntries = useMemo(() => {
    let result = [...listData];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((e) => {
        const driver = driverMap[e.driver_id];
        const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
        const carNum = (e.car_number || driver?.primary_number || '').toString();
        const team = teamMap[e.team_id];
        const teamName = team ? team.name.toLowerCase() : '';
        const transponder = (e.transponder_id || '').toString().toLowerCase();
        return (
          driverName.includes(term) ||
          carNum.includes(term) ||
          teamName.includes(term) ||
          transponder.includes(term)
        );
      });
    }

    // Class filter
    if (classFilter !== 'all') {
      result = result.filter((e) => (e.series_class_id || e.event_class_id) === classFilter);
    }

    // Status filter (if Entry data exists)
    if (statusFilter !== 'all' && hasEntries) {
      result = result.filter((e) => {
        if (statusFilter === 'Registered') return e.entry_status !== 'Checked In';
        if (statusFilter === 'Checked In') return e.entry_status === 'Checked In';
        return true;
      });
    }

    // Payment filter (if Entry data exists)
    if (paymentFilter !== 'all' && hasEntries) {
      result = result.filter((e) => {
        if (paymentFilter === 'Paid') return e.payment_status === 'Paid';
        if (paymentFilter === 'Unpaid') return e.payment_status === 'Unpaid';
        return true;
      });
    }

    return result.sort((a, b) => {
      const driverA = driverMap[a.driver_id];
      const driverB = driverMap[b.driver_id];
      const nameA = driverA ? `${driverA.first_name} ${driverA.last_name}`.toLowerCase() : '';
      const nameB = driverB ? `${driverB.first_name} ${driverB.last_name}`.toLowerCase() : '';
      return nameA.localeCompare(nameB);
    });
  }, [listData, searchTerm, classFilter, statusFilter, paymentFilter, hasEntries, driverMap, teamMap]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleCheckIn = useCallback((entry) => {
    if (!hasEntries) {
      toast.error('Entry tracking requires Entry records, create entries first');
      return;
    }
    if (!canMutate) {
      toast.error('No permission');
      return;
    }

    const newStatus = entry.entry_status === 'Checked In' ? 'Registered' : 'Checked In';
    updateEntryMutation.mutate({
      entryId: entry.id,
      data: { entry_status: newStatus },
    });
  }, [hasEntries, canMutate, updateEntryMutation]);

  const handleWristbandChange = useCallback((entry, delta) => {
    if (!hasEntries) {
      toast.error('Entry tracking requires Entry records, create entries first');
      return;
    }
    if (!canMutate) {
      toast.error('No permission');
      return;
    }

    const gateData = parseGateData(entry.notes);
    gateData.gate_wristbands = Math.max(0, (gateData.gate_wristbands || 0) + delta);

    updateEntryMutation.mutate({
      entryId: entry.id,
      data: { notes: serializeGateData(gateData) },
    });
  }, [hasEntries, canMutate, updateEntryMutation]);

  const handleSaveDrawer = useCallback((entry, gateData) => {
    if (!hasEntries) {
      toast.error('Entry tracking requires Entry records, create entries first');
      return;
    }
    if (!canMutate) {
      toast.error('No permission');
      return;
    }

    updateEntryMutation.mutate({
      entryId: entry.id,
      data: { notes: serializeGateData(gateData) },
    });
  }, [hasEntries, canMutate, updateEntryMutation]);

  const handleScanSubmit = useCallback(() => {
    if (!scanInput.trim()) return;
    // Search for the scanned code (transponder, car number, or driver name)
    const term = scanInput.toLowerCase();
    const found = filteredEntries.find((e) => {
      const driver = driverMap[e.driver_id];
      const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
      const carNum = (e.car_number || driver?.primary_number || '').toString();
      const transponder = (e.transponder_id || '').toString().toLowerCase();
      return driverName.includes(term) || carNum === term || transponder === term;
    });

    if (found) {
      setSelectedEntry(found);
      setEditingEntry(parseGateData(found.notes));
      setShowScanDialog(false);
      setScanInput('');
    } else {
      toast.error('Entry not found');
    }
  }, [scanInput, filteredEntries, driverMap]);

  // ── Empty state ────────────────────────────────────────────────────────────

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
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white text-2xl">Gate</CardTitle>
              <p className="text-sm text-gray-400 mt-1">Fast entry validation and wristbands</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 border-t border-gray-700 pt-4">
          {/* Search and Scan Row */}
          <div className="flex gap-2">
            <Input
              placeholder="Search driver, car number, transponder, team"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#262626] border-gray-700 text-white flex-1"
            />
            <Button
              onClick={() => setShowScanDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-10 px-3"
            >
              <QrCode className="w-4 h-4" />
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-3 gap-2">
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
                      {classMap[classId]?.class_name || classId.slice(0, 6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
                disabled={!hasEntries}
              >
                <SelectTrigger className={`text-xs h-9 ${!hasEntries ? 'opacity-50 cursor-not-allowed' : ''} bg-[#262626] border-gray-700 text-white`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="all" className="text-white">All</SelectItem>
                  <SelectItem value="Registered" className="text-white">Registered</SelectItem>
                  <SelectItem value="Checked In" className="text-white">Checked In</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Payment</label>
              <Select
                value={paymentFilter}
                onValueChange={setPaymentFilter}
                disabled={!hasEntries}
              >
                <SelectTrigger className={`text-xs h-9 ${!hasEntries ? 'opacity-50 cursor-not-allowed' : ''} bg-[#262626] border-gray-700 text-white`}>
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

          {!hasEntries && (
            <div className="bg-amber-900/20 border border-amber-800 rounded p-3">
              <p className="text-xs text-amber-300">
                No Entry records yet. Status and Payment filters are disabled. Create entries to enable full functionality.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Entry List ────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="pt-6">
          {filteredEntries.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">No entries found</p>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => {
                const driver = driverMap[entry.driver_id];
                const cls = classMap[entry.series_class_id || entry.event_class_id];
                const isCheckedIn = entry.entry_status === 'Checked In';
                const gateData = parseGateData(entry.notes);

                return (
                  <div
                    key={entry.id}
                    className="bg-[#262626] border border-gray-700 rounded p-3 hover:bg-[#2A2A2A] cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedEntry(entry);
                      setEditingEntry(gateData);
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left side */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-3">
                          <span className="text-lg font-mono font-bold text-white">
                            #{entry.car_number || driver?.primary_number || '—'}
                          </span>
                          <span className="text-sm text-gray-300 truncate">
                            {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge className="text-xs bg-gray-700 text-gray-300">
                            {cls?.class_name || 'Unassigned'}
                          </Badge>
                          {isCheckedIn && (
                            <Badge className="text-xs bg-green-900/50 text-green-300">✓ In</Badge>
                          )}
                          {entry.waiver_verified && (
                            <Badge className="text-xs bg-blue-900/50 text-blue-300">Waiver</Badge>
                          )}
                          {entry.payment_status === 'Paid' && (
                            <Badge className="text-xs bg-blue-900/50 text-blue-300">Paid</Badge>
                          )}
                          {entry.tech_status === 'Passed' && (
                            <Badge className="text-xs bg-blue-900/50 text-blue-300">Tech</Badge>
                          )}
                        </div>
                      </div>

                      {/* Right side actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 bg-[#171717] rounded px-2 py-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWristbandChange(entry, -1);
                            }}
                            disabled={!canMutate}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm font-semibold text-white w-6 text-center">
                            {gateData.gate_wristbands || 0}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWristbandChange(entry, 1);
                            }}
                            disabled={!canMutate}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckIn(entry);
                          }}
                          disabled={!canMutate}
                          className={`text-xs h-9 px-3 ${
                            isCheckedIn
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-600 hover:bg-gray-700'
                          } disabled:opacity-50 text-white`}
                        >
                          {isCheckedIn ? '✓ In' : 'Check In'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Entry Drawer ──────────────────────────────────────────────────── */}
      <Sheet open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <SheetContent className="bg-[#171717] border-gray-800 w-full sm:max-w-md">
          {selectedEntry && editingEntry && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">
                  {driverMap[selectedEntry.driver_id]
                    ? `${driverMap[selectedEntry.driver_id].first_name} ${driverMap[selectedEntry.driver_id].last_name}`
                    : 'Entry'}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6 py-6 overflow-y-auto max-h-[calc(100vh-120px)]">
                {/* Basic Info */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Details</p>
                  <div className="bg-[#262626] rounded p-3 space-y-2 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Car Number</p>
                      <p className="text-white">
                        #{selectedEntry.car_number || driverMap[selectedEntry.driver_id]?.primary_number || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Class</p>
                      <p className="text-white">
                        {classMap[selectedEntry.series_class_id || selectedEntry.event_class_id]?.class_name || 'Unassigned'}
                      </p>
                    </div>
                    {teamMap[selectedEntry.team_id] && (
                      <div>
                        <p className="text-gray-500 text-xs">Team</p>
                        <p className="text-white">{teamMap[selectedEntry.team_id].name}</p>
                      </div>
                    )}
                    {selectedEntry.transponder_id && (
                      <div>
                        <p className="text-gray-500 text-xs">Transponder</p>
                        <p className="text-white font-mono">{selectedEntry.transponder_id}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status and Payment (if Entry exists) */}
                {hasEntries && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between bg-[#262626] rounded p-2">
                        <span className="text-gray-400">Check In</span>
                        <Badge
                          className={`text-xs ${
                            selectedEntry.entry_status === 'Checked In'
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-gray-900/50 text-gray-300'
                          }`}
                        >
                          {selectedEntry.entry_status || 'Registered'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between bg-[#262626] rounded p-2">
                        <span className="text-gray-400">Payment</span>
                        <Badge
                          className={`text-xs ${
                            selectedEntry.payment_status === 'Paid'
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-yellow-900/50 text-yellow-300'
                          }`}
                        >
                          {selectedEntry.payment_status || 'Unpaid'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wristbands */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Wristbands</p>
                  <div className="bg-[#262626] rounded p-4 flex items-center justify-between">
                    <span className="text-gray-400">Issued</span>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          editingEntry.gate_wristbands = Math.max(0, editingEntry.gate_wristbands - 1);
                          setEditingEntry({ ...editingEntry });
                        }}
                        disabled={!canMutate}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-2xl font-bold text-white w-8 text-center">
                        {editingEntry.gate_wristbands || 0}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          editingEntry.gate_wristbands = (editingEntry.gate_wristbands || 0) + 1;
                          setEditingEntry({ ...editingEntry });
                        }}
                        disabled={!canMutate}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Gate Notes */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Gate Notes</p>
                  <Textarea
                    placeholder="Add notes here..."
                    value={editingEntry.gate_notes || ''}
                    onChange={(e) => {
                      editingEntry.gate_notes = e.target.value;
                      setEditingEntry({ ...editingEntry });
                    }}
                    disabled={!canMutate}
                    className="bg-[#262626] border-gray-700 text-white min-h-24 text-xs"
                  />
                </div>

                {!canMutate && (
                  <div className="bg-gray-900/30 border border-gray-700 rounded p-3">
                    <p className="text-xs text-gray-400">
                      View only. Mutations require admin or editor role.
                    </p>
                  </div>
                )}
              </div>

              {canMutate && (
                <div className="border-t border-gray-700 pt-4 mt-6 flex gap-2">
                  <Button
                    onClick={() => setSelectedEntry(null)}
                    className="flex-1 border-gray-700 text-gray-300 bg-gray-900 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleSaveDrawer(selectedEntry, editingEntry)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Save
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Scan Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
        <DialogContent className="bg-[#262626] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Scan Entry</DialogTitle>
            <DialogDescription className="text-gray-400">
              QR scan coming soon. Enter car number, driver name, or transponder ID manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Car number, driver name, or transponder..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleScanSubmit();
                }
              }}
              className="bg-[#171717] border-gray-700 text-white"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowScanDialog(false)}
              className="border-gray-700 text-gray-300 bg-gray-900 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleScanSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Find Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}