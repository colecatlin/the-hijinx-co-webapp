/**
 * REVISION 7D — Session Timeline (Polished)
 * Enhanced visual progression of sessions.
 * Think: broadcast timeline / timing tower / race progression map.
 * Read-only; no mutations.
 */
import React, { useMemo } from 'react';
import { CheckCircle2, Circle, Zap, Lock, CalendarDays } from 'lucide-react';
import { calculateSessionReadiness } from '../ops/sessionReadinessCalculator';
import { groupSessionsByEventDay, sortSessionsChronologically } from '../ops/sessionOrdering';

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

export default function SessionTimelinePolished({ sessions = [], results = [], entries = [], eventDays = [] }) {
  const activeSession = useMemo(() => sessions.find(s => s.status === 'Live'), [sessions]);
  const nextSession = useMemo(() => sessions.find(s => s.status !== 'Locked' && s.status !== 'Completed' && s !== activeSession), [sessions, activeSession]);

  // R8AH: group by EventDay when available, otherwise render flat
  const useEventDayGrouping = eventDays.length > 0;
  const dayGroups = useMemo(
    () => useEventDayGrouping ? groupSessionsByEventDay(sessions, eventDays) : null,
    [sessions, eventDays, useEventDayGrouping]
  );

  if (sessions.length === 0) {
    return (
      <div className="bg-gray-900/40 border border-gray-800/50 rounded-lg p-4 text-center">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">No sessions scheduled</p>
      </div>
    );
  }

  // EventDay-grouped rendering
  if (dayGroups) {
    return (
      <div className="space-y-4">
        {dayGroups.map(({ eventDay, dayLabel, sessions: daySessions }) => {
          // Build display label for the day header
          let headerLabel = dayLabel;
          if (eventDay?.date) {
            try {
              const d = new Date(eventDay.date + 'T12:00:00');
              const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              headerLabel = `${eventDay.label} · ${weekday}, ${dateStr}`;
            } catch { headerLabel = eventDay?.label || dayLabel; }
          }

          // EventDay status badge style
          const STATUS_STYLES = {
            Active:    'text-blue-400 border-blue-800',
            Completed: 'text-green-400 border-green-800',
            Cancelled: 'text-red-400 border-red-800',
          };
          const statusStyle = eventDay?.status ? STATUS_STYLES[eventDay.status] : null;

          return (
            <div key={dayLabel} className="bg-gray-900/40 border border-gray-800/50 rounded-lg overflow-hidden">
              {/* Day header */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800/60" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <CalendarDays className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                <p className="text-[11px] uppercase tracking-widest font-bold text-gray-400 flex-1">{headerLabel}</p>
                {statusStyle && (
                  <span className={`text-[10px] font-mono px-1.5 py-px rounded border ${statusStyle}`}>
                    {eventDay.status}
                  </span>
                )}
                <span className="text-[10px] font-mono text-gray-600">{daySessions.length} sessions</span>
              </div>
              {/* Sessions */}
              <div className="p-4 space-y-3">
                {daySessions.map((session, i) => (
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
        })}
      </div>
    );
  }

  // Flat rendering (no EventDay data)
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