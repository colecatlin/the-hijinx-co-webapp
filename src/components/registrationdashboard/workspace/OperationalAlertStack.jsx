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
    critical: 'bg-red-900/20 border-red-800/50 text-red-300',
    warning: 'bg-amber-900/20 border-amber-800/50 text-amber-300',
    info: 'bg-teal-900/20 border-teal-800/50 text-teal-300',
  };

  const iconMap = {
    critical: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
    warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
    info: <Clock className="w-3.5 h-3.5 text-teal-400" />,
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
      <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">Alerts</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <CheckCircle2 className="w-3 h-3 text-green-600" />
          All clear
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">{alerts.length} Alert{alerts.length !== 1 ? 's' : ''}</p>
      <div className="space-y-1.5">
        {alerts.slice(0, 4).map(alert => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
        {alerts.length > 4 && (
          <p className="text-[10px] text-gray-600 px-2 py-1">
            +{alerts.length - 4} more alert{alerts.length - 4 !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}