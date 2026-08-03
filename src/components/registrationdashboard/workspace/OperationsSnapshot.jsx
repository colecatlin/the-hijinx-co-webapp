/**
 * REVISION 7D — Operations Snapshot
 * Enhanced Overview panel header showing race weekend operational readiness.
 * Prioritizes blockers, next actions, and live operational state.
 * Read-only; no mutations.
 */
import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Target } from 'lucide-react';
import { calculateEventReadiness, buildOperationalAlerts, getNextSession } from '../ops/sessionReadinessCalculator';

export default function OperationsSnapshot({
  selectedEvent = {},
  sessions = [],
  entries = [],
  results = [],
  standings = [],
}) {
  const readiness = useMemo(
    () => calculateEventReadiness(selectedEvent, sessions, entries, results, standings),
    [selectedEvent, sessions, entries, results, standings]
  );

  const alerts = useMemo(
    () => buildOperationalAlerts(selectedEvent, sessions, entries, results),
    [selectedEvent, sessions, entries, results]
  );

  const nextSession = useMemo(() => getNextSession(sessions), [sessions]);

  const hasCriticalBlockers = alerts.some(a => a.severity === 'critical');

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-4 space-y-4">
      {/* Title + Readiness gauge */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Race Weekend Operations</h2>
          <p className="text-xs text-foreground-quiet mt-0.5">Weekend Readiness {readiness}%</p>
        </div>
        <div className="text-right">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="45" fill="none" stroke="hsl(var(--divider))" strokeWidth="6" />
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke={readiness >= 80 ? 'hsl(var(--success))' : readiness >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--danger))'}
                strokeWidth="6"
                strokeDasharray={`${(readiness / 100) * 282.7} 282.7`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-foreground">{readiness}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Blockers section */}
      {hasCriticalBlockers && (
        <div className="space-y-1.5 p-3 rounded-lg bg-danger/10 border border-danger/30">
          <p className="text-xs font-bold text-danger uppercase tracking-wider">⚠️ Critical Blockers</p>
          {alerts
            .filter(a => a.severity === 'critical')
            .slice(0, 2)
            .map(alert => (
              <p key={alert.id} className="text-xs text-danger line-clamp-1">
                {alert.title}
              </p>
            ))}
          {alerts.filter(a => a.severity === 'critical').length > 2 && (
            <p className="text-xs text-danger">+{alerts.filter(a => a.severity === 'critical').length - 2} more</p>
          )}
        </div>
      )}

      {/* Next action */}
      {nextSession && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-motion/10 border border-motion/30">
          <Target className="w-4 h-4 text-motion flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-motion uppercase tracking-wider">Next Session</p>
            <p className="text-sm text-foreground">{nextSession.name}</p>
            {nextSession.scheduled_time && (
              <p className="text-xs text-motion mt-1">
                {new Date(nextSession.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Status grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-surface-interactive/60 border border-divider/60">
          <p className="text-[10px] uppercase tracking-widest text-foreground-quiet font-bold">Sessions</p>
          <p className="text-lg font-bold text-foreground mt-1">{sessions.length}</p>
        </div>
        <div className="p-2 rounded-lg bg-surface-interactive/60 border border-divider/60">
          <p className="text-[10px] uppercase tracking-widest text-foreground-quiet font-bold">Entries</p>
          <p className="text-lg font-bold text-foreground mt-1">{entries.length}</p>
        </div>
        <div className="p-2 rounded-lg bg-surface-interactive/60 border border-divider/60">
          <p className="text-[10px] uppercase tracking-widest text-foreground-quiet font-bold">Results</p>
          <p className="text-lg font-bold text-foreground mt-1">{results.length}</p>
        </div>
      </div>

      {/* Publishing status */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-interactive/40 border border-divider/60">
        {selectedEvent.published_flag ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-xs text-success">Published and visible to public</span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4 text-warning" />
            <span className="text-xs text-warning">Draft — not visible to public</span>
          </>
        )}
      </div>
    </div>
  );
}