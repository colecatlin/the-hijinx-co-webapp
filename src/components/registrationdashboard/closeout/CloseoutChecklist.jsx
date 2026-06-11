/**
 * R9CR — CloseoutChecklist
 * Renders closeout checklist items with action links for failed items.
 */
import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

// Map checklist item IDs to workspace panel targets
const RESOLVE_MAP = {
  event_published:       'settings',
  all_sessions_complete: 'sessions',
  results_official:      'results',
  no_active_incidents:   'race_control',
  no_active_protests:    'race_control',
  no_pending_penalties:  'race_control',
  standings_calculated:  'standings',
  no_results_on_hold:    'results',
  // Warnings
  no_pending_media:      'media',
  export_packet:         'exports',
};

export default function CloseoutChecklist({ items, onNavigate }) {
  return (
    <div className="space-y-0.5">
      {items.map(item => {
        const isPass = item.passed;
        const isBlocker = item.is_blocker;
        const rowBg = isPass
          ? 'border-green-800/30 bg-green-950/10'
          : isBlocker
            ? 'border-red-800/30 bg-red-950/10'
            : 'border-amber-800/30 bg-amber-950/10';

        const Icon = isPass ? CheckCircle2 : isBlocker ? XCircle : AlertTriangle;
        const iconColor = isPass ? 'text-green-400' : isBlocker ? 'text-red-400' : 'text-amber-400';

        const resolveTarget = RESOLVE_MAP[item.id];

        return (
          <div
            key={item.id}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded border ${rowBg}`}
          >
            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
            <span className={`text-[11px] flex-1 ${isPass ? 'text-gray-400 line-through' : isBlocker ? 'text-red-200' : 'text-amber-200'}`}>
              {item.label}
            </span>
            {!isPass && (
              <span className={`text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 ${isBlocker ? 'text-red-400' : 'text-amber-400'}`}>
                {isBlocker ? 'Blocks' : 'Warning'}
              </span>
            )}
            {!isPass && resolveTarget && onNavigate && (
              <button
                onClick={() => onNavigate(resolveTarget)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors flex-shrink-0 ${
                  isBlocker
                    ? 'border-red-700/40 text-red-300 hover:bg-red-900/30'
                    : 'border-amber-700/40 text-amber-300 hover:bg-amber-900/30'
                }`}
                title={`Resolve → ${resolveTarget}`}
              >
                Resolve <ArrowRight className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}