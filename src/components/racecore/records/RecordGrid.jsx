import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * RecordGrid — shared dense records list wrapper for RaceCore record pages.
 *
 * Responsive:
 *   Desktop: sticky column header visible, dense rows
 *   Mobile:  column header hidden (rows are self-describing cards)
 *
 * Props:
 *   isLoading        — shows skeleton rows
 *   isEmpty          — shows empty state
 *   emptyIcon        — Lucide icon component
 *   emptyMessage     — string
 *   emptyAction      — ReactNode (e.g. clear filters link)
 *   columns          — Array<{ label, className }> for the sticky header
 *   showSelectAll    — boolean, show select-all checkbox in header
 *   allSelected      — boolean
 *   onSelectAll      — (checked: boolean) => void
 *   skeletonCount    — number of skeleton rows (default 12)
 *   actionsWidth     — Tailwind width class for actions column spacer (default 'w-20')
 *   children         — row components
 */
export default function RecordGrid({
  isLoading = false,
  isEmpty = false,
  emptyIcon: EmptyIcon,
  emptyMessage = 'No records found',
  emptyAction,
  columns = [],
  showSelectAll = false,
  allSelected = false,
  onSelectAll,
  skeletonCount = 12,
  actionsWidth = 'w-20',
  children,
}) {
  return (
    <div className="flex-1 overflow-y-auto">

      {/* Sticky column header — hidden on mobile (rows are self-labeling cards) */}
      {columns.length > 0 && (
        <div
          className="hidden sm:flex items-center gap-3 px-4 py-1.5 sticky top-0 z-10 border-b"
          style={{ background: '#0F1212', borderColor: 'rgba(255,255,255,0.07)' }}
        >
          {showSelectAll && (
            <div className="shrink-0 w-4">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onSelectAll}
                aria-label="Select all records"
                className="border-gray-700 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600 w-3.5 h-3.5"
              />
            </div>
          )}
          {columns.map((col) => (
            <div
              key={col.label}
              className={cn(
                'text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-gray-500',
                col.className
              )}
            >
              {col.label}
            </div>
          ))}
          {/* Actions spacer — width controlled by actionsWidth prop */}
          <div className={cn('shrink-0', actionsWidth)} />
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-3 sm:p-4 space-y-1.5">
          {[...Array(skeletonCount)].map((_, i) => (
            <Skeleton key={`skel-${i}`} className="h-14 sm:h-11 w-full rounded" style={{ background: '#1a1a1a' }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 sm:py-24 gap-3">
          {EmptyIcon && <EmptyIcon className="w-8 h-8 text-gray-800" />}
          <p className="text-xs font-mono text-gray-700 uppercase tracking-widest">{emptyMessage}</p>
          {emptyAction}
        </div>
      )}

      {/* Rows */}
      {!isLoading && !isEmpty && children}
    </div>
  );
}