/**
 * R9CQ — TechQueue
 * Full tech inspection queue for the Compliance panel.
 * Inline pass/fail/recheck — no drawer required.
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { applyDefaultQueryOptions } from '@/components/utils/queryDefaults';
import TechQueueRow from './TechQueueRow';
import CheckInSearchBar from '../checkin/CheckInSearchBar';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

const DQ = applyDefaultQueryOptions();

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Not Inspected', label: 'Pending' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Recheck Required', label: 'Recheck' },
  { value: 'Passed', label: 'Passed' },
];

export default function TechQueue({ selectedEvent }) {
  const eventId = selectedEvent?.id;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data: entries = [] } = useQuery({
    queryKey: ['entries', eventId],
    queryFn: () => (eventId ? base44.entities.Entry.filter({ event_id: eventId }) : Promise.resolve([])),
    enabled: !!eventId,
    ...DQ,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['tech_drivers'],
    queryFn: () => base44.entities.Driver.list('-created_date', 500),
    staleTime: 60_000,
    ...DQ,
  });

  const { data: seriesClasses = [] } = useQuery({
    queryKey: ['tech_seriesClasses'],
    queryFn: () => base44.entities.SeriesClass.list('-created_date', 200),
    staleTime: 60_000,
    ...DQ,
  });

  const driverMap = useMemo(() => Object.fromEntries(drivers.map(d => [d.id, d])), [drivers]);
  const classMap = useMemo(() => Object.fromEntries(seriesClasses.map(c => [c.id, c])), [seriesClasses]);

  const updateMutation = useMutation({
    mutationFn: ({ entryId, data }) => base44.entities.Entry.update(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries', eventId] });
      toast.success('Tech status updated');
    },
    onError: () => toast.error('Failed to update tech status'),
  });

  const handlePass = (entry) =>
    updateMutation.mutate({ entryId: entry.id, data: { tech_status: 'Passed', tech_time: new Date().toISOString() } });
  const handleFail = (entry) =>
    updateMutation.mutate({ entryId: entry.id, data: { tech_status: 'Failed', tech_time: new Date().toISOString() } });
  const handleRecheck = (entry) =>
    updateMutation.mutate({ entryId: entry.id, data: { tech_status: 'Recheck Required' } });

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
    // Sort: Failed first, then Recheck, then Not Inspected, then Passed
    const order = { 'Failed': 0, 'Recheck Required': 1, 'Not Inspected': 2, 'Passed': 3 };
    return result.sort((a, b) =>
      (order[a.tech_status || 'Not Inspected'] ?? 2) - (order[b.tech_status || 'Not Inspected'] ?? 2)
    );
  }, [entries, driverMap, filter, search]);

  // Stats
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
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="flex-1">
          <CheckInSearchBar value={search} onChange={setSearch} placeholder="Search driver, #number…" />
        </div>
        <div className="flex gap-1">
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
              className={classMap[entry.event_class_id || entry.series_class_id]?.class_name}
              onPass={handlePass}
              onFail={handleFail}
              onRecheck={handleRecheck}
              isPending={updateMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}