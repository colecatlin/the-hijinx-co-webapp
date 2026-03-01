import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { ChevronRight, Clock } from 'lucide-react';

export default function TechManager({ selectedEvent, user }) {
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['entries', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.Entry.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', selectedEvent?.id],
    queryFn: () =>
      selectedEvent
        ? base44.entities.EventClass.filter({ event_id: selectedEvent.id })
        : Promise.resolve([]),
    enabled: !!selectedEvent,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Entry.update(selectedEntry.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      setSelectedEntry(null);
      setNotes('');
    },
  });

  const getDriverName = (driverId) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
  };

  const getEventClassName = (seriesClassId) => {
    const seriesClass = seriesClasses.find((sc) => sc.id === seriesClassId);
    return seriesClass?.class_name || 'Unknown';
  };

  const classNames = useMemo(() => {
    const names = new Set();
    entries.forEach((e) => names.add(getEventClassName(e.series_class_id)));
    return Array.from(names);
  }, [entries, seriesClasses]);

  // Memoize entries by class
  const entriesByClass = useMemo(() => {
    const grouped = {};
    entries.forEach((e) => {
      const cls = getEventClassName(e.series_class_id);
      if (!grouped[cls]) grouped[cls] = [];
      grouped[cls].push(e);
    });
    return grouped;
  }, [entries, seriesClasses]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (classFilter !== 'all' && getEventClassName(entry.series_class_id) !== classFilter) return false;
      if (statusFilter !== 'all' && entry.tech_status !== statusFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          entry.car_number.toLowerCase().includes(search) ||
          getDriverName(entry.driver_id).toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [entries, classFilter, statusFilter, searchTerm, drivers, seriesClasses]);

  const getComplianceBadges = (entry) => {
    const badges = [];
    if (!entry.waiver_verified) badges.push({ label: 'Waiver Missing', color: 'bg-yellow-900/40 text-yellow-300' });
    if (entry.payment_status === 'Unpaid') badges.push({ label: 'Unpaid', color: 'bg-red-900/40 text-red-300' });
    return badges;
  };

  const handleSelectEntry = (entry) => {
    setSelectedEntry(entry);
    setNotes(entry.notes || '');
  };

  const handleSetTechStatus = (status) => {
    const updateData = { tech_status: status };
    if (notes !== selectedEntry.notes) {
      updateData.notes = notes;
    }
    updateMutation.mutate(updateData);
  };

  const handleSaveNotes = () => {
    updateMutation.mutate({ notes });
  };

  const getTechStatusColor = (status) => {
    switch (status) {
      case 'Passed':
        return 'bg-green-900/40 text-green-300';
      case 'Failed':
        return 'bg-red-900/40 text-red-300';
      case 'RecheckRequired':
        return 'bg-yellow-900/40 text-yellow-300';
      default:
        return 'bg-gray-900/40 text-gray-300';
    }
  };

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Select an event to manage tech inspection.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left column: Search and list */}
      <div className="lg:col-span-2 space-y-4">
        {/* Controls bar */}
        <div className="bg-[#171717] border border-gray-800 rounded-lg p-4">
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="min-w-[150px]">
                <label className="text-xs font-medium text-gray-400 block mb-1">Class</label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="bg-[#262626] border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classNames.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[150px]">
                <label className="text-xs font-medium text-gray-400 block mb-1">Tech Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-[#262626] border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="NotInspected">Not Inspected</SelectItem>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="RecheckRequired">Recheck Required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1">Search</label>
              <Input
                placeholder="Driver, car number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#262626] border-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Entries list */}
        <div className="space-y-2">
          {entriesLoading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : filteredEntries.length === 0 ? (
            <p className="text-gray-400 text-sm">No entries found.</p>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => handleSelectEntry(entry)}
                className={`cursor-pointer p-4 rounded-lg border transition-colors ${
                  selectedEntry?.id === entry.id
                    ? 'bg-gray-800 border-gray-600'
                    : 'bg-[#171717] border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-white">#{entry.car_number}</p>
                    <p className="text-sm text-gray-400">{getDriverName(entry.driver_id)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>

                <p className="text-xs text-gray-500 mb-2">{getEventClassName(entry.series_class_id)}</p>

                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTechStatusColor(entry.tech_status)}`}>
                    {entry.tech_status}
                  </span>

                  {getComplianceBadges(entry).map((badge, idx) => (
                    <span key={idx} className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right column: Tech Inspector panel */}
      {selectedEntry ? (
        <Card className="bg-[#171717] border-gray-800 h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Tech Inspector</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tech Status Buttons */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400">Set Status</p>
              <div className="space-y-2">
                <Button
                  onClick={() => handleSetTechStatus('Passed')}
                  disabled={updateMutation.isPending}
                  variant={selectedEntry.tech_status === 'Passed' ? 'default' : 'outline'}
                  className={`w-full ${selectedEntry.tech_status === 'Passed' ? 'bg-green-600 hover:bg-green-700' : 'border-gray-700'}`}
                >
                  Pass
                </Button>
                <Button
                  onClick={() => handleSetTechStatus('Failed')}
                  disabled={updateMutation.isPending}
                  variant={selectedEntry.tech_status === 'Failed' ? 'default' : 'outline'}
                  className={`w-full ${selectedEntry.tech_status === 'Failed' ? 'bg-red-600 hover:bg-red-700' : 'border-gray-700'}`}
                >
                  Fail
                </Button>
                <Button
                  onClick={() => handleSetTechStatus('RecheckRequired')}
                  disabled={updateMutation.isPending}
                  variant={selectedEntry.tech_status === 'RecheckRequired' ? 'default' : 'outline'}
                  className={`w-full ${selectedEntry.tech_status === 'RecheckRequired' ? 'bg-yellow-600 hover:bg-yellow-700' : 'border-gray-700'}`}
                >
                  Recheck Required
                </Button>
                <Button
                  onClick={() => handleSetTechStatus('NotInspected')}
                  disabled={updateMutation.isPending}
                  variant={selectedEntry.tech_status === 'NotInspected' ? 'default' : 'outline'}
                  className="w-full border-gray-700"
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400">Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Inspection notes..."
                rows={3}
                className="w-full bg-[#262626] border border-gray-700 rounded px-2 py-2 text-xs text-gray-300 resize-none"
              />
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={updateMutation.isPending}
                className="w-full bg-gray-700 hover:bg-gray-600"
              >
                Save Notes
              </Button>
            </div>

            {/* Inspector Info */}
            <div className="bg-gray-900 rounded p-3 space-y-1">
              <p className="text-xs text-gray-400">Inspector</p>
              <p className="text-xs font-medium text-white">{user?.full_name || 'Unknown'}</p>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                <Clock className="w-3 h-3" />
                <span>{selectedEntry.updated_date ? new Date(selectedEntry.updated_date).toLocaleString() : 'Never'}</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedEntry(null)}
              className="w-full border-gray-700"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#171717] border-gray-800 h-fit">
          <CardContent className="py-8 text-center">
            <p className="text-gray-400 text-sm">Select an entry to inspect</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}