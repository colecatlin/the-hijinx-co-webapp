/**
 * Gate Attendant Console
 * Real-time gate check-in, wristband tracking, and attendance for race events.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Search, ChevronRight, Plus, Minus, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const DQ = applyDefaultQueryOptions();

export default function GateAttendantConsole({
  selectedEvent,
  selectedTrack,
  invalidateAfterOperation,
  dashboardContext,
}) {
  const eventId = selectedEvent?.id;
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: entries = [] } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => (eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => (eventId ? base44.entities.EventClass.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['gateConsole_drivers'],
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

  const filteredEntries = useMemo(() => {
    let filtered = [...entries];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((e) => {
        const driver = driverMap[e.driver_id];
        const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
        const carNum = (e.car_number || '').toString();
        return driverName.includes(term) || carNum.includes(term) || e.id.includes(term);
      });
    }

    if (classFilter !== 'all') {
      filtered = filtered.filter((e) => e.event_class_id === classFilter);
    }

    if (statusFilter !== 'all') {
      const isCheckedIn = statusFilter === 'checked_in';
      filtered = filtered.filter((e) => (e.gate_checked_in === true) === isCheckedIn);
    }

    return filtered;
  }, [entries, searchTerm, classFilter, statusFilter, driverMap]);

  // Summary stats
  const stats = useMemo(() => {
    const checkedInCount = entries.filter((e) => e.gate_checked_in === true).length;
    const totalWristbands = entries.reduce((sum, e) => sum + (e.wristband_count || 0), 0);
    return { checkedInCount, totalWristbands };
  }, [entries]);

  // Get history for selected entry
  const selectedEntryHistory = useMemo(() => {
    if (!selectedEntry?.id) return [];
    return operationLogs
      .filter((log) => {
        const meta = log.metadata || {};
        return (meta.event_id === eventId && meta.driver_id === selectedEntry.driver_id) ||
               (meta.entry_id === selectedEntry.id);
      })
      .filter((log) => {
        const opType = log.operation_type;
        return opType && opType.startsWith('gate_');
      })
      .slice(0, 10);
  }, [selectedEntry, operationLogs, eventId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleGateCheckIn = useCallback(async (entry) => {
    try {
      const newStatus = !entry.gate_checked_in;

      // Update Entry if it has gate_checked_in field
      if (entry.id && typeof entry.gate_checked_in !== 'undefined') {
        await base44.entities.Entry.update(entry.id, { gate_checked_in: newStatus });
      }

      // Log operation
      await base44.entities.OperationLog.create({
        operation_type: 'gate_check_in_toggled',
        source_type: 'RaceCore',
        entity_name: 'Entry',
        status: 'success',
        metadata: {
          event_id: eventId,
          driver_id: entry.driver_id,
          entry_id: entry.id,
          gate_checked_in: newStatus,
          timestamp: new Date().toISOString(),
        },
      });

      invalidateAfterOperation('gate_updated', { eventId });
      toast.success(`Gate check-in ${newStatus ? 'enabled' : 'disabled'} for ${driverMap[entry.driver_id]?.first_name || 'driver'}`);
    } catch (err) {
      console.error('Gate check-in error:', err);
      toast.error('Failed to update gate check-in');
    }
  }, [eventId, driverMap, invalidateAfterOperation]);

  const handleWristbandChange = useCallback(async (entry, delta) => {
    try {
      const newCount = Math.max(0, (entry.wristband_count || 0) + delta);

      // Update Entry if it has wristband_count field
      if (entry.id && typeof entry.wristband_count !== 'undefined') {
        await base44.entities.Entry.update(entry.id, { wristband_count: newCount });
      }

      // Log operation
      await base44.entities.OperationLog.create({
        operation_type: 'gate_wristband_adjusted',
        source_type: 'RaceCore',
        entity_name: 'Entry',
        status: 'success',
        metadata: {
          event_id: eventId,
          driver_id: entry.driver_id,
          entry_id: entry.id,
          wristband_count: newCount,
          delta,
          timestamp: new Date().toISOString(),
        },
      });

      invalidateAfterOperation('gate_updated', { eventId });
      toast.success(`Wristbands updated to ${newCount}`);
    } catch (err) {
      console.error('Wristband update error:', err);
      toast.error('Failed to update wristband count');
    }
  }, [eventId, invalidateAfterOperation]);

  const handleNotesUpdate = useCallback(async (entry, notes) => {
    try {
      // Update Entry if it has gate_notes field
      if (entry.id && typeof entry.gate_notes !== 'undefined') {
        await base44.entities.Entry.update(entry.id, { gate_notes: notes });
      }

      // Log operation
      await base44.entities.OperationLog.create({
        operation_type: 'gate_notes_updated',
        source_type: 'RaceCore',
        entity_name: 'Entry',
        status: 'success',
        metadata: {
          event_id: eventId,
          driver_id: entry.driver_id,
          entry_id: entry.id,
          notes,
          timestamp: new Date().toISOString(),
        },
      });

      invalidateAfterOperation('gate_updated', { eventId });
      toast.success('Notes updated');
    } catch (err) {
      console.error('Notes update error:', err);
      toast.error('Failed to update notes');
    }
  }, [eventId, invalidateAfterOperation]);

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Gate Attendant Console</p>
          <p className="text-gray-400 text-sm">Select an event to begin gate check-in operations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Summary Strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Event</p>
            <p className="text-lg font-bold text-white">{selectedEvent.name}</p>
          </CardContent>
        </Card>

        {selectedTrack && (
          <Card className="bg-[#171717] border-gray-800">
            <CardContent className="pt-6">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Track</p>
              <p className="text-lg font-bold text-white">{selectedTrack.name}</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Gate Check-ins</p>
            <p className="text-lg font-bold text-white">{stats.checkedInCount} / {entries.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="pt-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Wristbands Issued</p>
            <p className="text-lg font-bold text-white">{stats.totalWristbands}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search driver name, car #, or entry ID..."
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 bg-[#262626] border-gray-700 text-white">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-[#262626] border-gray-700 text-white">
            <SelectItem value="all" className="text-white">All Statuses</SelectItem>
            <SelectItem value="checked_in" className="text-white">Checked In</SelectItem>
            <SelectItem value="not_checked_in" className="text-white">Not Checked In</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
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
                    {['Car', 'Driver', 'Class', 'Gate', 'Wristbands', 'Payment', 'Notes', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredEntries.map((entry) => {
                    const driver = driverMap[entry.driver_id];
                    const cls = classMap[entry.event_class_id];
                    return (
                      <tr key={entry.id} className="hover:bg-[#1e1e1e] transition-colors">
                        <td className="px-3 py-2 font-bold text-white">#{entry.car_number || '—'}</td>
                        <td className="px-3 py-2 text-white">
                          {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}
                        </td>
                        <td className="px-3 py-2 text-gray-400 text-xs">{cls?.class_name || '—'}</td>
                        <td className="px-3 py-2">
                          <Badge
                            className={`text-xs cursor-pointer ${
                              entry.gate_checked_in
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                            onClick={() => handleGateCheckIn(entry)}
                          >
                            {entry.gate_checked_in ? 'Checked In' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-white font-semibold text-center">
                          {entry.wristband_count || 0}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <Badge
                            className={`text-xs ${
                              entry.payment_status === 'Paid'
                                ? 'bg-green-500/20 text-green-400'
                                : entry.payment_status === 'Unpaid'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            {entry.payment_status || 'Unknown'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-gray-400 text-xs max-w-xs truncate">
                          {entry.gate_notes || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedEntry(entry)}
                            className="text-gray-400 hover:text-white h-7 px-2"
                          >
                            <ChevronRight className="w-4 h-4" />
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
      <Drawer open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DrawerContent className="bg-[#171717] border-gray-800">
          {selectedEntry && (
            <>
              <DrawerHeader>
                <DrawerTitle className="text-white">
                  {driverMap[selectedEntry.driver_id]
                    ? `${driverMap[selectedEntry.driver_id].first_name} ${driverMap[selectedEntry.driver_id].last_name}`
                    : 'Driver'}
                </DrawerTitle>
                <DrawerDescription className="text-gray-400">
                  Car #{selectedEntry.car_number || '—'} • {classMap[selectedEntry.event_class_id]?.class_name || 'Unknown Class'}
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-4 space-y-6 overflow-y-auto max-h-[60vh]">
                {/* Driver link */}
                {driverMap[selectedEntry.driver_id] && (
                  <div>
                    <Link
                      to={createPageUrl(`DriverProfile?driverId=${selectedEntry.driver_id}`)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      View Driver Profile
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {/* Entry Info */}
                <div className="space-y-2 p-3 bg-[#262626] rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Entry Info</p>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-gray-400">Entry ID: </span>
                      <span className="text-white font-mono text-xs">{selectedEntry.id}</span>
                    </p>
                    <p>
                      <span className="text-gray-400">Status: </span>
                      <span className="text-white">{selectedEntry.entry_status || 'Unknown'}</span>
                    </p>
                    <p>
                      <span className="text-gray-400">Payment: </span>
                      <span className="text-white">{selectedEntry.payment_status || 'Unknown'}</span>
                    </p>
                  </div>
                </div>

                {/* Gate Actions */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Gate Actions</p>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleGateCheckIn(selectedEntry)}
                      className={`flex-1 ${
                        selectedEntry.gate_checked_in
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white`}
                    >
                      {selectedEntry.gate_checked_in ? 'Uncheck In' : 'Check In'}
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Wristbands:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWristbandChange(selectedEntry, -1)}
                        className="border-gray-700 text-gray-300 h-8 w-8 p-0"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center font-bold text-white">{selectedEntry.wristband_count || 0}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWristbandChange(selectedEntry, 1)}
                        className="border-gray-700 text-gray-300 h-8 w-8 p-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <NotesEditor entry={selectedEntry} onSave={handleNotesUpdate} driverMap={driverMap} />

                {/* History */}
                {selectedEntryHistory.length > 0 && (
                  <div className="space-y-2 p-3 bg-[#262626] rounded-lg border border-gray-700">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Gate History (Last 10)</p>
                    <div className="space-y-1 text-xs">
                      {selectedEntryHistory.map((log, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Clock className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 text-gray-300">
                            <p className="font-mono">
                              {new Date(log.created_date).toLocaleString()}
                            </p>
                            <p className="text-gray-500">{log.operation_type.replace('gate_', '')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

/**
 * Inline notes editor for gate drawer
 */
function NotesEditor({ entry, onSave, driverMap }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [notes, setNotes] = React.useState(entry.gate_notes || '');

  const handleSave = async () => {
    await onSave(entry, notes);
    setIsEditing(false);
  };

  return (
    <div className="space-y-2 p-3 bg-[#262626] rounded-lg border border-gray-700">
      <p className="text-xs text-gray-400 uppercase tracking-wide">Notes</p>
      {!isEditing ? (
        <div
          onClick={() => setIsEditing(true)}
          className="cursor-pointer p-2 bg-[#1a1a1a] rounded text-sm text-gray-300 min-h-12 rounded hover:bg-[#202020] transition-colors"
        >
          {notes || <span className="text-gray-500 italic">Click to add notes...</span>}
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-[#1a1a1a] border-gray-700 text-white text-sm h-20 rounded"
            placeholder="Add notes..."
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setNotes(entry.gate_notes || '');
              }}
              className="flex-1 border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}