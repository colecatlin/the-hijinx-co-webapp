/**
 * REVISION 5F — ClassProgressionView
 * Secondary operational view showing each class's full session arc
 * across the event weekend: Practice → Qual → Heat → LCQ → Final.
 *
 * Read-only visualization layer. No mutations, no lifecycle changes.
 * Toggle between this and WeekendProgressionTimeline via view mode toggle.
 */
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { sortSessionsChronologically, isScoringSession, getSessionDisplayLabel } from './sessionOrdering';
import {
  deriveSessionOperationalState,
  SESSION_STATE_CONFIG,
  STANDINGS_TAG_CONFIG,
  deriveStandingsTag,
} from './sessionStateIntelligence';

// Scoring badge — Part 5 / 7
function ScoringBadge({ session }) {
  if (isScoringSession(session)) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-amber-400 font-medium">
        <Trophy className="w-2.5 h-2.5" /> Scores
      </span>
    );
  }
  return <span className="text-xs text-gray-600">Non-scoring</span>;
}

// Compact session row inside the class arc
function ArcSessionRow({ session, sessionResults, allSessions, seriesClasses, eventClasses, onSelectSession, isSelected }) {
  const state = deriveSessionOperationalState(session, sessionResults);
  const stateConfig = SESSION_STATE_CONFIG[state];
  const standingsTag = deriveStandingsTag(session, sessionResults);
  const standingsConfig = STANDINGS_TAG_CONFIG[standingsTag];

  const label = getSessionDisplayLabel(session, seriesClasses, eventClasses);

  const timeStr = session.scheduled_time
    ? new Date(session.scheduled_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : null;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-[#1e2a1e] border-green-700'
          : 'bg-[#1a1a1a] border-gray-800 hover:border-gray-600'
      }`}
      onClick={() => onSelectSession && onSelectSession(session.id)}
    >
      {/* State dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stateConfig.dot}`} />

      {/* Label */}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-white font-medium truncate block">{label}</span>
        <div className="flex items-center gap-2 mt-0.5">
          {timeStr && <span className="text-xs text-gray-500">{timeStr}</span>}
          {session.round_number && <span className="text-xs text-gray-400 font-mono">R{session.round_number}</span>}
          <ScoringBadge session={session} />
        </div>
      </div>

      {/* Status badge */}
      <Badge className={`${stateConfig.badge} text-xs flex-shrink-0`}>
        {stateConfig.icon} {stateConfig.label}
      </Badge>

      {/* Result count */}
      <span className="text-xs text-gray-600 flex-shrink-0">{sessionResults.length}r</span>
    </div>
  );
}

// Day sub-grouping within a class arc
function ClassDayBlock({ dayLabel, sessions, results, seriesClasses, eventClasses, onSelectSession, selectedSessionId }) {
  const getSessionResults = (sid) => results.filter(r => r.session_id === sid);
  return (
    <div className="space-y-1.5">
      {/* Day label */}
      <div className="flex items-center gap-2 mt-3 mb-1">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{dayLabel}</span>
        <div className="flex-1 h-px bg-gray-800" />
      </div>
      {sessions.map(session => (
        <ArcSessionRow
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
  );
}

// Derive a simplified day label for grouping within a class arc
function getDayLabel(session, eventStartDate) {
  if (!session.scheduled_time) return 'Unscheduled';
  const d = new Date(session.scheduled_time);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${weekday}, ${dateStr}`;
}

// Group sessions belonging to a class by day (chronological)
function groupClassSessionsByDay(sessions, eventStartDate) {
  const sorted = sortSessionsChronologically(sessions, eventStartDate);
  const buckets = {};
  const order = [];
  sorted.forEach(s => {
    const label = getDayLabel(s, eventStartDate);
    if (!buckets[label]) { buckets[label] = []; order.push(label); }
    buckets[label].push(s);
  });
  return order.map(label => ({ dayLabel: label, sessions: buckets[label] }));
}

export default function ClassProgressionView({
  sessions,
  results,
  eventClasses,
  seriesClasses,
  selectedEvent,
  selectedSessionId,
  onSelectSession,
}) {
  const [collapsedClasses, setCollapsedClasses] = useState({});

  const eventStartDate = selectedEvent?.event_date;

  // Group sessions by EventClass
  const classGroups = React.useMemo(() => {
    const map = {};
    const order = [];
    // Build class map from eventClasses
    eventClasses.forEach(ec => {
      map[ec.id] = { id: ec.id, name: ec.class_name, classOrder: ec.class_order || 0, sessions: [] };
      order.push(ec.id);
    });
    // Bucket sessions by event_class_id
    sessions.forEach(s => {
      if (s.event_class_id && map[s.event_class_id]) {
        map[s.event_class_id].sessions.push(s);
      } else {
        // Fallback bucket for sessions not tied to an EventClass
        if (!map['__unclassed']) {
          map['__unclassed'] = { id: '__unclassed', name: 'Unclassed Sessions', classOrder: 9999, sessions: [] };
          order.push('__unclassed');
        }
        map['__unclassed'].sessions.push(s);
      }
    });
    return order
      .filter(id => map[id].sessions.length > 0)
      .sort((a, b) => map[a].classOrder - map[b].classOrder)
      .map(id => map[id]);
  }, [sessions, eventClasses]);

  if (sessions.length === 0) {
    return (
      <div className="bg-[#171717] border border-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400 text-sm">No sessions yet. Sessions will appear grouped by class once added.</p>
      </div>
    );
  }

  const toggleClass = (id) => setCollapsedClasses(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-3">
      {classGroups.map(cg => {
        const isCollapsed = !!collapsedClasses[cg.id];
        const dayGroups = groupClassSessionsByDay(cg.sessions, eventStartDate);
        const totalResults = cg.sessions.reduce((sum, s) => sum + results.filter(r => r.session_id === s.id).length, 0);
        const officialCount = cg.sessions.filter(s => s.status === 'Official' || s.status === 'Locked').length;
        const scoringSessions = cg.sessions.filter(isScoringSession);

        return (
          <div key={cg.id} className="rounded-lg border border-gray-800 overflow-hidden">
            {/* Class header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left bg-[#171717] hover:bg-[#1e1e22] transition-colors"
              onClick={() => toggleClass(cg.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white">{cg.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-500">{cg.sessions.length} sessions</span>
                  <span className="text-xs text-gray-600">·</span>
                  <span className="text-xs text-gray-500">{totalResults} results</span>
                  {officialCount > 0 && (
                    <span className="text-xs text-green-400">{officialCount} official</span>
                  )}
                  {scoringSessions.length > 0 && (
                    <span className="text-xs text-amber-400 flex items-center gap-0.5">
                      <Trophy className="w-2.5 h-2.5" /> {scoringSessions.length} scoring
                    </span>
                  )}
                </div>
              </div>
              {isCollapsed
                ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                : <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />}
            </button>

            {/* Class content — sessions grouped by day */}
            {!isCollapsed && (
              <div className="bg-[#111111] px-4 py-3">
                {dayGroups.map(({ dayLabel, sessions: daySessions }) => (
                  <ClassDayBlock
                    key={dayLabel}
                    dayLabel={dayLabel}
                    sessions={daySessions}
                    results={results}
                    seriesClasses={seriesClasses}
                    eventClasses={eventClasses}
                    onSelectSession={onSelectSession}
                    selectedSessionId={selectedSessionId}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}