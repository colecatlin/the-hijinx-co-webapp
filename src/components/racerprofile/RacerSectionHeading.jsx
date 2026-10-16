import React from 'react';

/**
 * RacerSectionHeading — editorial section heading: mono eyebrow, strong
 * uppercase title, thin rule. Presentation only.
 */
export default function RacerSectionHeading({ label, title, action }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-divider pb-3 mb-6">
      <div className="min-w-0">
        {label && (
          <div className="font-mono text-[10px] tracking-[0.4em] uppercase text-motion mb-2">{label}</div>
        )}
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}