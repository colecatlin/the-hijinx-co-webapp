import React from 'react';
import { Trash2 } from 'lucide-react';

/**
 * BulkActionBar — high-contrast selection toolbar for RaceCore record pages.
 * Renders the selected count, optional children (bulk edit controls), a
 * destructive Delete button, and a Cancel link — all on a semantic
 * surface-interactive bar with a motion accent border.
 *
 * Props:
 *   count         — number of selected records
 *   onDelete      — () => void  (opens delete confirm)
 *   isDeleting    — boolean      (bulk delete mutation pending)
 *   deletingLabel — string      (e.g. "Delete 3")
 *   onCancel      — () => void  (clears selection)
 *   children      — ReactNode   (extra bulk controls like selects / Apply)
 */
export default function BulkActionBar({ count, onDelete, isDeleting, deletingLabel, onCancel, children }) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-2 flex-wrap"
      style={{ background: 'hsl(var(--surface-interactive))', borderBottom: '1px solid hsl(var(--motion) / 0.4)' }}
    >
      <span className="text-xs font-mono font-bold" style={{ color: 'hsl(var(--motion))' }}>
        {count} selected
      </span>

      {children}

      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="h-7 px-3 text-[11px] font-mono font-semibold rounded transition-colors disabled:opacity-40 flex items-center gap-1.5"
        style={{
          background: 'hsl(var(--danger) / 0.15)',
          color: 'hsl(var(--danger))',
          border: '1px solid hsl(var(--danger) / 0.5)',
        }}
      >
        <Trash2 className="w-3 h-3" />
        {isDeleting ? 'Deleting…' : deletingLabel}
      </button>

      <button
        onClick={onCancel}
        className="text-[11px] font-mono transition-colors"
        style={{ color: 'hsl(var(--foreground-quiet))' }}
      >
        Cancel
      </button>
    </div>
  );
}