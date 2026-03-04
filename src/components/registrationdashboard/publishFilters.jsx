/**
 * Check if an event should be visible on public pages
 */
export function isEventPublic(event) {
  if (!event) return false;
  
  // Event is public when published_flag is true AND status is publicly acceptable
  const publishedFlag = event.published_flag === true;
  const publicStatuses = ['upcoming', 'in_progress', 'completed'];
  const isPublicStatus = publicStatuses.includes(event.status);
  
  return publishedFlag && isPublicStatus;
}

/**
 * Check if a session should be visible on public pages
 */
export function isSessionPublic(session) {
  if (!session) return false;
  
  // Session is public when status is Official or Locked
  return ['Official', 'Locked'].includes(session.status);
}

/**
 * Check if results should be visible on public pages
 */
export function isResultPublic(result, session, event) {
  if (!result || !session) return false;
  
  // Results are public when:
  // 1. Session is Official or Locked, OR
  // 2. Session has no ID and event is public
  if (isSessionPublic(session)) {
    return true;
  }
  
  if (!session.id && event && isEventPublic(event)) {
    return true;
  }
  
  return false;
}

/**
 * Filter events for public visibility
 */
export function filterPublicEvents(events) {
  return events.filter(isEventPublic);
}

/**
 * Filter sessions for public visibility
 */
export function filterPublicSessions(sessions) {
  return sessions.filter(isSessionPublic);
}

/**
 * Filter results for public visibility
 */
export function filterPublicResults(results, sessions, event) {
  return results.filter(result => {
    const session = sessions.find(s => s.id === result.session_id);
    return isResultPublic(result, session, event);
  });
}