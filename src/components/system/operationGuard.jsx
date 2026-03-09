/**
 * HIJINX Platform — Operation Rate Guard
 * Lightweight in-memory cooldown protection for heavy operations.
 * Prevents accidental rapid re-execution during a session.
 */

const _lastRun = {};

/**
 * Check if an operation is allowed to run.
 * @param {string} key - Unique operation identifier
 * @param {number} cooldownMs - Cooldown in milliseconds (default 30s)
 * @returns {{ allowed: boolean, remainingSeconds?: number }}
 */
export function canRunOperation(key, cooldownMs = 30000) {
  const now = Date.now();
  const last = _lastRun[key];
  if (last && now - last < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - (now - last)) / 1000);
    return { allowed: false, remainingSeconds };
  }
  return { allowed: true };
}

/**
 * Mark an operation as having just run.
 * @param {string} key
 */
export function markOperationRun(key) {
  _lastRun[key] = Date.now();
}

/**
 * Admin override: reset a specific operation's cooldown.
 * @param {string} key
 */
export function resetOperationCooldown(key) {
  delete _lastRun[key];
}

/**
 * Get the last run timestamp for an operation.
 * @param {string} key
 * @returns {number|null}
 */
export function getLastRunTime(key) {
  return _lastRun[key] || null;
}

// Named keys for known heavy operations
export const OPERATION_KEYS = {
  DIAGNOSTICS:          'platform_diagnostics',
  SAFE_REPAIRS:         'safe_repairs',
  V1_VERIFICATION:      'v1_verification',
  ROUTE_VERIFICATION:   'route_verification',
  CSV_IMPORT:           'csv_import',
  NASCAR_SYNC:          'nascar_sync',
  CALENDAR_SYNC:        'calendar_sync',
  SOURCE_INTEGRITY:     'source_integrity_audit',
};