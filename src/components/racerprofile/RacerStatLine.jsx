import React from 'react';

/**
 * RacerStatLine — an editorial line of figures, not a dashboard grid.
 *
 * Values are passed in already computed from canonical sources; this component
 * performs no arithmetic. Items with an empty value are skipped.
 */
export default function RacerStatLine({ items = [] }) {
  const values = (items || []).filter(
    (item) => item && item.value !== null && item.value !== undefined && item.value !== ''
  );
  if (values.length === 0) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-9 gap-y-3">
      {values.map((item) => (
        <span key={item.label} className="inline-flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-black tabular-nums text-foreground leading-none">{item.value}</span>
          <span className="text-xs tracking-wide text-foreground-secondary">{item.label}</span>
        </span>
      ))}
    </div>
  );
}