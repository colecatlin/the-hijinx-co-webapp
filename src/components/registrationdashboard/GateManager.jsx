/**
 * Gate Manager
 * Fast entry validation and check-in for gate attendants.
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
  SheetDescription,
} from '@/components/ui/sheet';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, CheckCircle2, XCircle, Search, Download } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function GateManager({
  selectedEvent,
  selectedTrack,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);
  const [showCheckedIn, setShowCheckedIn] = useState(true);
  const [showNotCheckedIn, setShowNotCheckedIn] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);

  // Check if user can perform mutations
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
      invalidateAfterOperation('entry_updated', { eventId });
      queryClient.invalidateQueries({ queryKey: REG_QK.entries(eventId) });
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
  const listData = useMemo(() => {
    if (entries.length > 0) return entries;
    return driverPrograms.map((dp) => ({
      id: dp.id,
      event_id: dp.event_id,
      driver_id: dp.driver_id,
      series_class_id: dp.series_class_id,
      team_id: dp.team_id,
      car_number: dp.car_number,
      _from_driver_program: true,
    }));
  }, [entries, driverPrograms]);

  // Compute entry flags
  const getFlags = (entry) => {
    const flags = [];
    if (!entry.transponder_id) flags.push('no_xpndr');
    if (entry.payment_status === 'Unpaid') flags.push('unpaid');
    if (!entry.waiver_verified) flags.push('no_waiver');
    if (entry.tech_status && entry.tech_status !== 'Passed') flags.push('tech_pending');
    return flags;
  };

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

    // Check-in status filter
    const isCheckedIn = (e) => e.entry_status === 'Checked In' || e.gate_checked_in === true;
    if (showOnlyIssues) {
      result = result.filter((e) => getFlags(e).length > 0);
    } else {
      if (!showCheckedIn) {
        result = result.filter((e) => !isCheckedIn(e));
      }
      if (!showNotCheckedIn) {
        result = result.filter((e) => isCheckedIn(e));
      }
    }

    return result.sort((a, b) => {
      const driverA = driverMap[a.driver_id];
      const driverB = driverMap[b.driver_id];
      const nameA = driverA ? `${driverA.first_name} ${driverA.last_name}`.toLowerCase() : '';
      const nameB = driverB ? `${driverB.first_name} ${driverB.last_name}`.toLowerCase() : '';
      return nameA.localeCompare(nameB);
    });
  }, [listData, searchTerm, showOnlyIssues, showCheckedIn, showNotCheckedIn, driverMap, teamMap]);

  // Quick stats
  const stats = useMemo(() => {
    const checkedInCount = listData.filter((e) => e.entry_status === 'Checked In' || e.gate_checked_in === true).length;
    const issueCount = listData.filter((e) => getFlags(e).length > 0).length;
    return {
      total: listData.length,
      checkedIn: checkedInCount,
      notCheckedIn: listData.length - checkedInCount,
      issues: issueCount,
    };
  }, [listData]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleCheckIn = useCallback((entry) => {
    if (!entry.id || entry._from_driver_program) {
      toast.error('Check in fields not wired yet');
      return;
    }
    updateEntryMutation.mutate({
      entryId: entry.id,
      data: { entry_status: 'Checked In' },
    });
  }, [updateEntryMutation]);

  const handleToggleWaiver = useCallback((entry) => {
    if (!entry.id || entry._from_driver_program) {
      toast.error('Waiver fields not wired yet');
      return;
    }
    updateEntryMutation.mutate({
      entryId: entry.id,
      data: { waiver_verified: !entry.waiver_verified },
    });
  }, [updateEntryMutation]);

  const handleTogglePayment = useCallback((entry) => {
    if (!entry.id || entry._from_driver_program) {
      toast.error('Payment fields not wired yet');
      return;
    }
    updateEntryMutation.mutate({
      entryId: entry.id,
      data: { payment_status: entry.payment_status === 'Paid' ? 'Unpaid' : 'Paid' },
    });
  }, [updateEntryMutation]);

  const handleExportCSV = useCallback(() => {
    const rows = [['Car Number', 'Driver Name', 'Class', 'Team', 'Check In Status', 'Flags']];
    filteredEntries.forEach((entry) => {
      const driver = driverMap[entry.driver_id];
      const cls = classMap[entry.series_class_id];
      const team = teamMap[entry.team_id];
      const isCheckedIn = entry.entry_status === 'Checked In' || entry.gate_checked_in === true;
      rows.push([
        entry.car_number || driver?.primary_number || '—',
        driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown',
        cls?.class_name || 'Unassigned',
        team?.name || '—',
        isCheckedIn ? 'Checked In' : 'Not Checked In',
        getFlags(entry).join(', ') || 'None',
      ]);
    });

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gate_list_${selectedEvent.name || 'event'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [filteredEntries, driverMap, classMap, teamMap, selectedEvent.name]);

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
              {selectedTrack && (
                <p className="text-sm text-gray-400 mt-1">{selectedEvent.name} • {selectedTrack.name}</p>
              )}
            </div>
            <Button
              onClick={handleExportCSV}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
            >
              <Download className="w-3 h-3 mr-1" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search driver, car number, team, transponder..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#262626] border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Filter toggles */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowOnlyIssues(!showOnlyIssues);
                setShowCheckedIn(true);
                setShowNotCheckedIn(true);
              }}
              className={`text-xs ${
                showOnlyIssues
                  ? 'bg-red-900/40 border-red-700 text-red-300'
                  : 'border-gray-700 text-gray-300 hover:text-white'
              }`}
            >
              Show only issues
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCheckedIn(!showCheckedIn)}
              className={`text-xs ${
                showCheckedIn
                  ? 'bg-green-900/40 border-green-700 text-green-300'
                  : 'border-gray-700 text-gray-300 hover:text-white'
              }`}
            >
              Show checked in
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNotCheckedIn(!showNotCheckedIn)}
              className={`text-xs ${
                showNotCheckedIn
                  ? 'bg-yellow-900/40 border-yellow-700 text-yellow-300'
                  : 'border-gray-700 text-gray-300 hover:text-white'
              }`}
            >
              Show not checked in
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Quick Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-4">
            <p className="text-gray-400 text-xs mb-1">Total Entries</p>
            <p className="text-white text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-4">
            <p className="text-gray-400 text-xs mb-1">Checked In</p>
            <p className="text-green-400 text-2xl font-bold">{stats.checkedIn}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-4">
            <p className="text-gray-400 text-xs mb-1">Not Checked In</p>
            <p className="text-yellow-400 text-2xl font-bold">{stats.notCheckedIn}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-4">
            <p className="text-gray-400 text-xs mb-1">Issues</p>
            <p className="text-red-400 text-2xl font-bold">{stats.issues}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Entry Table ───────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="pt-6">
          {filteredEntries.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">No entries found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-500 px-3 py-2 font-medium">Car</th>
                    <th className="text-left text-gray-500 px-3 py-2 font-medium">Driver</th>
                    <th className="text-left text-gray-500 px-3 py-2 font-medium">Class</th>
                    <th className="text-left text-gray-500 px-3 py-2 font-medium">Team</th>
                    <th className="text-left text-gray-500 px-3 py-2 font-medium">Status</th>
                    <th className="text-left text-gray-500 px-3 py-2 font-medium">Flags</th>
                    <th className="text-left text-gray-500 px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const driver = driverMap[entry.driver_id];
                    const cls = classMap[entry.series_class_id];
                    const team = teamMap[entry.team_id];
                    const flags = getFlags(entry);
                    const isCheckedIn = entry.entry_status === 'Checked In' || entry.gate_checked_in === true;

                    return (
                      <tr
                        key={entry.id}
                        className="border-b border-gray-800 hover:bg-[#262626] cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedEntry(entry);
                          setEditingEntry({ ...entry });
                        }}
                      >
                        <td className="px-3 py-3 text-white font-mono">
                          #{entry.car_number || driver?.primary_number || '—'}
                        </td>
                        <td className="px-3 py-3 text-gray-300">
                          {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}
                        </td>
                        <td className="px-3 py-3 text-gray-400 text-xs">{cls?.class_name || 'Unassigned'}</td>
                        <td className="px-3 py-3 text-gray-400 text-xs">{team?.name || '—'}</td>
                        <td className="px-3 py-3">
                          <Badge
                            className={`text-xs ${
                              isCheckedIn
                                ? 'bg-green-900/40 text-green-300'
                                : 'bg-yellow-900/40 text-yellow-300'
                            }`}
                          >
                            {isCheckedIn ? '✓ In' : '○ Out'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          {flags.length > 0 ? (
                            <Badge className="bg-red-900/40 text-red-300 text-xs">
                              {flags.length} flag{flags.length !== 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge className="bg-green-900/40 text-green-300 text-xs">✓</Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEntry(entry);
                              setEditingEntry({ ...entry });
                            }}
                            className="border-gray-700 text-gray-300 text-xs h-7"
                          >
                            View
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

      {/* ── Detail Sheet ──────────────────────────────────────────────────── */}
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
                <SheetDescription className="text-gray-400">
                  {selectedEvent.name}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-6 overflow-y-auto max-h-[calc(100vh-120px)]">
                {/* Basic Info */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Details</p>
                  <div className="bg-[#262626] rounded p-3 space-y-2 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Car Number</p>
                      <p className="text-white">
                        #{editingEntry.car_number || driverMap[selectedEntry.driver_id]?.primary_number || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Class</p>
                      <p className="text-white">{classMap[selectedEntry.series_class_id]?.class_name || 'Unassigned'}</p>
                    </div>
                    {teamMap[selectedEntry.team_id] && (
                      <div>
                        <p className="text-gray-500 text-xs">Team</p>
                        <p className="text-white">{teamMap[selectedEntry.team_id].name}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Toggles */}
                {!selectedEntry._from_driver_program && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Actions</p>
                    <div className="space-y-2">
                      <Button
                        onClick={() => handleCheckIn(selectedEntry)}
                        disabled={!canMutate}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs h-9"
                      >
                        {editingEntry.entry_status === 'Checked In' ? '✓ Checked In' : 'Check In'}
                      </Button>
                      <Button
                        onClick={() => handleToggleWaiver(selectedEntry)}
                        disabled={!canMutate}
                        className={`w-full text-xs h-9 ${
                          editingEntry.waiver_verified
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-gray-700 hover:bg-gray-600'
                        } disabled:opacity-50 text-white`}
                      >
                        {editingEntry.waiver_verified ? '✓ Waiver Verified' : 'Verify Waiver'}
                      </Button>
                      <Button
                        onClick={() => handleTogglePayment(selectedEntry)}
                        disabled={!canMutate}
                        className={`w-full text-xs h-9 ${
                          editingEntry.payment_status === 'Paid'
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-gray-700 hover:bg-gray-600'
                        } disabled:opacity-50 text-white`}
                      >
                        {editingEntry.payment_status === 'Paid' ? '✓ Payment Received' : 'Mark Payment'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Flags */}
                {getFlags(selectedEntry).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Issues</p>
                    <div className="bg-red-900/20 border border-red-800 rounded p-3 space-y-1">
                      {getFlags(selectedEntry).map((flag, idx) => (
                        <p key={idx} className="text-xs text-red-300">
                          • {flag === 'no_xpndr' && 'Missing transponder'}
                          {flag === 'unpaid' && 'Not paid'}
                          {flag === 'no_waiver' && 'Waiver not verified'}
                          {flag === 'tech_pending' && 'Tech not passed'}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Not wired message */}
                {selectedEntry._from_driver_program && (
                  <div className="bg-amber-900/20 border border-amber-800 rounded p-3">
                    <p className="text-xs text-amber-300">
                      Entry fields not connected yet. Contact admin to wire Entry entity for gate operations.
                    </p>
                  </div>
                )}

                {!canMutate && (
                  <div className="bg-gray-900/30 border border-gray-700 rounded p-3">
                    <p className="text-xs text-gray-400">
                      View only. Mutations require admin or entity editor role.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}