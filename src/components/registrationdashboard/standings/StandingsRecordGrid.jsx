import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import RecordGrid from '@/components/racecore/records/RecordGrid';
import TacticalStatStrip from '@/components/racecore/records/TacticalStatStrip';
import StandingRecordRow from './StandingRecordRow';

/**
 * StandingsRecordGrid — tactical read-only standings renderer.
 *
 * Uses: RecordGrid + StandingRecordRow + TacticalStatStrip
 * Read-only. No mutations.
 *
 * Props:
 *   standings   — array of Standings records (pre-filtered, pre-sorted)
 *   drivers     — array of Driver records for name/location resolution
 *   isLoading   — boolean
 *   emptyMessage — optional string
 */
export default function StandingsRecordGrid({ standings = [], drivers = [], isLoading = false, emptyMessage }) {
  // Canonical sorted order: position ?? rank ?? points desc
  const sorted = useMemo(() => {
    return [...standings].sort((a, b) => {
      const ra = a.position ?? a.rank ?? 9999;
      const rb = b.position ?? b.rank ?? 9999;
      if (ra !== rb) return ra - rb;
      return (b.points_total ?? 0) - (a.points_total ?? 0);
    });
  }, [standings]);

  // TacticalStatStrip derivation (cheap, no loops beyond standings.length)
  const stats = useMemo(() => {
    if (!standings.length) return [];
    const leader = sorted[0];
    const second = sorted[1];
    const gap = leader && second
      ? (leader.points_total ?? 0) - (second.points_total ?? 0)
      : null;

    const latestCalc = standings.reduce((latest, s) => {
      if (!s.last_calculated) return latest;
      if (!latest) return s.last_calculated;
      return new Date(s.last_calculated) > new Date(latest) ? s.last_calculated : latest;
    }, null);

    const latestDisplay = latestCalc
      ? new Date(latestCalc).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '—';

    return [
      { label: 'Drivers', value: standings.length, accent: 'text-gray-100' },
      { label: 'Leader', value: leader ? (leader.points_total ?? 0) + ' pts' : '—', accent: 'text-teal-400' },
      ...(gap !== null ? [{ label: 'Gap', value: '+' + gap, accent: 'text-amber-400' }] : []),
      { label: 'Updated', value: latestDisplay, accent: 'text-gray-500' },
    ];
  }, [standings, sorted]);

  const columns = [
    { label: '#', className: 'w-8 sm:w-10 text-center' },
    { label: 'Driver', className: 'flex-1' },
    { label: 'Points', className: 'w-16 text-right' },
    { label: 'W / Pod / Sts', className: 'hidden sm:block w-36' },
    { label: 'Updated', className: 'hidden lg:block w-20 text-right' },
  ];

  return (
    <div className="space-y-2">
      {/* Stat strip */}
      {!isLoading && standings.length > 0 && (
        <TacticalStatStrip stats={stats} className="py-1" />
      )}

      <RecordGrid
        isLoading={isLoading}
        isEmpty={!isLoading && standings.length === 0}
        emptyIcon={Trophy}
        emptyMessage={emptyMessage || 'No standings calculated yet'}
        columns={columns}
        actionsWidth="w-10"
        skeletonCount={8}
      >
        {sorted.map((s, idx) => {
          const driver = drivers.find(d => d.id === s.driver_id);
          return (
            <StandingRecordRow
              key={s.id}
              standing={s}
              driver={driver}
              index={idx}
            />
          );
        })}
      </RecordGrid>
    </div>
  );
}