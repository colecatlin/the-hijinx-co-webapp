import React from 'react';
import { cn } from '@/lib/utils';

/**
 * TacticalStatStrip — compact operational telemetry stats bar.
 * Used in the header of all RaceCore record pages.
 *
 * stats prop: Array of { label, value, accent? }
 * accent is a Tailwind text color class e.g. 'text-emerald-400'
 */

function StatPill({ label, value, accent }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={cn('text-lg font-black font-mono tabular-nums leading-none', accent || 'text-gray-100')}>
        {value}
      </span>
      <span className="text-[10px] font-mono tracking-widest text-gray-600 uppercase">{label}</span>
    </div>
  );
}

export default function TacticalStatStrip({ stats = [], isLoading = false, className }) {
  if (isLoading || stats.length === 0) return null;

  return (
    <div className={cn('hidden sm:flex items-center gap-5 pl-3 border-l border-gray-800', className)}>
      {stats.map((stat, i) => (
        <StatPill key={i} label={stat.label} value={stat.value} accent={stat.accent} />
      ))}
    </div>
  );
}