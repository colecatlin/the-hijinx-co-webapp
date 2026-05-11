/**
 * REVISION 5E — Weekend Progression Timeline
 * Renders a day-grouped, type-grouped session timeline showing
 * the full event weekend structure with operational state indicators.
 *
 * Read-only: no mutations, no lifecycle changes.
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { groupSessionsByDay, groupBySessionType } from './sessionOrdering';
import {
  deriveSessionOperationalState,
  deriveEventOperationalStatus,
  SESSION_STATE_CONFIG,
  EVENT_STATUS_CONFIG,
} from './sessionStateIntelligence';
import SessionCard from './SessionCard';
import ClassProgressionView from './ClassProgressionView';

// Part 4 — View mode toggle labels
const VIEW_MODES = [
  { value: 'day', label: 'By Day' },
  { value: 'class', label: 'By Class' },
];

export default function WeekendProgressionTimeline({
  sessions,
  results,
  seriesClasses,
  eventClasses,
  selectedEvent,
  selectedSessionId,
  onSelectSession,
}) {
  const [collapsedDays, setCollapsedDays] = useState({});
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'class'

  const allCollapsed = Object.keys(collapsedDays).length > 0 &&
    Object.values(collapsedDays).every(Boolean);

  const toggleAllDays = () => {
    const dayGroups = groupSessionsByDay(sessions, selectedEvent?.event_date);
    if (allCollapsed) {
      setCollapsedDays({});
    } else {
      const collapsed = {};
      dayGroups.forEach(({ dayLabel }) => { collapsed[dayLabel] = true; });
      setCollapsedDays(collapsed);
    }
  };

  const eventStartDate = selectedEvent?.event_date;
  const dayGroups = groupSessionsByDay(sessions, eventStartDate);

  // Derived event operational status
  const derivedEventStatus = deriveEventOperationalStatus(sessions, results);
  const eventStatusConfig = EVENT_STATUS_CONFIG[derivedEventStatus];

  const toggleDay = (dayLabel) => {
    setCollapsedDays(prev => ({ ...prev, [dayLabel]: !prev[dayLabel] }));
  };

  const getSessionResults = (sessionId) => results.filter(r => r.session_id === sessionId);

  if (sessions.length === 0) {
    return (
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-6 text-center">
        <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">No sessions yet. Add sessions to build the weekend structure.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Event-level derived status + view mode toggle + Collapse All */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs text-gray-500 uppercase tracking-wide">Weekend Status</span>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${eventStatusConfig.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${eventStatusConfig.dot}`} />
          {eventStatusConfig.label}
        </span>

        {/* Part 4 — View mode toggle */}
        <div className="flex items-center gap-0.5 ml-2 rounded-lg border border-gray-800 overflow-hidden">
          {VIEW_MODES.map(mode => (
            <button
              key={mode.value}
              onClick={() => setViewMode(mode.value)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === mode.value
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {viewMode === 'day' && (
          <button
            onClick={toggleAllDays}
            className="ml-auto text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-0.5 rounded border border-gray-800 hover:border-gray-600"
          >
            {allCollapsed ? 'Expand All' : 'Collapse All'}
          </button>
        )}
      </div>

      {/* Class arc view — Part 4 */}
      {viewMode === 'class' && (
        <ClassProgressionView
          sessions={sessions}
          results={results}
          eventClasses={eventClasses}
          seriesClasses={seriesClasses}
          selectedEvent={selectedEvent}
          selectedSessionId={selectedSessionId}
          onSelectSession={onSelectSession}
        />
      )}

      {viewMode === 'day' && dayGroups.map(({ dayLabel, sessions: daySessions }) => {
        const isCollapsed = !!collapsedDays[dayLabel];
        const typeGroups = groupBySessionType(daySessions);

        // Day-level summary
        const dayResults = daySessions.map(s => getSessionResults(s.id));
        const dayStates = daySessions.map((s, i) => deriveSessionOperationalState(s, dayResults[i]));
        const allDayDone = dayStates.every(st => st === 'official' || st === 'locked');
        const anyDayActive = dayStates.some(st => st !== 'pending' && st !== 'missing_results');

        return (
          <div key={dayLabel} className="rounded-lg border border-gray-800 overflow-hidden">
            {/* Day header */}
            <button
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                allDayDone
                  ? 'bg-green-950/30'
                  : anyDayActive
                  ? 'bg-[#1e1e22]'
                  : 'bg-[#171717]'
              } hover:bg-[#1e1e22]`}
              onClick={() => toggleDay(dayLabel)}
            >
              {/* Day indicator */}
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                allDayDone ? 'bg-green-400' : anyDayActive ? 'bg-blue-400 animate-pulse' : 'bg-gray-600'
              }`} />

              <span className="font-bold text-sm text-white flex-1">{dayLabel}</span>

              {/* Day summary badges */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">{daySessions.length} sessions</span>
                {allDayDone && <span className="text-xs text-green-400 font-semibold">Complete ✓</span>}
              </div>

              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
            </button>

            {/* Day content */}
            {!isCollapsed && (
              <div className="bg-[#111111] px-4 py-3 space-y-4">
                {typeGroups.map(({ sessionType, sessions: typeSessions }) => (
                  <div key={sessionType}>
                    {/* Session type label */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {sessionType}
                      </span>
                      <div className="flex-1 h-px bg-gray-800" />
                      <span className="text-xs text-gray-600">{typeSessions.length}</span>
                    </div>

                    {/* Session cards */}
                    <div className="space-y-2">
                      {typeSessions.map(session => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          sessionResults={getSessionResults(session.id)}
                          allSessions={sessions}
                          seriesClasses={seriesClasses}
                          eventClasses={eventClasses}
                          onSelectSession={onSelectSession}
                          isSelected={selectedSessionId === session.id}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}