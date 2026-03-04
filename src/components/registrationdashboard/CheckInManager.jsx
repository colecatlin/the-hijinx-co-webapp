/**
 * Check In Manager
 * Driver and crew arrival tracking
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
import { Textarea } from '@/components/ui/textarea';
import { REG_QK } from './queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { AlertCircle, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { canTab, canAction } from '@/components/access/accessControl';

const DQ = applyDefaultQueryOptions();

export default function CheckInManager({
  selectedEvent,
  selectedTrack,
  selectedSeries,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const hasAccess = canTab(dashboardPermissions, 'checkin');
  const canEdit = ['admin', 'entity_owner', 'entity_editor'].includes(dashboardPermissions?.role);

  // ── State ──────────────────────────────────────────────────────────────────

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);
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
    queryKey: ['checkIn_driverPrograms'],
    queryFn: () => (eventId ? base44.entities.DriverProgram.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId && hasAccess,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['checkIn_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000,
    enabled: hasAccess,
    ...DQ,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['checkIn_teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 200),
    staleTime: 60_000,
    enabled: hasAccess,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['checkIn_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 500),
    staleTime: 60_000,
    enabled: hasAccess,
    ...DQ,
  });

  const { data: operationLogs = [] } = useQuery({
    queryKey: ['checkIn_operationLogs'],
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
      toast.success('Status updated');
    },
    onError: (err) => {
      console.error('Failed to update entry:', err);
      toast.error('Failed to update entry');
    },
  });

  const createOperationLogMutation = useMutation({
    mutationFn: (data) => base44.entities.OperationLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkIn_operationLogs'] });
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

  // Helper to check if entry has issues
  const hasIssues = useCallback((item) => {
    const issues = [];

    if (item.payment_status && item.payment_status !== 'Paid') issues.push('unpaid');
    if (item.waiver_verified === false) issues.push('waiver');
    if (item.tech_status && ['Failed', 'Recheck Required'].includes(item.tech_status)) issues.push('tech');
    if (item.entry_status !== 'Checked In') {
      // Also check OperationLog for checkin status
      const hasCheckInLog = operationLogs.some((log) => {
        try {
          const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          return metadata?.driver_id === item.driver_id && metadata?.checkin === true;
        } catch {
          return false;
        }
      });
      if (!hasCheckInLog) issues.push('not_checkin');
    }

    return issues;
  }, [operationLogs]);

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
      if (statusFilter === 'checked_in') {
        result = result.filter((item) => item.entry_status === 'Checked In');
      } else if (statusFilter === 'not_checked_in') {
        result = result.filter((item) => item.entry_status !== 'Checked In');
      }
    }

    if (showIssuesOnly) {
      result = result.filter((item) => hasIssues(item).length > 0);
    }

    return result.sort((a, b) => {
      const aName = driverMap[a.driver_id]?.last_name || '';
      const bName = driverMap[b.driver_id]?.last_name || '';
      return aName.localeCompare(bName);
    });
  }, [primaryData, driverMap, teamMap, search, classFilter, statusFilter, showIssuesOnly, hasIssues]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleCheckIn = useCallback(
    (item) => {
      if (!canEdit) return;
      updateEntryMutation.mutate({
        entryId: item.id,
        data: {
          entry_status: 'Checked In',
          checkin_time: new Date().toISOString(),
          checked_in_by_user_id: item.currentUserId || '',
        },
      });
    },
    [canEdit, updateEntryMutation]
  );

  const handleUndoCheckIn = useCallback(
    (item) => {
      if (!canEdit) return;
      updateEntryMutation.mutate({
        entryId: item.id,
        data: { entry_status: 'Registered', checkin_time: null },
      });
    },
    [canEdit, updateEntryMutation]
  );

  const handleOpenNoteModal = useCallback((item) => {
    setNoteModalEntry(item);
    setNoteText('');
    setNoteModalOpen(true);
  }, []);

  const handleSaveNote = useCallback(() => {
    if (!noteModalEntry || !noteText.trim()) return;

    createOperationLogMutation.mutate({
      operation_type: 'checkin_note',
      source_type: 'manual',
      entity_name: 'Driver',
      entity_id: noteModalEntry.driver_id,
      status: 'success',
      metadata: JSON.stringify({
        event_id: eventId,
        driver_id: noteModalEntry.driver_id,
        note: noteText,
        timestamp_client: new Date().toISOString(),
      }),
    });

    setNoteModalOpen(false);
    setNoteModalEntry(null);
    setNoteText('');
  }, [noteModalEntry, noteText, eventId, createOperationLogMutation]);

  // ── Empty/No access state ──────────────────────────────────────────────────

  if (!hasAccess) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">You do not have access to Check In operations.</p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Check In</p>
          <p className="text-gray-400 text-sm">Select an event to access check in.</p>
        </CardContent>
      </Card>
    );
  }

  const isCheckedIn = (item) => item.entry_status === 'Checked In';

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <div>
            <CardTitle className="text-white text-2xl">Check In</CardTitle>
            <p className="text-sm text-gray-400 mt-1">Driver and crew arrival tracking</p>
          </div>
        </CardHeader>

        {/* Controls */}
        <CardContent className="space-y-3 border-t border-gray-700 pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search driver, car number, team..."
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
                  <SelectItem value="checked_in" className="text-white">Checked In</SelectItem>
                  <SelectItem value="not_checked_in" className="text-white">Not Checked In</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => setShowIssuesOnly(!showIssuesOnly)}
              className={`col-span-1 text-xs h-9 ${
                showIssuesOnly
                  ? 'bg-red-700 hover:bg-red-600'
                  : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
            >
              {showIssuesOnly ? '✓ Issues' : 'Issues'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Check In List ──────────────────────────────────────────────────── */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">
            Drivers ({filteredData.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No drivers found</p>
          ) : (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filteredData.map((item) => {
                const driver = driverMap[item.driver_id];
                const team = teamMap[item.team_id];
                const classId = item.event_class_id || item.series_class_id;
                const className = classMap[classId]?.class_name || '—';
                const checked = isCheckedIn(item);
                const issues = hasIssues(item);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded border transition-colors ${
                      issues.length > 0
                        ? 'bg-red-900/20 border-red-700/50'
                        : checked
                        ? 'bg-green-900/20 border-green-700/50'
                        : 'bg-[#262626] border-gray-700'
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold text-sm">#{item.car_number || driver?.primary_number || '—'}</span>
                          {checked && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {issues.length > 0 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        </div>
                        <p className="text-xs text-gray-300">{driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}</p>
                        {team && <p className="text-xs text-gray-500">{team.name}</p>}
                        <p className="text-xs text-gray-500">{className}</p>
                      </div>

                      {/* Status badges */}
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <Badge
                          className={`text-xs whitespace-nowrap ${
                            checked ? 'bg-green-900/50 text-green-300' : 'bg-gray-700'
                          }`}
                        >
                          {checked ? 'Checked In' : 'Not Checked In'}
                        </Badge>
                        {item.payment_status && item.payment_status !== 'Paid' && (
                          <Badge className="text-xs bg-red-900/50 text-red-300 whitespace-nowrap">
                            Unpaid
                          </Badge>
                        )}
                        {item.waiver_verified === false && (
                          <Badge className="text-xs bg-yellow-900/50 text-yellow-300 whitespace-nowrap">
                            No Waiver
                          </Badge>
                        )}
                        {item.tech_status && ['Failed', 'Recheck Required'].includes(item.tech_status) && (
                          <Badge className="text-xs bg-orange-900/50 text-orange-300 whitespace-nowrap">
                            Tech Issue
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1 flex-wrap pt-2 border-t border-gray-600">
                      {!checked ? (
                        <Button
                          onClick={() => handleCheckIn(item)}
                          disabled={!canEdit}
                          className="text-xs h-7 px-2 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          ✓ Check In
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleUndoCheckIn(item)}
                          disabled={!canEdit}
                          className="text-xs h-7 px-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                        >
                          ↶ Undo
                        </Button>
                      )}
                      <Button
                        onClick={() => handleOpenNoteModal(item)}
                        disabled={!canEdit}
                        className="text-xs h-7 px-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Note
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Note Modal ────────────────────────────────────────────────────── */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="bg-[#262626] border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Add Check In Note</DialogTitle>
          </DialogHeader>

          {noteModalEntry && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                {driverMap[noteModalEntry.driver_id]?.first_name}{' '}
                {driverMap[noteModalEntry.driver_id]?.last_name}
              </p>
              <Textarea
                placeholder="Enter note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="bg-[#171717] border-gray-700 text-white text-sm h-24"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setNoteModalOpen(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNote}
              disabled={!noteText.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 disabled:opacity-50"
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}