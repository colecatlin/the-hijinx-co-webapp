import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Lock, Shield, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { QueryKeys } from '@/components/utils/queryKeys';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import useDashboardMutation from './useDashboardMutation';
import {
  parseComplianceFromNotes,
  writeComplianceToNotes,
  computeLicenseStatus,
  isWaiverVerified,
  isLicenseVerified,
  createWaiverState,
  createLicenseState,
} from './shared/complianceUtils';
import {
  buildEventConflictMap,
} from './shared/techUtils';
import {
  mergeNotes,
  getBlock,
} from './entryWorkflowHelper';
import {
  verifyEntryEventIntegrity,
  GUARD_ERROR_MESSAGE,
} from './contextGuardHelper';

const DQ = applyDefaultQueryOptions();

async function writeOperationLog(type, entryId, eventId, message) {
  try {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: type,
      source_type: 'RegistrationDashboard',
      entity_name: 'Entry',
      entity_id: entryId,
      event_id: eventId,
      status: 'success',
      message,
    });
  } catch (_) {}
}

export default function ComplianceManager({
  selectedEvent,
  onComplianceSeverityChange,
  user,
  dashboardContext,
  dashboardPermissions,
  invalidateAfterOperation: invalidateAfterOperationProp,
}) {
  const [classFilter, setClassFilter] = useState('all');
  const [flagTypeFilter, setFlagTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [transponderInput, setTransponderInput] = useState('');
  const [assigningTransponder, setAssigningTransponder] = useState(false);
  const queryClient = useQueryClient();
  const invalidateAfterOperation = invalidateAfterOperationProp ?? buildInvalidateAfterOperation(queryClient);

  const isAdmin = user?.role === 'admin';

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: QueryKeys.entries.listByEvent(selectedEvent?.id),
    queryFn: () => base44.entities.Entry.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent?.id,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
    ...DQ,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: QueryKeys.entries.listByEvent ? ['eventClasses', selectedEvent?.id] : ['eventClasses', selectedEvent?.id],
    queryFn: () => base44.entities.EventClass.filter({ event_id: selectedEvent.id }),
    enabled: !!selectedEvent?.id,
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

  const { mutateAsync: updateEntryAsync, isPending: updatePending } = useDashboardMutation({
    operationType: 'compliance_updated',
    entityName: 'Entry',
    mutationFn: ({ id, data }) => base44.entities.Entry.update(id, data),
    successMessage: 'Updated',
    invalidateAfterOperation,
    dashboardContext: dashboardContext ?? { eventId: selectedEvent?.id },
    selectedEvent: selectedEvent ?? null,
  });

  const getDriverName = (driverId) => {
    const d = drivers.find(dr => dr.id === driverId);
    return d ? `${d.first_name} ${d.last_name}` : 'Unknown';
  };

  const getClassName = (entry) => {
    if (entry.event_class_id) {
      const ec = eventClasses.find(c => c.id === entry.event_class_id);
      if (ec) return ec.class_name;
    }
    const sc = seriesClasses.find(s => s.id === entry.series_class_id);
    return sc?.class_name || '—';
  };

  const today = new Date().toISOString().split('T')[0];

  // ── Compliance computation ──────────────────────────────────────────────────
  const complianceData = useMemo(() => {
    if (!entries.length) return {
      totalEntries: 0, totalFlagged: 0,
      flags: { waivers: 0, licenses: 0, transponders: 0, duplicates: 0, payments: 0 },
      entriesMap: new Map(), severity: 'clear',
    };

    // Duplicate car number: per event_id + event_class_id
    const carNumberKey = (e) => `${e.event_id}|${e.event_class_id || ''}|${e.car_number || ''}`;
    const carNumberCounts = {};
    entries.forEach(e => {
      if (e.car_number) {
        const k = carNumberKey(e);
        carNumberCounts[k] = (carNumberCounts[k] || 0) + 1;
      }
    });

    const flags = { waivers: 0, licenses: 0, transponders: 0, duplicates: 0, payments: 0 };
    let totalFlagged = 0;
    const entriesMap = new Map();

    entries.forEach(entry => {
      const entryFlags = [];

      // Missing waiver
      if (!entry.waiver_verified) {
        entryFlags.push({ type: 'waivers', label: 'Waiver Missing', color: 'bg-yellow-900/40 text-yellow-300' });
        flags.waivers++;
      }

      // Missing transponder
      if (!entry.transponder_verified || !entry.transponder_id || entry.transponder_id.trim() === '') {
        entryFlags.push({ type: 'transponders', label: 'No Transponder', color: 'bg-purple-900/40 text-purple-300' });
        flags.transponders++;
      }

      // Duplicate car # (within same event+class)
      if (entry.car_number && carNumberCounts[carNumberKey(entry)] > 1) {
        entryFlags.push({ type: 'duplicates', label: 'Duplicate Car #', color: 'bg-orange-900/40 text-orange-300' });
        flags.duplicates++;
      }

      // License not verified
      if (!entry.license_verified) {
        entryFlags.push({ type: 'licenses', label: 'License Unverified', color: 'bg-orange-900/40 text-orange-300' });
        flags.licenses++;
      }

      // Payment
      if (entry.payment_status !== 'Paid') {
        entryFlags.push({ type: 'payments', label: 'Unpaid', color: 'bg-red-900/40 text-red-300' });
        flags.payments++;
      }

      if (entryFlags.length > 0) totalFlagged++;

      entriesMap.set(entry.id, {
        ...entry,
        driverName: getDriverName(entry.driver_id),
        className: getClassName(entry),
        flags: entryFlags,
        waiverOk: !!entry.waiver_verified,
      });
    });

    const severity = totalFlagged > 0 ? 'warning' : 'clear';
    return { totalEntries: entries.length, totalFlagged, flags, entriesMap, severity };
  }, [entries, drivers, eventClasses, seriesClasses]);

  React.useEffect(() => {
    if (onComplianceSeverityChange) onComplianceSeverityChange(complianceData.severity);
  }, [complianceData.severity, onComplianceSeverityChange]);

  const filteredEntries = useMemo(() => {
    let results = Array.from(complianceData.entriesMap.values());
    if (classFilter !== 'all') results = results.filter(e => e.className === classFilter);
    if (flagTypeFilter !== 'all') results = results.filter(e => e.flags.some(f => f.type === flagTypeFilter));
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      results = results.filter(e =>
        e.driverName.toLowerCase().includes(s) ||
        (e.car_number || '').toLowerCase().includes(s) ||
        (e.transponder_id || '').toLowerCase().includes(s)
      );
    }
    return results;
  }, [complianceData.entriesMap, classFilter, flagTypeFilter, searchTerm]);

  const classNames = useMemo(() => {
    const names = new Set();
    complianceData.entriesMap.forEach(e => names.add(e.className));
    return Array.from(names);
  }, [complianceData.entriesMap]);

  // ── Waiver toggle ──────────────────────────────────────────────────────────
  const handleToggleWaiver = async (entry) => {
    if (!(await verifyEntryEventIntegrity(entry, selectedEvent, base44))) {
      toast.error(GUARD_ERROR_MESSAGE);
      return;
    }
    const nextVerified = !entry.waiver_verified;
    await updateEntryAsync({ id: entry.id, data: { waiver_verified: nextVerified } });
    await writeOperationLog('compliance_updated', entry.id, selectedEvent.id,
      nextVerified ? 'Waiver verified' : 'Waiver unverified');
    toast.success(nextVerified ? 'Waiver verified' : 'Waiver cleared');
  };

  // ── License status update ──────────────────────────────────────────────────
  const handleUpdateLicenseStatus = async (entry, newStatus) => {
    if (!(await verifyEntryEventIntegrity(entry, selectedEvent, base44))) {
      toast.error(GUARD_ERROR_MESSAGE);
      return;
    }
    await updateEntryAsync({ id: entry.id, data: { license_verified: newStatus === 'Valid' } });
    await writeOperationLog('compliance_updated', entry.id, selectedEvent.id, `License status set to ${newStatus}`);
    toast.success(`License marked as ${newStatus}`);
  };

  // ── Notes save ─────────────────────────────────────────────────────────────
  const handleSaveNotes = async () => {
    if (!selectedEntry) return;
    await updateEntryAsync({ id: selectedEntry.id, data: { notes: notesValue } });
    await writeOperationLog('compliance_updated', selectedEntry.id, selectedEvent.id, 'Compliance notes updated');
    setEditingNotes(false);
    toast.success('Notes saved');
  };

  // ── Assign transponder ─────────────────────────────────────────────────────
  const handleAssignTransponder = async () => {
    if (!selectedEntry || !transponderInput.trim()) return;
    if (!(await verifyEntryEventIntegrity(selectedEntry, selectedEvent, base44))) {
      toast.error(GUARD_ERROR_MESSAGE);
      return;
    }
    await updateEntryAsync({ id: selectedEntry.id, data: { transponder_id: transponderInput.trim(), transponder_verified: true } });
    await writeOperationLog('compliance_updated', selectedEntry.id, selectedEvent.id, `Transponder assigned: ${transponderInput.trim()}`);
    setAssigningTransponder(false);
    toast.success('Transponder assigned');
  };

  // Load current user's entry
  const { data: myEntry } = useQuery({
    queryKey: ['myEntry', currentUser?.id, selectedEvent?.id],
    queryFn: async () => {
      if (!currentUser?.id || !selectedEvent?.id) return null;
      const myDrivers = await base44.entities.Driver.filter({ owner_user_id: currentUser.id });
      if (myDrivers.length === 0) return null;
      const driverEntries = await base44.entities.Entry.filter({
        event_id: selectedEvent.id,
        driver_id: myDrivers[0].id,
      });
      return driverEntries.length > 0 ? driverEntries[0] : null;
    },
    enabled: !!currentUser?.id && !!selectedEvent?.id,
    ...DQ,
  });

  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-gray-400">Select an event to view compliance</p>
        </CardContent>
      </Card>
    );
  }

  if (entriesLoading) {
    return <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-800/50 rounded animate-pulse" />)}</div>;
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">No entries found for this event.</p>
        </CardContent>
      </Card>
    );
  }

  const { flags, totalEntries, totalFlagged } = complianceData;

  // Compute my compliance status
  const myComplianceStatus = useMemo(() => {
    if (!myEntry) return null;
    const entryData = complianceData.entriesMap.get(myEntry.id);
    return entryData || null;
  }, [myEntry, complianceData.entriesMap]);

  return (
    <div className="space-y-4">
      {/* My Compliance card */}
      {myEntry && myComplianceStatus && (
        <Card className="bg-blue-900/20 border border-blue-800/50">
          <CardHeader>
            <CardTitle className="text-sm text-blue-300">Your Compliance Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-blue-900/30 rounded p-2">
                <p className="text-blue-300 font-medium">Waiver</p>
                <p className={myComplianceStatus.waiverOk ? 'text-green-400' : 'text-yellow-400'}>
                  {myComplianceStatus.waiverOk ? '✓ Verified' : '✗ Missing'}
                </p>
              </div>
              <div className="bg-blue-900/30 rounded p-2">
                <p className="text-blue-300 font-medium">License</p>
                <p className="text-gray-300">{myEntry.license_number ? '✓' : '—'}</p>
              </div>
              <div className="bg-blue-900/30 rounded p-2">
                <p className="text-blue-300 font-medium">Transponder</p>
                <p className="text-gray-300">{myEntry.transponder_id ? '✓' : '—'}</p>
              </div>
              <div className="bg-blue-900/30 rounded p-2">
                <p className="text-blue-300 font-medium">Flags</p>
                <p className="text-gray-300">{myComplianceStatus.flags.length > 0 ? myComplianceStatus.flags.length : '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Summary row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: totalEntries, color: 'text-white' },
          { label: 'Flagged', value: totalFlagged, color: 'text-orange-400' },
          { label: 'Waivers', value: flags.waivers, color: 'text-yellow-400' },
          { label: 'License', value: flags.licenses, color: 'text-orange-400' },
          { label: 'No Xpndr', value: flags.transponders, color: 'text-purple-400' },
          { label: 'Dup Car #', value: flags.duplicates, color: 'text-red-400' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-[#171717] border-gray-800">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-gray-400 block mb-1">Class</label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="bg-[#262626] border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#262626] border-gray-700">
                <SelectItem value="all">All Classes</SelectItem>
                {classNames.map(cls => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}
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
                <SelectItem value="waivers">Missing Waiver</SelectItem>
                <SelectItem value="licenses">License Unverified</SelectItem>
                <SelectItem value="transponders">No Transponder</SelectItem>
                <SelectItem value="duplicates">Duplicate Car #</SelectItem>
                <SelectItem value="payments">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-medium text-gray-400 block mb-1">Search</label>
            <Input
              placeholder="Driver, car #, transponder..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-[#262626] border-gray-700 text-white"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-300">Entries ({filteredEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-400">Car #</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-400">Driver</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-400">Class</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-400">Waiver</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-400">License</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-400">Expires</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-400">Verified</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-400">Flags</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => (
                    <tr key={entry.id} className={`border-b border-gray-800 ${entry.flags.length > 0 ? 'bg-gray-900/30' : ''}`}>
                      <td className="py-2 px-3 text-white font-semibold">#{entry.car_number || '—'}</td>
                      <td className="py-2 px-3 text-gray-300">{entry.driverName}</td>
                      <td className="py-2 px-3 text-gray-400">{entry.className}</td>
                      <td className="py-2 px-3">
                        {entry.waiverOk
                          ? <span className="text-green-400">✓ Verified</span>
                          : <span className="text-yellow-400">✗ Missing</span>}
                      </td>
                      <td className="py-2 px-3">
                        {entry.license_verified
                          ? <span className="text-green-400">✓ Verified</span>
                          : <span className="text-orange-400">✗ Not Verified</span>}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-400">—</td>
                      <td className="py-2 px-3 text-xs text-gray-400">—</td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1">
                          {entry.flags.slice(0, 2).map((f, i) => (
                            <Badge key={i} variant="secondary" className={`text-xs ${f.color}`}>{f.label}</Badge>
                          ))}
                          {entry.flags.length > 2 && <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">+{entry.flags.length - 2}</Badge>}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelectedEntry(entry);
                            setNotesValue(entry.notes || '');
                            setEditingNotes(false);
                            setTransponderInput(entry.transponder_id || '');
                            setAssigningTransponder(false);
                        }} className="border-gray-700 text-gray-300 hover:bg-gray-800">
                          {isAdmin ? 'Edit' : 'View'}
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      {selectedEntry && (
        <Drawer open={true} onOpenChange={open => !open && setSelectedEntry(null)}>
          <DrawerContent className="bg-[#171717] border-t border-gray-800">
            <DrawerHeader className="border-b border-gray-800">
              <DrawerTitle className="text-white">
                {selectedEntry.driverName} • #{selectedEntry.car_number || '—'}
              </DrawerTitle>
              <DrawerClose />
            </DrawerHeader>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Status grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Class</p>
                  <p className="text-white font-medium">{selectedEntry.className}</p>
                </div>
                <div className="bg-gray-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Entry Status</p>
                  <p className="text-white font-medium">{selectedEntry.entry_status || '—'}</p>
                </div>
                <div className="bg-gray-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Payment</p>
                  <p className="text-white font-medium">{selectedEntry.payment_status || '—'}</p>
                </div>
                <div className="bg-gray-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Tech Status</p>
                  <p className="text-white font-medium">{selectedEntry.tech_status || '—'}</p>
                </div>
                <div className="bg-gray-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">License Verified</p>
                  <p className="text-white font-medium">{selectedEntry.license_verified ? '✓ Yes' : '✗ No'}</p>
                </div>
                <div className="bg-gray-900/50 rounded p-3">
                  <p className="text-xs text-gray-400 mb-1">Transponder</p>
                  <p className="text-white font-medium">{selectedEntry.transponder_id || '—'}</p>
                </div>
              </div>

              {/* Action buttons (admin only) */}
              {isAdmin && (
                <div className="border-t border-gray-700 pt-4 space-y-3">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</p>

                  {/* Verify Waiver */}
                  <Button
                    onClick={() => handleToggleWaiver(selectedEntry)}
                    disabled={updatePending}
                    variant="outline"
                    className={`w-full border-gray-700 ${selectedEntry.waiver_verified ? 'bg-green-900/20 text-green-300 border-green-700' : 'text-yellow-300 border-yellow-700 hover:bg-yellow-900/20'}`}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {selectedEntry.waiver_verified ? 'Waiver Verified ✓' : 'Verify Waiver'}
                  </Button>

                  {/* Verify License */}
                  <Button
                    onClick={() => handleUpdateLicenseStatus(selectedEntry, selectedEntry.license_verified ? 'Unknown' : 'Valid')}
                    disabled={updatePending}
                    variant="outline"
                    className={`w-full border-gray-700 ${selectedEntry.license_verified ? 'bg-green-900/20 text-green-300 border-green-700' : 'text-orange-300 border-orange-700 hover:bg-orange-900/20'}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {selectedEntry.license_verified ? 'License Verified ✓' : 'Verify License'}
                  </Button>

                  {/* Assign Transponder */}
                  {!assigningTransponder ? (
                    <Button
                      onClick={() => setAssigningTransponder(true)}
                      variant="outline"
                      className={`w-full border-gray-700 ${selectedEntry.transponder_verified && selectedEntry.transponder_id ? 'bg-green-900/20 text-green-300 border-green-700' : 'text-purple-300 border-purple-700 hover:bg-purple-900/20'}`}
                    >
                      {selectedEntry.transponder_id
                        ? `Transponder: ${selectedEntry.transponder_id}${selectedEntry.transponder_verified ? ' ✓' : ' (unverified)'}`
                        : 'Assign Transponder'}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="Transponder ID"
                        value={transponderInput}
                        onChange={e => setTransponderInput(e.target.value)}
                        className="bg-[#262626] border-gray-700 text-white"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setAssigningTransponder(false)} className="flex-1 border-gray-700 text-gray-300">Cancel</Button>
                        <Button size="sm" onClick={handleAssignTransponder} disabled={updatePending || !transponderInput.trim()} className="flex-1 bg-purple-700 hover:bg-purple-600 text-white">Assign</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Flags */}
              {selectedEntry.flags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-400 uppercase">Flags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.flags.map((f, i) => (
                      <Badge key={i} variant="secondary" className={`${f.color}`}>{f.label}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="border-t border-gray-700 pt-4 space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase">Notes</p>
                {!editingNotes ? (
                  <>
                    {selectedEntry.notes
                      ? <p className="text-sm text-gray-300 whitespace-pre-line">{selectedEntry.notes}</p>
                      : <p className="text-xs text-gray-500">No notes</p>}
                    {isAdmin && (
                      <Button size="sm" variant="outline" onClick={() => { setNotesValue(selectedEntry.notes || ''); setEditingNotes(true); }} className="border-gray-700 text-gray-300">
                        <FileText className="w-3.5 h-3.5 mr-1.5" /> Edit Notes
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      value={notesValue}
                      onChange={e => setNotesValue(e.target.value)}
                      rows={3}
                      className="bg-[#262626] border-gray-700 text-white text-sm"
                      placeholder="Notes..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)} className="flex-1 border-gray-700">Cancel</Button>
                      <Button size="sm" onClick={handleSaveNotes} disabled={updatePending} className="flex-1 bg-blue-600 hover:bg-blue-700">Save</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}