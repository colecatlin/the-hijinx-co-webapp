import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Wrench } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import useDashboardMutation from './useDashboardMutation';
import TechEntryDrawer from './TechEntryDrawer';

const DQ = applyDefaultQueryOptions();

function techBadgeClass(status) {
  switch (status) {
    case 'Passed': return 'bg-green-500/20 text-green-400';
    case 'Failed': return 'bg-red-500/20 text-red-400';
    case 'Recheck Required': return 'bg-yellow-500/20 text-yellow-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

export default function TechManager({
  selectedEvent,
  user,
  dashboardContext,
  invalidateAfterOperation: invalidateAfterOperationProp,
}) {
  const queryClient = useQueryClient();
  const invalidateAfterOperation = invalidateAfterOperationProp ?? buildInvalidateAfterOperation(queryClient);
  const eventId = selectedEvent?.id;

  // ── Filters ──
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Drawer ──
  const [drawerEntry, setDrawerEntry] = useState(null);

  // ── Reset on event change ──
  useEffect(() => {
    setSearch('');
    setClassFilter('all');
    setStatusFilter('all');
    setDrawerEntry(null);
  }, [eventId]);

  // ── Queries ──
  const { data: entries = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['entries', eventId, 'tech'],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('first_name', 500),
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
    ...DQ,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    ...DQ,
  });

  // ── Lookups ──
  const driversMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const classesMap = useMemo(() => Object.fromEntries(seriesClasses.map((c) => [c.id, c])), [seriesClasses]);

  const getDriverName = (id) => {
    const d = driversMap[id];
    return d ? `${d.first_name} ${d.last_name}` : '—';
  };
  const getClassName = (entry) => {
    if (!entry.series_class_id) return '—';
    return classesMap[entry.series_class_id]?.class_name || entry.series_class_id;
  };

  // ── Classes present in this event ──
  const classOptions = useMemo(() => {
    const seen = new Set();
    entries.forEach((e) => {
      const name = getClassName(e);
      if (name && name !== '—') seen.add(name);
    });
    return Array.from(seen).sort();
  }, [entries, classesMap]);

  // ── Filtering ──
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (classFilter !== 'all' && getClassName(entry) !== classFilter) return false;
      if (statusFilter !== 'all' && (entry.tech_status || 'Not Inspected') !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const driver = driversMap[entry.driver_id];
        const driverMatch = driver
          ? `${driver.first_name} ${driver.last_name}`.toLowerCase().includes(s)
          : false;
        const carMatch = (entry.car_number || '').toLowerCase().includes(s);
        if (!driverMatch && !carMatch) return false;
      }
      return true;
    });
  }, [entries, classFilter, statusFilter, search, driversMap, classesMap]);

  // ── Summary stats ──
  const stats = useMemo(() => {
    const total = entries.length;
    const passed = entries.filter((e) => e.tech_status === 'Passed').length;
    const failed = entries.filter((e) => e.tech_status === 'Failed').length;
    const recheck = entries.filter((e) => e.tech_status === 'Recheck Required').length;
    const notInspected = entries.filter((e) => !e.tech_status || e.tech_status === 'Not Inspected').length;
    const queue = entries
      .filter((e) => e.tech_status !== 'Passed')
      .sort((a, b) => {
        const order = { Failed: 0, 'Recheck Required': 1, 'Not Inspected': 2 };
        return (order[a.tech_status] ?? 2) - (order[b.tech_status] ?? 2);
      });
    return { total, passed, failed, recheck, notInspected, queue };
  }, [entries]);

  // ── Mutation ──
  const { mutateAsync: updateEntry, isPending: saving } = useDashboardMutation({
    operationType: 'tech_updated',
    entityName: 'Entry',
    mutationFn: ({ id, data }) => base44.entities.Entry.update(id, data),
    successMessage: 'Tech updated',
    invalidateAfterOperation,
    dashboardContext: dashboardContext ?? { eventId },
    selectedEvent: selectedEvent ?? null,
  });

  const handleSave = async (id, payload) => {
    await updateEntry({ id, data: payload });
    setDrawerEntry((prev) => prev ? { ...prev, ...payload } : null);
  };

  const handleSaveAndNext = async (id, payload) => {
    await updateEntry({ id, data: payload });
    // Find next non-passed entry in filtered list
    const idx = filteredEntries.findIndex((e) => e.id === id);
    const next = filteredEntries.slice(idx + 1).find((e) => e.tech_status !== 'Passed');
    setDrawerEntry(next || null);
  };

  // ── Guards ──
  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">Select a Track or Series, Season, and Event to manage tech inspection</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-800/40 rounded animate-pulse" />)}
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

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card A – Overview */}
        <Card className="bg-[#171717] border-gray-800 md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Tech Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Total</span>
              <span className="text-white font-semibold">{stats.total}</span>
            </div>
            <div className="flex justify-between text-xs cursor-pointer hover:opacity-80" onClick={() => setStatusFilter('Passed')}>
              <span className="text-gray-400">Passed</span>
              <Badge className="text-xs bg-green-500/20 text-green-400">{stats.passed}</Badge>
            </div>
            <div className="flex justify-between text-xs cursor-pointer hover:opacity-80" onClick={() => setStatusFilter('Failed')}>
              <span className="text-gray-400">Failed</span>
              <Badge className="text-xs bg-red-500/20 text-red-400">{stats.failed}</Badge>
            </div>
            <div className="flex justify-between text-xs cursor-pointer hover:opacity-80" onClick={() => setStatusFilter('Recheck Required')}>
              <span className="text-gray-400">Recheck</span>
              <Badge className="text-xs bg-yellow-500/20 text-yellow-400">{stats.recheck}</Badge>
            </div>
            <div className="flex justify-between text-xs cursor-pointer hover:opacity-80" onClick={() => setStatusFilter('Not Inspected')}>
              <span className="text-gray-400">Not Inspected</span>
              <Badge className="text-xs bg-gray-500/20 text-gray-400">{stats.notInspected}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Card B – Work Queue */}
        <Card className="bg-[#171717] border-gray-800 md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-300">Work Queue ({stats.queue.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {stats.queue.length === 0 ? (
              <p className="text-xs text-green-400">All entries passed!</p>
            ) : (
              stats.queue.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between cursor-pointer hover:opacity-80"
                  onClick={() => setDrawerEntry(entry)}
                >
                  <span className="text-xs text-gray-300 truncate max-w-[120px]">
                    {entry.car_number ? `#${entry.car_number}` : ''} {getDriverName(entry.driver_id)}
                  </span>
                  <Badge className={`text-xs ${techBadgeClass(entry.tech_status)}`}>
                    {entry.tech_status || 'Not Inspected'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Search</label>
            <Input
              placeholder="Driver or car #…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Class</label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Not Inspected">Not Inspected</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Recheck Required">Recheck Required</SelectItem>
                <SelectItem value="Passed">Passed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredEntries.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <p className="text-gray-400 text-sm">
              {entries.length === 0 ? 'No entries for this event yet.' : 'No entries match the current filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#171717] border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/60 border-b border-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Car #</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Driver</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Class</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Tech Status</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Inspector</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Last Updated</th>
                  <th className="px-3 py-2 text-right text-xs text-gray-400 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                    <td className="px-3 py-2 text-white font-mono text-xs">{entry.car_number || '—'}</td>
                    <td className="px-3 py-2 text-white text-xs">{getDriverName(entry.driver_id)}</td>
                    <td className="px-3 py-2 text-gray-300 text-xs">{getClassName(entry)}</td>
                    <td className="px-3 py-2">
                      <Badge className={`text-xs ${techBadgeClass(entry.tech_status)}`}>
                        {entry.tech_status || 'Not Inspected'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-gray-400 text-xs">{entry.tech_inspector_name || '—'}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {entry.tech_timestamp ? new Date(entry.tech_timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDrawerEntry(entry)}
                        className="border-gray-700 text-gray-300 hover:bg-gray-800 h-7 text-xs"
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Drawer */}
      <TechEntryDrawer
        open={!!drawerEntry}
        onOpenChange={(open) => { if (!open) setDrawerEntry(null); }}
        entry={drawerEntry}
        driverName={drawerEntry ? getDriverName(drawerEntry.driver_id) : ''}
        className={drawerEntry ? getClassName(drawerEntry) : ''}
        currentUser={currentUser}
        saving={saving}
        onSave={handleSave}
        onSaveAndNext={handleSaveAndNext}
      />
    </div>
  );
}