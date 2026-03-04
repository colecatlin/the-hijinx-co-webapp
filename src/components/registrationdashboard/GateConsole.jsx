/**
 * Gate Console
 * Validate entry status fast—scan, search, view status indicators, toggle states locally or persist if fields exist.
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { AlertCircle, QrCode, Search, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function GateConsole({
  selectedEvent,
  selectedTrack,
  invalidateAfterOperation,
  dashboardContext,
}) {
  const eventId = selectedEvent?.id;
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [localState, setLocalState] = useState({});

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
    queryKey: ['gateConsole_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['gateConsole_teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 200),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['gateConsole_eventClasses', eventId],
    queryFn: () => (eventId ? base44.entities.EventClass.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);
  const classMap = useMemo(() => Object.fromEntries(eventClasses.map((c) => [c.id, c])), [eventClasses]);

  // Use entries if available, fallback to DriverProgram as proxy
  const listData = useMemo(() => {
    if (entries.length > 0) return entries;
    return driverPrograms.map((dp) => ({
      id: dp.id,
      event_id: dp.event_id,
      driver_id: dp.driver_id,
      event_class_id: dp.event_class_id,
      team_id: dp.team_id,
      _from_driver_program: true,
    }));
  }, [entries, driverPrograms]);

  // Entries need attention
  const needsAttention = useMemo(() => {
    return listData.filter((entry) => {
      const state = localState[entry.id] || {};
      const waiver = entry.waiver_verified !== undefined ? entry.waiver_verified : state.waiver_verified;
      const payment = entry.payment_status !== undefined ? entry.payment_status : state.payment_status;
      const checkin = entry.gate_checked_in !== undefined ? entry.gate_checked_in : state.gate_checked_in;
      const tech = entry.tech_status !== undefined ? entry.tech_status : state.tech_status;

      return (
        !waiver ||
        payment === 'Unpaid' ||
        !checkin ||
        (tech && tech !== 'Passed') ||
        !entry.transponder_id
      );
    }).sort((a, b) => {
      const driverA = driverMap[a.driver_id];
      const driverB = driverMap[b.driver_id];
      const nameA = driverA ? `${driverA.first_name} ${driverA.last_name}`.toLowerCase() : '';
      const nameB = driverB ? `${driverB.first_name} ${driverB.last_name}`.toLowerCase() : '';
      return nameA.localeCompare(nameB);
    });
  }, [listData, localState, driverMap]);

  // Filtered search results
  const searchResults = useMemo(() => {
    let filtered = [...listData];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((e) => {
        const driver = driverMap[e.driver_id];
        const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
        const carNum = (e.car_number || driverMap[e.driver_id]?.primary_number || '').toString();
        const transponder = (e.transponder_id || '').toString().toLowerCase();
        return driverName.includes(term) || carNum.includes(term) || transponder.includes(term);
      });
    }

    if (classFilter !== 'all') {
      filtered = filtered.filter((e) => e.event_class_id === classFilter || e.series_class_id === classFilter);
    }

    if (statusFilter === 'needs_attention') {
      filtered = filtered.filter((e) => needsAttention.some((n) => n.id === e.id));
    } else if (statusFilter === 'cleared') {
      filtered = filtered.filter((e) => !needsAttention.some((n) => n.id === e.id));
    }

    return filtered.sort((a, b) => {
      const driverA = driverMap[a.driver_id];
      const driverB = driverMap[b.driver_id];
      const nameA = driverA ? `${driverA.first_name} ${driverA.last_name}`.toLowerCase() : '';
      const nameB = driverB ? `${driverB.first_name} ${driverB.last_name}`.toLowerCase() : '';
      return nameA.localeCompare(nameB);
    });
  }, [listData, searchTerm, classFilter, statusFilter, driverMap, needsAttention]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleScan = useCallback(() => {
    if (!scanInput.trim()) return;

    const search = scanInput.toLowerCase();
    const found = listData.find((e) => {
      const driver = driverMap[e.driver_id];
      if (driver?.numeric_id === scanInput) return true;
      if (driver?.slug === scanInput) return true;
      const carNum = (e.car_number || driver?.primary_number || '').toString();
      if (carNum === scanInput) return true;
      return false;
    });

    if (found) {
      setSelectedEntry(found);
      setScanInput('');
    } else {
      toast.error('Entry not found');
    }
  }, [scanInput, listData, driverMap]);

  const handleToggleField = useCallback(async (entry, field, value) => {
    // Use local state as fallback
    const newState = { ...localState[entry.id] || {}, [field]: value };
    setLocalState({ ...localState, [entry.id]: newState });

    // Try to persist if Entry exists and field exists
    if (!entry._from_driver_program && entry.id) {
      try {
        const updateData = {};
        updateData[field] = value;
        await base44.entities.Entry.update(entry.id, updateData);
        invalidateAfterOperation('entry_updated', { eventId });
        toast.success(`${field} updated`);
      } catch (err) {
        console.error(`Failed to update ${field}:`, err);
        toast.error(`Could not persist ${field}—local changes saved`);
      }
    }
  }, [localState, eventId, invalidateAfterOperation]);

  // Get entry status values
  const getEntryValue = (entry, field) => {
    const local = localState[entry.id] || {};
    if (field in local) return local[field];
    return entry[field];
  };

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Gate Console</p>
          <p className="text-gray-400 text-sm">Select an event to begin entry validation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* ── Left: Needs Attention Queue ───────────────────────────────────── */}
      <div className="lg:col-span-1">
        <Card className="bg-[#171717] border-gray-800 sticky top-24">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" /> Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
            {needsAttention.length === 0 ? (
              <p className="text-gray-500 text-xs py-4">All clear!</p>
            ) : (
              needsAttention.map((entry) => {
                const driver = driverMap[entry.driver_id];
                const cls = classMap[entry.event_class_id];
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="w-full text-left bg-[#262626] rounded p-2 border border-yellow-900/40 hover:border-yellow-700 transition-colors"
                  >
                    <p className="text-white font-semibold text-xs">
                      #{entry.car_number || driver?.primary_number || '—'}
                    </p>
                    <p className="text-gray-400 text-xs">{driver ? `${driver.first_name} ${driver.last_name}` : 'Driver'}</p>
                    <p className="text-gray-500 text-xs">{cls?.class_name || 'Unassigned'}</p>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Right: Scan & Search ──────────────────────────────────────────── */}
      <div className="lg:col-span-3 space-y-6">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white">{selectedEvent.name}</CardTitle>
            {selectedTrack && <p className="text-xs text-gray-400">{selectedTrack.name}</p>}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
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

              <div className="flex gap-2">
                {['All', 'Needs Attention', 'Cleared'].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    onClick={() => setStatusFilter(status === 'All' ? 'all' : status === 'Needs Attention' ? 'needs_attention' : 'cleared')}
                    className={`text-xs ${
                      statusFilter === (status === 'All' ? 'all' : status === 'Needs Attention' ? 'needs_attention' : 'cleared')
                        ? 'bg-blue-900/40 border-blue-700 text-blue-300'
                        : 'border-gray-700 text-gray-300 hover:text-white'
                    }`}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Scan & Search Tabs ────────────────────────────────────────── */}
        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="bg-[#171717] border border-gray-800 p-1 h-auto flex gap-1">
            <TabsTrigger value="scan" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2">
              <QrCode className="w-4 h-4 mr-2" /> Scan
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400 px-4 py-2">
              <Search className="w-4 h-4 mr-2" /> Search
            </TabsTrigger>
          </TabsList>

          {/* Scan Mode */}
          <TabsContent value="scan" className="space-y-4">
            <Card className="bg-[#171717] border-gray-800">
              <CardContent className="pt-6 space-y-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">Scan or Enter ID</label>
                  <Input
                    placeholder="Scan transponder, numeric ID, car number..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    autoFocus
                    className="bg-[#262626] border-gray-700 text-white text-lg h-12 font-mono"
                  />
                </div>
                <Button onClick={handleScan} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Look Up Entry
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Mode */}
          <TabsContent value="search" className="space-y-4">
            <Card className="bg-[#171717] border-gray-800">
              <CardContent className="pt-6 space-y-3">
                <Input
                  placeholder="Search by driver name, car number, or transponder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#262626] border-gray-700 text-white"
                />

                {searchResults.length === 0 ? (
                  <p className="text-gray-500 text-sm py-8 text-center">No entries found</p>
                ) : (
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {searchResults.map((entry) => {
                      const driver = driverMap[entry.driver_id];
                      const cls = classMap[entry.event_class_id];
                      const needsAttn = needsAttention.some((n) => n.id === entry.id);

                      return (
                        <button
                          key={entry.id}
                          onClick={() => setSelectedEntry(entry)}
                          className={`w-full text-left rounded p-3 border transition-colors ${
                            needsAttn
                              ? 'bg-yellow-900/20 border-yellow-700 hover:border-yellow-600'
                              : 'bg-[#262626] border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-white font-semibold text-sm">
                                #{entry.car_number || driver?.primary_number || '—'}
                              </p>
                              <p className="text-gray-400 text-xs">{driver ? `${driver.first_name} ${driver.last_name}` : 'Driver'}</p>
                              <p className="text-gray-500 text-xs">{cls?.class_name || 'Unassigned'}</p>
                            </div>
                            {needsAttn ? (
                              <Badge className="bg-yellow-900/40 text-yellow-300 text-xs">⚠️</Badge>
                            ) : (
                              <Badge className="bg-green-900/40 text-green-300 text-xs">✓</Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Entry Detail Drawer ───────────────────────────────────────────– */}
      <Drawer open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DrawerContent className="bg-[#171717] border-gray-800">
          {selectedEntry && (
            <>
              <DrawerHeader>
                <DrawerTitle className="text-white">
                  {driverMap[selectedEntry.driver_id]
                    ? `${driverMap[selectedEntry.driver_id].first_name} ${driverMap[selectedEntry.driver_id].last_name}`
                    : 'Entry'}
                </DrawerTitle>
                <DrawerDescription className="text-gray-400">
                  Car #{selectedEntry.car_number || driverMap[selectedEntry.driver_id]?.primary_number || '—'} •{' '}
                  {classMap[selectedEntry.event_class_id]?.class_name || 'Unassigned'}
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-4 space-y-6 overflow-y-auto max-h-[60vh]">
                {/* Status Indicators */}
                <div className="p-3 bg-[#262626] rounded-lg border border-gray-700 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
                  <div className="space-y-1 text-sm">
                    {entries.length > 0 || selectedEntry._from_driver_program ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Waiver Verified</span>
                          <Badge
                            className={`text-xs cursor-pointer ${
                              getEntryValue(selectedEntry, 'waiver_verified')
                                ? 'bg-green-900/40 text-green-300'
                                : 'bg-red-900/40 text-red-300'
                            }`}
                            onClick={() =>
                              handleToggleField(selectedEntry, 'waiver_verified', !getEntryValue(selectedEntry, 'waiver_verified'))
                            }
                          >
                            {getEntryValue(selectedEntry, 'waiver_verified') ? '✓ Yes' : '✗ No'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Payment</span>
                          <Badge
                            className={`text-xs cursor-pointer ${
                              getEntryValue(selectedEntry, 'payment_status') === 'Paid'
                                ? 'bg-green-900/40 text-green-300'
                                : 'bg-red-900/40 text-red-300'
                            }`}
                            onClick={() =>
                              handleToggleField(
                                selectedEntry,
                                'payment_status',
                                getEntryValue(selectedEntry, 'payment_status') === 'Paid' ? 'Unpaid' : 'Paid'
                              )
                            }
                          >
                            {getEntryValue(selectedEntry, 'payment_status') === 'Paid' ? '✓ Paid' : '✗ Unpaid'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Check In</span>
                          <Badge
                            className={`text-xs cursor-pointer ${
                              getEntryValue(selectedEntry, 'gate_checked_in')
                                ? 'bg-green-900/40 text-green-300'
                                : 'bg-gray-900/40 text-gray-300'
                            }`}
                            onClick={() =>
                              handleToggleField(selectedEntry, 'gate_checked_in', !getEntryValue(selectedEntry, 'gate_checked_in'))
                            }
                          >
                            {getEntryValue(selectedEntry, 'gate_checked_in') ? '✓ In' : '○ Out'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Tech Status</span>
                          <Badge className="bg-blue-900/40 text-blue-300 text-xs">
                            {getEntryValue(selectedEntry, 'tech_status') || 'Not Inspected'}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 text-xs italic">Not connected yet (local only)</p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {entries.length > 0 || selectedEntry._from_driver_program ? (
                  <div className="p-3 bg-[#262626] rounded-lg border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Notes</p>
                    <Textarea
                      value={getEntryValue(selectedEntry, 'notes') || ''}
                      onChange={(e) => {
                        const newState = { ...localState[selectedEntry.id] || {}, notes: e.target.value };
                        setLocalState({ ...localState, [selectedEntry.id]: newState });
                      }}
                      placeholder="Add notes..."
                      className="bg-[#1a1a1a] border-gray-700 text-white text-sm h-16 resize-none"
                    />
                  </div>
                ) : null}
              </div>

              <DrawerFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedEntry(null)}
                  className="border-gray-700 text-gray-300"
                >
                  Close
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}