/**
 * R9CQ — TechQueueRow
 * Compact tech inspection row. No drawer required.
 * Shows: #num | Driver | Class | Status | Pass/Fail/Recheck buttons
 */
import React from 'react';
import { CheckCircle2, XCircle, RotateCcw, Clock } from 'lucide-react';

const STATUS_STYLES = {
  'Not Inspected': 'text-gray-400 border-gray-700/40 bg-gray-800/20',
  'Passed':        'text-green-300 border-green-700/40 bg-green-900/20',
  'Failed':        'text-red-300 border-red-700/40 bg-red-900/20',
  'Recheck Required': 'text-amber-300 border-amber-700/40 bg-amber-900/20',
};

const STATUS_ICONS = {
  'Not Inspected':    Clock,
  'Passed':           CheckCircle2,
  'Failed':           XCircle,
  'Recheck Required': RotateCcw,
};

export default function TechQueueRow({ entry, driver, className, onPass, onFail, onRecheck, isPending }) {
  const status = entry.tech_status || 'Not Inspected';
  const StatusIcon = STATUS_ICONS[status] || Clock;
  const rowStyle = STATUS_STYLES[status] || STATUS_STYLES['Not Inspected'];
  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : '—';

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${rowStyle}`}>
      {/* Status icon */}
      <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" />

      {/* Car number */}
      <span className="text-[11px] font-mono font-bold w-10 flex-shrink-0">
        #{entry.car_number || '—'}
      </span>

      {/* Driver */}
      <span className="text-[11px] font-medium flex-1 min-w-0 truncate text-gray-200">
        {driverName}
      </span>

      {/* Class */}
      {className && (
        <span className="text-[10px] text-gray-500 flex-shrink-0 hidden sm:block max-w-[80px] truncate">
          {className}
        </span>
      )}

      {/* Status label */}
      <span className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 opacity-80">
        {status === 'Not Inspected' ? 'Pending' : status}
      </span>

      {/* Action buttons */}
      {status !== 'Passed' && (
        <button
          onClick={() => onPass(entry)}
          disabled={isPending}
          className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-700/60 hover:bg-green-600/80 text-green-100 border border-green-600/40 transition-colors disabled:opacity-50"
        >
          Pass
        </button>
      )}
      {status !== 'Failed' && (
        <button
          onClick={() => onFail(entry)}
          disabled={isPending}
          className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-700/60 hover:bg-red-600/80 text-red-100 border border-red-600/40 transition-colors disabled:opacity-50"
        >
          Fail
        </button>
      )}
      {status !== 'Recheck Required' && status !== 'Not Inspected' && (
        <button
          onClick={() => onRecheck(entry)}
          disabled={isPending}
          className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] text-amber-300 border border-amber-700/40 hover:bg-amber-900/30 transition-colors disabled:opacity-50"
          title="Recheck"
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}