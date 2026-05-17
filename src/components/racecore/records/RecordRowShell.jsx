import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getStatusAccent } from './RecordStatusBadge';

/**
 * RecordRowShell — shared tactical row wrapper for all RaceCore entity rows.
 * Handles: hover state, selection state, left accent bar, checkbox, action reveal.
 *
 * Responsive:
 *   Desktop: dense row, actions revealed on hover
 *   Mobile:  actions always visible (no hover available), taller touch targets
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
      role="listitem"
      tabIndex={onClick ? 0 : undefined}
      aria-selected={isSelected}
      aria-label={label ? `${label} record row` : undefined}
      className={cn(
        'group relative flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-2.5 border-b border-gray-800/60 transition-colors cursor-pointer',
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

      {/* Checkbox — larger touch target on mobile */}
      {isAdmin && (
        <div
          role="cell"
          className="shrink-0 flex items-center justify-center w-8 h-8 sm:w-4 sm:h-4 -mx-1 sm:mx-0"
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

      {/* Actions:
          Desktop — revealed on hover/focus-within
          Mobile  — always visible (no hover state on touch) */}
      {actions && (
        <div
          role="cell"
          className={cn(
            'flex items-center gap-0.5 shrink-0 transition-opacity',
            // Mobile: always visible; Desktop: reveal on hover/focus
            'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
          )}
          onClick={e => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
}