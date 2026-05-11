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
    <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-4 space-y-4">
      {/* Title + Readiness gauge */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Race Weekend Operations</h2>
          <p className="text-xs text-gray-500 mt-0.5">Weekend Readiness {readiness}%</p>
        </div>
        <div className="text-right">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke={readiness >= 80 ? '#16a34a' : readiness >= 60 ? '#ea580c' : '#dc2626'}
                strokeWidth="6"
                strokeDasharray={`${(readiness / 100) * 282.7} 282.7`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{readiness}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Blockers section */}
      {hasCriticalBlockers && (
        <div className="space-y-1.5 p-3 rounded-lg bg-red-900/10 border border-red-800/30">
          <p className="text-xs font-bold text-red-300 uppercase tracking-wider">⚠️ Critical Blockers</p>
          {alerts
            .filter(a => a.severity === 'critical')
            .slice(0, 2)
            .map(alert => (
              <p key={alert.id} className="text-xs text-red-200 line-clamp-1">
                {alert.title}
              </p>
            ))}
          {alerts.filter(a => a.severity === 'critical').length > 2 && (
            <p className="text-xs text-red-300">+{alerts.filter(a => a.severity === 'critical').length - 2} more</p>
          )}
        </div>
      )}

      {/* Next action */}
      {nextSession && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-teal-900/10 border border-teal-800/30">
          <Target className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-teal-300 uppercase tracking-wider">Next Session</p>
            <p className="text-sm text-teal-200">{nextSession.name}</p>
            {nextSession.scheduled_time && (
              <p className="text-xs text-teal-300 mt-1">
                {new Date(nextSession.scheduled_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Status grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-gray-800/30 border border-gray-700/30">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Sessions</p>
          <p className="text-lg font-bold text-white mt-1">{sessions.length}</p>
        </div>
        <div className="p-2 rounded-lg bg-gray-800/30 border border-gray-700/30">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Entries</p>
          <p className="text-lg font-bold text-white mt-1">{entries.length}</p>
        </div>
        <div className="p-2 rounded-lg bg-gray-800/30 border border-gray-700/30">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Results</p>
          <p className="text-lg font-bold text-white mt-1">{results.length}</p>
        </div>
      </div>

      {/* Publishing status */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/20 border border-gray-700/30">
        {selectedEvent.published_flag ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-300">Published and visible to public</span>
          </>
        ) : (
          <>
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-300">Draft — not visible to public</span>
          </>
        )}
      </div>
    </div>
  );
}