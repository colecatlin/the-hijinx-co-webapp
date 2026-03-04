/**
 * Gate Attendant Manager
 * Verify entry status and log attendance actions
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, LogOut, MessageSquare, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { canTab } from '@/components/access/accessControl';

const DQ = applyDefaultQueryOptions();

export default function GateAttendantManager({
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
  const canAct = ['admin', 'entity_owner', 'entity_editor'].includes(dashboardPermissions?.role);

  // ── State ──────────────────────────────────────────────────────────────────

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [spectatorModalOpen, setSpectatorModalOpen] = useState(false);
  const [spectatorCount, setSpectatorCount] = useState('');
  const [spectatorNotes, setSpectatorNotes] = useState('');
  const [gateLogsOpen, setGateLogsOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalEntry, setNoteModalEntry] = useState(null);
  const [noteText, setNoteText] = useState('');

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: entries = [] } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => (eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && hasAccess,
    ...DQ,
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['gateAttendant_driverPrograms'],
    queryFn: () => (eventId ? base44.entities.DriverProgram.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && hasAccess,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['gateAttendant_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000,
    enabled: hasAccess,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['gateAttendant_teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 200),
    staleTime: 60_000,
    enabled: hasAccess,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['gateAttendant_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 500),
    staleTime: 60_000,
    enabled: hasAccess,
    ...DQ,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['gateAttendant_operationLogs'],
    queryFn: () => base44.entities.OperationLog.list('-created_date', 300),
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
      toast.success('Entry verified');
    },
    onError: (err) => {
      console.error('Failed to update entry:', err);
      toast.error('Failed to update entry');
    },
  });

  const createOperationLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateAttendant_operationLogs'] });
      invalidateAfterOperation('operation_logged');
      toast.success('Logged');
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

  // Use Entry as primary source, fallback to DriverProgram
  const primaryData = entries.length > 0 ? entries : driverPrograms;

  // Get unique classes
  const uniqueClasses = useMemo(() => {
    const classIds = new Set();
    primaryData.forEach((item) => {
      const classId = item.event_class_id || item.series_class_id;
      if (classId) classIds.add(classId);
    });
    return Array.from(classIds);
  }, [primaryData]);

  // Filter and search
  const filteredData = useMemo(() => {
    let result = [...primaryData];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((item) => {
        const driver = driverMap[item.driver_id];
        const team = teamMap[item.team_id];
        const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
        const teamName = team ? team.name.toLowerCase() : '';
        const carNum = (item.car_number || '').toLowerCase();

        return driverName.includes(q) || teamName.includes(q) || carNum.includes(q);
      });
    }

    if (classFilter !== 'all') {
      result = result.filter((item) => {
        const classId = item.event_class_id || item.series_class_id;
        return classId === classFilter;
      });
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'unknown') {
        result = result.filter((item) => !item.entry_status || item.entry_status === '');
      } else {
        result = result.filter((item) => item.entry_status === statusFilter);
      }
    }

    return result.sort((a, b) => {
      const aName = driverMap[a.driver_id]?.last_name || '';
      const bName = driverMap[b.driver_id]?.last_name || '';
      return aName.localeCompare(bName);
    });
  }, [primaryData, driverMap, teamMap, search, classFilter, statusFilter]);

  // Filter gate logs for selected event
  const gateEventLogs = useMemo(() => {
    if (!eventId) return [];
    return operationLogs
      .filter((log) => {
        try {
          const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          return metadata?.event_id === eventId && ['gate_verify', 'gate_note', 'gate_spectator_count'].includes(log.operation_type);
        } catch {
          return false;
        }
      })
      .slice(0, 50);
  }, [operationLogs, eventId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleVerifyArrival = useCallback(
    (item) => {
      if (!canAct) return;

      if ('entry_status' in item) {
        updateEntryMutation.mutate({
          entryId: item.id,
          data: { entry_status: 'Checked In' },
        });
      } else {
        createOperationLogMutation.mutate({
          operation_type: 'gate_verify',
          source_type: 'manual',
          entity_name: 'Driver',
          entity_id: item.driver_id,
          status: 'success',
          metadata: JSON.stringify({
            event_id: eventId,
            driver_id: item.driver_id,
            program_id: item.id,
            verified: true,
            timestamp_client: new Date().toISOString(),
          }),
        });
      }
    },
    [canAct, eventId, updateEntryMutation, createOperationLogMutation]
  );

  const handleMarkNotArrived = useCallback(
    (item) => {
      if (!canAct) return;

      if ('entry_status' in item) {
        updateEntryMutation.mutate({
          entryId: item.id,
          data: { entry_status: 'Registered' },
        });
      } else {
        createOperationLogMutation.mutate({
          operation_type: 'gate_verify',
          source_type: 'manual',
          entity_name: 'Driver',
          entity_id: item.driver_id,
          status: 'success',
          metadata: JSON.stringify({
            event_id: eventId,
            driver_id: item.driver_id,
            program_id: item.id,
            verified: false,
            timestamp_client: new Date().toISOString(),
          }),
        });
      }
    },
    [canAct, eventId, updateEntryMutation, createOperationLogMutation]
  );

  const handleOpenNoteModal = useCallback((item) => {
    setNoteModalEntry(item);
    setNoteText('');
    setNoteModalOpen(true);
  }, []);

  const handleSaveNote = useCallback(() => {
    if (!noteModalEntry || !noteText.trim()) return;

    createOperationLogMutation.mutate({
      operation_type: 'gate_note',
      source_type: 'manual',
      entity_name: 'Driver',
      entity_id: noteModalEntry.driver_id,
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        driver_id: noteModalEntry.driver_id,
        program_id: noteModalEntry.id,
        note: noteText,
        timestamp_client: new Date().toISOString(),
      }),
    });

    setNoteModalOpen(false);
    setNoteModalEntry(null);
    setNoteText('');
  }, [noteModalEntry, noteText, eventId, createOperationLogMutation]);

  const handleSaveSpectatorCount = useCallback(() => {
    if (!spectatorCount.trim()) return;

    createOperationLogMutation.mutate({
      operation_type: 'gate_spectator_count',
      source_type: 'manual',
      entity_name: 'Event',
      entity_id: eventId,
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        spectator_count: parseInt(spectatorCount, 10),
        note: spectatorNotes,
        timestamp_client: new Date().toISOString(),
      }),
    });

    setSpectatorModalOpen(false);
    setSpectatorCount('');
    setSpectatorNotes('');
  }, [spectatorCount, spectatorNotes, eventId, createOperationLogMutation]);

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
          <div>
            <CardTitle className="text-white text-2xl">Gate</CardTitle>
            <p className="text-sm text-gray-400 mt-1">Scan, verify, log entry</p>
          </div>
        </CardHeader>

        {/* Controls */}
        <CardContent className="space-y-3 border-t border-gray-700 pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search driver, car number, team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#262626] border-gray-700 text-white text-sm h-10 flex-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Class</label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-10">
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
                <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#262626] border-gray-700">
                  <SelectItem value="all" className="text-white">All</SelectItem>
                  <SelectItem value="Registered" className="text-white">Registered</SelectItem>
                  <SelectItem value="Checked In" className="text-white">Checked In</SelectItem>
                  <SelectItem value="Teched" className="text-white">Teched</SelectItem>
                  <SelectItem value="Withdrawn" className="text-white">Withdrawn</SelectItem>
                  <SelectItem value="unknown" className="text-white">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-1">
              <Button
                onClick={() => setSpectatorModalOpen(true)}
                disabled={!canAct}
                className="flex-1 text-xs h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Users className="w-4 h-4" /> Spectators
              </Button>
              <Button
                onClick={() => setGateLogsOpen(true)}
                className="flex-1 text-xs h-10 bg-gray-700 hover:bg-gray-600 flex items-center justify-center gap-1"
              >
                <Clock className="w-4 h-4" /> Logs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Gate List ──────────────────────────────────────────────────────– */}
      <div className="space-y-2">
        {filteredData.length === 0 ? (
          <Card className="bg-[#171717] border-gray-800">
            <CardContent className="py-12 text-center text-gray-500 text-sm">
              No entries found
            </CardContent>
          </Card>
        ) : (
          filteredData.map((item) => {
            const driver = driverMap[item.driver_id];
            const team = teamMap[item.team_id];
            const classId = item.event_class_id || item.series_class_id;
            const className = classMap[classId]?.class_name || 'Unknown';
            const isCheckedIn = item.entry_status === 'Checked In';

            return (
              <Card key={item.id} className={`bg-[#171717] border-gray-800 ${isCheckedIn ? 'border-green-700/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Left block */}
                    <div>
                      <p className="text-white font-bold text-lg">#{item.car_number || driver?.primary_number || 'N/A'}</p>
                      <p className="text-gray-300 text-sm">{driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}</p>
                      {team && <p className="text-gray-500 text-xs">{team.name}</p>}
                      <p className="text-gray-500 text-xs">{className}</p>
                    </div>

                    {/* Right block - badges */}
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        className={`text-xs whitespace-nowrap ${
                          isCheckedIn ? 'bg-green-900/50 text-green-300' : 'bg-gray-700'
                        }`}
                      >
                        {item.entry_status || 'Unknown'}
                      </Badge>
                      {item.payment_status && (
                        <Badge
                          className={`text-xs whitespace-nowrap ${
                            item.payment_status === 'Paid'
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-red-900/50 text-red-300'
                          }`}
                        >
                          {item.payment_status}
                        </Badge>
                      )}
                      {item.tech_status && (
                        <Badge
                          className={`text-xs whitespace-nowrap ${
                            item.tech_status === 'Passed'
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-yellow-900/50 text-yellow-300'
                          }`}
                        >
                          Tech: {item.tech_status}
                        </Badge>
                      )}
                      {item.waiver_verified && (
                        <Badge className="text-xs bg-green-900/50 text-green-300 whitespace-nowrap">
                          Waiver ✓
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {!isCheckedIn ? (
                        <Button
                          onClick={() => handleVerifyArrival(item)}
                          disabled={!canAct}
                          className="flex-1 text-xs h-9 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          ✓ Verify Arrival
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleMarkNotArrived(item)}
                          disabled={!canAct}
                          className="flex-1 text-xs h-9 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <LogOut className="w-3 h-3" /> Not Arrived
                        </Button>
                      )}
                      <Button
                        onClick={() => handleOpenNoteModal(item)}
                        disabled={!canAct}
                        className="text-xs h-9 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> Note
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Spectator Count Modal ──────────────────────────────────────────– */}
      <Dialog open={spectatorModalOpen} onOpenChange={setSpectatorModalOpen}>
        <DialogContent className="bg-[#262626] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Log Spectator Count</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Spectator Count</label>
              <Input
                type="number"
                placeholder="0"
                value={spectatorCount}
                onChange={(e) => setSpectatorCount(e.target.value)}
                className="bg-[#171717] border-gray-700 text-white h-10"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Notes (optional)</label>
              <Textarea
                placeholder="Add notes..."
                value={spectatorNotes}
                onChange={(e) => setSpectatorNotes(e.target.value)}
                className="bg-[#171717] border-gray-700 text-white text-xs h-16"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setSpectatorModalOpen(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSpectatorCount}
              disabled={!spectatorCount.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 disabled:opacity-50"
            >
              Log Count
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Gate Note Modal ────────────────────────────────────────────────– */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="bg-[#262626] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Add Gate Note</DialogTitle>
          </DialogHeader>

          {noteModalEntry && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-gray-400">
                {driverMap[noteModalEntry.driver_id]?.first_name}{' '}
                {driverMap[noteModalEntry.driver_id]?.last_name}
              </p>
              <Textarea
                placeholder="Enter note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="bg-[#171717] border-gray-700 text-white text-xs h-20"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setNoteModalOpen(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNote}
              disabled={!noteText.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 disabled:opacity-50"
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Gate Logs Drawer ──────────────────────────────────────────────– */}
      <Drawer open={gateLogsOpen} onOpenChange={setGateLogsOpen}>
        <DrawerContent className="bg-[#262626] border-gray-800 max-h-[80vh]">
          <DrawerHeader className="border-b border-gray-700">
            <DrawerTitle className="text-white">Recent Gate Logs</DrawerTitle>
            <DrawerClose />
          </DrawerHeader>

          <div className="overflow-y-auto p-4 space-y-2">
            {gateEventLogs.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No gate logs yet</p>
            ) : (
              gateEventLogs.map((log) => {
                let metadata = {};
                try {
                  metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
                } catch {
                  // ignore
                }

                const driver = driverMap[metadata.driver_id];
                const time = new Date(log.created_date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                let summary = '';
                if (log.operation_type === 'gate_verify') {
                  summary = metadata.verified ? 'Verified arrival' : 'Marked not arrived';
                } else if (log.operation_type === 'gate_note') {
                  summary = `Note: ${metadata.note}`;
                } else if (log.operation_type === 'gate_spectator_count') {
                  summary = `Spectators: ${metadata.spectator_count}`;
                }

                return (
                  <div key={log.id} className="bg-[#171717] rounded p-2 text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-gray-300 font-semibold">
                        {driver ? `${driver.first_name} ${driver.last_name}` : 'System'}
                      </span>
                      <span className="text-gray-500">{time}</span>
                    </div>
                    <p className="text-gray-400">{summary}</p>
                  </div>
                );
              })
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}