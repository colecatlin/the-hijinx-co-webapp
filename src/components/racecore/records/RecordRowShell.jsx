import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getStatusAccent } from './RecordStatusBadge';

/**
 * RecordRowShell — shared tactical row wrapper for all RaceCore entity rows.
 * Handles: hover state, selection state, left accent bar, checkbox, action reveal.
 *
 * Props:
 *   id              — record id (string)
 *   status          — operational status string (for accent bar color)
 *   isAdmin         — show checkbox
 *   isSelected      — boolean
 *   onSelect        — (id) => void
 *   onClick         — main row click handler (navigate to editor)
 *   actions         — ReactNode, revealed on hover (right side)
 *   label           — accessible label for the row (e.g. entity name) — used for aria-label
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
  label,
  children,
}) {
  const accentColor = getStatusAccent(status);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="row"
      tabIndex={onClick ? 0 : undefined}
      aria-selected={isSelected}
      aria-label={label ? `${label} record row` : undefined}
      className={cn(
        'group relative flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/60 transition-colors cursor-pointer',
        'hover:bg-gray-800/40',
        'focus:outline-none focus-visible:bg-gray-800/50 focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-teal-600/60',
        isSelected && 'bg-gray-800/30'
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {/* Left accent bar — visible on hover and focus */}
      <div className={cn(
        'absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-0 transition-opacity',
        'group-hover:opacity-100 group-focus-visible:opacity-100',
        accentColor
      )} />

      {/* Checkbox */}
      {isAdmin && (
        <div
          role="cell"
          className="shrink-0"
          onClick={e => { e.stopPropagation(); onSelect?.(id); }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect?.(id)}
            aria-label={label ? `Select ${label}` : 'Select record'}
            className="border-gray-600 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 focus-visible:ring-1 focus-visible:ring-teal-500"
          />
        </div>
      )}

      {/* Content columns */}
      {children}

      {/* Actions — revealed on hover or focus-within */}
      {actions && (
        <div
          role="cell"
          className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
}