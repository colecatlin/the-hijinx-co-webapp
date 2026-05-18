/**
 * R8AH — EventDayGroupHeader
 * Visual header for an EventDay group in session timeline surfaces.
 * Pure display — no mutations, no lifecycle authority changes.
 * EventDay.status is manual presentation metadata only.
 */
import React from 'react';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_STYLES = {
  Planned:   { dot: 'bg-gray-500',  badge: 'text-gray-400 border-gray-700',  label: 'Planned'   },
  Active:    { dot: 'bg-blue-400 animate-pulse', badge: 'text-blue-400 border-blue-800', label: 'Active' },
  Completed: { dot: 'bg-green-400', badge: 'text-green-400 border-green-800', label: 'Complete'  },
  Cancelled: { dot: 'bg-red-500',   badge: 'text-red-400 border-red-800',    label: 'Cancelled' },
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
    ? 'bg-green-950/30'
    : anyActive
    ? 'bg-[#1e1e26]'
    : 'bg-[#171717]';

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
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${headerBg} hover:bg-[#1e1e22]`}
      onClick={onToggle}
      aria-expanded={!isCollapsed}
    >
      {/* Day status dot — operational-state-aware */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
        allDone ? 'bg-green-400' :
        anyActive ? 'bg-blue-400 animate-pulse' :
        isUnassigned ? 'bg-gray-700' :
        statusStyle?.dot || 'bg-gray-600'
      }`} />

      {/* Icon for real EventDay records */}
      {!isUnassigned && (
        <CalendarDays className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
      )}

      {/* Label */}
      <span className="font-bold text-sm text-white flex-1 text-left">{displayLabel}</span>

      {/* EventDay status badge */}
      {statusStyle && (
        <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-px rounded border ${statusStyle.badge}`}>
          {statusStyle.label}
        </span>
      )}

      {/* Session count + completion */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">{sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
        {allDone && <span className="text-xs text-green-400 font-semibold">Complete ✓</span>}
      </div>

      {/* Collapse chevron */}
      {isCollapsed
        ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        : <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
      }
    </button>
  );
}