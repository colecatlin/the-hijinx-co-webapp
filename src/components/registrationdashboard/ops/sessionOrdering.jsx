/**
 * REVISION 5E — Session Ordering & Weekend Structure Logic
 *
 * Pure utility functions — no side effects, no API calls.
 * Does NOT touch standings math, publish lifecycle, or results logic.
 */

/**
 * Sort sessions chronologically:
 * Priority: scheduled_time date → scheduled_time time → run_order → session_number → created_date
 */
export function sortSessionsChronologically(sessions) {
  return [...sessions].sort((a, b) => {
    // 1. scheduled_time date
    const dateA = a.scheduled_time ? new Date(a.scheduled_time) : null;
    const dateB = b.scheduled_time ? new Date(b.scheduled_time) : null;
    if (dateA && dateB) {
      const diff = dateA - dateB;
      if (diff !== 0) return diff;
    } else if (dateA && !dateB) return -1;
    else if (!dateA && dateB) return 1;

    // 2. run_order
    const orderA = a.run_order ?? 9999;
    const orderB = b.run_order ?? 9999;
    if (orderA !== orderB) return orderA - orderB;

    // 3. session_number
    const numA = a.session_number ?? 0;
    const numB = b.session_number ?? 0;
    if (numA !== numB) return numA - numB;

    // 4. created_date fallback
    const createdA = a.created_date ? new Date(a.created_date) : new Date(0);
    const createdB = b.created_date ? new Date(b.created_date) : new Date(0);
    return createdA - createdB;
  });
}

/**
 * Extract a "day label" from a session.
 * Uses scheduled_time date if available, else returns 'Unscheduled'.
 */
export function getSessionDayLabel(session, eventStartDate) {
  if (session.scheduled_time) {
    const d = new Date(session.scheduled_time);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }
  // Try to use run_order to infer relative day if event has a start date
  if (eventStartDate && session.run_order != null) {
    const dayOffset = Math.floor(session.run_order / 100); // convention: 100s = day 1, 200s = day 2
    if (dayOffset > 0) {
      const base = new Date(eventStartDate);
      base.setDate(base.getDate() + dayOffset - 1);
      return base.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
  }
  return 'Unscheduled';
}

/**
 * Group sorted sessions by day label.
 * Returns: Array<{ dayLabel: string, sessions: Session[] }>
 */
export function groupSessionsByDay(sessions, eventStartDate) {
  const sorted = sortSessionsChronologically(sessions);
  const groups = [];
  const seen = {};

  for (const session of sorted) {
    const label = getSessionDayLabel(session, eventStartDate);
    if (!seen[label]) {
      seen[label] = true;
      groups.push({ dayLabel: label, sessions: [] });
    }
    groups[groups.length - 1].sessions.push(session);
  }

  return groups;
}

/**
 * Sub-group sessions within a day by session_type.
 * Returns: Array<{ sessionType: string, sessions: Session[] }>
 */
export function groupBySessionType(sessions) {
  const TYPE_ORDER = ['Practice', 'Qualifying', 'Heat', 'LCQ', 'Feature', 'Final', 'Time Attack', 'Other'];
  const groups = {};

  for (const session of sessions) {
    const type = session.session_type || 'Other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(session);
  }

  return TYPE_ORDER
    .filter(t => groups[t])
    .map(t => ({ sessionType: t, sessions: groups[t] }))
    .concat(
      Object.keys(groups)
        .filter(t => !TYPE_ORDER.includes(t))
        .map(t => ({ sessionType: t, sessions: groups[t] }))
    );
}

/**
 * Get a human-readable label for a session, including round/heat context.
 * E.g. "Pro 4 Final — Round 2", "Pro 2 Heat 3"
 */
export function getSessionDisplayLabel(session, seriesClasses, eventClasses) {
  const className =
    (eventClasses?.find(ec => ec.id === session.event_class_id)?.class_name) ||
    (seriesClasses?.find(sc => sc.id === session.series_class_id)?.class_name) ||
    session.class_name ||
    null;

  const parts = [];
  if (className) parts.push(className);

  let sessionLabel = session.session_type || 'Session';
  if (session.round_number) sessionLabel += ` — Round ${session.round_number}`;
  else if (session.heat_number) sessionLabel += ` ${session.heat_number}`;
  else if (session.session_number) sessionLabel += ` ${session.session_number}`;
  parts.push(sessionLabel);

  return parts.join(' · ');
}

/**
 * Determine if a session is a scoring Final (counts toward standings).
 * This is visibility-only — does not change standings math.
 */
export function isScoringSession(session) {
  const scoringTypes = ['Final', 'Feature'];
  return scoringTypes.includes(session.session_type);
}

/**
 * Check if a qualifying session exists for a class before a final.
 * Returns true if there's a Qualifying session for the same class.
 * Visibility-only — no enforcement.
 */
export function hasQualifyingBeforeFinal(session, allSessions) {
  if (session.session_type !== 'Final' && session.session_type !== 'Feature') return true;
  const classId = session.series_class_id || session.event_class_id;
  if (!classId) return true; // can't determine, no warning

  return allSessions.some(s =>
    s.session_type === 'Qualifying' &&
    (s.series_class_id === classId || s.event_class_id === classId)
  );
}