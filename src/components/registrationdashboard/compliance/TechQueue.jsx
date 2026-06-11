/**
 * R9CR — TechQueue
 * Tech inspection queue. TechInspectionRecord is now the AUTHORITY.
 * Pass/Fail/Recheck writes a TechInspectionRecord via syncEntryTechStatus.
 * Entry.tech_status is derived from TechInspectionRecord.
 * Reads entries/drivers/classes from wsData (no local fetches).
 */
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TechQueueRow from './TechQueueRow';
import CheckInSearchBar from '../checkin/CheckInSearchBar';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Not Inspected', label: 'Pending' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Recheck Required', label: 'Recheck' },
  { value: 'Passed', label: 'Passed' },
];

export default function TechQueue({ selectedEvent, wsData }) {
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Consume from workspace context — no local fetches
  const entries = wsData?.entries || [];
  const drivers = wsData?.drivers || [];
  const eventClasses = wsData?.eventClasses || [];
  const seriesClasses = wsData?.seriesClasses || [];

  const driverMap = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers]);
  const classMap = useMemo(() => {
    const m = {};
    seriesClasses.forEach(c => { m[c.id] = c.class_name || c.name || c.id; });
    eventClasses.forEach(c => { m[c.id] = c.class_name || c.name || c.id; });
    return m;
  }, [eventClasses, seriesClasses]);

  // R9CR: Write to TechInspectionRecord (authority) → sync Entry.tech_status
  const techMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke('syncEntryTechStatus', payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['entries', eventId] });
      queryClient.invalidateQueries({ queryKey: ['techInspections', eventId] });
      toast.success(`Tech: ${vars.status}`);
    },
    onError: (e) => toast.error('Failed to update tech status: ' + (e.response?.data?.error || e.message)),
  });

  const handlePass = (entry) => techMutation.mutate({
    entry_id: entry.id,
    event_id: eventId,
    status: 'Passed',
    inspection_phase: 'Pre-Race',
  });

  const handleFail = (entry) => techMutation.mutate({
    entry_id: entry.id,
    event_id: eventId,
    status: 'Failed',
    inspection_phase: 'Pre-Race',
  });

  const handleRecheck = (entry) => techMutation.mutate({
    entry_id: entry.id,
    event_id: eventId,
    status: 'Recheck Required',
    inspection_phase: 'Pre-Race',
  });

  const filtered = useMemo(() => {
    let result = [...entries];
    if (filter !== 'all') {
      result = result.filter(e => (e.tech_status || 'Not Inspected') === filter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e => {
        const driver = driverMap[e.driver_id];
        const name = driver ? `${driver.first_name} ${driver.last_name}`.toLowerCase() : '';
        const num = (e.car_number || '').toLowerCase();
        const transponder = (e.transponder_id || '').toLowerCase();
        return name.includes(q) || num.includes(q) || transponder.includes(q);
      });
    }
    const order = { 'Failed': 0, 'Recheck Required': 1, 'Not Inspected': 2, 'Passed': 3 };
    return result.sort((a, b) =>
      (order[a.tech_status || 'Not Inspected'] ?? 2) - (order[b.tech_status || 'Not Inspected'] ?? 2)
    );
  }, [entries, driverMap, filter, search]);

  const pending = entries.filter(e => !e.tech_status || e.tech_status === 'Not Inspected').length;
  const passed = entries.filter(e => e.tech_status === 'Passed').length;
  const failed = entries.filter(e => e.tech_status === 'Failed').length;
  const recheck = entries.filter(e => e.tech_status === 'Recheck Required').length;

  return (
    <div className="space-y-3">
      {/* Stats strip */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { label: 'Pending', value: pending, color: 'text-gray-300' },
          { label: 'Passed', value: passed, color: 'text-green-300' },
          { label: 'Failed', value: failed, color: 'text-red-300' },
          { label: 'Recheck', value: recheck, color: 'text-amber-300' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
            <span className="text-[10px] uppercase tracking-wider text-gray-600">{s.label}</span>
          </div>
        ))}
        <span className="text-[10px] text-gray-700 ml-2">⦁ Via TechInspectionRecord</span>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="flex-1">
          <CheckInSearchBar value={search} onChange={setSearch} placeholder="Search driver, #number…" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider border transition-colors ${
                filter === opt.value
                  ? 'bg-teal-800/40 border-teal-600/40 text-teal-300'
                  : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:text-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Queue */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Shield className="w-8 h-8 text-gray-700" />
          <p className="text-gray-500 text-sm">No entries match filter</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {filtered.map(entry => (
            <TechQueueRow
              key={entry.id}
              entry={entry}
              driver={driverMap[entry.driver_id]}
              className={classMap[entry.event_class_id || entry.series_class_id]}
              onPass={handlePass}
              onFail={handleFail}
              onRecheck={handleRecheck}
              isPending={techMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}