/**
 * R9CQ — LiveStatusBar
 * Persistent compact status strip. Pills are clickable → navigate to target panel.
 * Also surfaces critical/warning alerts as clickable pills.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Zap } from 'lucide-react';
import { calculateSessionReadiness, getNextSession, getCountdownToNext, formatCountdown } from '../ops/sessionReadinessCalculator';

function StatusPill({ icon: IconComponent, label, value, variant = 'default', pulse = false, onClick }) {
  const styles = {
    default:  'bg-gray-800/40 border-gray-700/60 text-gray-400',
    success:  'bg-green-900/30 border-green-800/50 text-green-300',
    warning:  'bg-amber-900/30 border-amber-800/50 text-amber-300',
    critical: 'bg-red-900/30 border-red-800/50 text-red-300',
    active:   'bg-teal-900/30 border-teal-800/50 text-teal-300',
  };

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium whitespace-nowrap transition-colors ${styles[variant]} ${pulse ? 'animate-pulse' : ''} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={onClick}
    >
      {IconComponent && <IconComponent className="w-3.5 h-3.5 flex-shrink-0" />}
      {label && <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>}
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function LiveStatusBar({ sessions = [], results = [], entries = [], standings = [], alerts = [], onNavigate }) {
  const nextSession = useMemo(() => getNextSession(sessions), [sessions]);
  const [countdown, setCountdown] = React.useState(null);

  React.useEffect(() => {
    if (!nextSession) return;
    const update = () => {
      const ms = getCountdownToNext(nextSession);
      setCountdown(formatCountdown(ms));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextSession]);

  const stats = useMemo(() => {
    const activeSession = sessions.find(s => s.status === 'Live');
    const lockedSessions = sessions.filter(s => s.locked || s.status === 'Locked').length;
    // Sessions that are Completed but have no results yet
    const sessionsNeedingResults = sessions.filter(s =>
      s.status === 'Completed' && !results.some(r => r.session_id === s.id)
    ).length;
    const draftResults = results.filter(r => r.status_state === 'Draft' || !r.status_state).length;
    const complianceIssues = entries.filter(e => !e.waiver_verified || e.tech_status === 'Failed').length;
    return { activeSession, lockedSessions, sessionsNeedingResults, draftResults, complianceIssues };
  }, [sessions, results, entries, standings]);

  // Only show top 3 non-info alerts as pills here (full stack is in EventAlertStack)
  const alertPills = useMemo(() =>
    alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'WARNING').slice(0, 3),
    [alerts]
  );

  return (
    <div
      className="px-5 py-1.5 flex items-center gap-1.5 flex-wrap overflow-x-auto scrollbar-hide border-b"
      style={{ background: '#0B0D0D', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {/* Active session */}
      {stats.activeSession && (
        <StatusPill
          icon={Zap}
          label="Live"
          value={stats.activeSession.name}
          variant="critical"
          pulse={true}
          onClick={() => onNavigate?.('sessions')}
        />
      )}

      {/* Next session */}
      {nextSession && !stats.activeSession && (
        <>
          <StatusPill
            icon={Clock}
            label="Next"
            value={nextSession.name}
            variant="active"
            onClick={() => onNavigate?.('schedule')}
          />
          {countdown && (
            <StatusPill icon={Clock} label="In" value={countdown} variant="default" />
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
          onClick={() => onNavigate?.('sessions')}
        />
      )}

      {/* Sessions needing results */}
      {stats.sessionsNeedingResults > 0 && (
        <StatusPill
          icon={AlertTriangle}
          label="Results"
          value={`${stats.sessionsNeedingResults} pending`}
          variant="critical"
          onClick={() => onNavigate?.('results')}
        />
      )}

      {/* Draft results */}
      {stats.draftResults > 0 && (
        <StatusPill
          icon={AlertTriangle}
          label="Draft"
          value={`${stats.draftResults} results`}
          variant="warning"
          onClick={() => onNavigate?.('results')}
        />
      )}

      {/* Compliance */}
      {stats.complianceIssues > 0 && (
        <StatusPill
          icon={AlertTriangle}
          label="Compliance"
          value={stats.complianceIssues}
          variant="critical"
          onClick={() => onNavigate?.('compliance')}
        />
      )}

      {/* Alert pills from alert engine */}
      {alertPills.map(alert => (
        <StatusPill
          key={alert.id}
          icon={AlertTriangle}
          label={alert.severity === 'CRITICAL' ? '●' : '▲'}
          value={alert.message.split(' ').slice(0, 4).join(' ')}
          variant={alert.severity === 'CRITICAL' ? 'critical' : 'warning'}
          onClick={() => onNavigate?.(alert.target)}
        />
      ))}
    </div>
  );
}