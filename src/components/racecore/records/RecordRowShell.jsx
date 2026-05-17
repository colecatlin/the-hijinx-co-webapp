import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { STATUS_ACCENT } from './RecordStatusBadge';

/**
 * RecordRowShell — shared tactical row wrapper for all RaceCore entity rows.
 * Handles: hover state, selection state, left accent bar, checkbox, action reveal.
 *
 * Props:
 *   id              — record id
 *   status          — operational status string (for accent bar color)
 *   isAdmin         — show checkbox
 *   isSelected      — boolean
 *   onSelect        — (id) => void
 *   onClick         — main row click handler (navigate to editor)
 *   actions         — ReactNode, revealed on hover (right side)
 *   children        — identity + metadata columns (middle content)
 */
export default function RecordRowShell({
  id,
  status,
  isAdmin = false,
  isSelected = false,
  onSelect,
  onClick,
  actions,
  children,
}) {
  const accentColor = STATUS_ACCENT[status] || 'bg-gray-700';

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/60 transition-colors cursor-pointer',
        'hover:bg-gray-800/40',
        isSelected && 'bg-gray-800/30'
      )}
      onClick={onClick}
    >
      {/* Left accent bar — visible on hover */}
      <div className={cn(
        'absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity',
        accentColor
      )} />

      {/* Checkbox */}
      {isAdmin && (
        <div
          className="shrink-0"
          onClick={e => { e.stopPropagation(); onSelect?.(id); }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect?.(id)}
            className="border-gray-600 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
          />
        </div>
      )}

      {/* Content columns */}
      {children}

      {/* Actions — revealed on hover */}
      {actions && (
        <div
          className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
}