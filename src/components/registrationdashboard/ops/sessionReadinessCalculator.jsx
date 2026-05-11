/**
 * Session Readiness State Calculator
 * Derives operational readiness for sessions from existing data.
 * Read-only; no mutations.
 */

export function calculateSessionReadiness(session, entries = [], results = []) {
  if (!session) return { state: 'Unknown', ready: false };

  // Locked state takes priority
  if (session.locked || session.status === 'Locked') {
    return { state: 'Locked', ready: true };
  }

  // Completed state
  if (session.status === 'Completed') {
    return { state: 'Complete', ready: true };
  }

  // Filter entries + results for this session
  const sessionEntries = entries.filter(e => e.event_class_id); // Entries are for the event
  const sessionResults = results.filter(r => r.session_id === session.id);

  // No entries registered
  if (sessionEntries.length === 0) {
    return { state: 'Missing Entries', ready: false, severity: 'warning' };
  }

  // Results exist
  if (sessionResults.length > 0) {
    const draftResults = sessionResults.filter(r => r.status_state === 'Draft' || !r.status_state);
    const officialResults = sessionResults.filter(r => r.status_state === 'Official');
    const lockedResults = sessionResults.filter(r => r.status_state === 'Locked');

    if (lockedResults.length > 0) {
      return { state: 'Locked', ready: true };
    }
    if (draftResults.length > 0) {
      return { state: 'Draft Results', ready: false, severity: 'warning' };
    }
    if (officialResults.length > 0) {
      return { state: 'Awaiting Official', ready: true, severity: 'info' };
    }
  }

  // No results yet but session is scheduled/in progress
  if (session.status === 'Draft' || !session.status) {
    return { state: 'Missing Results', ready: false, severity: 'warning' };
  }

  return { state: 'Ready', ready: true };
}

/**
 * Calculate event operational readiness percentage
 */
export function calculateEventReadiness(event = {}, sessions = [], entries = [], results = [], standings = []) {
  let score = 0;
  let total = 0;

  // Sessions built (0-25%)
  total += 25;
  if (sessions.length > 0) score += 25;

  // Entries present (0-20%)
  total += 20;
  if (entries.length > 0) score += 20;

  // Compliance clear (0-15%)
  total += 15;
  const complianceIssues = entries.filter(e => !e.waiver_verified || e.tech_status === 'Failed').length;
  if (complianceIssues === 0) score += 15;
  else if (complianceIssues < entries.length * 0.1) score += 10; // > 90% compliant

  // Results status (0-20%)
  total += 20;
  const draftResults = results.filter(r => r.status_state === 'Draft' || !r.status_state).length;
  const lockedResults = results.filter(r => r.status_state === 'Locked').length;
  if (lockedResults > 0) score += 20;
  else if (draftResults === 0 && results.length > 0) score += 15;
  else if (results.length === 0 && sessions.length > 0) score += 5; // Penalize missing results

  // Standings current (0-10%)
  total += 10;
  if (standings.length > 0) score += 10;

  // Publishing readiness (0-10%)
  total += 10;
  if (event.published_flag) score += 10;
  else if (event.status === 'Published' || event.status === 'Live') score += 8;

  return Math.round((score / total) * 100);
}

/**
 * Build operational alert list
 */
export function buildOperationalAlerts(event = {}, sessions = [], entries = [], results = [], operationLogs = []) {
  const alerts = [];

  // Missing entries
  if (sessions.length > 0 && entries.length === 0) {
    alerts.push({
      id: 'missing-entries',
      priority: 'critical',
      type: 'missing_entries',
      title: 'No entries registered',
      severity: 'critical',
    });
  }

  // Compliance blockers
  const missingWaivers = entries.filter(e => !e.waiver_verified).length;
  const failedTech = entries.filter(e => e.tech_status === 'Failed').length;
  const missingTransponders = entries.filter(e => !e.transponder_id).length;

  if (missingWaivers > 0) {
    alerts.push({
      id: 'missing-waivers',
      priority: 'high',
      type: 'compliance',
      title: `${missingWaivers} ${missingWaivers === 1 ? 'entry' : 'entries'} missing waiver`,
      severity: 'warning',
    });
  }
  if (failedTech > 0) {
    alerts.push({
      id: 'failed-tech',
      priority: 'high',
      type: 'compliance',
      title: `${failedTech} ${failedTech === 1 ? 'entry' : 'entries'} failed tech`,
      severity: 'critical',
    });
  }
  if (missingTransponders > 0) {
    alerts.push({
      id: 'missing-transponders',
      priority: 'medium',
      type: 'compliance',
      title: `${missingTransponders} ${missingTransponders === 1 ? 'entry' : 'entries'} missing transponder`,
      severity: 'warning',
    });
  }

  // Draft results
  const draftResults = results.filter(r => r.status_state === 'Draft' || !r.status_state).length;
  if (draftResults > 0) {
    alerts.push({
      id: 'draft-results',
      priority: 'high',
      type: 'results',
      title: `${draftResults} ${draftResults === 1 ? 'session' : 'sessions'} with draft results`,
      severity: 'warning',
    });
  }

  // Missing results for completed sessions
  const sessionsNeedingResults = sessions.filter(s => 
    (s.status === 'Completed' || s.status === 'Official') &&
    !results.some(r => r.session_id === s.id)
  ).length;
  if (sessionsNeedingResults > 0) {
    alerts.push({
      id: 'missing-results',
      priority: 'high',
      type: 'results',
      title: `${sessionsNeedingResults} ${sessionsNeedingResults === 1 ? 'session' : 'sessions'} missing results`,
      severity: 'critical',
    });
  }

  // Unpublished event
  if (!event.published_flag && event.status !== 'Draft') {
    alerts.push({
      id: 'unpublished-event',
      priority: 'medium',
      type: 'publishing',
      title: 'Event not yet published',
      severity: 'info',
    });
  }

  return alerts.sort((a, b) => {
    const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityMap[a.priority] - priorityMap[b.priority];
  });
}

/**
 * Get next upcoming session
 */
export function getNextSession(sessions = [], eventDate = null) {
  const sorted = [...sessions].sort((a, b) => {
    const aTime = a.scheduled_time ? new Date(a.scheduled_time).getTime() : Infinity;
    const bTime = b.scheduled_time ? new Date(b.scheduled_time).getTime() : Infinity;
    return aTime - bTime;
  });

  return sorted.find(s => s.status !== 'Locked' && s.status !== 'Completed') || null;
}

/**
 * Calculate countdown to next session (milliseconds)
 */
export function getCountdownToNext(nextSession) {
  if (!nextSession?.scheduled_time) return null;
  const now = new Date().getTime();
  const sessionTime = new Date(nextSession.scheduled_time).getTime();
  const diff = sessionTime - now;
  return diff > 0 ? diff : null;
}

/**
 * Format countdown as human-readable
 */
export function formatCountdown(ms) {
  if (ms === null || ms === undefined) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}