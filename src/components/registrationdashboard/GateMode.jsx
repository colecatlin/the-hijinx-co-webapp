import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { REG_QK } from './queryKeys';
import { buildInvalidateAfterOperation } from './invalidationHelper';
import { logOperation } from './operationLogger';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  Search,
  Scan,
  Zap,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function isLicenseValid(entry) {
  if (!entry.license_expiration_date) return null; // unknown
  return new Date(entry.license_expiration_date) >= new Date();
}

function StatusBadge({ label, ok, warn }) {
  if (ok)   return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-600 text-white">{label}</span>;
  if (warn) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500 text-black">{label}</span>;
  return      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">{label}</span>;
}

function useDebounce(value, delay = 250) {
  const [dv, setDv] = useState(value);
  const t = useRef(null);
  React.useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t.current);
  }, [value, delay]);
  return dv;
}

// ─── Entry Row Card ──────────────────────────────────────────────────────────

function EntryCard({ entry, driver, classes, onClick, rapidMode, children }) {
  const driverName = driver
    ? `${driver.first_name} ${driver.last_name}`
    : entry.driver_id?.slice(0, 8) ?? '—';
  const className = classes[entry.series_class_id] ?? entry.class_name ?? '—';
  const licenseOk = isLicenseValid(entry);
  const checkedIn = entry.entry_status === 'Checked In';
  const paid      = entry.payment_status === 'Paid';
  const waiver    = entry.waiver_verified === true;

  return (
    <div
      className="bg-gray-800 rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform border border-gray-700 hover:border-gray-500"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          {entry.car_number && (
            <span className="text-3xl font-black text-white leading-none w-14 text-center shrink-0">
              #{entry.car_number}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-white font-semibold text-lg leading-tight truncate">{driverName}</p>
            <p className="text-gray-400 text-sm truncate">{className}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end shrink-0">
          <StatusBadge label={checkedIn ? 'Checked In' : 'Not In'} ok={checkedIn} />
          <StatusBadge label={paid ? 'Paid' : 'Unpaid'} ok={paid} />
          <StatusBadge label={waiver ? 'Waiver ✓' : 'No Waiver'} ok={waiver} warn={false} />
          {licenseOk === false && <StatusBadge label="Lic Expired" ok={false} />}
        </div>
      </div>
      {rapidMode && children && (
        <div className="mt-4 border-t border-gray-700 pt-4" onClick={e => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Action Panel ────────────────────────────────────────────────────────────

function ActionPanel({ entry, driver, classes, user, isAdmin, eventId, onClose, onMutated }) {
  const [wristbandCount, setWristbandCount] = useState(entry.wristband_count ?? 0);
  const [saving, setSaving] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : '—';
  const className  = classes[entry.series_class_id] ?? entry.class_name ?? '—';
  const licenseOk  = isLicenseValid(entry);

  async function applyUpdate(fields, opType, message) {
    setSaving(opType);
    setBlockReason('');
    await base44.entities.Entry.update(entry.id, fields);
    await logOperation({
      operation_type: opType,
      status: 'success',
      entity_name: 'Entry',
      entity_id: entry.id,
      event_id: eventId,
      message,
    });
    onMutated(opType);
    setSaving('');
  }

  function handleWaiver() {
    applyUpdate(
      {
        waiver_verified: !entry.waiver_verified,
        waiver_verified_date: new Date().toISOString(),
        waiver_verified_by_user_id: user?.id ?? '',
        waiver_status: 'Verified',
      },
      'waiver_verified',
      `Waiver ${entry.waiver_verified ? 'unverified' : 'verified'} for ${driverName}`
    );
  }

  function handlePayment() {
    const next = entry.payment_status === 'Paid' ? 'Unpaid' : 'Paid';
    applyUpdate(
      { payment_status: next },
      'payment_collected',
      `Payment ${next} for ${driverName}`
    );
  }

  function handleCheckIn() {
    if (!entry.waiver_verified) { setBlockReason('Waiver not verified'); return; }
    if (licenseOk === false)    { setBlockReason('License is expired'); return; }
    applyUpdate(
      { entry_status: 'Checked In' },
      'gate_checkin',
      `Gate check-in for ${driverName}`
    );
  }

  function handleOverrideCheckIn() {
    applyUpdate(
      { entry_status: 'Checked In', compliance_notes: (entry.compliance_notes ?? '') + ' [Gate override]' },
      'gate_override_checkin',
      `Gate OVERRIDE check-in for ${driverName}`
    );
  }

  function handleWristband() {
    applyUpdate(
      { wristband_count: Number(wristbandCount) },
      'wristband_assigned',
      `Wristbands assigned: ${wristbandCount} for ${driverName}`
    );
  }

  const Field = ({ label, value, ok, warn }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${ok ? 'text-green-400' : warn ? 'text-yellow-400' : 'text-white'}`}>{value ?? '—'}</span>
    </div>
  );

  const Btn = ({ children, onClick, color = 'gray', disabled, loading, size = 'lg' }) => {
    const colors = {
      green:  'bg-green-600 hover:bg-green-500 text-white',
      red:    'bg-red-600 hover:bg-red-500 text-white',
      yellow: 'bg-yellow-500 hover:bg-yellow-400 text-black',
      blue:   'bg-blue-600 hover:bg-blue-500 text-white',
      orange: 'bg-orange-600 hover:bg-orange-500 text-white',
      gray:   'bg-gray-700 hover:bg-gray-600 text-white',
    };
    return (
      <button
        onClick={onClick}
        disabled={disabled || !!saving}
        className={`w-full rounded-xl font-bold transition-all active:scale-95 ${size === 'lg' ? 'py-5 text-lg' : 'py-3 text-base'} ${colors[color]} disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {loading ? '…' : children}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-700">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div>
          <p className="text-white font-bold text-xl leading-tight">
            {entry.car_number ? `#${entry.car_number} — ` : ''}{driverName}
          </p>
          <p className="text-gray-400 text-sm">{className}</p>
        </div>
        <div className="ml-auto">
          {entry.entry_status === 'Checked In'
            ? <CheckCircle2 className="w-8 h-8 text-green-500" />
            : <XCircle className="w-8 h-8 text-gray-500" />}
        </div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6 max-w-xl mx-auto w-full">
        {/* Info */}
        <div className="bg-gray-800 rounded-xl px-4 divide-y divide-gray-700">
          <Field label="Entry Status" value={entry.entry_status} />
          <Field label="Payment"      value={entry.payment_status} ok={entry.payment_status === 'Paid'} />
          <Field label="Waiver"       value={entry.waiver_verified ? 'Verified' : 'Missing'} ok={entry.waiver_verified} />
          <Field label="License Exp"  value={entry.license_expiration_date ?? 'Not set'}
            ok={licenseOk === true} warn={licenseOk === null} />
          <Field label="Transponder"  value={entry.transponder_id} />
          <Field label="Wristbands"   value={entry.wristband_count ?? 0} />
        </div>

        {/* Block reason */}
        {blockReason && (
          <div className="flex items-center gap-2 bg-red-900/60 border border-red-600 rounded-xl px-4 py-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-red-300 font-medium">{blockReason}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <Btn
            onClick={handleWaiver}
            color={entry.waiver_verified ? 'gray' : 'green'}
            loading={saving === 'waiver_verified'}
          >
            {entry.waiver_verified ? 'Unverify Waiver' : '✓ Mark Waiver Verified'}
          </Btn>

          <Btn
            onClick={handlePayment}
            color={entry.payment_status === 'Paid' ? 'gray' : 'blue'}
            loading={saving === 'payment_collected'}
          >
            {entry.payment_status === 'Paid' ? 'Mark Unpaid' : '$ Collect Payment'}
          </Btn>

          <Btn
            onClick={handleCheckIn}
            color={entry.entry_status === 'Checked In' ? 'gray' : 'green'}
            loading={saving === 'gate_checkin'}
          >
            {entry.entry_status === 'Checked In' ? 'Already Checked In' : '⚡ Check In'}
          </Btn>

          {isAdmin && (
            <Btn
              onClick={handleOverrideCheckIn}
              color="orange"
              loading={saving === 'gate_override_checkin'}
            >
              🚨 Admin Override Check In
            </Btn>
          )}

          {/* Wristband */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <p className="text-white font-semibold">Wristbands Issued</p>
            <div className="flex gap-3">
              <input
                type="number"
                min={0}
                value={wristbandCount}
                onChange={e => setWristbandCount(e.target.value)}
                className="flex-1 bg-gray-700 text-white text-xl font-bold rounded-xl px-4 py-3 border border-gray-600 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleWristband}
                disabled={!!saving}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl px-6 py-3 transition-all active:scale-95 disabled:opacity-40"
              >
                {saving === 'wristband_assigned' ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Actions (Rapid Mode) ─────────────────────────────────────────────

function InlineActions({ entry, driver, classes, user, isAdmin, eventId, onMutated }) {
  const [saving, setSaving] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const licenseOk = isLicenseValid(entry);
  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : '—';

  async function applyUpdate(fields, opType, message) {
    setSaving(opType);
    setBlockReason('');
    await base44.entities.Entry.update(entry.id, fields);
    await logOperation({ operation_type: opType, status: 'success', entity_name: 'Entry', entity_id: entry.id, event_id: eventId, message });
    onMutated(opType);
    setSaving('');
  }

  function handleCheckIn() {
    if (!entry.waiver_verified) { setBlockReason('Waiver not verified'); return; }
    if (licenseOk === false) { setBlockReason('License expired'); return; }
    applyUpdate({ entry_status: 'Checked In' }, 'gate_checkin', `Gate check-in for ${driverName}`);
  }

  return (
    <div className="space-y-2">
      {blockReason && (
        <p className="text-red-400 text-sm font-medium">⛔ {blockReason}</p>
      )}
      <div className="flex gap-2 flex-wrap">
        {!entry.waiver_verified && (
          <button onClick={() => applyUpdate({ waiver_verified: true, waiver_verified_date: new Date().toISOString(), waiver_verified_by_user_id: user?.id ?? '', waiver_status: 'Verified' }, 'waiver_verified', `Waiver verified for ${driverName}`)}
            disabled={!!saving}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg py-3 text-sm transition-all active:scale-95 disabled:opacity-40">
            {saving === 'waiver_verified' ? '…' : '✓ Waiver'}
          </button>
        )}
        {entry.payment_status !== 'Paid' && (
          <button onClick={() => applyUpdate({ payment_status: 'Paid' }, 'payment_collected', `Payment collected for ${driverName}`)}
            disabled={!!saving}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg py-3 text-sm transition-all active:scale-95 disabled:opacity-40">
            {saving === 'payment_collected' ? '…' : '$ Pay'}
          </button>
        )}
        {entry.entry_status !== 'Checked In' && (
          <button onClick={handleCheckIn}
            disabled={!!saving}
            className="flex-1 bg-white text-black font-black rounded-lg py-3 text-sm transition-all active:scale-95 disabled:opacity-40">
            {saving === 'gate_checkin' ? '…' : '⚡ Check In'}
          </button>
        )}
        {entry.entry_status !== 'Checked In' && isAdmin && (
          <button onClick={() => applyUpdate({ entry_status: 'Checked In' }, 'gate_override_checkin', `Admin override check-in for ${driverName}`)}
            disabled={!!saving}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg py-3 px-4 text-sm transition-all active:scale-95 disabled:opacity-40">
            {saving === 'gate_override_checkin' ? '…' : '🚨'}
          </button>
        )}
        {entry.entry_status === 'Checked In' && (
          <span className="flex-1 flex items-center justify-center gap-1 bg-green-900 text-green-300 font-bold rounded-lg py-3 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Checked In
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main GateMode ────────────────────────────────────────────────────────────

export default function GateMode({ selectedEvent, isAdmin, currentUser }) {
  const queryClient = useQueryClient();
  const invalidate = buildInvalidateAfterOperation(queryClient);

  const [search, setSearch]       = useState('');
  const [qrInput, setQrInput]     = useState('');
  const [rapidMode, setRapidMode] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const debouncedSearch = useDebounce(search, 200);
  const debouncedQr     = useDebounce(qrInput, 200);
  const qrRef = useRef(null);

  // Entries
  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: selectedEvent ? REG_QK.entries(selectedEvent.id) : ['entries_none'],
    queryFn:  () => base44.entities.Entry.filter({ event_id: selectedEvent.id }, '-created_date', 500),
    enabled:  !!selectedEvent,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  // Drivers
  const driverIds = useMemo(() => [...new Set(entries.map(e => e.driver_id).filter(Boolean))], [entries]);
  const { data: driversRaw = [] } = useQuery({
    queryKey: ['gate_drivers', driverIds.join(',')],
    queryFn:  () => base44.entities.Driver.list(),
    enabled:  driverIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const driversMap = useMemo(() => {
    const m = {};
    driversRaw.forEach(d => { m[d.id] = d; });
    return m;
  }, [driversRaw]);

  // Series classes
  const { data: seriesClassesRaw = [] } = useQuery({
    queryKey: ['seriesClasses'],
    queryFn:  () => base44.entities.SeriesClass.list(),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });
  const classesMap = useMemo(() => {
    const m = {};
    seriesClassesRaw.forEach(c => { m[c.id] = c.name ?? c.class_name ?? c.id; });
    return m;
  }, [seriesClassesRaw]);

  // Filter
  const term = debouncedSearch || debouncedQr;
  const filtered = useMemo(() => {
    if (!term) return entries;
    const t = term.toLowerCase();
    return entries.filter(e => {
      if (e.car_number?.toLowerCase().includes(t)) return true;
      const d = driversMap[e.driver_id];
      if (!d) return false;
      return `${d.first_name} ${d.last_name}`.toLowerCase().includes(t);
    });
  }, [entries, driversMap, term]);

  function handleMutated(opType) {
    invalidate(opType === 'gate_checkin' || opType === 'gate_override_checkin' || opType === 'entry_updated'
      ? 'entry_checked_in' : 'entry_updated',
      { eventId: selectedEvent?.id });
    // Refresh selected entry from cache (optimistic)
    setSelected(prev => prev ? { ...prev } : null);
  }

  // Re-sync selected entry when entries refresh
  React.useEffect(() => {
    if (!selected) return;
    const fresh = entries.find(e => e.id === selected.id);
    if (fresh) setSelected(fresh);
  }, [entries]);

  // No event selected
  if (!selectedEvent) {
    return (
      <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center text-center px-8 py-16">
        <Scan className="w-16 h-16 text-gray-600 mb-4" />
        <p className="text-white text-2xl font-bold mb-2">Gate Mode</p>
        <p className="text-gray-400 text-lg">Select an event to activate gate operations.</p>
      </div>
    );
  }

  // Full-screen action panel
  if (selected && !rapidMode) {
    const freshEntry = entries.find(e => e.id === selected.id) ?? selected;
    return (
      <ActionPanel
        entry={freshEntry}
        driver={driversMap[freshEntry.driver_id]}
        classes={classesMap}
        user={currentUser}
        isAdmin={isAdmin}
        eventId={selectedEvent.id}
        onClose={() => setSelected(null)}
        onMutated={opType => {
          handleMutated(opType);
        }}
      />
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col">
      {/* Top controls */}
      <div className="sticky top-0 bg-gray-900 z-10 border-b border-gray-700 px-4 pt-4 pb-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search car number or driver name…"
            className="w-full bg-gray-800 text-white text-lg rounded-xl pl-11 pr-4 py-4 border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500"
          />
        </div>
        {/* QR scan */}
        <div className="relative">
          <Scan className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <input
            ref={qrRef}
            type="text"
            value={qrInput}
            onChange={e => setQrInput(e.target.value)}
            placeholder="QR / barcode scan input…"
            className="w-full bg-gray-800 text-gray-300 text-base rounded-xl pl-11 pr-4 py-3 border border-gray-700 focus:border-purple-500 focus:outline-none placeholder-gray-600"
          />
        </div>
        {/* Rapid Mode toggle */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <Label htmlFor="rapid-mode" className="text-white font-semibold text-sm cursor-pointer">Rapid Mode</Label>
            <span className="text-gray-500 text-xs">(inline actions)</span>
          </div>
          <Switch id="rapid-mode" checked={rapidMode} onCheckedChange={setRapidMode} />
        </div>
        {/* Summary */}
        <div className="flex gap-4 text-xs text-gray-500 px-1 pb-1">
          <span>{filtered.length} entries</span>
          <span>{entries.filter(e => e.entry_status === 'Checked In').length} checked in</span>
          <span>{entries.filter(e => e.payment_status !== 'Paid').length} unpaid</span>
          <span>{entries.filter(e => !e.waiver_verified).length} waivers missing</span>
        </div>
      </div>

      {/* Entry list */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
        {loadingEntries && (
          <div className="text-center py-16 text-gray-400">Loading entries…</div>
        )}
        {!loadingEntries && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-lg">
            {entries.length === 0 ? 'No entries registered yet.' : 'No matches found.'}
          </div>
        )}
        {filtered.map(entry => (
          <EntryCard
            key={entry.id}
            entry={entry}
            driver={driversMap[entry.driver_id]}
            classes={classesMap}
            rapidMode={rapidMode}
            onClick={() => {
              if (rapidMode) {
                setExpandedId(expandedId === entry.id ? null : entry.id);
              } else {
                setSelected(entry);
              }
            }}
          >
            {rapidMode && expandedId === entry.id && (
              <InlineActions
                entry={entries.find(e => e.id === entry.id) ?? entry}
                driver={driversMap[entry.driver_id]}
                classes={classesMap}
                user={currentUser}
                isAdmin={isAdmin}
                eventId={selectedEvent.id}
                onMutated={handleMutated}
              />
            )}
          </EntryCard>
        ))}
      </div>
    </div>
  );
}