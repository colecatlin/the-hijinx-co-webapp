/**
 * R8AH — EventDayGroupHeader
 * Visual header for an EventDay group in session timeline surfaces.
 * Pure display — no mutations, no lifecycle authority changes.
 * EventDay.status is manual presentation metadata only.
 */
import React from 'react';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_STYLES = {
  Planned:   { dot: 'bg-foreground-quiet',  badge: 'text-foreground-quiet border-divider',  label: 'Planned'   },
  Active:    { dot: 'bg-motion animate-pulse', badge: 'text-motion border-motion/40', label: 'Active' },
  Completed: { dot: 'bg-success', badge: 'text-success border-success/40', label: 'Complete'  },
  Cancelled: { dot: 'bg-danger',   badge: 'text-danger border-danger/40',    label: 'Cancelled' },
};

/**
 * Props:
 *   eventDay     — EventDay record (may be null for "Unassigned" group)
 *   dayLabel     — fallback string when eventDay is null
 *   sessionCount — number of sessions in this group
 *   isCollapsed  — boolean
 *   onToggle     — () => void
 *   allDone      — boolean, all sessions complete/locked
 *   anyActive    — boolean, any session in-progress
 */
export default function EventDayGroupHeader({
  eventDay,
  dayLabel,
  sessionCount,
  isCollapsed,
  onToggle,
  allDone = false,
  anyActive = false,
}) {
  const isUnassigned = !eventDay;
  const status = eventDay?.status || null;
  const statusStyle = STATUS_STYLES[status] || null;

  // Derive header background from operational state
  const headerBg = allDone
    ? 'bg-success/5'
    : anyActive
    ? 'bg-motion/5'
    : 'bg-surface-interactive/40';

  // Build the display label
  let displayLabel = dayLabel;
  if (eventDay) {
    displayLabel = eventDay.label;
    if (eventDay.date) {
      try {
        const d = new Date(eventDay.date + 'T12:00:00'); // noon to avoid tz-shift
        const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        displayLabel = `${eventDay.label} · ${weekday}, ${dateStr}`;
      } catch { /* keep label as-is */ }
    }
  }

  return (
    <button
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${headerBg} hover:bg-surface-interactive`}
      onClick={onToggle}
      aria-expanded={!isCollapsed}
    >
      {/* Day status dot — operational-state-aware */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
        allDone ? 'bg-success' :
        anyActive ? 'bg-motion animate-pulse' :
        isUnassigned ? 'bg-foreground-quiet' :
        statusStyle?.dot || 'bg-foreground-quiet'
      }`} />

      {/* Icon for real EventDay records */}
      {!isUnassigned && (
        <CalendarDays className="w-3.5 h-3.5 text-motion flex-shrink-0" />
      )}

      {/* Label */}
      <span className="font-bold text-sm text-foreground flex-1 text-left">{displayLabel}</span>

      {/* EventDay status badge */}
      {statusStyle && (
        <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-px rounded border ${statusStyle.badge}`}>
          {statusStyle.label}
        </span>
      )}

      {/* Session count + completion */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-foreground-quiet">{sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
        {allDone && <span className="text-xs text-success font-semibold">Complete ✓</span>}
      </div>

      {/* Collapse chevron */}
      {isCollapsed
        ? <ChevronDown className="w-4 h-4 text-foreground-quiet flex-shrink-0" />
        : <ChevronUp className="w-4 h-4 text-foreground-quiet flex-shrink-0" />
      }
    </button>
  );
}