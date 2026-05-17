import React from 'react';
import { cn } from '@/lib/utils';

/**
 * RecordStatusBadge — unified operational status badge for all RaceCore record entities.
 * Single source of truth for status colors and labels across Tracks, Drivers, Teams, Series, Events.
 */

export const STATUS_STYLES = {
  // Operational statuses
  Active:    'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  Live:      'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  live:      'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  Seasonal:  'text-amber-400  bg-amber-400/10  border-amber-500/30',
  Limited:   'text-amber-400  bg-amber-400/10  border-amber-500/30',
  Draft:     'text-gray-500   bg-gray-500/10   border-gray-600/30',
  draft:     'text-gray-500   bg-gray-500/10   border-gray-600/30',
  Inactive:  'text-gray-600   bg-gray-600/10   border-gray-700/30',
  Archived:  'text-gray-700   bg-gray-700/10   border-gray-800/30',
  Pending:   'text-sky-400    bg-sky-400/10    border-sky-500/30',
  Completed: 'text-violet-400 bg-violet-400/10 border-violet-500/30',
  // Event lifecycle statuses
  PendingApproval: 'text-sky-400    bg-sky-400/10    border-sky-500/30',
  Published:       'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  Cancelled:       'text-red-500    bg-red-500/10    border-red-600/30',
  // Aliases for entity-specific field values
  'Part Time':  'text-amber-400  bg-amber-400/10  border-amber-500/30',
  'Semi-Professional': 'text-sky-400 bg-sky-400/10 border-sky-500/30',
  Professional: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  Novice:    'text-gray-500   bg-gray-500/10   border-gray-600/30',
  Amateur:   'text-sky-400    bg-sky-400/10    border-sky-500/30',
  Upcoming:  'text-sky-400    bg-sky-400/10    border-sky-500/30',
  Historic:  'text-gray-600   bg-gray-600/10   border-gray-700/30',
};

// Map raw field values → display labels
export const STATUS_LABELS = {
  Active:    'ACTIVE',
  Live:      'LIVE',
  live:      'LIVE',
  Seasonal:  'SEASONAL',
  Limited:   'LIMITED',
  Draft:     'DRAFT',
  draft:     'DRAFT',
  Inactive:  'INACTIVE',
  Archived:  'ARCHIVED',
  Pending:   'PENDING',
  Completed: 'DONE',
  PendingApproval: 'PENDING',
  Published:       'PUBLISHED',
  Cancelled:       'CANCELLED',
  'Part Time': 'PT',
  'Semi-Professional': 'SEMI-PRO',
  Professional: 'PRO',
  Novice:    'NOVICE',
  Amateur:   'AMATEUR',
  Upcoming:  'UPCOMING',
  Historic:  'HISTORIC',
};

// Accent bar color for left-rail hover indicator
export const STATUS_ACCENT = {
  Active:    'bg-emerald-500',
  Live:      'bg-emerald-500',
  live:      'bg-emerald-500',
  Seasonal:  'bg-amber-500',
  Limited:   'bg-amber-500',
  Draft:     'bg-gray-600',
  draft:     'bg-gray-600',
  Inactive:  'bg-gray-700',
  Archived:  'bg-gray-800',
  Pending:   'bg-sky-500',
  PendingApproval: 'bg-sky-500',
  Published: 'bg-emerald-500',
  Cancelled: 'bg-red-600',
  Completed: 'bg-violet-500',
  Novice:    'bg-gray-600',
  Amateur:   'bg-sky-600',
  'Part Time': 'bg-amber-500',
  Historic:  'bg-gray-700',
  Upcoming:  'bg-sky-500',
};

export default function RecordStatusBadge({ status, className }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Draft;
  const label = STATUS_LABELS[status] || (status ? status.toUpperCase() : 'UNKNOWN');

  return (
    <span className={cn(
      'shrink-0 inline-flex items-center px-1.5 py-px text-[9px] font-mono font-bold tracking-widest rounded border',
      style,
      className
    )}>
      {label}
    </span>
  );
}