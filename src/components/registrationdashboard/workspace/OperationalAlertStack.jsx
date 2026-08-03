/**
 * REVISION 7D — Operational Alert Stack
 * Compact prioritized alerts for the intelligence rail.
 * Shows blockers and actionable operational issues.
 * Read-only; no mutations.
 */
import React, { useMemo } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { buildOperationalAlerts } from '../ops/sessionReadinessCalculator';

function AlertItem({ alert }) {
  const severityStyles = {
    critical: 'bg-danger/10 border-danger/30 text-danger',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    info: 'bg-motion/10 border-motion/30 text-motion',
  };

  const iconMap = {
    critical: <AlertTriangle className="w-3.5 h-3.5 text-danger" />,
    warning: <AlertTriangle className="w-3.5 h-3.5 text-warning" />,
    info: <Clock className="w-3.5 h-3.5 text-motion" />,
  };

  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${severityStyles[alert.severity]}`}>
      <div className="flex-shrink-0 mt-0.5">{iconMap[alert.severity]}</div>
      <p className="line-clamp-2">{alert.title}</p>
    </div>
  );
}

export default function OperationalAlertStack({
  selectedEvent = {},
  sessions = [],
  results = [],
  entries = [],
}) {
  const alerts = React.useMemo(() => {
    return buildOperationalAlerts(selectedEvent, sessions, entries, results);
  }, [selectedEvent, sessions, entries, results]);

  if (alerts.length === 0) {
    return (
      <div className="bg-surface-elevated border border-divider rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-widest font-bold text-foreground-quiet mb-2">Alerts</p>
        <div className="flex items-center gap-2 text-xs text-foreground-quiet">
          <CheckCircle2 className="w-3 h-3 text-success" />
          All clear
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-widest font-bold text-foreground-quiet">{alerts.length} Alert{alerts.length !== 1 ? 's' : ''}</p>
      <div className="space-y-1.5">
        {alerts.slice(0, 4).map(alert => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
        {alerts.length > 4 && (
          <p className="text-[10px] text-foreground-quiet px-2 py-1">
            +{alerts.length - 4} more alert{alerts.length - 4 !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}