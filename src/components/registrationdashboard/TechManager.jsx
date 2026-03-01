import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, Clock, AlertCircle, Upload, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

// Tech checklist templates
const TECH_TEMPLATES = {
  'Generic': [
    { label: 'Safety equipment present', help: 'Helmet, harness, etc.' },
    { label: 'Fuel system secure', help: 'No leaks, proper caps' },
    { label: 'Brakes functional', help: 'Test pedal feel and stopping' },
    { label: 'Steering responsive', help: 'Check for play or damage' },
    { label: 'Tires condition', help: 'Tread depth, inflation, damage' },
    { label: 'Lights operational', help: 'Headlights, brake lights' },
    { label: 'Suspension intact', help: 'Check for damage or excessive wear' },
    { label: 'Engine runs smoothly', help: 'No unusual sounds or vibrations' },
    { label: 'Belts and hoses intact', help: 'No cracks or leaks' },
    { label: 'Electrical system OK', help: 'Battery, alternator, wiring' },
  ],
  'Off Road Short Course': [
    { label: 'Roll cage secure', help: 'All welds intact' },
    { label: 'Tie rods and steering', help: 'No play or damage' },
    { label: 'A-arms and control arms', help: 'Check for bending' },
    { label: 'Shocks functional', help: 'No leaks, full travel' },
    { label: 'Skid plate intact', help: 'Protecting fuel and oil' },
    { label: 'Fuel cell secure', help: 'Proper mounting, no leaks' },
    { label: 'Seat and harness', help: 'Secure, no tears or damage' },
    { label: 'Lights and safety', help: 'Kill switch, lights working' },
    { label: 'Tires and wheels', help: 'Lug nuts tight, tread OK' },
    { label: 'Fire extinguisher accessible', help: 'Mounted and ready' },
  ],
  'Asphalt Oval': [
    { label: 'Brakes inspected', help: 'Pads, rotors, fluid' },
    { label: 'Suspension springs', help: 'No cracks or bending' },
    { label: 'Sway bars connected', help: 'Check end links' },
    { label: 'Wheels and lug nuts', help: 'Tight, no cracks' },
    { label: 'Fuel system safe', help: 'Fill cap tight, no leaks' },
    { label: 'Safety harness', help: 'Properly installed, functional' },
    { label: 'Driver window net', help: 'Properly mounted' },
    { label: 'Engine bay secure', help: 'All components tight' },
  ],
  'Dirt Oval': [
    { label: 'Cage and frame', help: 'Welds solid, no cracks' },
    { label: 'Suspension play', help: 'Check all pivot points' },
    { label: 'Drive shaft secure', help: 'No damage or vibration' },
    { label: 'Fuel cell mounted', help: 'Properly strapped' },
    { label: 'Brakes responsive', help: 'Full pressure and feel' },
    { label: 'Lights working', help: 'Headlight, brake light' },
    { label: 'Seat and belts', help: 'Secure and functional' },
    { label: 'Tires pressure', help: 'Check before event' },
  ],
  'Road Course': [
    { label: 'Brake system', help: 'Lines, pads, fluid level' },
    { label: 'Suspension geometry', help: 'Alignment looks correct' },
    { label: 'Steering rack', help: 'No leaks, responsive' },
    { label: 'Tire condition', help: 'Tread, sidewalls, inflation' },
    { label: 'Engine cooling', help: 'Radiator, fans, thermostat' },
    { label: 'Transmission smooth', help: 'No grinding or slipping' },
    { label: 'Exhaust intact', help: 'No leaks or damage' },
    { label: 'Lights and wipers', help: 'All operational' },
    { label: 'Safety equipment', help: 'Helmet, harness, fire suit' },
    { label: 'Drive line intact', help: 'CV boots, U-joints' },
  ],
};

