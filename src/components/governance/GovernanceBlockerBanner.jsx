/**
 * R9CT — GovernanceBlockerBanner
 * Displays active governance blockers with severity and remediation links.
 * Used at the top of critical panels when enforcement is active.
 */
import React from 'react';
import { ShieldAlert, AlertTriangle, X } from 'lucide-react';

const TYPE_CONFIG = {
  governance:  { icon: ShieldAlert, color: 'text-red-300', bg: 'bg-red-950/20', border: 'border-red-800/40' },
  data_health: { icon: AlertTriangle, color: 'text-amber-300', bg: 'bg-amber-950/20', border: 'border-amber-800/40' },
  officials:   { icon: AlertTriangle, color: 'text-amber-300', bg: 'bg-amber-950/20', border: 'border-amber-800/40' },
};

export default function GovernanceBlockerBanner({ blockers = [], onNavigate, onDismiss }) {
  if (!blockers.length) return null;

  return (
    <div className="space-y-1.5">
      {blockers.map((b, i) => {
        const cfg = TYPE_CONFIG[b.type] || TYPE_CONFIG.data_health;
        const Icon = cfg.icon;
        return (
          <div
            key={i}
            className={`flex items-start gap-2 px-3 py-2 rounded border ${cfg.bg} ${cfg.border}`}
          >
            <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-semibold ${cfg.color}`}>{b.message}</p>
              {b.action && onNavigate && (
                <button
                  onClick={() => onNavigate(b.action)}
                  className="text-[10px] text-gray-400 hover:text-gray-200 underline mt-0.5 transition-colors"
                >
                  {b.actionLabel || 'Resolve →'}
                </button>
              )}
            </div>
            {onDismiss && (
              <button onClick={() => onDismiss(i)} className="text-gray-600 hover:text-gray-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}