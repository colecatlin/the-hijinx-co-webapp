/**
 * sessionLifecycle.js
 * Shared constants and guard functions for Session and Result lifecycle status checks.
 *
 * These use Title Case values to match the actual Session.status entity field.
 * Do NOT confuse with publishRules.js which uses lowercase publish-pipeline values.
 */

// ── Constants ─────────────────────────────────────────────────────────────

/** Canonical Session.status values (Title Case — matches entity field) */
export const SESSION_STATUSES = {
  DRAFT:       'Draft',
  PROVISIONAL: 'Provisional',
  OFFICIAL:    'Official',
  LOCKED:      'Locked',
};

/** Statuses considered "operational" — edit/delete should be gated */
export const OPERATIONAL_SESSION_STATUSES = ['Provisional', 'Official', 'Locked'];

/** Ordered lifecycle progression */
export const SESSION_STATUS_ORDER = ['Draft', 'Provisional', 'Official', 'Locked'];

/** Race outcome values for Result.status (not lifecycle) */
export const RESULT_OUTCOME_STATUSES = ['Running', 'DNF', 'DNS', 'DSQ', 'DNP'];

/** Publication state values for Result.status_state */
export const RESULT_STATE_STATUSES = ['Draft', 'Provisional', 'Official', 'Locked'];

// ── Session guard functions ────────────────────────────────────────────────

/**
 * Is this session in an operational state?
 * Checks BOTH status field AND locked boolean to handle inconsistent records.
 */
export function isOperationalSession(session) {
  if (!session) return false;
  if (session.locked === true) return true;
  return OPERATIONAL_SESSION_STATUSES.includes(session.status);
}

/**
 * Is this session locked from all edits?
 * Dual-field check: status === 'Locked' OR locked boolean.
 */
export function isSessionLocked(session) {
  if (!session) return false;
  return session.status === SESSION_STATUSES.LOCKED || session.locked === true;
}

/**
 * Is this session publicly visible?
 * Official and Locked sessions are public.
 */
export function isSessionPublic(session) {
  if (!session) return false;
  return session.status === SESSION_STATUSES.OFFICIAL ||
         session.status === SESSION_STATUSES.LOCKED;
}

/**
 * Is this session in Official state?
 * (Results are still editable but editing reverts to Provisional.)
 */
export function isSessionOfficial(session) {
  if (!session) return false;
  return session.status === SESSION_STATUSES.OFFICIAL;
}

// ── Result guard functions ─────────────────────────────────────────────────

/**
 * Is this result in an operational state?
 * Resolves via the provided sessions array. Returns false if session not found.
 */
export function isResultOperational(result, sessions = []) {
  if (!result) return false;
  if (!result.session_id) return false;
  const session = sessions.find(s => s.id === result.session_id);
  if (!session) return false;
  return isOperationalSession(session);
}

// ── Badge helpers ──────────────────────────────────────────────────────────

/**
 * Tailwind class string for a session status badge.
 */
export function getSessionStatusBadgeClass(status) {
  switch (status) {
    case SESSION_STATUSES.PROVISIONAL: return 'bg-blue-500/20 text-blue-400';
    case SESSION_STATUSES.OFFICIAL:    return 'bg-green-500/20 text-green-400';
    case SESSION_STATUSES.LOCKED:      return 'bg-purple-500/20 text-purple-400';
    default:                           return 'bg-gray-500/20 text-gray-400';
  }
}