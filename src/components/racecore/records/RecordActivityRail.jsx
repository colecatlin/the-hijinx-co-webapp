import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import ActivityTab from '@/components/management/ActivityTab';

/**
 * RecordActivityRail — collapsible right-side activity panel for RaceCore record pages.
 *
 * Props:
 *   entityName      — string, e.g. 'Track', 'Driver'
 *   onClose         — () => void
 *   overlayOnMobile — boolean (default false)
 *                     If true: below lg renders as an absolute overlay instead of
 *                     consuming horizontal space. At lg+ keeps the standard rail.
 *                     Default behavior is unchanged when omitted.
 */
export default function RecordActivityRail({ entityName, onClose, overlayOnMobile = false }) {
  return (
    <div
      className={cn(
        'border-l border-gray-800/60 overflow-y-auto flex flex-col shrink-0',
        overlayOnMobile
          ? 'absolute inset-y-0 right-0 z-20 w-72 lg:static lg:z-auto'
          : 'w-72'
      )}
      style={{ background: '#0c0c0c' }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/60 shrink-0">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600">
          Activity Log
        </span>
        <button
          onClick={onClose}
          aria-label="Close activity log"
          className="text-gray-700 hover:text-gray-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500 rounded transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="p-3 flex-1 overflow-y-auto">
        <ActivityTab entityName={entityName} />
      </div>
    </div>
  );
}