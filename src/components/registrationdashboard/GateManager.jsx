import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { REG_QK } from './queryKeys';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { createPageUrl } from '@/components/utils';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  DoorOpen,
} from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

// ── Status badge helpers ──────────────────────────────────────────────────────
function entryStatusColor(status) {
  if (status === 'Checked In') return 'bg-green-900/50 text-green-300 border-green-700';
  if (status === 'Teched')     return 'bg-blue-900/50 text-blue-300 border-blue-700';
  if (status === 'Withdrawn')  return 'bg-red-900/50 text-red-300 border-red-700';
  return 'bg-gray-800 text-gray-300 border-gray-600';
}

function paymentColor(status) {
  if (status === 'Paid')    return 'bg-green-900/50 text-green-300 border-green-700';
  if (status === 'Comped')  return 'bg-blue-900/50 text-blue-300 border-blue-700';
  if (status === 'Refunded') return 'bg-gray-700 text-gray-300 border-gray-600';
  return 'bg-red-900/50 text-red-300 border-red-700';
}

function techColor(status) {
  if (status === 'Passed')          return 'bg-green-900/50 text-green-300 border-green-700';
  if (status === 'Failed')          return 'bg-red-900/50 text-red-300 border-red-700';
  if (status === 'Recheck Required') return 'bg-amber-900/50 text-amber-300 border-amber-700';
  return 'bg-gray-800 text-gray-300 border-gray-600';
}

function isFlagged(entry) {
  return (
    !entry.waiver_verified ||
    entry.payment_status === 'Unpaid' ||
    entry.tech_status === 'Failed' ||
    entry.tech_status === 'Recheck Required'
  );
}

