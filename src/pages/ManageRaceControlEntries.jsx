import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Eye, Download, AlertCircle, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ManageRaceControlEntries() {
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [entryStatusFilter, setEntryStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntries, setSelectedEntries] = useState(new Set());

  // Fetch events
  const { data: events = [] } = useQuery({
    queryKey: ['raceControlEvents'],
    queryFn: () => base44.entities.RaceControlEvent.list(),
  });

  // Fetch classes for selected event
  const { data: classes = [] } = useQuery({
    queryKey: ['eventClasses', selectedEvent],
    queryFn: () => base44.entities.RaceControlEventClass.filter(
      { racecontrolevent_id: selectedEvent }
    ),
    enabled: !!selectedEvent,
  });

  // Fetch drivers for lookup
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  // Fetch entries for selected event
  const { data: allEntries = [], isLoading } = useQuery({
    queryKey: ['entries', selectedEvent],
    queryFn: () => base44.entities.RaceControlEntry.filter(
      { racecontrolevent_id: selectedEvent }
    ),
    enabled: !!selectedEvent,
  });

  // Filter entries
  const filteredEntries = useMemo(() => {
    let result = allEntries;

    if (selectedClass) {
      result = result.filter(e => e.class_name === selectedClass);
    }

    if (entryStatusFilter) {
      result = result.filter(e => e.status === entryStatusFilter);
    }

    if (paymentStatusFilter) {
      result = result.filter(e => e.payment_status === paymentStatusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e => {
        const driver = drivers.find(d => d.id === e.driver_id);
        const driverName = driver ? `${driver.first_name} ${driver.last_name}` : '';
        return driverName.toLowerCase().includes(query) || e.car_number.includes(query);
      });
    }

    return result;
  }, [allEntries, selectedClass, entryStatusFilter, paymentStatusFilter, searchQuery, drivers]);

  // Withdraw entry mutation
  const withdrawEntryMutation = useMutation({
    mutationFn: (entryId) =>
      base44.entities.RaceControlEntry.update(entryId, { status: 'withdrawn' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', selectedEvent] });
    },
  });

  // Bulk update class mutation
  const updateClassMutation = useMutation({
    mutationFn: async ({ entryIds, newClass }) => {
      for (const entryId of entryIds) {
        await base44.entities.RaceControlEntry.update(entryId, { class_name: newClass });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', selectedEvent] });
      setSelectedEntries(new Set());
    },
  });

  // Bulk assign transponders mutation
  const assignTranspondersMutation = useMutation({
    mutationFn: async ({ entryIds, baseTransponderId }) => {
      for (let i = 0; i < entryIds.length; i++) {
        const transponderId = `${baseTransponderId}${String(i + 1).padStart(3, '0')}`;
        await base44.entities.RaceControlEntry.update(entryIds[i], {
          transponder_id: transponderId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', selectedEvent] });
      setSelectedEntries(new Set());
    },
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Car Number', 'Driver Name', 'Class', 'Transponder ID', 'Status', 'Payment', 'Tech', 'Flags'];
    const rows = filteredEntries.map(entry => {
      const driver = drivers.find(d => d.id === entry.driver_id);
      return [
        entry.car_number,
        driver ? `${driver.first_name} ${driver.last_name}` : '—',
        entry.class_name,
        entry.transponder_id || '—',
        entry.status,
        entry.payment_status,
        entry.tech_status,
        (entry.flags || []).join('; '),
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entries-${selectedEvent}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : '—';
  };

  const getEventName = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event?.event_name || '—';
  };

  const toggleEntry = (entryId) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  return (
    <PageShell>
      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">RaceControl Entries</h1>
            <p className="text-gray-600">Manage race event entries and registrations</p>
          </div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Event</label>
                <Select value={selectedEvent} onValueChange={(value) => {
                  setSelectedEvent(value);
                  setSelectedClass('');
                  setSelectedEntries(new Set());
                }}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>{event.event_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Class</label>
                <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedEvent}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Classes</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.class_name}>{cls.class_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Entry Status</label>
                <Select value={entryStatusFilter} onValueChange={setEntryStatusFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All</SelectItem>
                    <SelectItem value="registered">Registered</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    <SelectItem value="disqualified">Disqualified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Payment Status</label>
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <div className="w-full relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Driver name or car #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedEntries.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between"
              >
                <span className="text-sm font-semibold text-blue-900">
                  {selectedEntries.size} entry{selectedEntries.size !== 1 ? 'ies' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(newClass) => {
                      updateClassMutation.mutate({
                        entryIds: Array.from(selectedEntries),
                        newClass,
                      });
                    }}
                  >
                    <SelectTrigger className="w-40 bg-white">
                      <SelectValue placeholder="Change class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.class_name}>{cls.class_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const baseId = prompt('Enter base transponder ID (e.g., 1000):');
                      if (baseId) {
                        assignTranspondersMutation.mutate({
                          entryIds: Array.from(selectedEntries),
                          baseTransponderId: baseId,
                        });
                      }
                    }}
                  >
                    Assign Transponders
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedEntries(new Set())}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Entries Table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Entries</CardTitle>
                    <CardDescription>{filteredEntries.length} entry{filteredEntries.length !== 1 ? 'ies' : ''}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={filteredEntries.length === 0}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading entries...</div>
                ) : !selectedEvent ? (
                  <div className="text-center py-8 text-gray-500">Select an event to view entries</div>
                ) : filteredEntries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No entries found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedEntries.size === filteredEntries.length && filteredEntries.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEntries(new Set(filteredEntries.map(e => e.id)));
                                } else {
                                  setSelectedEntries(new Set());
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Car #</TableHead>
                          <TableHead>Driver Name</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Transponder ID</TableHead>
                          <TableHead>Entry Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Tech</TableHead>
                          <TableHead>Flags</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEntries.map(entry => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedEntries.has(entry.id)}
                                onCheckedChange={() => toggleEntry(entry.id)}
                              />
                            </TableCell>
                            <TableCell className="font-bold text-lg">{entry.car_number}</TableCell>
                            <TableCell>{getDriverName(entry.driver_id)}</TableCell>
                            <TableCell>{entry.class_name}</TableCell>
                            <TableCell className="font-mono text-sm">{entry.transponder_id || '—'}</TableCell>
                            <TableCell>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                entry.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                                entry.status === 'checked_in' ? 'bg-green-100 text-green-800' :
                                entry.status === 'withdrawn' ? 'bg-gray-100 text-gray-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {entry.status.replace('_', ' ')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                entry.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                entry.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.payment_status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                entry.tech_status === 'passed' ? 'bg-green-100 text-green-800' :
                                entry.tech_status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.tech_status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {entry.flags && entry.flags.length > 0 ? (
                                <AlertCircle className="w-4 h-4 text-orange-500" title={entry.flags.join(', ')} />
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </Button>
                                {entry.status !== 'withdrawn' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => withdrawEntryMutation.mutate(entry.id)}
                                  >
                                    X Withdraw
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => {
                                    const driver = drivers.find(d => d.id === entry.driver_id);
                                    if (driver) {
                                      window.open(`/driver-profile/${driver.id}`, '_blank');
                                    }
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                  Profile
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </PageShell>
  );
}