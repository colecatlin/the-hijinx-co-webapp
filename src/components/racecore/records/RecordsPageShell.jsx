import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import TacticalStatStrip from './TacticalStatStrip';

/**
 * RecordsPageShell — shared tactical page wrapper for all RaceCore record surfaces.
 *
 * Responsive header behavior:
 *   Desktop: all actions shown inline
 *   Mobile/tablet: primary action (last child) stays visible; remaining actions
 *                  move into a collapsible "More" tray to prevent overflow
 *
 * Props:
 *   icon        — Lucide icon component (rendered at 14px teal)
 *   title       — string, e.g. "Track Records"
 *   stats       — Array<{ label, value, accent? }> passed to TacticalStatStrip
 *   isLoading   — hides stats while loading
 *   actions     — ReactNode, rendered right side of header
 *   alert       — ReactNode, narrow warning/notice strip above header (e.g. duplicate warnings)
 *   panel       — ReactNode, larger collapsible tool panel (e.g. bulk scheduler, import tools)
 *   bulkBar     — ReactNode, optional bulk-action strip rendered below filter rail
 *   filterRail  — ReactNode, rendered as the filter row
 *   children    — main content area (grid + optional activity rail)
 */
export default function RecordsPageShell({
  icon: Icon,
  title,
  stats = [],
  isLoading = false,
  actions,
  alert,
  panel,
  bulkBar,
  filterRail,
  children,
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex flex-col h-full min-h-screen" style={{ background: '#0a0a0a' }}>

      {/* Alert strip (duplicate warnings, system notices) */}
      {alert && (
        <div className="shrink-0">
          {alert}
        </div>
      )}

      {/* Header strip */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/[0.06] shrink-0 min-w-0">
        {/* Left: identity + stats */}
        <div className="flex items-center gap-2 sm:gap-5 min-w-0 flex-1">
          <div className="flex items-center gap-2 shrink-0">
            {Icon && <Icon className="w-3.5 h-3.5 text-teal-500 shrink-0" />}
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-gray-300 whitespace-nowrap">
              {title}
            </span>
          </div>
          <TacticalStatStrip stats={stats} isLoading={isLoading} />
        </div>

        {/* Right: action buttons — responsive */}
        {actions && (
          <div className="flex items-center gap-1.5 shrink-0 relative">

            {/* Desktop: show all actions normally */}
            <div className="hidden md:flex items-center gap-2">
              {actions}
            </div>

            {/* Mobile/Tablet: show last action (primary = Add) + More button */}
            <div className="flex md:hidden items-center gap-1.5">
              {/* More tray button */}
              <button
                onClick={() => setMoreOpen(v => !v)}
                aria-label={moreOpen ? 'Close more actions' : 'More actions'}
                aria-expanded={moreOpen}
                className={cn(
                  'h-9 w-9 flex items-center justify-center rounded border transition-colors',
                  moreOpen
                    ? 'bg-gray-800 border-gray-600 text-gray-200'
                    : 'border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400'
                )}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Primary action (always shown — last node in actions) */}
              <div className="[&>*:last-child]:flex [&>*:not(:last-child)]:hidden flex items-center">
                {actions}
              </div>
            </div>

            {/* More dropdown tray */}
            {moreOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMoreOpen(false)}
                  aria-hidden="true"
                />
                <div
                  className="md:hidden absolute top-full right-0 mt-1.5 z-40 rounded-lg border border-gray-700/80 shadow-2xl flex flex-col gap-1 p-2 min-w-[160px]"
                  style={{ background: '#181818' }}
                >
                  {/* All secondary actions rendered as tray items */}
                  <div className="flex flex-col gap-1 [&>*:last-child]:hidden [&>*]:w-full [&>*]:justify-start [&>*]:text-left">
                    {actions}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filter rail */}
      {filterRail && (
        <div className="shrink-0">
          {filterRail}
        </div>
      )}

      {/* Panel slot — for collapsible utility tools (scheduler, importer, etc.) */}
      {panel && (
        <div className="shrink-0">
          {panel}
        </div>
      )}

      {/* Bulk action bar — sticky bottom tray on mobile */}
      {bulkBar && (
        <div className="shrink-0 sm:relative sm:bottom-auto">
          {/* Desktop: normal inline position */}
          <div className="hidden sm:block">
            {bulkBar}
          </div>
          {/* Mobile: sticky bottom tray */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 shadow-2xl border-t border-red-900/50"
            style={{ background: '#100808' }}
          >
            {bulkBar}
          </div>
        </div>
      )}

      {/* Main content — add bottom padding on mobile when bulkBar is active (sticky tray) */}
      <div className={cn('flex flex-1 min-h-0 overflow-hidden', bulkBar && 'pb-14 sm:pb-0')}>
        {children}
      </div>
    </div>
  );
}