import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Search, Plus, Minus, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function GateConsole({ selectedEvent, dashboardContext, dashboardPermissions, invalidateAfterOperation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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

  // Load entries
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['gateConsole', 'entries', selectedEvent.id],
    queryFn: () => base44.entities.Entry.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent.id,
  });

  // Load drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['gateConsole', 'drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  // Load teams
  const { data: teams = [] } = useQuery({
    queryKey: ['gateConsole', 'teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  // Build maps
  const driverMap = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const teamMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);

  // Mutations
  const updateEntryMutation = useMutation({
    mutationFn: ({ entryId, data }) => base44.entities.Entry.update(entryId, data),
  });

  const logOperationMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.OperationLog.create(data),
  });

  // Handle entry update
  const handleEntryUpdate = async (entry, updates, operationType) => {
    try {
      await updateEntryMutation.mutateAsync({
        entryId: entry.id,
        data: updates,
      });

      // Log operation
      await logOperationMutation.mutateAsync({
        operation_type: operationType,
        entity_name: 'Entry',
        entity_id: entry.id,
        status: 'success',
        metadata: {
          event_id: selectedEvent.id,
          entry_id: entry.id,
          driver_id: entry.driver_id,
          changes: updates,
        },
      });

      // Invalidate queries
      await invalidateAfterOperation('entry_updated', { entryId: entry.id });
      toast.success(`Entry updated: ${operationType}`);
    } catch (error) {
      toast.error(`Failed to update entry: ${error.message}`);
      console.error(error);
    }
  };

  // Filter entries
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e => {
        const driver = driverMap.get(e.driver_id);
        const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
        return (
          e.car_number?.toLowerCase().includes(q) ||
          driverName.includes(q) ||
          teamMap.get(e.team_id)?.name?.toLowerCase().includes(q)
        );
      });
    }

    // Status filter
    if (filterStatus === 'unpaid') {
      filtered = filtered.filter(e => e.payment_status !== 'Paid');
    } else if (filterStatus === 'waiver_missing') {
      filtered = filtered.filter(e => !e.waiver_verified);
    } else if (filterStatus === 'not_checked_in') {
      filtered = filtered.filter(e => e.entry_status !== 'Checked In');
    }

    return filtered;
  }, [entries, searchQuery, filterStatus, driverMap, teamMap]);

  if (entriesLoading) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-8 text-center">
          <p className="text-gray-400">Loading entries...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Gate Console</CardTitle>
          <p className="text-sm text-gray-400 mt-2">Fast entry management for gate operations</p>
        </CardHeader>
      </Card>

      {/* Search & Filters */}
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search driver, car number, team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900 border-gray-700 text-white"
              />
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'unpaid', 'waiver_missing', 'not_checked_in'].map((status) => (
              <Button
                key={status}
                onClick={() => setFilterStatus(status)}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                className={`text-xs ${
                  filterStatus === status
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'border-gray-700 text-gray-400 hover:bg-gray-800'
                }`}
              >
                {status === 'all' && 'All'}
                {status === 'unpaid' && 'Unpaid'}
                {status === 'waiver_missing' && 'Waiver Missing'}
                {status === 'not_checked_in' && 'Not Checked In'}
              </Button>
            ))}
          </div>

          <div className="text-xs text-gray-500">
            {filteredEntries.length} of {entries.length} entries
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      {filteredEntries.length === 0 ? (
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No entries match the current filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-[#171717] border border-gray-800 rounded-lg">
            <thead className="bg-gray-800/50 border-b border-gray-800">
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Car #</th>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Class</th>
                <th className="px-4 py-3 text-center">Payment</th>
                <th className="px-4 py-3 text-center">Waiver</th>
                <th className="px-4 py-3 text-center">Checked In</th>
                <th className="px-4 py-3 text-right">Wristbands</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredEntries.map((entry) => {
                const driver = driverMap.get(entry.driver_id);
                const team = teamMap.get(entry.team_id);
                return (
                  <tr key={entry.id} className="hover:bg-gray-900/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-white">{entry.car_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown'}
                      {team && <div className="text-xs text-gray-500">{team.name}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{entry.series_class_id || 'N/A'}</td>

                    {/* Payment Status */}
                    <td className="px-4 py-3 text-center">
                      <Button
                        onClick={() =>
                          handleEntryUpdate(
                            entry,
                            {
                              payment_status:
                                entry.payment_status === 'Paid' ? 'Unpaid' : 'Paid',
                            },
                            'gate_payment_updated'
                          )
                        }
                        size="sm"
                        variant="ghost"
                        className={`text-xs h-7 ${
                          entry.payment_status === 'Paid'
                            ? 'bg-green-900/30 text-green-300 hover:bg-green-900/50'
                            : 'bg-orange-900/30 text-orange-300 hover:bg-orange-900/50'
                        }`}
                      >
                        {entry.payment_status === 'Paid' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </Button>
                    </td>

                    {/* Waiver Status */}
                    <td className="px-4 py-3 text-center">
                      <Button
                        onClick={() =>
                          handleEntryUpdate(
                            entry,
                            { waiver_verified: !entry.waiver_verified },
                            'gate_waiver_updated'
                          )
                        }
                        size="sm"
                        variant="ghost"
                        className={`text-xs h-7 ${
                          entry.waiver_verified
                            ? 'bg-green-900/30 text-green-300 hover:bg-green-900/50'
                            : 'bg-red-900/30 text-red-300 hover:bg-red-900/50'
                        }`}
                      >
                        {entry.waiver_verified ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </Button>
                    </td>

                    {/* Check In Status */}
                    <td className="px-4 py-3 text-center">
                      <Button
                        onClick={() =>
                          handleEntryUpdate(
                            entry,
                            {
                              entry_status:
                                entry.entry_status === 'Checked In' ? 'Registered' : 'Checked In',
                              checkin_time:
                                entry.entry_status !== 'Checked In'
                                  ? new Date().toISOString()
                                  : entry.checkin_time,
                            },
                            'gate_checkin_updated'
                          )
                        }
                        size="sm"
                        variant="ghost"
                        className={`text-xs h-7 ${
                          entry.entry_status === 'Checked In'
                            ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50'
                            : 'bg-gray-900/30 text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        {entry.entry_status === 'Checked In' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </Button>
                    </td>

                    {/* Wristbands */}
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                      <Button
                        onClick={() =>
                          handleEntryUpdate(
                            entry,
                            { wristband_count: Math.max(0, (entry.wristband_count || 0) - 1) },
                            'gate_wristbands_updated'
                          )
                        }
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-2 border border-gray-700 text-gray-400 hover:bg-gray-800"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-semibold text-white w-6 text-center">
                        {entry.wristband_count || 0}
                      </span>
                      <Button
                        onClick={() =>
                          handleEntryUpdate(
                            entry,
                            { wristband_count: (entry.wristband_count || 0) + 1 },
                            'gate_wristbands_updated'
                          )
                        }
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-2 border border-gray-700 text-gray-400 hover:bg-gray-800"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}