import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Plus, Minus, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function GateConsole({
  selectedEvent,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation,
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Load entries
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['racecore', 'gate_console', 'entries', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.Entry.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  // Load drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['racecore', 'gate_console', 'drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  // Load teams
  const { data: teams = [] } = useQuery({
    queryKey: ['racecore', 'gate_console', 'teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  // Mutations
  const updateEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['racecore', 'gate_console', 'entries', selectedEvent?.id],
      });
    },
  });

  const logMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.OperationLog.create(data),
  });

  // Build maps
  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);

  // Filter logic
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(e => {
        const driver = driverMap.get(e.driver_id);
        const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
        const carNum = (e.car_number || '').toLowerCase();
        return driverName.includes(q) || carNum.includes(q);
      });
    }

    // Filter type
    if (filterType === 'unpaid') {
      filtered = filtered.filter(e => e.payment_status === 'Unpaid');
    } else if (filterType === 'waiver') {
      filtered = filtered.filter(e => !e.waiver_verified);
    } else if (filterType === 'not_checked_in') {
      filtered = filtered.filter(e => !e.checkin_time);
    }

    return filtered;
  }, [entries, search, filterType, driverMap]);

  // Handlers
  const handleCheckIn = async (entry) => {
    try {
      const nextCheckedIn = !entry.checkin_time;
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        checkin_time: nextCheckedIn ? new Date().toISOString() : null,
      });

      await logMutation.mutateAsync({
        operation_type: 'gate_checkin_updated',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          entry_id: entry.id,
          checked_in: !!nextCheckedIn,
        },
      });

      invalidateAfterOperation('entry_updated');
      toast.success(nextCheckedIn ? 'Entry checked in' : 'Check-in removed');
    } catch (error) {
      toast.error('Failed to update check-in');
      console.error(error);
    }
  };

  const handlePaymentToggle = async (entry) => {
    try {
      const nextStatus = entry.payment_status === 'Paid' ? 'Unpaid' : 'Paid';
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        payment_status: nextStatus,
      });

      await logMutation.mutateAsync({
        operation_type: 'gate_payment_updated',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          entry_id: entry.id,
          payment_status: nextStatus,
        },
      });

      invalidateAfterOperation('entry_updated');
      toast.success(`Payment marked as ${nextStatus}`);
    } catch (error) {
      toast.error('Failed to update payment');
      console.error(error);
    }
  };

  const handleWaiverToggle = async (entry) => {
    try {
      const nextVerified = !entry.waiver_verified;
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        waiver_verified: nextVerified,
      });

      await logMutation.mutateAsync({
        operation_type: 'gate_waiver_updated',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          entry_id: entry.id,
          waiver_verified: nextVerified,
        },
      });

      invalidateAfterOperation('entry_updated');
      toast.success(nextVerified ? 'Waiver verified' : 'Waiver unverified');
    } catch (error) {
      toast.error('Failed to update waiver');
      console.error(error);
    }
  };

  const handleWristbandDelta = async (entry, delta) => {
    try {
      const nextCount = Math.max(0, (entry.wristband_count || 0) + delta);
      await updateEntryMutation.mutateAsync({
        id: entry.id,
        wristband_count: nextCount,
      });

      await logMutation.mutateAsync({
        operation_type: 'gate_wristbands_updated',
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          entry_id: entry.id,
          wristband_count: nextCount,
        },
      });

      invalidateAfterOperation('entry_updated');
    } catch (error) {
      toast.error('Failed to update wristbands');
      console.error(error);
    }
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-400">Select an event to access Gate Console</p>
        </CardContent>
      </Card>
    );
  }

  if (entriesLoading) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Loading entries...</p>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-blue-500 mx-auto mb-3" />
          <p className="text-gray-400">No entries yet</p>
          <p className="text-sm text-gray-500 mt-2">Entries will appear here once created</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search driver, car number, team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-900 border-gray-700 text-white text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            {['all', 'unpaid', 'waiver', 'not_checked_in'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                  filterType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {type === 'all' && 'All'}
                {type === 'unpaid' && 'Unpaid'}
                {type === 'waiver' && 'Waiver Missing'}
                {type === 'not_checked_in' && 'Not Checked In'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-sm">
            Entries ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Car #</TableHead>
                  <TableHead className="text-gray-400">Driver</TableHead>
                  <TableHead className="text-gray-400">Team</TableHead>
                  <TableHead className="text-gray-400">Payment</TableHead>
                  <TableHead className="text-gray-400">Waiver</TableHead>
                  <TableHead className="text-gray-400">Checked In</TableHead>
                  <TableHead className="text-gray-400">Wristbands</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map(entry => {
                  const driver = driverMap.get(entry.driver_id);
                  const team = teamMap.get(entry.team_id);

                  return (
                    <TableRow key={entry.id} className="border-gray-800 text-xs hover:bg-gray-900/50">
                      <TableCell className="text-white font-semibold">{entry.car_number}</TableCell>
                      <TableCell className="text-white">
                        {driver ? `${driver.first_name} ${driver.last_name}` : '-'}
                      </TableCell>
                      <TableCell className="text-gray-400">{team?.name || '-'}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handlePaymentToggle(entry)}
                          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                            entry.payment_status === 'Paid'
                              ? 'bg-green-900/30 text-green-300'
                              : 'bg-red-900/30 text-red-300'
                          }`}
                        >
                          {entry.payment_status === 'Paid' ? '✓ Paid' : '✗ Unpaid'}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleWaiverToggle(entry)}
                          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                            entry.waiver_verified
                              ? 'bg-green-900/30 text-green-300'
                              : 'bg-yellow-900/30 text-yellow-300'
                          }`}
                        >
                          {entry.waiver_verified ? '✓' : '○'}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleCheckIn(entry)}
                          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                            entry.checkin_time
                              ? 'bg-green-900/30 text-green-300'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {entry.checkin_time ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                      </TableCell>
                      <TableCell className="text-white font-bold">{entry.wristband_count || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleWristbandDelta(entry, -1)}
                            className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleWristbandDelta(entry, 1)}
                            className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}