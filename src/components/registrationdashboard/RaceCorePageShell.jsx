import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, Info } from 'lucide-react';

/**
 * RaceCorePageShell
 * ─────────────────
 * Standard page-level wrapper for all Race Core inner pages.
 *
 * Usage:
 *   <RaceCorePageShell
 *     title="Results"
 *     subtitle="Enter, review, and publish session results."
 *     chip={{ label: 'Live', color: 'red' }}         // optional status chip
 *     actions={<Button>Import</Button>}               // optional right-side actions
 *     notice="Select an event to manage results."     // optional top notice
 *     noticeType="warning"                            // 'info' | 'warning' | 'error'
 *     isEmpty={results.length === 0}                  // show empty state instead of children
 *     emptyIcon={Flag}                                // Lucide icon component
 *     emptyTitle="No results yet"
 *     emptyMessage="Import or enter results to get started."
 *     emptyAction={<Button>Import Results</Button>}
 *   >
 *     {content}
 *   </RaceCorePageShell>
 */

const CHIP_STYLES = {
  green:  'bg-green-900/40 text-green-300 border-green-800/50',
  red:    'bg-red-900/40 text-red-300 border-red-800/50',
  amber:  'bg-amber-900/30 text-amber-300 border-amber-700/40',
  blue:   'bg-blue-900/30 text-blue-300 border-blue-800/40',
  gray:   'bg-gray-800/60 text-gray-400 border-gray-700/50',
  purple: 'bg-purple-900/30 text-purple-300 border-purple-800/40',
};

const NOTICE_STYLES = {
  info:    'bg-blue-950/30 border-blue-800/40 text-blue-200',
  warning: 'bg-amber-950/30 border-amber-700/40 text-amber-200',
  error:   'bg-red-950/40 border-red-800/40 text-red-300',
};

function StatusChip({ label, color = 'gray', icon: Icon }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium',
      CHIP_STYLES[color] || CHIP_STYLES.gray
    )}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

function Notice({ message, type = 'info' }) {
  const Icon = type === 'warning' || type === 'error' ? AlertCircle : Info;
  return (
    <div className={cn(
      'flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-xs mb-5',
      NOTICE_STYLES[type] || NOTICE_STYLES.info
    )}>
      <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="w-8 h-8 text-gray-700 mb-3" />}
      <p className="text-sm font-semibold text-gray-400 mb-1">{title}</p>
      {message && <p className="text-xs text-gray-600 max-w-xs leading-relaxed mb-4">{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

export default function RaceCorePageShell({
  // Header
  title,
  subtitle,
  chip,             // { label, color, icon? }

  // Actions (rendered right of header)
  actions,

  // Top notice (optional contextual warning/info)
  notice,
  noticeType = 'info',

  // Empty state
  isEmpty = false,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  emptyAction,

  // Content
  children,
  className,
}) {
  return (
    <div className={cn('space-y-0', className)}>

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {title && (
              <h2 className="text-base font-bold text-white leading-tight">{title}</h2>
            )}
            {chip && (
              <StatusChip label={chip.label} color={chip.color} icon={chip.icon} />
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {actions}
          </div>
        )}
      </div>

      {/* Top notice */}
      {notice && <Notice message={notice} type={noticeType} />}

      {/* Content or Empty State */}
      {isEmpty ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle || 'Nothing here yet'}
          message={emptyMessage}
          action={emptyAction}
        />
      ) : (
        children
      )}
    </div>
  );
}

// ── Named exports for sub-components (use inside pages without full shell) ──

export { StatusChip, Notice, EmptyState };

/**
 * ── Page Pattern Reference ──────────────────────────────────────────────────
 *
 * CHIP COLOR GUIDE:
 *   green  = active, live, published, official
 *   red    = live event, error, locked
 *   amber  = draft, pending, needs attention
 *   blue   = info, selected, in-progress
 *   gray   = inactive, no data, default
 *   purple = announcer mode, special state
 *
 * NOTICE TYPE GUIDE:
 *   info    = neutral guidance (blue)
 *   warning = needs action (amber)
 *   error   = blocking issue (red)
 *
 * ACTION PLACEMENT:
 *   - Primary actions: right side of header via `actions` prop
 *   - Secondary/bulk actions: inside content area
 *   - Destructive actions: always inside content, never in header
 *
 * ROLE-AWARE PATTERN:
 *   - Gate actions with canTab/canAction before passing to `actions` prop
 *   - Gate entire shell or notice using isAdmin/isOwnerOrEditor
 *   - Read-only users: pass no `actions`, optionally show a Notice('Read only access')
 *
 * EMPTY STATE PATTERN:
 *   - No event selected → notice above, not isEmpty (page should still render)
 *   - No data for event → isEmpty=true with guidance
 *   - Error state → Notice with error type
 *
 * CATEGORY-SPECIFIC CHIP DEFAULTS:
 *   Build pages     → chip based on event status (Draft/Published)
 *   Operate pages   → chip based on session status (Draft/Official/Locked)
 *   Championship    → chip based on standings freshness (Up to Date / Needs Recalc)
 *   Tools pages     → no chip unless showing active operation
 */