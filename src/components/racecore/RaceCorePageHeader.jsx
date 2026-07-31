import React from 'react';
import { cn } from '@/lib/utils';

/**
 * RaceCorePageHeader — shared tactical page header for all RaceCore surfaces.
 *
 * Generalizes the header pattern from RecordsPageShell without replacing it.
 * Used standalone by Standings, Dashboard, and future surfaces.
 *
 * Props:
 *   icon        — Lucide icon component (rendered at 14px teal)
 *   title       — string — primary label
 *   subtitle    — string — secondary descriptor (optional)
 *   actions     — ReactNode — right-side action buttons (optional)
 *   stats       — ReactNode — stats slot rendered inline after title (optional)
 *   compact     — boolean — reduces vertical padding for embedded contexts
 *   className   — optional additional class
 */
export default function RaceCorePageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  stats,
  compact = false,
  className,
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 sm:gap-4 border-b border-divider flex-shrink-0 min-w-0',
        compact ? 'px-3 sm:px-5 py-2 sm:py-2.5' : 'px-3 sm:px-5 py-2.5 sm:py-3',
        className
      )}
    >
      {/* Left: identity + stats */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        {/* Icon + Title + Subtitle */}
        <div className="flex items-center gap-2 shrink-0">
          {Icon && <Icon className="w-3.5 h-3.5 text-motion shrink-0" />}
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-foreground whitespace-nowrap leading-none">
              {title}
            </span>
            {subtitle && (
              <span className="text-[9px] font-mono text-foreground-quiet uppercase tracking-widest mt-0.5 whitespace-nowrap">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Stats slot */}
        {stats && (
          <div className="flex items-center pl-2 sm:pl-3 border-l border-divider min-w-0">
            {stats}
          </div>
        )}
      </div>

      {/* Right: actions */}
      {actions && (
        <div className="flex items-center gap-1.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}