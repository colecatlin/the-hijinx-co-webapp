/**
 * R9CQ — CloseoutProgressBar
 * Visual progress indicator for event closeout checklist.
 */
import React from 'react';

export default function CloseoutProgressBar({ passed, total }) {
  const pct = total === 0 ? 0 : Math.round((passed / total) * 100);
  const color = pct === 100 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Closeout Readiness
        </span>
        <span className="text-[11px] font-bold" style={{ color }}>
          {passed}/{total} complete
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}