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
    if (session.locked || session.status === 'Locked') return 'text-success bg-success/10';
    if (session.status === 'Completed') return 'text-success bg-success/10';
    if (isActive) return 'text-danger bg-danger/10 animate-pulse';
    if (isNext) return 'text-motion bg-motion/10';
    if (!readiness.ready) return 'text-warning bg-warning/10';
    return 'text-foreground-quiet bg-surface-interactive/60';
  };

  const getLineColor = () => {
    if (isActive) return 'bg-danger';
    if (session.locked || session.status === 'Locked') return 'bg-success';
    if (isNext) return 'bg-motion';
    return 'bg-divider';
  };

  return (
    <div className="flex gap-4 items-start">
      {/* Timeline node */}
      <div className="flex flex-col items-center gap-1">
        <div className={`rounded-full p-2 border border-current ${getStatusColor()}`}>
          {getStatusIcon()}
        </div>
        {index < 10 && (
          <div className={`w-0.5 h-12 ${getLineColor()}`} />
        )}
      </div>

      {/* Session content */}
      <div className="flex-1 pt-1">
        <div className="flex items-baseline gap-2">
          <p className="font-semibold text-sm text-foreground">{session.name}</p>
          {isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger/10 text-danger uppercase tracking-wider font-bold">Live</span>}
          {isNext && <span className="text-[10px] px-1.5 py-0.5 rounded bg-motion/10 text-motion uppercase tracking-wider font-bold">Next</span>}
        </div>
        <div className="text-xs text-foreground-quiet mt-0.5">
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
          <p className="text-xs text-warning mt-1">{readiness.state}</p>
        )}
        {readiness.ready && (
          <p className="text-xs text-success mt-1">Ready</p>
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
      <div className="bg-surface-elevated border border-divider rounded-lg p-4 text-center">
        <p className="text-xs text-foreground-quiet uppercase tracking-wider font-bold">No sessions scheduled</p>
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
            Active:    'text-motion border-motion/40',
            Completed: 'text-success border-success/40',
            Cancelled: 'text-danger border-danger/40',
          };
          const statusStyle = eventDay?.status ? STATUS_STYLES[eventDay.status] : null;

          return (
            <div key={dayLabel} className="bg-surface-elevated border border-divider rounded-lg overflow-hidden">
              {/* Day header */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-divider" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
                <CalendarDays className="w-3.5 h-3.5 text-motion flex-shrink-0" />
                <p className="text-[11px] uppercase tracking-widest font-bold text-foreground-secondary flex-1">{headerLabel}</p>
                {statusStyle && (
                  <span className={`text-[10px] font-mono px-1.5 py-px rounded border ${statusStyle}`}>
                    {eventDay.status}
                  </span>
                )}
                <span className="text-[10px] font-mono text-foreground-quiet">{daySessions.length} sessions</span>
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
    <div className="bg-surface-elevated border border-divider rounded-lg p-4 space-y-6">
      <p className="text-[10px] uppercase tracking-widest font-bold text-foreground-quiet">Weekend Progression</p>
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