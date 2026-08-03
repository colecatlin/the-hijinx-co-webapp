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
 *
 * Part 7 — Standardized badge palette (light theme semantic tokens):
 *   GREEN   = official, healthy, standings applied
 *   YELLOW  = advisory (draft with results, duplicate warning)
 *   RED     = blocking (missing results, invalid rows)
 *   TEAL    = informational (provisional, non-scoring)
 *   MUTED   = locked / pending
 */
export const SESSION_STATE_CONFIG = {
  locked: {
    label: 'Locked',
    badge: 'bg-surface-interactive text-foreground-secondary border border-divider',
    dot: 'bg-foreground-quiet',
    icon: '🔒',
  },
  official: {
    label: 'Official',
    badge: 'bg-success/10 text-success border border-success/30',
    dot: 'bg-success',
    icon: '✓',
  },
  provisional: {
    label: 'Provisional',
    badge: 'bg-motion/10 text-motion border border-motion/30',
    dot: 'bg-motion',
    icon: '◎',
  },
  draft_results: {
    label: 'Draft Results',
    badge: 'bg-warning/10 text-warning border border-warning/30',
    dot: 'bg-warning',
    icon: '△',
  },
  missing_results: {
    label: 'No Results',
    badge: 'bg-danger/10 text-danger border border-danger/30',
    dot: 'bg-danger',
    icon: '!',
  },
  pending: {
    label: 'Pending',
    badge: 'bg-surface-interactive/60 text-foreground-quiet border border-divider',
    dot: 'bg-foreground-quiet',
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

// Part 7 — standardized standings tag badges
export const STANDINGS_TAG_CONFIG = {
  counted: { label: 'Standings: Applied', color: 'text-success' },
  pending_results: { label: 'Standings: Pending', color: 'text-warning' },
  scoring: { label: 'Scoring Session', color: 'text-motion' },
  non_scoring: { label: 'Non-Scoring', color: 'text-foreground-quiet' },
  skipped: { label: 'Skipped', color: 'text-foreground-quiet' },
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
  upcoming: { label: 'Upcoming', badge: 'bg-surface-interactive/60 text-foreground-quiet border-divider', dot: 'bg-foreground-quiet' },
  in_progress: { label: 'In Progress', badge: 'bg-motion/10 text-motion border-motion/30', dot: 'bg-motion animate-pulse' },
  results_pending: { label: 'Results Pending', badge: 'bg-warning/10 text-warning border-warning/30', dot: 'bg-warning' },
  partially_official: { label: 'Partially Official', badge: 'bg-motion/10 text-motion border-motion/30', dot: 'bg-motion' },
  official_complete: { label: 'Official Complete', badge: 'bg-success/10 text-success border-success/30', dot: 'bg-success' },
  locked_complete: { label: 'Locked Complete', badge: 'bg-surface-interactive text-foreground-secondary border-divider', dot: 'bg-foreground-quiet' },
};