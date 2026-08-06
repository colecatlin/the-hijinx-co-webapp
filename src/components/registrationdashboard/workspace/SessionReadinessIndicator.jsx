/**
 * R9CT — SessionReadinessIndicator
 * Small reusable component showing per-session readiness checks.
 * Used in EventGridPanel and EventSchedulePanel.
 */
import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useSessionReadiness } from '../../../hooks/useSessionReadiness';

const STATUS_CONFIG = {
  ready:   { label: 'Ready',   color: 'text-success',  dot: 'bg-success' },
  warning: { label: 'Warning', color: 'text-warning',  dot: 'bg-warning' },
  blocked: { label: 'Blocked', color: 'text-danger',    dot: 'bg-danger' },
  unknown: { label: 'Unknown', color: 'text-foreground-quiet',   dot: 'bg-surface-interactive' },
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
        {blockers.length > 0 && <span className="text-[10px] text-danger">({blockers.length} blocker{blockers.length > 1 ? 's' : ''})</span>}
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
          <span className="text-[10px] text-danger">{blockers.length} blocker{blockers.length > 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="space-y-0.5">
        {checks.map(check => (
          <div key={check.id} className="flex items-start gap-2">
            {check.passed ? (
              <CheckCircle2 className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
            ) : check.severity === 'blocker' ? (
              <XCircle className="w-3 h-3 text-danger mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
            )}
            <div>
              <span className={`text-[10px] ${check.passed ? 'text-foreground-quiet' : check.severity === 'blocker' ? 'text-danger font-semibold' : 'text-warning'}`}>
                {check.label}
              </span>
              {check.detail && !check.passed && (
                <span className="text-[10px] text-foreground-quiet ml-1">— {check.detail}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}