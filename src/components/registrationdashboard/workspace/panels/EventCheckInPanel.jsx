/**
 * R9CR — EventCheckInPanel
 * Compact check-in with inline transponder assignment + bulk operations.
 * Reads entries/drivers/classes from wsData (no local fetches).
 */
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEventWorkspace } from '../EventWorkspaceContext';
import CheckInSearchBar from '../../checkin/CheckInSearchBar';
import CompactCheckInRow from '../../checkin/CompactCheckInRow';
import { Shield, Users, CheckCircle2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function EventCheckInPanel({ wsData }) {
  const { selectedEvent, isAdmin, eventPermissions } = useEventWorkspace();
  const canEdit = isAdmin || !!eventPermissions?.canManageCheckIn || !!eventPermissions?.canManageEntries;
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();

  // Consume from workspace context — no local fetches
  const entries = wsData?.entries || [];
  const drivers = wsData?.drivers || [];
  const eventClasses = wsData?.eventClasses || [];
  const seriesClasses = wsData?.seriesClasses || [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const driverMap = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers]);

  // Build class map from both EventClass and SeriesClass (EventClass takes priority)
  const classMap = useMemo(() => {
    const m = {};
    seriesClasses.forEach(c => { m[c.id] = c.class_name || c.name || c.id; });
    eventClasses.forEach(c => { m[c.id] = c.class_name || c.name || c.id; }); // override
    return m;
  }, [eventClasses, seriesClasses]);

  const updateMutation = useMutation({
    mutationFn: ({ entryId, data }) => base44.entities.Entry.update(entryId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entries', eventId] }),
    onError: () => toast.error('Failed to update entry'),
  });

  const handleCheckIn = (entry) => {
    updateMutation.mutate({
      entryId: entry.id,
      data: { entry_status: 'Checked In', checkin_time: new Date().toISOString() },
    });
  };

  const handleUndoCheckIn = (entry) => {
    updateMutation.mutate({
      entryId: entry.id,
      data: { entry_status: 'Registered', checkin_time: null },
    });
  };

  const handleUpdateTransponder = (entry, value) => {
    updateMutation.mutate({
      entryId: entry.id,
      data: { transponder_id: value },
    });
    toast.success(`Transponder ${value ? `set to ${value}` : 'cleared'}`);
  };

  // Bulk operations
  const handleBulkCheckIn = async (targetEntries) => {
    if (targetEntries.length === 0) return;
    setBulkLoading(true);
    const now = new Date().toISOString();
    await Promise.all(
      targetEntries.map(e =>
        base44.entities.Entry.update(e.id, { entry_status: 'Checked In', checkin_time: now })
      )
    );
    queryClient.invalidateQueries({ queryKey: ['entries', eventId] });
    setSelected(new Set());
    setBulkLoading(false);
    toast.success(`${targetEntries.length} entries checked in`);
  };

  const handleBulkUndoCheckIn = async (targetEntries) => {
    if (targetEntries.length === 0) return;
    setBulkLoading(true);
    await Promise.all(
      targetEntries.map(e =>
        base44.entities.Entry.update(e.id, { entry_status: 'Registered', checkin_time: null })
      )
    );
    queryClient.invalidateQueries({ queryKey: ['entries', eventId] });
    setSelected(new Set());
    setBulkLoading(false);
    toast.success(`${targetEntries.length} check-ins reversed`);
  };

  const uniqueClassIds = useMemo(() => {
    const ids = new Set();
    entries.forEach(e => { if (e.event_class_id || e.series_class_id) ids.add(e.event_class_id || e.series_class_id); });
    return Array.from(ids);
  }, [entries]);

  const filtered = useMemo(() => {
    let result = [...entries];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e => {
        const d = driverMap[e.driver_id];
        const name = d ? `${d.first_name} ${d.last_name}`.toLowerCase() : '';
        const num = (e.car_number || '').toLowerCase();
        const transponder = (e.transponder_id || '').toLowerCase();
        const cls = classMap[e.event_class_id || e.series_class_id]?.toLowerCase() || '';
        return name.includes(q) || num.includes(q) || transponder.includes(q) || cls.includes(q);
      });
    }
    if (statusFilter === 'checked_in') result = result.filter(e => e.entry_status === 'Checked In');
    if (statusFilter === 'not_checked_in') result = result.filter(e => e.entry_status !== 'Checked In');
    if (classFilter !== 'all') result = result.filter(e => (e.event_class_id || e.series_class_id) === classFilter);
    return result.sort((a, b) => {
      const an = driverMap[a.driver_id]?.last_name || '';
      const bn = driverMap[b.driver_id]?.last_name || '';
      return an.localeCompare(bn);
    });
  }, [entries, driverMap, classMap, search, statusFilter, classFilter]);

  if (!canEdit && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Shield className="w-8 h-8 text-foreground-quiet" />
        <p className="text-foreground-quiet text-sm">Your access does not include Check-In.</p>
      </div>
    );
  }

  const checkedIn = entries.filter(e => e.entry_status === 'Checked In').length;
  const pct = entries.length > 0 ? Math.round((checkedIn / entries.length) * 100) : 0;
  const selectedEntries = filtered.filter(e => selected.has(e.id));
  const notCheckedInSelected = selectedEntries.filter(e => e.entry_status !== 'Checked In');
  const checkedInSelected = selectedEntries.filter(e => e.entry_status === 'Checked In');

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(e => e.id)));
    }
  };

  return (
    <div className="space-y-3">
      {/* Stats header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-foreground-quiet" />
          <span className="text-sm font-bold text-foreground">{checkedIn}</span>
          <span className="text-xs text-foreground-quiet">/ {entries.length} checked in</span>
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-surface-interactive/50 overflow-hidden max-w-[120px]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct === 100 ? 'hsl(var(--success))' : 'hsl(var(--motion))' }}
          />
        </div>
        <span className="text-[11px] font-semibold text-foreground-quiet">{pct}%</span>
        {/* Bulk check-in all visible */}
        {canEdit && filtered.length > 0 && filtered.some(e => e.entry_status !== 'Checked In') && (
          <button
            onClick={() => handleBulkCheckIn(filtered.filter(e => e.entry_status !== 'Checked In'))}
            disabled={bulkLoading}
            className="ml-auto px-2.5 py-1 rounded border border-motion/40 bg-motion/10 text-motion text-[10px] font-semibold uppercase tracking-wider hover:bg-motion/20 transition-colors disabled:opacity-50"
          >
            {bulkLoading ? '…' : `Check In All Visible (${filtered.filter(e => e.entry_status !== 'Checked In').length})`}
          </button>
        )}
      </div>

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded border border-motion/40 bg-motion/5">
          <span className="text-[11px] font-semibold text-motion">{selected.size} selected</span>
          <div className="flex-1" />
          {notCheckedInSelected.length > 0 && (
            <button
              onClick={() => handleBulkCheckIn(notCheckedInSelected)}
              disabled={bulkLoading}
              className="px-2.5 py-1 rounded bg-motion/60 hover:bg-motion-hover/80 border border-motion/40 text-[10px] font-semibold text-foreground transition-colors disabled:opacity-50"
            >
              Check In Selected ({notCheckedInSelected.length})
            </button>
          )}
          {checkedInSelected.length > 0 && (
            <button
              onClick={() => handleBulkUndoCheckIn(checkedInSelected)}
              disabled={bulkLoading}
              className="px-2.5 py-1 rounded bg-warning/20 hover:bg-warning/30 border border-warning/40 text-[10px] font-semibold text-warning transition-colors disabled:opacity-50"
            >
              Undo ({checkedInSelected.length})
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="text-[10px] text-foreground-quiet hover:text-foreground-secondary transition-colors">Clear</button>
        </div>
      )}

      <CheckInSearchBar value={search} onChange={setSearch} />

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {[
          { value: 'all', label: 'All' },
          { value: 'not_checked_in', label: 'Pending' },
          { value: 'checked_in', label: 'Checked In' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider border transition-colors ${
              statusFilter === opt.value
                ? 'bg-motion/10 border-motion/40 text-motion'
                : 'bg-surface-interactive/30 border-divider/60 text-foreground-quiet hover:text-foreground-secondary'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {uniqueClassIds.length > 1 && (
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="bg-surface-interactive border border-divider rounded text-[10px] text-foreground-quiet px-2 py-1 outline-none"
          >
            <option value="all">All Classes</option>
            {uniqueClassIds.map(id => (
              <option key={id} value={id}>{classMap[id] || id.slice(0, 8)}</option>
            ))}
          </select>
        )}
        {/* Select all toggle */}
        {filtered.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="ml-auto text-[10px] text-foreground-quiet hover:text-foreground-secondary transition-colors"
          >
            {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* Entry list */}
      <div className="space-y-0.5">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-foreground-quiet text-sm">No entries match filter</div>
        ) : (
          filtered.map(entry => (
            <div key={entry.id} className="flex items-center gap-1">
              {/* Row selection checkbox */}
              <input
                type="checkbox"
                checked={selected.has(entry.id)}
                onChange={() => toggleSelect(entry.id)}
                className="w-3 h-3 accent-motion flex-shrink-0 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <CompactCheckInRow
                  entry={entry}
                  driver={driverMap[entry.driver_id]}
                  className={classMap[entry.event_class_id || entry.series_class_id]}
                  onCheckIn={handleCheckIn}
                  onUndoCheckIn={handleUndoCheckIn}
                  onUpdateTransponder={handleUpdateTransponder}
                  canEdit={canEdit}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-[10px] text-foreground-quiet">{filtered.length} entries shown</p>
    </div>
  );
}