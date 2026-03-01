import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Download, Plus } from 'lucide-react';
import CreateEntryModal from './CreateEntryModal';
import EntryDetailDrawer from './EntryDetailDrawer';

export default function EntriesManager({ selectedEvent }) {
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['entries', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.Entry.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.EventClass.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
  });

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (classFilter !== 'all' && entry.series_class_id !== classFilter)
        return false;
      if (statusFilter !== 'all' && entry.entry_status !== statusFilter)
        return false;
      if (paymentFilter !== 'all' && entry.payment_status !== paymentFilter)
        return false;

      if (searchTerm) {
        const driver = drivers.find((d) => d.id === entry.driver_id);
        const driverName = driver
          ? `${driver.first_name} ${driver.last_name}`.toLowerCase()
          : '';
        const carNum = entry.car_number.toLowerCase();
        const transponder = (entry.transponder_id || '').toLowerCase();
        const search = searchTerm.toLowerCase();

        return (
          driverName.includes(search) ||
          carNum.includes(search) ||
          transponder.includes(search)
        );
      }

      return true;
    });
  }, [entries, classFilter, statusFilter, paymentFilter, searchTerm, drivers]);

  const getDriverName = (driverId) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : '—';
  };

  const getClassName = (classId) => {
    const cls = seriesClasses.find((c) => c.id === classId);
    return cls ? cls.class_name : '—';
  };

  const getTeamName = (teamId) => {
    if (!teamId) return '';
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : '—';
  };

  const getComplianceFlags = (entry) => {
    const flags = [];
    if (!entry.waiver_verified) flags.push('Missing Waiver');
    if (entry.payment_status === 'Unpaid') flags.push('Unpaid');
    if (
      entry.tech_status === 'NotInspected' ||
      entry.tech_status === 'RecheckRequired'
    )
      flags.push('Tech Pending');
    if (!entry.transponder_id) flags.push('Missing Transponder');
    return flags;
  };

  const handleExportCSV = async () => {
    try {
      const { data } = await base44.functions.invoke('csvEntityManager', {
        action: 'export',
        entityType: 'Entry',
        filters: { event_id: selectedEvent.id },
      });

      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entries-${selectedEvent.id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to load entries.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="min-w-[200px]">
              <label className="text-xs font-medium text-gray-400 block mb-1">
                Class
              </label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {eventClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[200px]">
              <label className="text-xs font-medium text-gray-400 block mb-1">
                Entry Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Registered">Registered</SelectItem>
                  <SelectItem value="CheckedIn">Checked In</SelectItem>
                  <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[200px]">
              <label className="text-xs font-medium text-gray-400 block mb-1">
                Payment Status
              </label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="bg-[#262626] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-400 block mb-1">
                Search
              </label>
              <Input
                placeholder="Driver name, car number, transponder..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#262626] border-gray-700"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1" /> Create Entry
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="border-gray-700"
              >
                <Download className="w-4 h-4 mr-1" /> Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Entries table */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-300">
            Entries ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <p className="text-gray-400 text-sm">Loading entries...</p>
          ) : filteredEntries.length === 0 ? (
            <p className="text-gray-400 text-sm">No entries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-3 font-medium text-gray-400">
                      Car #
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">
                      Driver
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">
                      Class
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">
                      Transponder
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">
                      Entry Status
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">
                      Payment
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">
                      Tech
                    </th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">
                      Flags
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const flags = getComplianceFlags(entry);
                    const hasFlags = flags.length > 0;

                    return (
                      <tr
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className={`border-b border-gray-800 cursor-pointer transition-colors ${
                          hasFlags
                            ? 'bg-red-900/10 hover:bg-red-900/15'
                            : 'hover:bg-gray-800/50'
                        }`}
                      >
                        <td className="py-3 px-3 text-gray-300 font-medium">
                          {entry.car_number}
                        </td>
                        <td className="py-3 px-3 text-gray-300">
                          {getDriverName(entry.driver_id)}
                        </td>
                        <td className="py-3 px-3 text-gray-300">
                          {getClassName(entry.series_class_id)}
                        </td>
                        <td className="py-3 px-3 text-gray-400">
                          {entry.transponder_id || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              entry.entry_status === 'Registered'
                                ? 'bg-blue-900/40 text-blue-300'
                                : entry.entry_status === 'CheckedIn'
                                ? 'bg-green-900/40 text-green-300'
                                : 'bg-gray-900/40 text-gray-400'
                            }`}
                          >
                            {entry.entry_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              entry.payment_status === 'Paid'
                                ? 'bg-green-900/40 text-green-300'
                                : entry.payment_status === 'Unpaid'
                                ? 'bg-yellow-900/40 text-yellow-300'
                                : 'bg-gray-900/40 text-gray-400'
                            }`}
                          >
                            {entry.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              entry.tech_status === 'Passed'
                                ? 'bg-green-900/40 text-green-300'
                                : entry.tech_status === 'Failed'
                                ? 'bg-red-900/40 text-red-300'
                                : 'bg-gray-900/40 text-gray-400'
                            }`}
                          >
                            {entry.tech_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {flags.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                              <span className="text-red-300 font-medium">
                                {flags.length}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
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

      {/* Detail drawer */}
      {selectedEntry && (
        <EntryDetailDrawer
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSave={() => {
            setSelectedEntry(null);
          }}
        />
      )}

      {/* Create modal */}
      <CreateEntryModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        eventId={selectedEvent.id}
        seriesId={selectedEvent.series_id}
      />
    </div>
  );
}