export default function TechManager({ selectedEvent, user, canAction }) {
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('Generic');
  const [checklist, setChecklist] = useState({});
  const [notes, setNotes] = useState('');
  const [notesMode, setNotesMode] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkUpdates, setBulkUpdates] = useState({});
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

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateMutation = useMutation({
    mutationFn: async (updateData) => {
      const result = await base44.entities.Entry.update(selectedEntry.id, updateData);
      
      // Log operation
      try {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'tech_update',
          status: 'success',
          entity_name: 'Entry',
          entity_id: selectedEntry.id,
          metadata: JSON.stringify(updateData),
          source_type: 'TechManager',
          event_id: selectedEvent?.id,
        });
      } catch (e) {
        console.warn('Failed to log operation:', e);
      }
      
      return result;
    },
    onSuccess: (updatedEntry) => {
      queryClient.invalidateQueries({ queryKey: ['entries', selectedEvent?.id] });
      setSelectedEntry(updatedEntry);
      toast.success('Entry updated');
    },
    onError: () => {
      toast.error('Failed to update entry');
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates) => {
      const results = [];
      for (const [entryId, data] of Object.entries(updates)) {
        try {
          const result = await base44.entities.Entry.update(entryId, data);
          results.push(result);
          
          // Log each bulk update
          try {
            await base44.asServiceRole.entities.OperationLog.create({
              operation_type: 'tech_update',
              status: 'success',
              entity_name: 'Entry',
              entity_id: entryId,
              metadata: JSON.stringify(data),
              source_type: 'TechManager-Bulk',
              event_id: selectedEvent?.id,
            });
          } catch (e) {
            console.warn('Failed to log operation:', e);
          }
        } catch (e) {
          console.warn('Bulk update failed for entry:', entryId, e);
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', selectedEvent?.id] });
      setBulkUpdates({});
      toast.success('Entries updated');
    },
    onError: () => {
      toast.error('Failed to update entries');
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
    setNotes(entry.tech_notes || entry.notes || '');
    setChecklist({});
    setNotesMode(false);
  };

  const handleSetTechStatus = (status) => {
    const update = {};
    if ('tech_status' in selectedEntry) {
      update.tech_status = status;
    }
    if (status !== 'Not Inspected') {
      if ('tech_checked_at' in selectedEntry) {
        update.tech_checked_at = new Date().toISOString();
      }
      if ('tech_checked_by_user_id' in selectedEntry && currentUser) {
        update.tech_checked_by_user_id = currentUser.id;
      }
    }
    if ('tech_recheck_required' in selectedEntry) {
      update.tech_recheck_required = status === 'Recheck Required';
    }
    if (Object.keys(update).length === 0 && 'status' in selectedEntry) {
      update.status = status;
    }
    if (Object.keys(update).length > 0) {
      updateMutation.mutate(update);
    }
  };

  const handleSaveNotes = () => {
    const field = 'tech_notes' in selectedEntry ? 'tech_notes' : 'notes';
    updateMutation.mutate({ [field]: notes });
    setNotesMode(false);
  };

  const handleToggleChecklistItem = (idx) => {
    setChecklist((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleSaveChecklist = () => {
    const template = TECH_TEMPLATES[selectedTemplate];
    const passed = Object.values(checklist).filter(Boolean).length;
    const total = template.length;
    const summary = `Tech checklist, ${selectedTemplate}, ${passed}/${total}`;
    
    const field = 'tech_notes' in selectedEntry ? 'tech_notes' : 'notes';
    let existingNotes = selectedEntry[field] || '';
    
    // Remove old checklist line if exists
    existingNotes = existingNotes.split('\n').filter(line => !line.startsWith('Tech checklist')).join('\n').trim();
    const finalNotes = existingNotes ? `${existingNotes}\n${summary}` : summary;
    
    updateMutation.mutate({ [field]: finalNotes });
    setChecklist({});
  };

  const handleBulkTechUpdate = (entryId, status) => {
    const update = {};
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    
    if ('tech_status' in entry) {
      update.tech_status = status;
    }
    if (status !== 'Not Inspected') {
      if ('tech_checked_at' in entry) {
        update.tech_checked_at = new Date().toISOString();
      }
      if ('tech_checked_by_user_id' in entry && currentUser) {
        update.tech_checked_by_user_id = currentUser.id;
      }
    }
    if ('tech_recheck_required' in entry) {
      update.tech_recheck_required = status === 'Recheck Required';
    }
    if (Object.keys(update).length === 0 && 'status' in entry) {
      update.status = status;
    }
    
    if (Object.keys(update).length > 0) {
      setBulkUpdates(prev => ({
        ...prev,
        [entryId]: update,
      }));
    }
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

  const hasPermission = canAction?.includes('techUpdate');

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-gray-400">
            Select Track/Series, season, and event above to manage tech inspection
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!hasPermission) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-gray-400">You don't have permission to manage tech inspection</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Mode Toggle */}
      <div className="flex items-center gap-2 bg-[#171717] border border-gray-800 rounded-lg p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBulkMode(!bulkMode)}
          className="flex items-center gap-2 text-gray-400 hover:text-white"
        >
          {bulkMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          <span className="text-xs font-medium">{bulkMode ? 'Bulk Mode' : 'Single Entry'}</span>
        </Button>
      </div>

      {/* Bulk Mode Table */}
      {bulkMode ? (
        <div className="bg-[#171717] border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="text-left p-3 text-gray-400">Car #</th>
                  <th className="text-left p-3 text-gray-400">Driver</th>
                  <th className="text-left p-3 text-gray-400">Class</th>
                  <th className="text-left p-3 text-gray-400">Status</th>
                  <th className="text-center p-3 text-gray-400">Pass</th>
                  <th className="text-center p-3 text-gray-400">Fail</th>
                  <th className="text-center p-3 text-gray-400">Recheck</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredEntries.slice(0, 25).map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-900/50">
                    <td className="p-3 text-white font-semibold">#{entry.car_number}</td>
                    <td className="p-3 text-gray-300">{getDriverName(entry.driver_id)}</td>
                    <td className="p-3 text-gray-400 text-xs">{getEventClassName(entry.series_class_id)}</td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs">
                        {bulkUpdates[entry.id]?.tech_status || entry.tech_status || 'Not Inspected'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleBulkTechUpdate(entry.id, 'Passed')}
                        disabled={bulkUpdateMutation.isPending}
                        className={`text-xs ${bulkUpdates[entry.id]?.tech_status === 'Passed' ? 'bg-green-900/40 text-green-300' : 'text-gray-400'}`}
                      >
                        ✓
                      </Button>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleBulkTechUpdate(entry.id, 'Failed')}
                        disabled={bulkUpdateMutation.isPending}
                        className={`text-xs ${bulkUpdates[entry.id]?.tech_status === 'Failed' ? 'bg-red-900/40 text-red-300' : 'text-gray-400'}`}
                      >
                        ✗
                      </Button>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleBulkTechUpdate(entry.id, 'Recheck Required')}
                        disabled={bulkUpdateMutation.isPending}
                        className={`text-xs ${bulkUpdates[entry.id]?.tech_status === 'Recheck Required' ? 'bg-yellow-900/40 text-yellow-300' : 'text-gray-400'}`}
                      >
                        !
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {Object.keys(bulkUpdates).length > 0 && (
            <div className="border-t border-gray-800 p-3 flex gap-2">
              <Button
                onClick={() => bulkUpdateMutation.mutate(bulkUpdates)}
                disabled={bulkUpdateMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Save {Object.keys(bulkUpdates).length} updates
              </Button>
              <Button
                variant="outline"
                onClick={() => setBulkUpdates({})}
                className="border-gray-700"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Single Entry Mode */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Search and list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls bar */}
          <div className="bg-[#171717] border border-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[120px]">
                <label className="text-xs font-medium text-gray-400 block mb-1">Class</label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value="all">All Classes</SelectItem>
                    {classNames.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[120px]">
                <label className="text-xs font-medium text-gray-400 block mb-1">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Not Inspected">Not Inspected</SelectItem>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Recheck Required">Recheck Required</SelectItem>
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
                className="bg-[#262626] border-gray-700 text-white"
              />
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
                <button
                  key={entry.id}
                  onClick={() => handleSelectEntry(entry)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedEntry?.id === entry.id
                      ? 'bg-gray-800 border-gray-600'
                      : 'bg-[#171717] border-gray-800 hover:border-gray-700 hover:bg-gray-800/30'
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
                    <Badge variant={entry.tech_status === 'Passed' ? 'default' : 'secondary'} className="text-xs">
                      {entry.tech_status || 'Not Inspected'}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right column: Tech Inspector panel */}
        {selectedEntry ? (
          <Card className="bg-[#171717] border-gray-800 lg:sticky lg:top-4 lg:h-fit">
            <CardHeader className="border-b border-gray-800 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white text-lg">{getDriverName(selectedEntry.driver_id)}</CardTitle>
                  <p className="text-xs text-gray-400 mt-1">#{selectedEntry.car_number || '—'}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 py-4">
              {/* Driver Info */}
              <div className="bg-gray-900/50 rounded p-3">
                <p className="text-xs text-gray-400">Class</p>
                <p className="text-sm font-semibold text-white">{getEventClassName(selectedEntry.series_class_id)}</p>
              </div>

              {/* Tech Status */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400">Tech Status</p>
                <div className="space-y-2">
                  {['Passed', 'Failed', 'Recheck Required', 'Not Inspected'].map((status) => (
                    <Button
                      key={status}
                      onClick={() => handleSetTechStatus(status)}
                      disabled={updateMutation.isPending}
                      variant={selectedEntry.tech_status === status ? 'default' : 'outline'}
                      className={`w-full text-sm font-semibold ${
                        selectedEntry.tech_status === status
                          ? status === 'Passed'
                            ? 'bg-green-600 hover:bg-green-700'
                            : status === 'Failed'
                            ? 'bg-red-600 hover:bg-red-700'
                            : status === 'Recheck Required'
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                          : 'border-gray-700 text-gray-300'
                      }`}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2 border-t border-gray-800 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-400">Checklist Template</label>
                </div>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="bg-[#262626] border-gray-700 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#262626] border-gray-700">
                    {Object.keys(TECH_TEMPLATES).map((tmpl) => (
                      <SelectItem key={tmpl} value={tmpl}>
                        {tmpl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {TECH_TEMPLATES[selectedTemplate].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-gray-900/50 rounded">
                      <Checkbox
                        checked={checklist[idx] || false}
                        onCheckedChange={() => handleToggleChecklistItem(idx)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white">{item.label}</p>
                        {item.help && <p className="text-xs text-gray-400">{item.help}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {Object.keys(checklist).length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleSaveChecklist}
                    disabled={updateMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Save Checklist ({Object.values(checklist).filter(Boolean).length}/{TECH_TEMPLATES[selectedTemplate].length})
                  </Button>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2 border-t border-gray-800 pt-4">
                {!notesMode ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNotesMode(true)}
                    className="w-full border-gray-700"
                  >
                    {notes ? 'Edit Notes' : 'Add Notes'}
                  </Button>
                ) : (
                  <>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Inspection notes..."
                      rows={3}
                      className="bg-[#262626] border-gray-700 text-white text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNotesMode(false)}
                        className="flex-1 border-gray-700"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                        disabled={updateMutation.isPending}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        Save
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Inspector Info */}
              <div className="bg-gray-900/50 rounded p-3 space-y-1 border-t border-gray-800 pt-4">
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
          <Card className="bg-[#171717] border-gray-800 lg:sticky lg:top-4">
            <CardContent className="py-8 text-center">
              <AlertCircle className="w-6 h-6 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Select an entry to inspect</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}