import React from 'react';
import { cn } from '@/lib/utils';

/**
 * RecordStatusBadge — unified operational status badge for all RaceCore record entities.
 * Single source of truth for status colors and labels across Tracks, Drivers, Teams, Series, Events.
 *
 * Normalization: all lookups go through normalizeStatus() which handles case variants,
 * so 'active', 'Active', 'ACTIVE' all resolve identically.
 */

// ── Internal normalization ────────────────────────────────────────────────────
// Canonical-case map: lowercase key → canonical key used in style tables.
// Handles all known entity status values from Driver, Team, Track, Series, Event.
const CANONICAL = {
  // visibility
  'live':               'Live',
  'draft':              'Draft',
  // operational — shared
  'active':             'Active',
  'inactive':           'Inactive',
  'seasonal':           'Seasonal',
  'archived':           'Archived',
  'pending':            'Pending',
  'completed':          'Completed',
  'upcoming':           'Upcoming',
  'historic':           'Historic',
  // Team-specific
  'part time':          'Part Time',
  // Driver career
  'novice':             'Novice',
  'amateur':            'Amateur',
  'semi-professional':  'Semi-Professional',
  'professional':       'Professional',
  // Event lifecycle
  'pendingapproval':    'PendingApproval',
  'pending approval':   'PendingApproval',
  'published':          'Published',
  'cancelled':          'Cancelled',
  'canceled':           'Cancelled',
  // Session result states (safe to have even if not displayed via this badge)
  'provisional':        'Provisional',
  'official':           'Official',
  'locked':             'Locked',
  // Track operational
  'limited':            'Limited',
};

/** Returns the canonical casing for a raw status value. */
function normalizeStatus(raw) {
  if (!raw) return 'Draft';
  const key = String(raw).toLowerCase().trim();
  return CANONICAL[key] ?? raw; // fall back to raw if genuinely unknown
}

// ── Style tables (canonical keys only) ───────────────────────────────────────

export const STATUS_STYLES = {
  // Visibility
  Live:      'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  Draft:     'text-gray-500   bg-gray-500/10   border-gray-600/30',
  // Operational — shared
  Active:    'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  Inactive:  'text-gray-600   bg-gray-600/10   border-gray-700/30',
  Seasonal:  'text-amber-400  bg-amber-400/10  border-amber-500/30',
  Limited:   'text-amber-400  bg-amber-400/10  border-amber-500/30',
  Archived:  'text-gray-700   bg-gray-700/10   border-gray-800/30',
  Pending:   'text-sky-400    bg-sky-400/10    border-sky-500/30',
  Completed: 'text-violet-400 bg-violet-400/10 border-violet-500/30',
  Upcoming:  'text-sky-400    bg-sky-400/10    border-sky-500/30',
  Historic:  'text-gray-600   bg-gray-600/10   border-gray-700/30',
  // Team
  'Part Time': 'text-amber-400 bg-amber-400/10 border-amber-500/30',
  // Driver career
  Novice:             'text-gray-500   bg-gray-500/10   border-gray-600/30',
  Amateur:            'text-sky-400    bg-sky-400/10    border-sky-500/30',
  'Semi-Professional':'text-sky-400    bg-sky-400/10    border-sky-500/30',
  Professional:       'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  // Event lifecycle
  PendingApproval: 'text-sky-400    bg-sky-400/10    border-sky-500/30',
  Published:       'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  Cancelled:       'text-red-500    bg-red-500/10    border-red-600/30',
  // Session result states
  Provisional: 'text-amber-400  bg-amber-400/10  border-amber-500/30',
  Official:    'text-emerald-400 bg-emerald-400/10 border-emerald-500/30',
  Locked:      'text-violet-400 bg-violet-400/10 border-violet-500/30',
};

export const STATUS_LABELS = {
  Live:      'LIVE',
  Draft:     'DRAFT',
  Active:    'ACTIVE',
  Inactive:  'INACTIVE',
  Seasonal:  'SEASONAL',
  Limited:   'LIMITED',
  Archived:  'ARCHIVED',
  Pending:   'PENDING',
  Completed: 'DONE',
  Upcoming:  'UPCOMING',
  Historic:  'HISTORIC',
  'Part Time': 'PT',
  Novice:             'NOVICE',
  Amateur:            'AMATEUR',
  'Semi-Professional':'SEMI-PRO',
  Professional:       'PRO',
  PendingApproval: 'PENDING',
  Published:       'PUBLISHED',
  Cancelled:       'CANCELLED',
  Provisional: 'PROV.',
  Official:    'OFFICIAL',
  Locked:      'LOCKED',
};

export const STATUS_ACCENT = {
  Live:      'bg-emerald-500',
  Draft:     'bg-gray-600',
  Active:    'bg-emerald-500',
  Inactive:  'bg-gray-700',
  Seasonal:  'bg-amber-500',
  Limited:   'bg-amber-500',
  Archived:  'bg-gray-800',
  Pending:   'bg-sky-500',
  Completed: 'bg-violet-500',
  Upcoming:  'bg-sky-500',
  Historic:  'bg-gray-700',
  'Part Time': 'bg-amber-500',
  Novice:             'bg-gray-600',
  Amateur:            'bg-sky-600',
  'Semi-Professional':'bg-sky-500',
  Professional:       'bg-emerald-500',
  PendingApproval: 'bg-sky-500',
  Published:       'bg-emerald-500',
  Cancelled:       'bg-red-600',
  Provisional:     'bg-amber-500',
  Official:        'bg-emerald-500',
  Locked:          'bg-violet-500',
};

// ── Variant styling ───────────────────────────────────────────────────────────
// operational = solid badge (lifecycle: Active, Upcoming, Inactive, …)
// visibility = ghost/dashed badge (public access: Draft, Live)
const VARIANT_BORDER = {
  operational: 'border',
  visibility:  'border border-dashed',
};

const VARIANT_TOOLTIP = {
  operational: 'Operational lifecycle — whether this entity is actively running sessions.',
  visibility:  'Public access — whether this profile is visible on the public directory.',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecordStatusBadge({ status, className, variant = 'operational' }) {
  const canonical = normalizeStatus(status);
  const style = STATUS_STYLES[canonical] || STATUS_STYLES.Draft;
  const label = STATUS_LABELS[canonical] || (canonical ? canonical.toUpperCase() : 'UNKNOWN');
  const borderClass = VARIANT_BORDER[variant] || VARIANT_BORDER.operational;
  const tooltip = VARIANT_TOOLTIP[variant];

  return (
    <span
      title={tooltip}
      className={cn(
        'shrink-0 inline-flex items-center px-1.5 py-px text-[9px] font-mono font-bold tracking-widest rounded',
        borderClass,
        style,
        className
      )}
    >
      {label}
    </span>
  );
}

/**
 * getStatusAccent(status) — returns Tailwind bg class for the accent bar.
 * Exported for use by RecordRowShell and entity row components.
 */
export function getStatusAccent(status) {
  const canonical = normalizeStatus(status);
  return STATUS_ACCENT[canonical] || 'bg-gray-700';
}