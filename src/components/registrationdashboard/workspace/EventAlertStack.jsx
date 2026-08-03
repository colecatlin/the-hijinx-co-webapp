/**
 * R9CQ — EventAlertStack
 * Renders active alerts above panel content.
 * CRITICAL: non-dismissible. WARNING: session-dismissible. INFO: permanently dismissible.
 */
import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const SEVERITY_STYLES = {
  CRITICAL: {
    bar: 'border-danger/40 bg-danger/10',
    icon: 'text-danger',
    text: 'text-danger',
    label: 'text-danger',
    Icon: AlertCircle,
  },
  WARNING: {
    bar: 'border-warning/40 bg-warning/10',
    icon: 'text-warning',
    text: 'text-warning',
    label: 'text-warning',
    Icon: AlertTriangle,
  },
  INFO: {
    bar: 'border-motion/40 bg-motion/10',
    icon: 'text-motion',
    text: 'text-motion',
    label: 'text-motion',
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