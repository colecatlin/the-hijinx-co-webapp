import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, FileText, CheckCircle2, X, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function ComplianceManager({ selectedEvent, onComplianceSeverityChange, user, canAction }) {
  const [classFilter, setClassFilter] = useState('all');
  const [flagTypeFilter, setFlagTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const queryClient = useQueryClient();
  const hasPermission = canAction?.includes('complianceUpdate');

  // Check auth status
  useQuery({
    queryKey: ['authStatus'],
    queryFn: async () => {
      const status = await base44.auth.isAuthenticated();
      setIsAuth(status);
      return status;
    },
  });

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

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuth,
  });

  const updateMutation = useMutation({
    mutationFn: async (updateData) => {
      const result = await base44.entities.Entry.update(selectedEntry.id, updateData);
      
      // Log operation
      try {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'compliance_update',
          status: 'success',
          entity_name: 'Entry',
          entity_id: selectedEntry.id,
          metadata: JSON.stringify(updateData),
          source_type: 'ComplianceManager',
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

  const getDriverName = (driverId) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unknown';
  };

  const getEventClassName = (seriesClassId) => {
    const seriesClass = seriesClasses.find((sc) => sc.id === seriesClassId);
    return seriesClass?.class_name || 'Unknown';
  };

  // Compute compliance issues and severity
  const complianceData = useMemo(() => {
    if (!entries.length) return { 
      totalEntries: 0,
      totalFlagged: 0,
      flags: { waivers: 0, payments: 0, transponders: 0, duplicates: 0, tech: 0, licenses: 0 },
      entriesMap: new Map(), 
      severity: 'clear' 
    };

    const today = new Date().toISOString().split('T')[0];
    const entriesMap = new Map();
    
    let totalFlagged = 0;
    const flags = { waivers: 0, payments: 0, transponders: 0, duplicates: 0, tech: 0, licenses: 0 };

    // Build car number map per class for duplicate detection
    const carNumbersByClass = {};
    entries.forEach((entry) => {
      const classId = entry.series_class_id || '__all__';
      if (!carNumbersByClass[classId]) carNumbersByClass[classId] = {};
      const carNum = entry.car_number || '';
      if (carNum) {
        carNumbersByClass[classId][carNum] = (carNumbersByClass[classId][carNum] || 0) + 1;
      }
    });

    entries.forEach((entry) => {
      const entryFlags = [];

      // 1. Missing waivers
      if ('waiver_verified' in entry) {
        if (!entry.waiver_verified) {
          entryFlags.push({ type: 'waivers', label: 'Waiver Missing', color: 'bg-yellow-900/40 text-yellow-300' });
          flags.waivers++;
        }
      }

      // 2. Unpaid balance
      if ('payment_status' in entry) {
        if (entry.payment_status !== 'Paid') {
          entryFlags.push({ type: 'payments', label: 'Unpaid', color: 'bg-red-900/40 text-red-300' });
          flags.payments++;
        }
      }

      // 3. Missing transponder
      if ('transponder_id' in entry) {
        if (!entry.transponder_id || entry.transponder_id.trim() === '') {
          entryFlags.push({ type: 'transponders', label: 'No Transponder', color: 'bg-purple-900/40 text-purple-300' });
          flags.transponders++;
        }
      } else {
        // Infer from notes
        const hasTransponderNote = entry.notes && entry.notes.toLowerCase().includes('transponder');
        if (!hasTransponderNote && !entry.transponder_id) {
          entryFlags.push({ type: 'transponders', label: 'No Transponder', color: 'bg-purple-900/40 text-purple-300' });
          flags.transponders++;
        }
      }

      // 4. Duplicate car numbers
      const classId = entry.series_class_id || '__all__';
      const carNum = entry.car_number || '';
      if (carNum && carNumbersByClass[classId]?.[carNum] > 1) {
        entryFlags.push({ type: 'duplicates', label: 'Duplicate #', color: 'bg-orange-900/40 text-orange-300' });
        flags.duplicates++;
      }

      // 5. Tech pending
      if ('tech_status' in entry || 'status' in entry) {
        const techStatus = entry.tech_status || entry.status;
        if (!techStatus || techStatus === 'Not Inspected') {
          entryFlags.push({ type: 'tech', label: 'Tech Pending', color: 'bg-blue-900/40 text-blue-300' });
          flags.tech++;
        }
      }

      // 6. License expired
      const driver = drivers.find(d => d.id === entry.driver_id);
      if (driver && 'license_expiration_date' in driver) {
        if (driver.license_expiration_date && driver.license_expiration_date < today) {
          entryFlags.push({ type: 'licenses', label: 'License Expired', color: 'bg-red-900/40 text-red-300' });
          flags.licenses++;
        }
      }

      if (entryFlags.length > 0) {
        totalFlagged++;
      }

      entriesMap.set(entry.id, {
        ...entry,
        driverName: getDriverName(entry.driver_id),
        className: getEventClassName(entry.series_class_id),
        flags: entryFlags,
      });
    });

    const severity = totalFlagged > 0 ? 'warning' : 'clear';

    return {
      totalEntries: entries.length,
      totalFlagged,
      flags,
      entriesMap,
      severity,
    };
  }, [entries, drivers, seriesClasses]);

  // Notify parent of compliance severity changes
  React.useEffect(() => {
    if (onComplianceSeverityChange) {
      onComplianceSeverityChange(complianceData.severity);
    }
  }, [complianceData.severity, onComplianceSeverityChange]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    let results = Array.from(complianceData.entriesMap.values());
    
    if (classFilter !== 'all') {
      results = results.filter(e => e.className === classFilter);
    }

    if (flagTypeFilter !== 'all') {
      results = results.filter(e => e.flags.some(f => f.type === flagTypeFilter));
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      results = results.filter(e =>
        e.driverName.toLowerCase().includes(search) ||
        e.car_number?.toLowerCase().includes(search) ||
        e.transponder_id?.toLowerCase().includes(search)
      );
    }

    return results;
  }, [complianceData.entriesMap, classFilter, flagTypeFilter, searchTerm]);

  const classNames = useMemo(() => {
    const names = new Set();
    complianceData.entriesMap.forEach(e => names.add(e.className));
    return Array.from(names);
  }, [complianceData.entriesMap]);

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-gray-400">
            Select Track/Series, season, and event above to view compliance
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isAuth) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <Lock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400">Login required to view compliance tools</p>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">No entries found for this event yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-3">
            <p className="text-xs text-gray-400 mb-1">Total Entries</p>
            <p className="text-2xl font-bold text-white">{complianceData.totalEntries}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-3">
            <p className="text-xs text-gray-400 mb-1">Flagged</p>
            <p className="text-2xl font-bold text-orange-500">{complianceData.totalFlagged}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-3">
            <p className="text-xs text-gray-400 mb-1">Waivers</p>
            <p className="text-2xl font-bold text-yellow-500">{complianceData.flags.waivers}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-3">
            <p className="text-xs text-gray-400 mb-1">Payments</p>
            <p className="text-2xl font-bold text-red-500">{complianceData.flags.payments}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#171717] border-gray-800">
          <CardContent className="py-3">
            <p className="text-xs text-gray-400 mb-1">Tech</p>
            <p className="text-2xl font-bold text-blue-500">{complianceData.flags.tech}</p>
          </CardContent>
        </Card>
      </div>

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
            <label className="text-xs font-medium text-gray-400 block mb-1">Flag Type</label>
            <Select value={flagTypeFilter} onValueChange={setFlagTypeFilter}>
              <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All Flags</SelectItem>
                <SelectItem value="waivers">Waivers</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
                <SelectItem value="transponders">Transponders</SelectItem>
                <SelectItem value="duplicates">Duplicates</SelectItem>
                <SelectItem value="tech">Tech Pending</SelectItem>
                <SelectItem value="licenses">Licenses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-medium text-gray-400 block mb-1">Search</label>
            <Input
              placeholder="Driver, car #, transponder..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#262626] border-gray-700 text-white"
            />
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
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : filteredEntries.length === 0 ? (
            <p className="text-gray-400 text-sm">No entries match your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Car #</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Driver</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Class</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Flags</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Tech</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Payment</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Waiver</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-400">Xpndr</th>
                    <th className="text-center py-3 px-3 font-medium text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr 
                      key={entry.id} 
                      className={`border-b border-gray-800 ${entry.flags.length > 0 ? 'bg-gray-900/50' : ''}`}
                    >
                      <td className="py-3 px-3 text-white font-semibold">#{entry.car_number || '—'}</td>
                      <td className="py-3 px-3 text-gray-300">{entry.driverName}</td>
                      <td className="py-3 px-3 text-gray-400 text-xs">{entry.className}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {entry.flags.slice(0, 2).map((flag, idx) => (
                            <Badge key={idx} variant="secondary" className={`text-xs ${flag.color}`}>
                              {flag.label}
                            </Badge>
                          ))}
                          {entry.flags.length > 2 && (
                            <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                              +{entry.flags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary" className="text-xs">
                          {entry.tech_status || entry.status || '—'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="secondary" className="text-xs">
                          {entry.payment_status || '—'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <CheckCircle2 className={`w-4 h-4 ${entry.waiver_verified ? 'text-green-500' : 'text-gray-500'}`} />
                      </td>
                      <td className="py-3 px-3 text-gray-400 text-xs">
                        {entry.transponder_id ? '✓' : '✗'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedEntry(entry)}
                          className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry detail drawer */}
      {selectedEntry && (
        <Drawer open={true} onOpenChange={(open) => !open && setSelectedEntry(null)}>
          <DrawerContent className="bg-[#171717] border-t border-gray-800">
            <DrawerHeader className="border-b border-gray-800">
              <DrawerTitle className="text-white">
                {selectedEntry.driverName} • #{selectedEntry.car_number || '—'}
              </DrawerTitle>
              <DrawerClose />
            </DrawerHeader>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Entry summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Class</p>
                  <p className="text-sm font-semibold text-white">{selectedEntry.className}</p>
                </div>
                <div className="bg-gray-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Tech Status</p>
                  <p className="text-sm font-semibold text-white">{selectedEntry.tech_status || selectedEntry.status || 'Not Set'}</p>
                </div>
                <div className="bg-gray-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Payment</p>
                  <p className="text-sm font-semibold text-white">{selectedEntry.payment_status || 'Not Set'}</p>
                </div>
                <div className="bg-gray-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Waiver</p>
                  <p className="text-sm font-semibold text-white">{selectedEntry.waiver_verified ? 'Verified' : 'Missing'}</p>
                </div>
              </div>

              {/* Flags */}
              {selectedEntry.flags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-400">Flags ({selectedEntry.flags.length})</p>
                  <div className="space-y-1">
                    {selectedEntry.flags.map((flag, idx) => (
                      <div key={idx} className={`p-2 rounded text-sm ${flag.color}`}>
                        {flag.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {hasPermission && (
                <div className="space-y-2 border-t border-gray-800 pt-4">
                  <p className="text-xs font-medium text-gray-400">Quick Actions</p>
                  <div className="space-y-2">
                    {'waiver_verified' in selectedEntry && !selectedEntry.waiver_verified && (
                      <Button
                        onClick={() => updateMutation.mutate({ waiver_verified: true })}
                        disabled={updateMutation.isPending}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        Mark Waiver Verified
                      </Button>
                    )}
                    {'payment_status' in selectedEntry && selectedEntry.payment_status !== 'Paid' && (
                      <Button
                        onClick={() => updateMutation.mutate({ payment_status: 'Paid' })}
                        disabled={updateMutation.isPending}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        Mark Payment Paid
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}