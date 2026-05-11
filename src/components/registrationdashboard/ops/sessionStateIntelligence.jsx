/**
 * REVISION 5E — Session State Intelligence
 *
 * Derives operational state labels and visual indicators from session + result data.
 * Pure functions — no side effects, no API calls.
 * Does NOT touch standings math, publish lifecycle, or result mutations.
 */

import { isScoringSession, hasQualifyingBeforeFinal } from './sessionOrdering';

/**
 * Derive a single operational state for a session.
 *
 * Returns one of:
 *   'locked'           — session.status === 'Locked'
 *   'official'         — session.status === 'Official'
 *   'provisional'      — session.status === 'Provisional'
 *   'draft_results'    — has results, status = Draft
 *   'missing_results'  — no results entered at all
 *   'pending'          — default / no data yet
 */
export function deriveSessionOperationalState(session, sessionResults) {
  const count = sessionResults?.length ?? 0;

  if (session.status === 'Locked') return 'locked';
  if (session.status === 'Official') return 'official';
  if (session.status === 'Provisional') return 'provisional';
  if (count > 0) return 'draft_results';
  return 'missing_results';
}

/**
 * Config map: state → label, color classes, indicator dot color.
 */
export const SESSION_STATE_CONFIG = {
  locked: {
    label: 'Locked',
    badge: 'bg-purple-900/40 text-purple-300 border border-purple-800',
    dot: 'bg-purple-400',
    icon: '🔒',
  },
  official: {
    label: 'Official',
    badge: 'bg-green-900/40 text-green-300 border border-green-800',
    dot: 'bg-green-400',
    icon: '✓',
  },
  provisional: {
    label: 'Provisional',
    badge: 'bg-blue-900/40 text-blue-300 border border-blue-800',
    dot: 'bg-blue-400',
    icon: '◎',
  },
  draft_results: {
    label: 'Draft Results',
    badge: 'bg-yellow-900/40 text-yellow-300 border border-yellow-800',
    dot: 'bg-yellow-400',
    icon: '△',
  },
  missing_results: {
    label: 'Missing Results',
    badge: 'bg-red-900/30 text-red-300 border border-red-800/50',
    dot: 'bg-red-400',
    icon: '!',
  },
  pending: {
    label: 'Pending',
    badge: 'bg-gray-800/40 text-gray-400 border border-gray-700',
    dot: 'bg-gray-600',
    icon: '○',
  },
};

/**
 * Derive dependency warnings for a session (visibility only, no enforcement).
 * Returns array of warning strings.
 */
export function deriveSessionDependencyWarnings(session, allSessions, sessionResults) {
  const warnings = [];

  // Final without qualifying
  if (!hasQualifyingBeforeFinal(session, allSessions)) {
    warnings.push('No qualifying session found for this class');
  }

  // Final with no results when event has started
  if (isScoringSession(session) && (sessionResults?.length ?? 0) === 0) {
    warnings.push('No results entered — standings will be incomplete');
  }

  return warnings;
}

/**
 * Derive a standings-visibility tag for a session.
 * Returns: 'scoring' | 'non_scoring' | 'pending_results' | 'counted' | 'skipped'
 *
 * Visibility only — does not change what the standings engine does.
 */
export function deriveStandingsTag(session, sessionResults) {
  if (!isScoringSession(session)) return 'non_scoring';
  const count = sessionResults?.length ?? 0;
  if (session.status === 'Official' || session.status === 'Locked') return 'counted';
  if (count > 0) return 'pending_results';
  return 'scoring';
}

export const STANDINGS_TAG_CONFIG = {
  counted: { label: 'Standings: Applied', color: 'text-green-400' },
  pending_results: { label: 'Standings: Pending', color: 'text-yellow-400' },
  scoring: { label: 'Scoring Session', color: 'text-blue-400' },
  non_scoring: { label: 'Non-Scoring', color: 'text-gray-500' },
  skipped: { label: 'Skipped', color: 'text-gray-600' },
};

/**
 * Derive a derived event-level status from all sessions + results.
 * Visibility-only — does not write to Event record.
 *
 * Returns one of:
 *   'upcoming'           — no sessions have results
 *   'in_progress'        — some sessions have results, not all official
 *   'results_pending'    — all sessions have draft results
 *   'partially_official' — some sessions are Official/Locked
 *   'official_complete'  — all scoring sessions are Official or Locked
 *   'locked_complete'    — all sessions are Locked
 */
export function deriveEventOperationalStatus(sessions, results) {
  if (!sessions || sessions.length === 0) return 'upcoming';

  const total = sessions.length;
  const sessionResultCounts = sessions.map(s => results.filter(r => r.session_id === s.id).length);
  const withResults = sessions.filter((s, i) => sessionResultCounts[i] > 0).length;
  const locked = sessions.filter(s => s.status === 'Locked').length;
  const official = sessions.filter(s => s.status === 'Official' || s.status === 'Locked').length;

  if (locked === total) return 'locked_complete';
  if (official === total) return 'official_complete';
  if (official > 0) return 'partially_official';
  if (withResults === total) return 'results_pending';
  if (withResults > 0) return 'in_progress';
  return 'upcoming';
}

export const EVENT_STATUS_CONFIG = {
  upcoming: { label: 'Upcoming', badge: 'bg-gray-800 text-gray-400 border-gray-700', dot: 'bg-gray-600' },
  in_progress: { label: 'In Progress', badge: 'bg-blue-900/40 text-blue-300 border-blue-800', dot: 'bg-blue-400 animate-pulse' },
  results_pending: { label: 'Results Pending', badge: 'bg-yellow-900/40 text-yellow-300 border-yellow-800', dot: 'bg-yellow-400' },
  partially_official: { label: 'Partially Official', badge: 'bg-teal-900/40 text-teal-300 border-teal-800', dot: 'bg-teal-400' },
  official_complete: { label: 'Official Complete', badge: 'bg-green-900/40 text-green-300 border-green-800', dot: 'bg-green-400' },
  locked_complete: { label: 'Locked Complete', badge: 'bg-purple-900/40 text-purple-300 border-purple-800', dot: 'bg-purple-400' },
};