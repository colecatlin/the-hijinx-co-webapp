import React from 'react';
import { cn } from '@/lib/utils';

/**
 * TacticalStatStrip — compact operational telemetry stats bar.
 * Used in the header of all RaceCore record pages.
 *
 * Responsive:
 *   Mobile: horizontal scroll strip, max 3 stats visible
 *   sm+:    full inline layout, all stats visible
 *
 * stats prop: Array of { label, value, accent? }
 * accent is a Tailwind text color class e.g. 'text-emerald-400'
 */

function StatPill({ label, value, accent }) {
  return (
    <div className="flex items-baseline gap-1 shrink-0">
      <span className={cn('text-base sm:text-lg font-black font-mono tabular-nums leading-none', accent || 'text-gray-100')}>
        {value}
      </span>
      <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-gray-600 uppercase">{label}</span>
    </div>
  );
}

export default function TacticalStatStrip({ stats = [], isLoading = false, className }) {
  if (isLoading || stats.length === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 sm:gap-5 pl-2 sm:pl-3 border-l border-gray-800 overflow-x-auto scrollbar-hide',
        className
      )}
    >
      {stats.map((stat, i) => (
        <StatPill key={i} label={stat.label} value={stat.value} accent={stat.accent} />
      ))}
    </div>
  );
}