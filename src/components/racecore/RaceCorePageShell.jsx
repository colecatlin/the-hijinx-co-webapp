/**
 * RaceCorePageShell — R9CC
 * Native RaceCore page framing for utility/data pages.
 * Renders inside RaceCoreLayout — no Management sidebar, no Management header.
 */
import React from 'react';
import { cn } from '@/lib/utils';

export default function RaceCorePageShell({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}) {
  return (
    <div className={cn('flex flex-col min-h-screen', className)} style={{ background: '#0a0a0a' }}>
      {/* Header strip */}
      <div
        className="flex items-center justify-between gap-4 px-5 py-4 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {/* Left: icon + title + description */}
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className="mt-0.5 shrink-0">
              <Icon className="w-4 h-4 text-teal-500" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-sm font-mono font-bold uppercase tracking-[0.22em] text-gray-200 leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-xs text-gray-600 mt-0.5 leading-snug">{description}</p>
            )}
          </div>
        </div>

        {/* Right: optional actions */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Content area — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}