function flagSummary(entry) {
  const flags = [];
  if (!entry.waiver_verified) flags.push('Waiver Missing');
  if (entry.payment_status === 'Unpaid') flags.push('Unpaid');
  if (entry.tech_status === 'Failed') flags.push('Tech Failed');
  if (entry.tech_status === 'Recheck Required') flags.push('Tech Recheck');
  return flags.join(' · ');
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GateManager({ selectedEvent, isAdmin, currentUser, invalidateAfterOperation }) {
  const queryClient = useQueryClient();
  const inv = invalidateAfterOperation || buildInvalidateAfterOperation(queryClient);

  const [search, setSearch] = useState('');
  const [showFlagged, setShowFlagged] = useState(false);
  const [showUnpaid, setShowUnpaid] = useState(false);
  const [showWaiverMissing, setShowWaiverMissing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Drawer edit state
  const [wristbandCount, setWristbandCount] = useState(0);
  const [waiverVerified, setWaiverVerified] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');

  const eventId = selectedEvent?.id || '';

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: REG_QK.entries(eventId),
    queryFn: () => base44.entities.Entry.filter({ event_id: eventId }, '-created_date', 500),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['driverPrograms'],
    queryFn: () => base44.entities.DriverProgram.list(),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: eventClasses = [] } = useQuery({
    queryKey: ['eventClasses', eventId],
    queryFn: () => base44.entities.EventClass.filter({ event_id: eventId }),
    enabled: !!eventId,
    ...DQ,
  });

  // ── Lookup maps ────────────────────────────────────────────────────────────
  const driverMap = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);
  const classMap  = useMemo(() => Object.fromEntries(eventClasses.map((c) => [c.id, c])), [eventClasses]);

  const driverName = (id) => {
    const d = driverMap[id];
    return d ? `${d.first_name} ${d.last_name}`.trim() : '—';
  };
  const className = (ecId) => classMap[ecId]?.class_name || '—';

  // ── Driver profile link via DriverProgram ──────────────────────────────────
  const driverProfileUrl = (driverId) => {
    const dp = driverPrograms.find((p) => p.driver_id === driverId);
    if (dp?.slug) return createPageUrl('DriverProfile') + `?slug=${dp.slug}`;
    return null;
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredEntries = useMemo(() => {
    let list = [...entries];

    if (search.trim()) {
      const t = search.toLowerCase();
      list = list.filter((e) => {
        if (e.car_number?.toLowerCase().includes(t)) return true;
        if (e.transponder_id?.toLowerCase().includes(t)) return true;
        const d = driverMap[e.driver_id];
        if (d && `${d.first_name} ${d.last_name}`.toLowerCase().includes(t)) return true;
        return false;
      });
    }

    if (showFlagged)       list = list.filter(isFlagged);
    if (showUnpaid)        list = list.filter((e) => e.payment_status === 'Unpaid');
    if (showWaiverMissing) list = list.filter((e) => !e.waiver_verified);

    return list;
  }, [entries, search, showFlagged, showUnpaid, showWaiverMissing, driverMap]);

  // ── Open drawer ────────────────────────────────────────────────────────────
  function openDrawer(entry) {
    setSelectedEntry(entry);
    setWaiverVerified(entry.waiver_verified || false);
    setPaymentStatus(entry.payment_status || 'Unpaid');
    setWristbandCount(entry.wristband_count ?? 0);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedEntry(null);
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selectedEntry) return;
    setSaving(true);

    const prev = {
      waiver_verified: selectedEntry.waiver_verified,
      payment_status: selectedEntry.payment_status,
      wristband_count: selectedEntry.wristband_count,
    };
    const next = {
      waiver_verified: waiverVerified,
      payment_status: paymentStatus,
      wristband_count: Number(wristbandCount),
    };

    const changedFields = Object.keys(next).filter((k) => next[k] !== prev[k]);

    if (changedFields.length === 0) {
      toast.info('No changes to save.');
      setSaving(false);
      return;
    }

    await base44.entities.Entry.update(selectedEntry.id, next);

    // Write OperationLog
    try {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'gate_updated',
        source_type: 'GateManager',
        entity_name: 'Entry',
        status: 'success',
        metadata: {
          event_id: eventId,
          entry_id: selectedEntry.id,
          changed_fields: changedFields,
          previous_values: Object.fromEntries(changedFields.map((k) => [k, prev[k]])),
          new_values: Object.fromEntries(changedFields.map((k) => [k, next[k]])),
        },
      });
    } catch (_) {}

    inv('checkin_updated', { eventId });
    toast.success('Entry updated');
    setSaving(false);
    closeDrawer();
  }

  // ── Empty state: no event ──────────────────────────────────────────────────
  if (!selectedEvent) {
    return (
      <Card className="bg-[#171717] border-gray-800">
        <CardContent className="py-20 text-center">
          <DoorOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-white font-semibold text-lg mb-1">Gate Module</p>
          <p className="text-gray-400 text-sm">
            Select Track or Series, Season, and Event above to activate gate operations.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Live entry for drawer (always fresh from cache) ────────────────────────
  const liveEntry = selectedEntry
    ? entries.find((e) => e.id === selectedEntry.id) ?? selectedEntry
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-5 h-5 text-gray-400" />
          <div>
            <h2 className="text-lg font-bold text-white">Gate</h2>
            <p className="text-xs text-gray-500">{selectedEvent.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{entries.filter((e) => e.entry_status === 'Checked In').length} / {entries.length} checked in</span>
          <span>{entries.filter((e) => e.payment_status === 'Unpaid').length} unpaid</span>
          <span>{entries.filter((e) => !e.waiver_verified).length} waivers missing</span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by driver name, car number, or transponder ID…"
            className="pl-9 bg-[#1e1e1e] border-gray-700 text-white"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          {[
            { id: 'flagged', label: 'Flagged only', state: showFlagged, set: setShowFlagged },
            { id: 'unpaid',  label: 'Unpaid only',  state: showUnpaid,  set: setShowUnpaid  },
            { id: 'waiver',  label: 'Waiver missing', state: showWaiverMissing, set: setShowWaiverMissing },
          ].map(({ id, label, state, set }) => (
            <div key={id} className="flex items-center gap-2">
              <Switch id={id} checked={state} onCheckedChange={set} />
              <Label htmlFor={id} className="text-sm text-gray-300 cursor-pointer">{label}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Entry List */}
      <div className="space-y-2">
        {entriesLoading && (
          <div className="py-10 text-center text-sm text-gray-500">Loading entries…</div>
        )}
        {!entriesLoading && filteredEntries.length === 0 && (
          <Card className="bg-[#171717] border-gray-800">
            <CardContent className="py-12 text-center">
              <p className="text-gray-400">
                {entries.length === 0 ? 'No entries found for this event.' : 'No entries match the current filters.'}
              </p>
            </CardContent>
          </Card>
        )}
        {filteredEntries.map((entry) => {
          const flags = flagSummary(entry);
          return (
            <div
              key={entry.id}
              className="bg-[#1e1e1e] border border-gray-800 rounded-lg px-4 py-3 cursor-pointer hover:border-gray-600 transition-colors"
              onClick={() => openDrawer(entry)}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Left */}
                <div className="flex items-center gap-4 min-w-0">
                  {entry.car_number && (
                    <span className="text-2xl font-black text-white w-12 shrink-0 text-center">
                      #{entry.car_number}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-semibold leading-tight truncate">{driverName(entry.driver_id)}</p>
                    <p className="text-gray-500 text-xs">{className(entry.event_class_id)}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <Badge className={`text-xs border ${entryStatusColor(entry.entry_status)}`}>
                    {entry.entry_status || 'Registered'}
                  </Badge>
                  <Badge className={`text-xs border ${paymentColor(entry.payment_status)}`}>
                    {entry.payment_status || 'Unpaid'}
                  </Badge>
                  <Badge className={`text-xs border ${entry.waiver_verified ? 'bg-green-900/50 text-green-300 border-green-700' : 'bg-red-900/50 text-red-300 border-red-700'}`}>
                    {entry.waiver_verified ? 'Waiver ✓' : 'No Waiver'}
                  </Badge>
                  <Badge className={`text-xs border ${techColor(entry.tech_status)}`}>
                    {entry.tech_status || 'Not Inspected'}
                  </Badge>
                </div>
              </div>
              {flags && (
                <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {flags}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Drawer */}
      <Sheet open={drawerOpen} onOpenChange={(o) => { if (!o) closeDrawer(); }}>
        <SheetContent className="bg-[#1e1e1e] border-gray-700 w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">
              {liveEntry?.car_number ? `#${liveEntry.car_number} — ` : ''}
              {liveEntry ? driverName(liveEntry.driver_id) : ''}
            </SheetTitle>
          </SheetHeader>

          {liveEntry && (
            <div className="space-y-5 mt-5">
              {/* Driver profile link */}
              {(() => {
                const url = driverProfileUrl(liveEntry.driver_id);
                return url ? (
                  <Link to={url} target="_blank">
                    <Button size="sm" variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 text-xs justify-start">
                      <ExternalLink className="w-3 h-3 mr-2" /> View Driver Profile
                    </Button>
                  </Link>
                ) : null;
              })()}

              {/* Read-only entry fields */}
              <div className="space-y-2 bg-[#262626] rounded-lg p-4 text-sm">
                {[
                  ['Car Number', liveEntry.car_number || '—'],
                  ['Transponder', liveEntry.transponder_id || '—'],
                  ['Class', className(liveEntry.event_class_id)],
                  ['Tech Status', liveEntry.tech_status || 'Not Inspected'],
                  ['Notes', liveEntry.notes || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-gray-200 text-right">{val}</span>
                  </div>
                ))}
              </div>

              {/* Editable gate actions */}
              <div className="space-y-4">
                <h3 className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Gate Actions</h3>

                {/* Waiver */}
                <div className="flex items-center justify-between bg-[#262626] rounded-lg px-4 py-3">
                  <Label className="text-white text-sm">Waiver Verified</Label>
                  <div className="flex items-center gap-2">
                    {waiverVerified
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <XCircle className="w-4 h-4 text-red-400" />}
                    <Switch checked={waiverVerified} onCheckedChange={setWaiverVerified} />
                  </div>
                </div>

                {/* Payment */}
                <div className="flex items-center justify-between bg-[#262626] rounded-lg px-4 py-3">
                  <Label className="text-white text-sm">Payment Collected</Label>
                  <div className="flex items-center gap-2">
                    {paymentStatus === 'Paid'
                      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                      : <XCircle className="w-4 h-4 text-red-400" />}
                    <Switch
                      checked={paymentStatus === 'Paid'}
                      onCheckedChange={(checked) => setPaymentStatus(checked ? 'Paid' : 'Unpaid')}
                    />
                  </div>
                </div>

                {/* Wristband */}
                <div className="bg-[#262626] rounded-lg px-4 py-3 space-y-2">
                  <Label className="text-white text-sm">Wristband Count</Label>
                  <Input
                    type="number"
                    min={0}
                    value={wristbandCount}
                    onChange={(e) => setWristbandCount(e.target.value)}
                    className="bg-[#171717] border-gray-700 text-white w-full"
                  />
                </div>

                {/* Save */}
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}