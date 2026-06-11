/**
 * R9CQ — EventAlertStack
 * Renders active alerts above panel content.
 * CRITICAL: non-dismissible. WARNING: session-dismissible. INFO: permanently dismissible.
 */
import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
// Icon is rendered via style.Icon destructuring inside the map — no additional import needed

const SEVERITY_STYLES = {
  CRITICAL: {
    bar: 'border-red-800/60 bg-red-950/40',
    icon: 'text-red-400',
    text: 'text-red-200',
    label: 'text-red-400',
    Icon: AlertCircle,
  },
  WARNING: {
    bar: 'border-amber-800/50 bg-amber-950/30',
    icon: 'text-amber-400',
    text: 'text-amber-200',
    label: 'text-amber-400',
    Icon: AlertTriangle,
  },
  INFO: {
    bar: 'border-teal-800/40 bg-teal-950/20',
    icon: 'text-teal-400',
    text: 'text-teal-200',
    label: 'text-teal-400',
    Icon: Info,
  },
};

export default function EventAlertStack({ alerts = [], onDismiss, onNavigate }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-1 mb-4">
      {alerts.map(alert => {
        const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.INFO;
        const { Icon } = style;
        return (
          <div
            key={alert.id}
            className={`flex items-center gap-2.5 px-3 py-2 rounded border cursor-pointer transition-opacity hover:opacity-90 ${style.bar}`}
            onClick={() => onNavigate?.(alert.target)}
          >
            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${style.icon}`} />
            <span className={`text-[10px] font-bold uppercase tracking-widest flex-shrink-0 ${style.label}`}>
              {alert.severity}
            </span>
            <span className={`text-xs flex-1 ${style.text}`}>{alert.message}</span>
            <span className={`text-[10px] uppercase tracking-wider flex-shrink-0 opacity-50 ${style.text}`}>
              → {alert.target.replace('_', ' ')}
            </span>
            {alert.dismissible && (
              <button
                onClick={e => { e.stopPropagation(); onDismiss?.(alert.id); }}
                className={`flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity ${style.text}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}