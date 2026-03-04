import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { AlertCircle, Wrench, CheckCircle, XCircle, RefreshCw, StickyNote, AlertTriangle } from 'lucide-react';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import useDashboardMutation from './useDashboardMutation';

const DQ = applyDefaultQueryOptions();

function techBadgeClass(status) {
  switch (status) {
    case 'Passed': return 'bg-green-500/20 text-green-400';
    case 'Failed': return 'bg-red-500/20 text-red-400';
    case 'Recheck Required': return 'bg-yellow-500/20 text-yellow-400';
    default: return 'bg-gray-500/20 text-gray-400';
  }
}

function rowHighlight(status) {
  if (status === 'Failed') return 'bg-red-900/10 border-red-900/30';
  if (status === 'Recheck Required') return 'bg-yellow-900/10 border-yellow-900/30';
  return '';
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

  // ── Notes drawer ──
  const [notesEntry, setNotesEntry] = useState(null);
  const [notesText, setNotesText] = useState('');

  // ── Reset on event change ──
  useEffect(() => {
    setSearch('');
    setClassFilter('all');
    setStatusFilter('all');
    setNotesEntry(null);
  }, [eventId]);

  // ── Queries ──
  const { data: allEntries = [], isLoading, isError, refetch } = useQuery({
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

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => base44.entities.EventClass.filter({ event_id: eventId }, 'class_order'),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    ...DQ,
  });

  const isAdmin = currentUser?.role === 'admin';

  // ── Lookups ──
  const driversMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const eventClassMap = useMemo(() => Object.fromEntries(eventClasses.map((c) => [c.id, c])), [eventClasses]);

  const getDriverName = (id) => {
    const d = driversMap[id];
    return d ? `${d.first_name} ${d.last_name}` : '—';
  };
  const getClassName = (entry) => {
    if (entry.event_class_id && eventClassMap[entry.event_class_id]) {
      return eventClassMap[entry.event_class_id].class_name || eventClassMap[entry.event_class_id].name || '—';
    }
    return '—';
  };

  // ── Entries: exclude Withdrawn ──
  const entries = useMemo(() => allEntries.filter(e => e.entry_status !== 'Withdrawn'), [allEntries]);

  // ── Filtering ──
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (classFilter !== 'all' && (entry.event_class_id || '') !== classFilter) return false;
      if (statusFilter !== 'all' && (entry.tech_status || 'Not Inspected') !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const d = driversMap[entry.driver_id];
        const driverMatch = d ? `${d.first_name} ${d.last_name}`.toLowerCase().includes(s) : false;
        const carMatch = (entry.car_number || '').toLowerCase().includes(s);
        if (!driverMatch && !carMatch) return false;
      }
      return true;
    });
  }, [entries, classFilter, statusFilter, search, driversMap]);

  // ── Summary stats ──
  const stats = useMemo(() => {
    const total = entries.length;
    const passed = entries.filter((e) => e.tech_status === 'Passed').length;
    const failed = entries.filter((e) => e.tech_status === 'Failed').length;
    const recheck = entries.filter((e) => e.tech_status === 'Recheck Required').length;
    const notInspected = entries.filter((e) => !e.tech_status || e.tech_status === 'Not Inspected').length;
    return { total, passed, failed, recheck, notInspected };
  }, [entries]);

  // ── Mutation ──
  const { mutateAsync: updateEntry, isPending: saving } = useDashboardMutation({
    operationType: 'entry_updated',
    entityName: 'Entry',
    mutationFn: async ({ id, data }) => base44.entities.Entry.update(id, data),
    successMessage: 'Tech updated',
    invalidateAfterOperation,
    dashboardContext: dashboardContext ?? { eventId },
    selectedEvent: selectedEvent ?? null,
  });

  const handleAction = async (entry, techStatus) => {
    const now = new Date().toISOString();
    await updateEntry({
      id: entry.id,
      data: {
        tech_status: techStatus,
        tech_time: now,
        tech_inspector_user_id: currentUser?.id || '',
      },
    });
    queryClient.invalidateQueries({ queryKey: ['entries', eventId, 'tech'] });
  };

  const openNotes = (entry) => {
    setNotesEntry(entry);
    setNotesText('');
  };

  const handleSaveNote = async () => {
    if (!notesEntry || !notesText.trim()) return;
    const timestamp = new Date().toLocaleString();
    const append = `[${timestamp}] Tech: ${notesText.trim()}`;
    const existing = notesEntry.notes ? notesEntry.notes + '\n' + append : append;
    await updateEntry({ id: notesEntry.id, data: { notes: existing } });
    queryClient.invalidateQueries({ queryKey: ['entries', eventId, 'tech'] });
    setNotesEntry(null);
    setNotesText('');
  };

  // ── Guards ──
  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">Select an event to manage tech inspection</p>
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
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Total', value: stats.total, cls: 'text-white' },
          { label: 'Passed', value: stats.passed, cls: 'text-green-400', filter: 'Passed' },
          { label: 'Failed', value: stats.failed, cls: 'text-red-400', filter: 'Failed' },
          { label: 'Recheck', value: stats.recheck, cls: 'text-yellow-400', filter: 'Recheck Required' },
          { label: 'Pending', value: stats.notInspected, cls: 'text-gray-400', filter: 'Not Inspected' },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => s.filter && setStatusFilter(statusFilter === s.filter ? 'all' : s.filter)}
            className={`bg-[#171717] border rounded-lg p-3 text-left transition-colors ${
              statusFilter === s.filter ? 'border-gray-500' : 'border-gray-800 hover:border-gray-700'
            }`}
          >
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                {eventClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.class_name || c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tech Status</label>
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
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Transponder</th>
                  <th className="px-3 py-2 text-left text-xs text-gray-400 font-semibold">Notes</th>
                  <th className="px-3 py-2 text-right text-xs text-gray-400 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const techStatus = entry.tech_status || 'Not Inspected';
                  const isCheckedIn = entry.entry_status === 'Checked In';
                  const passDisabled = techStatus === 'Passed' && !isAdmin;
                  const highlight = rowHighlight(techStatus);
                  const missingTransponder = !entry.transponder_id;

                  return (
                    <tr key={entry.id} className={`border-b border-gray-800 transition-colors hover:bg-gray-800/20 ${highlight}`}>
                      <td className="px-3 py-2 text-white font-mono text-xs">
                        {entry.car_number || '—'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-1">
                          {!isCheckedIn && (
                            <AlertTriangle className="w-3 h-3 text-yellow-400 flex-shrink-0" title="Not checked in" />
                          )}
                          <span className="text-white">{getDriverName(entry.driver_id)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-300 text-xs">{getClassName(entry)}</td>
                      <td className="px-3 py-2">
                        <Badge className={`text-xs ${techBadgeClass(techStatus)}`}>
                          {techStatus}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {missingTransponder ? (
                          <Badge className="text-xs bg-orange-500/20 text-orange-400">Missing</Badge>
                        ) : (
                          <span className="text-gray-400 font-mono">{entry.transponder_id}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 max-w-[140px] truncate" title={entry.notes || ''}>
                        {entry.notes ? entry.notes.split('\n').pop() : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            disabled={passDisabled || saving}
                            onClick={() => handleAction(entry, 'Passed')}
                            className="h-6 px-2 text-xs bg-green-700/80 hover:bg-green-700 text-white border-0"
                            title={passDisabled ? 'Already passed (admin to override)' : 'Pass'}
                          >
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            disabled={saving}
                            onClick={() => handleAction(entry, 'Failed')}
                            className="h-6 px-2 text-xs bg-red-700/80 hover:bg-red-700 text-white border-0"
                            title="Fail"
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            disabled={saving}
                            onClick={() => handleAction(entry, 'Recheck Required')}
                            className="h-6 px-2 text-xs bg-yellow-700/80 hover:bg-yellow-700 text-white border-0"
                            title="Recheck Required"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => openNotes(entry)}
                            className="h-6 px-2 text-xs border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                            title="Add note"
                          >
                            <StickyNote className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Notes Drawer */}
      <Sheet open={!!notesEntry} onOpenChange={(open) => { if (!open) { setNotesEntry(null); setNotesText(''); } }}>
        <SheetContent className="bg-[#1A1A1A] border-gray-700 text-white">
          <SheetHeader>
            <SheetTitle className="text-white text-sm">
              Add Inspector Note — #{notesEntry?.car_number} {notesEntry ? getDriverName(notesEntry.driver_id) : ''}
            </SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-3">
            {notesEntry?.notes && (
              <div className="bg-gray-900 rounded p-3 text-xs text-gray-400 max-h-32 overflow-y-auto whitespace-pre-wrap">
                {notesEntry.notes}
              </div>
            )}
            <Textarea
              placeholder="Enter tech note…"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              className="bg-[#262626] border-gray-700 text-white text-xs min-h-[80px]"
            />
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => { setNotesEntry(null); setNotesText(''); }}>
              Cancel
            </Button>
            <Button disabled={!notesText.trim() || saving} onClick={handleSaveNote} className="bg-blue-600 hover:bg-blue-700">
              Save Note
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}