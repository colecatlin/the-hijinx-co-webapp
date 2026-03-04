/**
 * Gate Manager
 * Entry lookups, wristband counts, and quick status toggles.
 * Uses Entry when available, falls back to DriverProgram.
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
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, Plus, Minus, Link as LinkIcon, X } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

// ── Entity Detection ───────────────────────────────────────────────────────

function hasEntryEntity() {
  try {
    return !!base44?.entities?.Entry;
  } catch {
    return false;
  }
}

// ── Helper Functions ───────────────────────────────────────────────────────

function getStatusBadgeClass(status) {
  const colors = {
    'Paid': 'bg-green-900/50 text-green-300',
    'Unpaid': 'bg-red-900/50 text-red-300',
    'Verified': 'bg-green-900/50 text-green-300',
    'Missing': 'bg-red-900/50 text-red-300',
    'Passed': 'bg-green-900/50 text-green-300',
    'Failed': 'bg-red-900/50 text-red-300',
    'Pending': 'bg-yellow-900/50 text-yellow-300',
    'Checked In': 'bg-blue-900/50 text-blue-300',
    'Not Checked In': 'bg-gray-700 text-gray-300',
    'Unknown': 'bg-gray-700 text-gray-300',
  };
  return colors[status] || 'bg-gray-700 text-gray-300';
}

function sortEntries(entries) {
  return entries.sort((a, b) => {
    // Issues first
    const aHasIssue = (a.hasIssues || false);
    const bHasIssue = (b.hasIssues || false);
    if (aHasIssue !== bHasIssue) return bHasIssue ? 1 : -1;

    // Then by driver last name
    const aName = (a.driverName || '').split(' ').pop();
    const bName = (b.driverName || '').split(' ').pop();
    return aName.localeCompare(bName);
  });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GateManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
}) {
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const canUpdate = dashboardPermissions?.actions?.includes('export') || dashboardPermissions?.role === 'admin';

  // ── State ──────────────────────────────────────────────────────────────────

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [drawerData, setDrawerData] = useState({});

  const useEntry = hasEntryEntity();

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: sessions = [] } = useQuery({
    queryKey: REG_QK.sessions(eventId),
    queryFn: () => (eventId ? base44.entities.Session.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: entries = [] } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () =>
      useEntry && eventId
        ? base44.entities.Entry.filter({ event_id: eventId })
        : Promise.resolve([]),
    enabled: !!eventId && useEntry,
    ...DQ,
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['gateManager_driverPrograms'],
    queryFn: () =>
      !useEntry && eventId
        ? base44.entities.DriverProgram.filter({ event_id: eventId })
        : Promise.resolve([]),
    enabled: !!eventId && !useEntry,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['gateManager_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
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
    mutationFn: ({ entryId, data }) =>
      useEntry ? base44.entities.Entry.update(entryId, data) : Promise.resolve(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REG_QK.entries(eventId) });
      toast.success('Entry updated');
      setDrawerOpen(false);
    },
    onError: (err) => {
      console.error('Failed to update entry:', err);
      toast.error('Failed to update entry');
    },
  });

  const createOperationLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
    onSuccess: () => {
      toast.success('Change logged');
    },
    onError: (err) => {
      console.error('Failed to log operation:', err);
      toast.error('Failed to log operation');
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const classMap = useMemo(
    () => Object.fromEntries(seriesClasses.map((c) => [c.id, c])),
    [seriesClasses]
  );

  // Get unique classes from sessions or entries
  const uniqueClasses = useMemo(() => {
    const classIds = new Set();

    // From sessions
    sessions.forEach((s) => {
      if (s.series_class_id || s.event_class_id) {
        classIds.add(s.series_class_id || s.event_class_id);
      }
    });

    // From entries
    if (useEntry) {
      entries.forEach((e) => {
        if (e.event_class_id) classIds.add(e.event_class_id);
      });
    } else {
      driverPrograms.forEach((dp) => {
        if (dp.series_class_id) classIds.add(dp.series_class_id);
      });
    }

    return Array.from(classIds);
  }, [sessions, entries, driverPrograms, useEntry]);

  // Normalize data to unified list with helper fields
  const normalizedList = useMemo(() => {
    const raw = useEntry ? entries : driverPrograms;
    return raw.map((item) => {
      const driver = driverMap[item.driver_id];
      const className =
        classMap[item.event_class_id || item.series_class_id]?.class_name || 'Unassigned';

      let metadata = {};
      try {
        if (typeof item.notes === 'string' && item.notes.startsWith('{')) {
          metadata = JSON.parse(item.notes);
        }
      } catch {
        // notes is plain text
      }

      // Derive status fields
      const paymentStatus = item.payment_status || 'Unknown';
      const waiverStatus = item.waiver_verified ? 'Verified' : item.waiver_verified === false ? 'Missing' : 'Unknown';
      const techStatus = item.tech_status || 'Unknown';
      const checkinStatus = item.entry_status === 'Checked In' ? 'Checked In' : 'Not Checked In';
      const wristbandCount = item.wristband_count || 0;

      // Flags
      const hasIssues =
        paymentStatus === 'Unpaid' ||
        waiverStatus === 'Missing' ||
        techStatus === 'Failed' ||
        techStatus === 'Pending' ||
        (item.transponder_id === null || item.transponder_id === '');

      return {
        id: item.id,
        driver_id: item.driver_id,
        driverName: driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown',
        carNumber: item.car_number || '—',
        className,
        paymentStatus,
        waiverStatus,
        techStatus,
        checkinStatus,
        wristbandCount,
        entry_status: item.entry_status || 'Registered',
        waiver_verified: item.waiver_verified,
        notes: item.notes,
        hasIssues,
        originalItem: item,
      };
    });
  }, [entries, driverPrograms, driverMap, classMap, useEntry]);

  // Filter list
  const filteredList = useMemo(() => {
    let result = [...normalizedList];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.driverName.toLowerCase().includes(q) ||
          e.carNumber.toLowerCase().includes(q)
      );
    }

    // Class filter
    if (classFilter !== 'all') {
      result = result.filter((e) => {
        const classId = e.originalItem.event_class_id || e.originalItem.series_class_id;
        return classId === classFilter;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((e) => e.entry_status === statusFilter);
    }

    // Issues only
    if (showIssuesOnly) {
      result = result.filter((e) => e.hasIssues);
    }

    return sortEntries(result);
  }, [normalizedList, search, classFilter, statusFilter, showIssuesOnly]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleOpenDrawer = useCallback((entry) => {
    setSelectedEntry(entry);
    setDrawerData({
      checkinStatus: entry.checkinStatus,
      waiverStatus: entry.waiverStatus,
      wristbandCount: entry.wristbandCount,
      notes: typeof entry.notes === 'string' && !entry.notes.startsWith('{') ? entry.notes : '',
    });
    setDrawerOpen(true);
  }, []);

  const handleSaveEntry = useCallback(() => {
    if (!useEntry || !selectedEntry || !canUpdate) return;

    const updateData = {};
    let changed = [];

    // Check in status
    if (drawerData.checkinStatus !== selectedEntry.checkinStatus) {
      updateData.entry_status = drawerData.checkinStatus === 'Checked In' ? 'Checked In' : 'Registered';
      changed.push(`entry_status to ${updateData.entry_status}`);
    }

    // Waiver
    if (drawerData.waiverStatus !== selectedEntry.waiverStatus) {
      updateData.waiver_verified = drawerData.waiverStatus === 'Verified';
      changed.push(`waiver_verified to ${updateData.waiver_verified}`);
    }

    // Wristbands
    if (drawerData.wristbandCount !== selectedEntry.wristbandCount) {
      updateData.wristband_count = drawerData.wristbandCount;
      changed.push(`wristband_count to ${drawerData.wristbandCount}`);
    }

    // Notes
    if (drawerData.notes !== selectedEntry.notes) {
      updateData.notes = drawerData.notes;
      changed.push('notes updated');
    }

    if (changed.length === 0) {
      toast.info('No changes to save');
      return;
    }

    // Log operation
    createOperationLogMutation.mutate({
      operation_type: 'gate_update',
      source_type: 'dashboard',
      entity_name: 'Entry',
      entity_id: selectedEntry.id,
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        entry_id: selectedEntry.id,
        changed_fields: changed,
      }),
    });

    // Update entry
    updateEntryMutation.mutate({
      entryId: selectedEntry.id,
      data: updateData,
    });
  }, [selectedEntry, drawerData, useEntry, canUpdate, eventId, updateEntryMutation, createOperationLogMutation]);

  const handleClear = useCallback(() => {
    setSearch('');
    setClassFilter('all');
    setStatusFilter('all');
    setShowIssuesOnly(false);
  }, []);

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
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-white text-2xl">Gate</CardTitle>
              <p className="text-sm text-gray-400 mt-1">Search, confirm, wristbands, quick status</p>
            </div>
          </div>
        </CardHeader>

        {/* Controls */}
        <CardContent className="space-y-3 border-t border-gray-700 pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Driver name, car number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#262626] border-gray-700 text-white text-sm h-9 flex-1"
            />
            <Button
              onClick={handleClear}
              variant="outline"
              className="border-gray-700 text-gray-300 h-9 text-xs"
            >
              <X className="w-3 h-3" /> Clear
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
                      {classMap[classId]?.class_name || classId.slice(0, 6)}
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
                  <SelectItem value="all" className="text-white">All Statuses</SelectItem>
                  <SelectItem value="Registered" className="text-white">Registered</SelectItem>
                  <SelectItem value="Checked In" className="text-white">Checked In</SelectItem>
                  <SelectItem value="Withdrawn" className="text-white">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end col-span-2 md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showIssuesOnly}
                  onChange={(e) => setShowIssuesOnly(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs text-gray-400">Issues only</span>
              </label>
            </div>
          </div>

          {!useEntry && (
            <p className="text-xs text-gray-500 italic">
              Using fallback data mode (DriverProgram). Full tracking unavailable until Entry workflow is active.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Results List ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {filteredList.length === 0 ? (
          <Card className="bg-[#171717] border-gray-800">
            <CardContent className="py-12 text-center text-gray-500 text-sm">
              No entries found
            </CardContent>
          </Card>
        ) : (
          filteredList.map((entry) => (
            <Card
              key={entry.id}
              onClick={() => handleOpenDrawer(entry)}
              className={`bg-[#171717] border-gray-800 cursor-pointer hover:border-gray-600 transition-colors ${
                entry.hasIssues ? 'border-red-800/50' : ''
              }`}
            >
              <CardContent className="p-3 md:p-4 space-y-2">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm">{entry.driverName}</p>
                    <p className="text-xs text-gray-400">
                      #{entry.carNumber} • {entry.className}
                    </p>
                  </div>
                  {entry.hasIssues && (
                    <Badge className="text-xs bg-red-900/50 text-red-300 whitespace-nowrap">
                      Issues
                    </Badge>
                  )}
                </div>

                {/* Status Pills */}
                <div className="flex flex-wrap gap-1">
                  <Badge className={`text-xs ${getStatusBadgeClass(entry.paymentStatus)}`}>
                    {entry.paymentStatus}
                  </Badge>
                  <Badge className={`text-xs ${getStatusBadgeClass(entry.waiverStatus)}`}>
                    {entry.waiverStatus}
                  </Badge>
                  <Badge className={`text-xs ${getStatusBadgeClass(entry.techStatus)}`}>
                    {entry.techStatus}
                  </Badge>
                  <Badge className={`text-xs ${getStatusBadgeClass(entry.checkinStatus)}`}>
                    {entry.checkinStatus}
                  </Badge>
                  {entry.wristbandCount > 0 && (
                    <Badge className="text-xs bg-purple-900/50 text-purple-300">
                      {entry.wristbandCount} wristbands
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── Detail Drawer ─────────────────────────────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="bg-[#171717] border-t border-gray-800">
          <DrawerHeader className="text-white border-b border-gray-800">
            <DrawerTitle className="text-white">
              {selectedEntry?.driverName} #{selectedEntry?.carNumber}
            </DrawerTitle>
          </DrawerHeader>

          {selectedEntry && (
            <div className="overflow-y-auto max-h-[80vh] p-4 space-y-4">
              {/* Driver link */}
              {selectedEntry.driver_id && (
                <div>
                  <a
                    href={createPageUrl(`DriverProfile?driverId=${selectedEntry.driver_id}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-semibold"
                  >
                    <LinkIcon className="w-3 h-3" /> View Driver Profile
                  </a>
                </div>
              )}

              {/* Toggles */}
              {useEntry && (
                <div className="space-y-3 bg-[#262626] rounded p-3 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Check In Status</span>
                    <button
                      onClick={() =>
                        setDrawerData((prev) => ({
                          ...prev,
                          checkinStatus:
                            prev.checkinStatus === 'Checked In' ? 'Not Checked In' : 'Checked In',
                        }))
                      }
                      disabled={!canUpdate}
                      className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                        drawerData.checkinStatus === 'Checked In'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      } ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {drawerData.checkinStatus}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Waiver Verified</span>
                    <button
                      onClick={() =>
                        setDrawerData((prev) => ({
                          ...prev,
                          waiverStatus: prev.waiverStatus === 'Verified' ? 'Missing' : 'Verified',
                        }))
                      }
                      disabled={!canUpdate}
                      className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                        drawerData.waiverStatus === 'Verified'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-300'
                      } ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {drawerData.waiverStatus}
                    </button>
                  </div>
                </div>
              )}

              {/* Wristbands */}
              {useEntry && (
                <div className="bg-[#262626] rounded p-3 border border-gray-700 space-y-2">
                  <label className="text-sm text-gray-300 block">Wristbands Issued</label>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() =>
                        setDrawerData((prev) => ({
                          ...prev,
                          wristbandCount: Math.max(0, prev.wristbandCount - 1),
                        }))
                      }
                      disabled={!canUpdate || drawerData.wristbandCount === 0}
                      className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 h-9 w-9 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-white font-semibold text-lg min-w-[3rem] text-center">
                      {drawerData.wristbandCount}
                    </span>
                    <Button
                      onClick={() =>
                        setDrawerData((prev) => ({
                          ...prev,
                          wristbandCount: prev.wristbandCount + 1,
                        }))
                      }
                      disabled={!canUpdate}
                      className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 h-9 w-9 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes */}
              {useEntry && (
                <div className="bg-[#262626] rounded p-3 border border-gray-700 space-y-2">
                  <label className="text-sm text-gray-300 block">Notes</label>
                  <Textarea
                    placeholder="Optional notes..."
                    value={drawerData.notes}
                    onChange={(e) =>
                      setDrawerData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    disabled={!canUpdate}
                    className="bg-[#171717] border-gray-700 text-white text-xs h-24"
                  />
                </div>
              )}

              {/* Save button */}
              {useEntry && (
                <Button
                  onClick={handleSaveEntry}
                  disabled={!canUpdate || updateEntryMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold h-10"
                >
                  {updateEntryMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              )}

              {!useEntry && (
                <p className="text-xs text-gray-500 italic bg-[#262626] rounded p-3 border border-gray-700">
                  Fallback mode active. Tracking features unavailable until Entry workflow is enabled.
                </p>
              )}

              {!canUpdate && (
                <p className="text-xs text-yellow-600 bg-yellow-900/20 rounded p-3 border border-yellow-900">
                  No permission to update gate statuses. Contact an administrator.
                </p>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}