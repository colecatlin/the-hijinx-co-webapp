/**
 * REVISION 7D — Session Timeline (Polished)
 * Enhanced visual progression of sessions.
 * Think: broadcast timeline / timing tower / race progression map.
 * Read-only; no mutations.
 */
import React, { useMemo } from 'react';
import { CheckCircle2, Circle, Zap, Lock } from 'lucide-react';
import { calculateSessionReadiness, getActiveSession } from '../ops/sessionReadinessCalculator';

function TimelineSession({ session, results, entries, isActive, isNext, index }) {
  const readiness = useMemo(() => calculateSessionReadiness(session, entries, results), [session, entries, results]);

  const getStatusIcon = () => {
    if (session.locked || session.status === 'Locked') return <Lock className="w-4 h-4" />;
    if (session.status === 'Completed') return <CheckCircle2 className="w-4 h-4" />;
    if (isActive) return <Zap className="w-4 h-4 animate-pulse" />;
    return <Circle className="w-4 h-4" />;
  };

  const getStatusColor = () => {
    if (session.locked || session.status === 'Locked') return 'text-green-400 bg-green-900/20';
    if (session.status === 'Completed') return 'text-green-400 bg-green-900/20';
    if (isActive) return 'text-red-400 bg-red-900/20 animate-pulse';
    if (isNext) return 'text-teal-400 bg-teal-900/20';
    if (!readiness.ready) return 'text-amber-400 bg-amber-900/20';
    return 'text-gray-400 bg-gray-800/20';
  };

  const getLineColor = () => {
    if (isActive) return 'bg-red-500';
    if (session.locked || session.status === 'Locked') return 'bg-green-500';
    if (isNext) return 'bg-teal-500';
    return 'bg-gray-700';
  };

  return (
    <div className="flex gap-4 items-start">
      {/* Timeline node */}
      <div className="flex flex-col items-center gap-1">
        <div className={`rounded-full p-2 border border-current ${getStatusColor()}`}>
          {getStatusIcon()}
        </div>
        {index < 10 && ( // Don't show line after last item (arbitrary)
          <div className={`w-0.5 h-12 ${getLineColor()}`} />
        )}
      </div>

      {/* Session content */}
      <div className="flex-1 pt-1">
        <div className="flex items-baseline gap-2">
          <p className="font-semibold text-sm text-gray-100">{session.name}</p>
          {isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 uppercase tracking-wider font-bold">Live</span>}
          {isNext && <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-900/40 text-teal-300 uppercase tracking-wider font-bold">Next</span>}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {session.session_type}
          {session.scheduled_time && (
            <>
              {' • '}
              {new Date(session.scheduled_time).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </>
          )}
        </div>
        {!readiness.ready && (
          <p className="text-xs text-amber-400 mt-1">{readiness.state}</p>
        )}
        {readiness.ready && (
          <p className="text-xs text-green-400 mt-1">Ready</p>
        )}
      </div>
    </div>
  );
}

export default function SessionTimelinePolished({ sessions = [], results = [], entries = [] }) {
  const activeSession = useMemo(() => getActiveSession(sessions), [sessions]);
  const nextSession = useMemo(() => {
    const now = new Date().getTime();
    return sessions
      .filter(s => s.scheduled_time && new Date(s.scheduled_time).getTime() > now && s.status !== 'Locked' && s.status !== 'Completed')
      .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())[0] || null;
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-4 text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">No sessions scheduled</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-4 space-y-6">
      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Weekend Progression</p>
      <div className="space-y-3">
        {sessions.map((session, i) => (
          <TimelineSession
            key={session.id}
            session={session}
            results={results}
            entries={entries}
            isActive={session === activeSession}
            isNext={session === nextSession}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}