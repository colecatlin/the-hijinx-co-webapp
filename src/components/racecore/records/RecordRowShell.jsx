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
 *   compact         — boolean: reduces row height for operational/high-density surfaces
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
  compact = false,
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
        'group relative flex items-center gap-2 sm:gap-3 px-3 sm:px-4 border-b transition-colors cursor-pointer',
        compact ? 'py-1.5 sm:py-1' : 'py-3 sm:py-2.5',
        'hover:bg-surface-interactive/50',
        'focus:outline-none focus-visible:bg-surface-interactive focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-motion/60',
        isSelected && 'bg-surface-interactive/60'
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
            className="border-divider data-[state=checked]:bg-motion data-[state=checked]:border-motion focus-visible:ring-1 focus-visible:ring-motion"
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