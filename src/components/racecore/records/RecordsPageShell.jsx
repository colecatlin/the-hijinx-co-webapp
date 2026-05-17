import React from 'react';
import { cn } from '@/lib/utils';
import TacticalStatStrip from './TacticalStatStrip';

/**
 * RecordsPageShell — shared tactical page wrapper for all RaceCore record surfaces.
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
  return (
    <div className="flex flex-col h-full min-h-screen" style={{ background: '#0a0a0a' }}>

      {/* Alert strip (duplicate warnings, system notices) */}
      {alert && (
        <div className="shrink-0">
          {alert}
        </div>
      )}

      {/* Header strip */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-gray-800/80 shrink-0">
        {/* Left: identity + stats */}
        <div className="flex items-center gap-5 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            {Icon && <Icon className="w-3.5 h-3.5 text-teal-500 shrink-0" />}
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-gray-300 whitespace-nowrap">
              {title}
            </span>
          </div>
          <TacticalStatStrip stats={stats} isLoading={isLoading} />
        </div>
        {/* Right: action buttons */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
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

      {/* Bulk action bar */}
      {bulkBar && (
        <div className="shrink-0">
          {bulkBar}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}