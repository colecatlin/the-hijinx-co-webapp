/**
 * REVISION 7D — Live Operations Status Bar
 * Persistent compact operational status strip below command header.
 * Shows session readiness, compliance state, standings status.
 * Read-only; no mutations.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Zap } from 'lucide-react';
import { calculateSessionReadiness, getActiveSession, getNextSession, getCountdownToNext, formatCountdown } from '../ops/sessionReadinessCalculator';

function StatusPill({ icon: IconComponent, label, value, variant = 'default', pulse = false }) {
  const styles = {
    default: 'bg-gray-800/40 border-gray-700/60 text-gray-400',
    success: 'bg-green-900/30 border-green-800/50 text-green-300',
    warning: 'bg-amber-900/30 border-amber-800/50 text-amber-300',
    critical: 'bg-red-900/30 border-red-800/50 text-red-300',
    active: 'bg-teal-900/30 border-teal-800/50 text-teal-300',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap ${styles[variant]} ${pulse ? 'animate-pulse' : ''}`}>
      {IconComponent && <IconComponent className="w-3.5 h-3.5 flex-shrink-0" />}
      <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function LiveStatusBar({ sessions = [], results = [], entries = [], standings = [] }) {
  const activeSession = useMemo(() => getActiveSession(sessions), [sessions]);
  const nextSession = useMemo(() => getNextSession(sessions), [sessions]);
  const [countdown, setCountdown] = React.useState(null);

  // Update countdown timer
  React.useEffect(() => {
    if (!nextSession) return;
    const updateCountdown = () => {
      const ms = getCountdownToNext(nextSession);
      setCountdown(formatCountdown(ms));
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextSession]);

  const stats = useMemo(() => {
    const lockedSessions = sessions.filter(s => s.locked || s.status === 'Locked').length;
    const sessionsNeedingResults = sessions.filter(s =>
      s.status === 'Completed' && !results.some(r => r.session_id === s.id)
    ).length;
    const draftResults = results.filter(r => r.status_state === 'Draft' || !r.status_state).length;
    const complianceIssues = entries.filter(e => !e.waiver_verified || e.tech_status === 'Failed').length;

    return {
      activeSession,
      lockedSessions,
      sessionsNeedingResults,
      draftResults,
      complianceIssues,
      standingsReady: standings.length > 0,
    };
  }, [sessions, results, entries, standings]);

  return (
    <div
      className="px-5 py-2.5 flex items-center gap-2 flex-wrap border-b border-gray-800/40 overflow-x-auto scrollbar-hide"
      style={{ background: 'rgba(10,12,14,0.6)', backdropFilter: 'blur(4px)' }}
    >
      {/* Active session indicator */}
      {stats.activeSession && (
        <StatusPill
          icon={Zap}
          label="Live"
          value={stats.activeSession.name}
          variant="critical"
          pulse={true}
        />
      )}

      {/* Next session + countdown */}
      {nextSession && !stats.activeSession && (
        <>
          <StatusPill
            icon={Clock}
            label="Next"
            value={nextSession.name}
            variant="active"
          />
          {countdown && (
            <StatusPill
              icon={Clock}
              label="In"
              value={countdown}
              variant="default"
            />
          )}
        </>
      )}

      {/* Sessions locked */}
      {stats.lockedSessions > 0 && (
        <StatusPill
          icon={CheckCircle2}
          label="Locked"
          value={stats.lockedSessions}
          variant="success"
        />
      )}

      {/* Sessions needing results */}
      {stats.sessionsNeedingResults > 0 && (
        <StatusPill
          icon={AlertTriangle}
          label="Results"
          value={`${stats.sessionsNeedingResults} pending`}
          variant="critical"
        />
      )}

      {/* Draft results */}
      {stats.draftResults > 0 && (
        <StatusPill
          icon={AlertTriangle}
          label="Draft"
          value={`${stats.draftResults} results`}
          variant="warning"
        />
      )}

      {/* Compliance alerts */}
      {stats.complianceIssues > 0 && (
        <StatusPill
          icon={AlertTriangle}
          label="Compliance"
          value={stats.complianceIssues}
          variant="critical"
        />
      )}

      {/* Standings ready */}
      {stats.standingsReady && (
        <StatusPill
          icon={CheckCircle2}
          label="Standings"
          value="Ready"
          variant="success"
        />
      )}
    </div>
  );
}