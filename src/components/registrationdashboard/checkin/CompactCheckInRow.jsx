/**
 * R9CQ — CompactCheckInRow
 * Single-line check-in row. No drawer required.
 * Shows: #num | Driver Name | Class | status icons | action buttons
 */
import React from 'react';
import { CheckCircle2, RotateCcw, AlertTriangle, DollarSign, FileText, Zap } from 'lucide-react';

export default function CompactCheckInRow({ entry, driver, className, onCheckIn, onUndoCheckIn, canEdit }) {
  const isCheckedIn = entry.entry_status === 'Checked In';
  const unpaid = entry.payment_status === 'Unpaid';
  const noWaiver = !entry.waiver_verified;
  const noTransponder = !entry.transponder_id;
  const techFailed = entry.tech_status === 'Failed';
  const hasIssue = unpaid || noWaiver || techFailed;

  const driverName = driver
    ? `${driver.first_name} ${driver.last_name}`
    : '—';

  const rowBg = techFailed
    ? 'border-red-800/50 bg-red-950/20'
    : hasIssue
      ? 'border-amber-800/40 bg-amber-950/10'
      : isCheckedIn
        ? 'border-green-800/40 bg-green-950/10'
        : 'border-white/[0.06] bg-transparent';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${rowBg}`}>
      {/* Car number */}
      <span className="text-[11px] font-mono font-bold text-white w-10 flex-shrink-0">
        #{entry.car_number || '—'}
      </span>

      {/* Driver name */}
      <span className="text-[11px] font-medium text-gray-200 flex-1 min-w-0 truncate">
        {driverName}
      </span>

      {/* Class */}
      {className && (
        <span className="text-[10px] text-gray-500 flex-shrink-0 hidden sm:block max-w-[80px] truncate">
          {className}
        </span>
      )}

      {/* Status icons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {unpaid && (
          <span title="Unpaid">
            <DollarSign className="w-3 h-3 text-amber-400" />
          </span>
        )}
        {noWaiver && (
          <span title="No Waiver">
            <FileText className="w-3 h-3 text-amber-400" />
          </span>
        )}
        {noTransponder && (
          <span title="No Transponder">
            <Zap className="w-3 h-3 text-amber-400" />
          </span>
        )}
        {techFailed && (
          <span title="Tech Failed">
            <AlertTriangle className="w-3 h-3 text-red-400" />
          </span>
        )}
      </div>

      {/* Check-in status + action */}
      {isCheckedIn ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          {canEdit && (
            <button
              onClick={() => onUndoCheckIn(entry)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-amber-300 border border-amber-700/40 hover:bg-amber-900/30 transition-colors"
              title="Undo Check-In"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      ) : (
        canEdit && (
          <button
            onClick={() => onCheckIn(entry)}
            className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-700/60 hover:bg-teal-600/80 text-teal-100 border border-teal-600/40 transition-colors"
          >
            Check In
          </button>
        )
      )}
    </div>
  );
}