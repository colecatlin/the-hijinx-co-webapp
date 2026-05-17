import React from 'react';
import { X } from 'lucide-react';
import ActivityTab from '@/components/management/ActivityTab';

/**
 * RecordActivityRail — collapsible right-side activity panel for RaceCore record pages.
 *
 * Props:
 *   entityName  — string, e.g. 'Track', 'Driver'
 *   onClose     — () => void
 */
export default function RecordActivityRail({ entityName, onClose }) {
  return (
    <div
      className="w-72 shrink-0 border-l border-gray-800/60 overflow-y-auto flex flex-col"
      style={{ background: '#0c0c0c' }}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/60 shrink-0">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-600">
          Activity Log
        </span>
        <button onClick={onClose} className="text-gray-700 hover:text-gray-400 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="p-3 flex-1 overflow-y-auto">
        <ActivityTab entityName={entityName} />
      </div>
    </div>
  );
}