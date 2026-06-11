/**
 * R9CT — SessionReadinessIndicator
 * Small reusable component showing per-session readiness checks.
 * Used in EventGridPanel and EventSchedulePanel.
 */
import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useSessionReadiness } from '../../../hooks/useSessionReadiness';

const STATUS_CONFIG = {
  ready:   { label: 'Ready',   color: 'text-green-300',  dot: 'bg-green-400' },
  warning: { label: 'Warning', color: 'text-amber-300',  dot: 'bg-amber-400' },
  blocked: { label: 'Blocked', color: 'text-red-300',    dot: 'bg-red-400' },
  unknown: { label: 'Unknown', color: 'text-gray-500',   dot: 'bg-gray-600' },
};

export default function SessionReadinessIndicator({
  session,
  entries = [],
  officials = [],
  gridLineups = [],
  results = [],
  compact = false,
}) {
  const { status, checks, blockers, warnings } = useSessionReadiness({
    session,
    entries,
    officials,
    gridLineups,
    results,
  });

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title={`Session readiness: ${cfg.label}`}>
        <span className={`w-2 h-2 rounded-full ${cfg.dot} ${status === 'blocked' ? 'animate-pulse' : ''}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
        {blockers.length > 0 && <span className="text-[10px] text-red-400">({blockers.length} blocker{blockers.length > 1 ? 's' : ''})</span>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${cfg.dot} ${status === 'blocked' ? 'animate-pulse' : ''}`} />
        <span className={`text-[11px] font-bold uppercase tracking-wider ${cfg.color}`}>
          Session {cfg.label}
        </span>
        {blockers.length > 0 && (
          <span className="text-[10px] text-red-400">{blockers.length} blocker{blockers.length > 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="space-y-0.5">
        {checks.map(check => (
          <div key={check.id} className="flex items-start gap-2">
            {check.passed ? (
              <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
            ) : check.severity === 'blocker' ? (
              <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <span className={`text-[10px] ${check.passed ? 'text-gray-500' : check.severity === 'blocker' ? 'text-red-300 font-semibold' : 'text-amber-300'}`}>
                {check.label}
              </span>
              {check.detail && !check.passed && (
                <span className="text-[10px] text-gray-600 ml-1">— {check.detail}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}