import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronRight, Plus, Minus, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { buildInvalidateAfterOperation } from './invalidationHelper';

const DQ = applyDefaultQueryOptions();

export default function CheckInManager({ selectedEvent, user }) {
  const [classFilter, setClassFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [qrInput, setQrInput] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState(null);
  const [notesMode, setNotesMode] = useState(false);
  const qrInputRef = useRef(null);
  const queryClient = useQueryClient();

  const eventId = selectedEvent?.id;
  const invalidateAfterOperation = buildInvalidateAfterOperation(queryClient);

  const { data: entries = [], isLoading: entriesLoading, isError: entriesError, refetch: refetchEntries } = useQuery({
    queryKey: QueryKeys.entries.listByEvent(eventId),
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => base44.entities.EventClass.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
    ...DQ,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    ...DQ,
  });

  const updateMutation = useMutation({
    mutationFn: async (updateData) => {
      const result = await base44.entities.Entry.update(selectedEntry.id, updateData);
      
      // Log operation
      try {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'checkin_update',
          status: 'success',
          entity_name: 'Entry',
          entity_id: selectedEntry.id,
          metadata: JSON.stringify(updateData),
          source_type: 'CheckInManager',
          event_id: selectedEvent?.id,
        });
      } catch (e) {
        console.warn('Failed to log operation:', e);
      }
      
      return result;
    },
    onSuccess: (updatedEntry) => {
      invalidateAfterOperation('entry_updated');
      setSelectedEntry(updatedEntry);
      setFormData(updatedEntry);
      toast.success('Entry updated');
    },
    onError: () => {
      toast.error('Failed to update entry');
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
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          entry.car_number.toLowerCase().includes(search) ||
          getDriverName(entry.driver_id).toLowerCase().includes(search) ||
          (entry.transponder_id && entry.transponder_id.toLowerCase().includes(search))
        );
      }
      return true;
    });
  }, [entries, classFilter, searchTerm, drivers, seriesClasses]);

  const getComplianceBadges = (entry) => {
    const badges = [];
    if (!entry.waiver_verified) badges.push({ label: 'Waiver Missing', color: 'bg-yellow-900/40 text-yellow-300' });
    if (entry.payment_status === 'Unpaid') badges.push({ label: 'Unpaid', color: 'bg-red-900/40 text-red-300' });
    if (entry.tech_status === 'NotInspected' || entry.tech_status === 'RecheckRequired') badges.push({ label: 'Tech Pending', color: 'bg-orange-900/40 text-orange-300' });
    return badges;
  };

  const handleSelectEntry = (entry) => {
    setSelectedEntry(entry);
    setFormData({ ...entry });
  };

  const isCheckedIn = formData?.entry_status === 'Checked In';

  const handleCheckIn = () => {
    updateMutation.mutate({
      entry_status: isCheckedIn ? 'Registered' : 'Checked In',
    });
  };

  const handleToggleWaiver = () => {
    updateMutation.mutate({
      waiver_status: formData?.waiver_status === 'Verified' ? 'Missing' : 'Verified',
    });
  };

  const handleTogglePayment = () => {
    updateMutation.mutate({ payment_status: formData?.payment_status === 'Paid' ? 'Unpaid' : 'Paid' });
  };

  const handleWristbandChange = (delta) => {
    const newCount = Math.max(0, (formData?.wristband_count || 0) + delta);
    setFormData({ ...formData, wristband_count: newCount });
  };

  const handleNotesChange = () => {
    updateMutation.mutate({ notes: formData.notes });
    setNotesMode(false);
  };

  const handleQrSubmit = (e) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    
    const entry = entries.find(
      (en) =>
        en.id === qrInput ||
        en.car_number === qrInput ||
        en.transponder_id === qrInput ||
        en.driver_id === qrInput
    );
    
    if (entry) {
      handleSelectEntry(entry);
      setQrInput('');
    } else {
      toast.error('Entry not found');
      setQrInput('');
    }
  };

  // Reset local selection when event changes
  useEffect(() => {
    setSelectedEntry(null);
    setFormData(null);
    setClassFilter('all');
    setSearchTerm('');
  }, [eventId]);

  // Auto-focus QR input on mount
  useEffect(() => {
    if (qrInputRef.current) {
      qrInputRef.current.focus();
    }
  }, []);

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-gray-400">Select Track/Series, season, and event above to check in entries</p>
        </CardContent>
      </Card>
    );
  }

  if (entriesLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-800/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (entriesError) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center space-y-3">
          <p className="text-red-400 text-sm">Failed to load check-in entries</p>
          <Button size="sm" variant="outline" onClick={() => refetchEntries()} className="border-gray-700 text-gray-300">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left column: Search, QR, and list */}
      <div className="lg:col-span-2 space-y-4">
        {/* QR and Search Bar */}
        <div className="bg-[#171717] border border-gray-800 rounded-lg p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1">QR / Transponder ID</label>
            <form onSubmit={handleQrSubmit}>
              <Input
                ref={qrInputRef}
                placeholder="Scan QR or paste ID..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                className="bg-[#262626] border-gray-700 text-white"
              />
            </form>
          </div>

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
              <label className="text-xs font-medium text-gray-400 block mb-1">Search</label>
              <Input
                placeholder="Driver, car #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#262626] border-gray-700 text-white"
              />
            </div>
          </div>
        </div>

        {/* Quick List: Top 25 Recent Entries */}
        {!searchTerm && !classFilter !== 'all' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 px-2">Recent entries (25)</p>
            {entriesLoading ? (
              <p className="text-gray-400 text-sm px-2">Loading...</p>
            ) : filteredEntries.slice(0, 25).length === 0 ? (
              <p className="text-gray-400 text-sm px-2">No entries found.</p>
            ) : (
              filteredEntries.slice(0, 25).map((entry) => (
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
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={entry.entry_status === 'Checked In' ? 'default' : 'secondary'} className="text-xs">
                      {entry.entry_status || 'Registered'}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Filtered Search Results */}
        {(searchTerm || classFilter !== 'all') && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 px-2">{filteredEntries.length} results</p>
            {entriesLoading ? (
              <p className="text-gray-400 text-sm px-2">Loading...</p>
            ) : filteredEntries.length === 0 ? (
              <p className="text-gray-400 text-sm px-2">No entries found.</p>
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
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={entry.entry_status === 'Checked In' ? 'default' : 'secondary'} className="text-xs">
                      {entry.entry_status || 'Registered'}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right column: Detail panel */}
      {selectedEntry && formData ? (
        <Card className="bg-[#171717] border-gray-800 lg:sticky lg:top-4 lg:h-fit">
          <CardHeader className="border-b border-gray-800 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-white text-lg">{getDriverName(selectedEntry.driver_id)}</CardTitle>
                <p className="text-xs text-gray-400 mt-1">#{formData.car_number || '—'}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedEntry(null);
                  setFormData(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 py-4">
            {/* Driver Info */}
            <div className="bg-gray-900/50 rounded p-3 space-y-2">
              <p className="text-xs text-gray-400">Class</p>
              <p className="text-sm font-semibold text-white">{getEventClassName(selectedEntry.series_class_id)}</p>
              {formData.amount_due && (
                <>
                  <p className="text-xs text-gray-400 mt-2">Amount Due</p>
                  <p className="text-sm font-semibold text-white">${formData.amount_due}</p>
                </>
              )}
            </div>

            {/* Status Chips */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={formData.entry_status === 'Checked In' ? 'default' : 'secondary'}
                  className={`text-xs ${formData.entry_status === 'Checked In' ? 'bg-green-600' : ''}`}
                >
                  {formData.entry_status === 'Checked In' ? 'Checked In ✓' : 'Not Checked In'}
                </Badge>
                <Badge
                  variant={formData.waiver_status === 'Verified' ? 'default' : 'secondary'}
                  className={`text-xs ${formData.waiver_status === 'Verified' ? 'bg-green-600' : ''}`}
                >
                  {formData.waiver_status === 'Verified' ? 'Waiver ✓' : 'Waiver ✗'}
                </Badge>
                <Badge
                  variant={formData.payment_status === 'Paid' ? 'default' : 'secondary'}
                  className={`text-xs ${formData.payment_status === 'Paid' ? 'bg-green-600' : ''}`}
                >
                  {formData.payment_status === 'Paid' ? 'Paid ✓' : 'Unpaid'}
                </Badge>
                {formData.tech_status && (
                  <Badge variant="secondary" className="text-xs">
                    Tech: {formData.tech_status}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 border-t border-gray-800 pt-4">
              <Button
                onClick={handleCheckIn}
                disabled={updateMutation.isPending}
                className={`w-full font-semibold ${isCheckedIn ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isCheckedIn ? 'Checked In ✓' : 'Check In Now'}
              </Button>

              <Button
                onClick={handleToggleWaiver}
                disabled={updateMutation.isPending}
                variant="outline"
                className={`w-full border-gray-700 ${
                  formData.waiver_status === 'Verified'
                    ? 'bg-green-900/20 text-green-300 border-green-700'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                {formData.waiver_status === 'Verified' ? 'Waiver Verified ✓' : 'Verify Waiver'}
              </Button>

              <Button
                onClick={handleTogglePayment}
                disabled={updateMutation.isPending}
                variant="outline"
                className={`w-full border-gray-700 ${
                  formData.payment_status === 'Paid'
                    ? 'bg-green-900/20 text-green-300 border-green-700'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                {formData.payment_status === 'Paid' ? 'Paid ✓' : 'Mark Paid'}
              </Button>

              {/* Wristbands (UI-only local counter) */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400">Wristbands: {formData.wristband_count || 0}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleWristbandChange(-1)} className="flex-1 border-gray-700">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleWristbandChange(1)} className="flex-1 border-gray-700">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                {!notesMode ? (
                  <Button size="sm" variant="outline" onClick={() => setNotesMode(true)} className="w-full border-gray-700">
                    {formData.notes ? 'Edit Notes' : 'Add Notes'}
                  </Button>
                ) : (
                  <>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Quick notes..."
                      rows={3}
                      className="bg-[#262626] border-gray-700 text-white text-xs"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setNotesMode(false)} className="flex-1 border-gray-700">Cancel</Button>
                      <Button size="sm" onClick={handleNotesChange} disabled={updateMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700">Save</Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#171717] border-gray-800 lg:sticky lg:top-4">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-6 h-6 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Select an entry to check in</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}