/**
 * R9CQ — EventCheckInPanel
 * Compact check-in mode with search bar and inline actions.
 * 20+ entries visible without scrolling. No drawer required.
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import { useEventWorkspace } from '../EventWorkspaceContext';
import CheckInSearchBar from '../../checkin/CheckInSearchBar';
import CompactCheckInRow from '../../checkin/CompactCheckInRow';
import { Shield, Users, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const DQ = applyDefaultQueryOptions();

export default function EventCheckInPanel() {
  const {
    selectedEvent,
    isAdmin,
    eventPermissions,
  } = useEventWorkspace();

  const canEdit = isAdmin || !!eventPermissions?.canManageCheckIn || !!eventPermissions?.canManageEntries;
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  const { data: entries = [] } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([]),
    enabled: !!eventId, ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['checkin_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000, ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['checkin_classes'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 200),
    staleTime: 60_000, ...DQ,
  });

  const driverMap = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers]);
  const classMap = useMemo(() => Object.fromEntries(seriesClasses.map(c => [c.id, c])), [seriesClasses]);

  const updateMutation = useMutation({
    mutationFn: ({ entryId, data }) => base44.entities.Entry.update(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', eventId] });
    },
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

  // Class options from entries
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
        return name.includes(q) || num.includes(q) || transponder.includes(q);
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
  }, [entries, driverMap, search, statusFilter, classFilter]);

  if (!canEdit && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Shield className="w-8 h-8 text-gray-600" />
        <p className="text-gray-400 text-sm">Your access does not include Check-In.</p>
      </div>
    );
  }

  // Stats
  const checkedIn = entries.filter(e => e.entry_status === 'Checked In').length;
  const pct = entries.length > 0 ? Math.round((checkedIn / entries.length) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Stats header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-white">{checkedIn}</span>
          <span className="text-xs text-gray-500">/ {entries.length} checked in</span>
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden max-w-[120px]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#0d9488' }}
          />
        </div>
        <span className="text-[11px] font-semibold text-gray-400">{pct}%</span>
      </div>

      {/* Search */}
      <CheckInSearchBar value={search} onChange={setSearch} />

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
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
                ? 'bg-teal-800/40 border-teal-600/40 text-teal-300'
                : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:text-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {uniqueClassIds.length > 1 && (
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded text-[10px] text-gray-400 px-2 py-1 outline-none"
          >
            <option value="all">All Classes</option>
            {uniqueClassIds.map(id => (
              <option key={id} value={id}>{classMap[id]?.class_name || id.slice(0, 8)}</option>
            ))}
          </select>
        )}
      </div>

      {/* Compact entry list */}
      <div className="space-y-0.5">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-gray-600 text-sm">No entries match filter</div>
        ) : (
          filtered.map(entry => (
            <CompactCheckInRow
              key={entry.id}
              entry={entry}
              driver={driverMap[entry.driver_id]}
              className={classMap[entry.event_class_id || entry.series_class_id]?.class_name}
              onCheckIn={handleCheckIn}
              onUndoCheckIn={handleUndoCheckIn}
              canEdit={canEdit}
            />
          ))
        )}
      </div>

      <p className="text-[10px] text-gray-700">{filtered.length} entries shown</p>
    </div>
  );
}