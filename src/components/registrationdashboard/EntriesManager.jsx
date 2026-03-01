import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { AlertCircle, Download, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/components/utils';
import { Link } from 'react-router-dom';
import AddEntryDialog from './AddEntryDialog';
import EntryDetailDrawer from './EntryDetailDrawer';
import EntriesBulkActions from './EntriesBulkActions';

export default function EntriesManager({ eventId, seriesId, selectedEvent }) {
  const [classFilter, setClassFilter] = useState('all');
  const [entryStatusFilter, setEntryStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const queryClient = useQueryClient();

  // Fetch entries
  const { data: entries = [] } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId, status: 'active' }),
    enabled: !!eventId,
  });

  // Fetch event classes
  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => base44.entities.EventClass.filter({ event_id: eventId, status: 'active' }),
    enabled: !!eventId,
  });

  // Fetch drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  // Update entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', eventId] });
    },
  });

  // Helper function to get compliance flags
  const computeFlags = (entry) => {
    const flags = [...(entry.flags || [])];
    
    if (entry.waiver_status === 'Missing' && !flags.includes('MissingWaiver')) {
      flags.push('MissingWaiver');
    }
    if (entry.payment_status === 'Unpaid' && !flags.includes('Unpaid')) {
      flags.push('Unpaid');
    }
    if (!entry.transponder_id && !flags.includes('MissingTransponder')) {
      flags.push('MissingTransponder');
    }
    
    // Check duplicate car numbers
    const duplicates = entries.filter(
      (e) =>
        e.id !== entry.id &&
        e.event_id === entry.event_id &&
        e.event_class_id === entry.event_class_id &&
        e.car_number === entry.car_number &&
        e.entry_status !== 'Withdrawn'
    );
    if (duplicates.length > 0 && !flags.includes('DuplicateCarNumber')) {
      flags.push('DuplicateCarNumber');
    }

    return flags;
  };

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const flags = computeFlags(entry);
      if (classFilter !== 'all' && entry.event_class_id !== classFilter) return false;
      if (entryStatusFilter !== 'all' && entry.entry_status !== entryStatusFilter) return false;
      if (paymentStatusFilter !== 'all' && entry.payment_status !== paymentStatusFilter) return false;
      
      if (searchTerm) {
        const driver = drivers.find((d) => d.id === entry.driver_id);
        const driverName = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
        const search = searchTerm.toLowerCase();
        return (
          driverName.includes(search) ||
          entry.car_number.toLowerCase().includes(search) ||
          (entry.transponder_id && entry.transponder_id.toLowerCase().includes(search))
        );
      }
      return true;
    });
  }, [entries, classFilter, entryStatusFilter, paymentStatusFilter, searchTerm, drivers]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEntries(new Set());
      setSelectAll(false);
    } else {
      setSelectedEntries(new Set(filteredEntries.map((e) => e.id)));
      setSelectAll(true);
    }
  };

  // Handle row select
  const handleRowSelect = (entryId) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
    setSelectAll(newSelected.size === filteredEntries.length && filteredEntries.length > 0);
  };

  // Get driver name
  const getDriverName = (driverId) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
  };

  // Get class name
  const getClassName = (classId) => {
    const cls = eventClasses.find((c) => c.id === classId);
    return cls?.class_name || 'Unknown';
  };

  // Row highlight based on flags
  const getRowStyle = (entry) => {
    const flags = computeFlags(entry);
    if (flags.includes('MissingWaiver') || flags.includes('Unpaid')) {
      return 'bg-red-900/20 border-l-2 border-red-500';
    }
    if (flags.includes('MissingTransponder') || flags.includes('DuplicateCarNumber')) {
      return 'bg-yellow-900/20 border-l-2 border-yellow-500';
    }
    return '';
  };

  // Export CSV
  const handleExportCSV = () => {
    const data = filteredEntries.map((entry) => ({
      'Car Number': entry.car_number,
      Driver: getDriverName(entry.driver_id),
      Class: getClassName(entry.event_class_id),
      Transponder: entry.transponder_id || '',
      'Entry Status': entry.entry_status,
      'Payment Status': entry.payment_status,
      'Tech Status': entry.tech_status,
      Flags: (computeFlags(entry) || []).join(', '),
    }));

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map((row) => Object.values(row).map((v) => `"${v}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entries-${eventId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <>
      <div className="space-y-4">
        {/* Top Controls */}
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="bg-gray-900 border-gray-700">
                  <SelectValue placeholder="All Classes" />
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

              <Select value={entryStatusFilter} onValueChange={setEntryStatusFilter}>
                <SelectTrigger className="bg-gray-900 border-gray-700">
                  <SelectValue placeholder="All Entry Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Registered">Registered</SelectItem>
                  <SelectItem value="CheckedIn">Checked In</SelectItem>
                  <SelectItem value="Teched">Teched</SelectItem>
                  <SelectItem value="Withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="bg-gray-900 border-gray-700">
                  <SelectValue placeholder="All Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Search by name, #, or transponder..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-900 border-gray-700"
              />

              <div className="flex gap-2">
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  size="sm"
                  className="border-gray-700 hover:bg-gray-900"
                >
                  <Download className="w-4 h-4 mr-1" /> Export
                </Button>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedEntries.size > 0 && (
          <EntriesBulkActions
            selectedEntries={selectedEntries}
            entries={entries}
            eventClasses={eventClasses}
            onUpdateComplete={() => {
              setSelectedEntries(new Set());
              setSelectAll(false);
            }}
          />
        )}

        {/* Entries Table */}
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Entries ({filteredEntries.length})</span>
              {filteredEntries.length > 0 && (
                <label className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                  Select all
                </label>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400">No entries found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-3 font-semibold text-gray-400 w-8">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-400">#</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-400">Driver</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-400">Class</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-400">Transponder</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-400">Entry Status</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-400">Payment</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-400">Tech</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-400">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => {
                      const flags = computeFlags(entry);
                      return (
                        <tr
                          key={entry.id}
                          onClick={() => setSelectedEntryId(entry.id)}
                          className={`border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors ${getRowStyle(
                            entry
                          )}`}
                        >
                          <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedEntries.has(entry.id)}
                              onChange={() => handleRowSelect(entry.id)}
                              className="rounded"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="py-3 px-3 font-semibold text-white">{entry.car_number}</td>
                          <td className="py-3 px-3">
                            <Link
                              to={createPageUrl(`DriverProfile?id=${entry.driver_id}`)}
                              className="text-blue-400 hover:text-blue-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {getDriverName(entry.driver_id)}
                            </Link>
                          </td>
                          <td className="py-3 px-3">{getClassName(entry.event_class_id)}</td>
                          <td className="py-3 px-3 text-gray-400">{entry.transponder_id || '-'}</td>
                          <td className="py-3 px-3">
                            <Badge
                              className={
                                entry.entry_status === 'CheckedIn'
                                  ? 'bg-green-500/20 text-green-400'
                                  : entry.entry_status === 'Teched'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : entry.entry_status === 'Withdrawn'
                                  ? 'bg-gray-500/20 text-gray-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }
                            >
                              {entry.entry_status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              className={
                                entry.payment_status === 'Paid'
                                  ? 'bg-green-500/20 text-green-400'
                                  : entry.payment_status === 'Refunded'
                                  ? 'bg-gray-500/20 text-gray-400'
                                  : 'bg-red-500/20 text-red-400'
                              }
                            >
                              {entry.payment_status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              className={
                                entry.tech_status === 'Passed'
                                  ? 'bg-green-500/20 text-green-400'
                                  : entry.tech_status === 'Failed'
                                  ? 'bg-red-500/20 text-red-400'
                                  : entry.tech_status === 'RecheckRequired'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }
                            >
                              {entry.tech_status === 'NotInspected' ? 'Not Inspected' : entry.tech_status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            {flags.length > 0 ? (
                              <div className="flex items-center gap-1">
                                {flags.includes('Unpaid') || flags.includes('MissingWaiver') ? (
                                  <AlertCircle className="w-4 h-4 text-red-400" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                                )}
                                <span className="text-gray-400">{flags.length}</span>
                              </div>
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
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
      </div>

      {/* Add Entry Dialog */}
      {showAddDialog && (
        <AddEntryDialog
          eventId={eventId}
          eventClasses={eventClasses}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            queryClient.invalidateQueries({ queryKey: ['entries', eventId] });
          }}
        />
      )}

      {/* Entry Detail Drawer */}
      {selectedEntryId && (
        <EntryDetailDrawer
          entryId={selectedEntryId}
          eventId={eventId}
          onClose={() => setSelectedEntryId(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['entries', eventId] });
          }}
        />
      )}
    </>
  );
}