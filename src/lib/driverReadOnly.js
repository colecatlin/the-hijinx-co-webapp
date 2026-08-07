/**
 * driverReadOnly.js
 *
 * Phase 8+ — Frontend Driver read-only enforcement helper.
 *
 * Wraps Driver entity SDK methods to block direct create/update from normal UI flows.
 * Only allowlisted compatibility services (backend functions) may write to Driver.
 *
 * Usage:
 *   import { isDriverWriteAllowed } from '@/lib/driverReadOnly';
 *   const check = await isDriverWriteAllowed('create');
 *   if (!check.allowed) { showWarning(check.reason); return; }
 */

import { base44 } from '@/api/base44Client';

/**
 * Check if a Driver write operation is allowed by calling the backend enforcement function.
 * Returns { allowed, reason, auth_source } or { allowed: false, error } on failure.
 */
export async function isDriverWriteAllowed(operation, options = {}) {
  try {
    const response = await base44.functions.invoke('enforceDriverReadOnly', {
      operation,
      source_operation: options.source_operation || null,
      driver_id: options.driver_id || null,
    });
    return response.data || response;
  } catch (err) {
    // If the enforcement function fails, default to blocked for safety
    const errData = err?.response?.data || err;
    return {
      allowed: false,
      reason: errData?.reason || 'Driver write enforcement check failed',
      error: errData?.error || err?.message || 'Enforcement unavailable',
    };
  }
}

/**
 * Frontend gate for Driver create operations.
 * Returns true if allowed, false if blocked.
 */
export async function canCreateDriver(sourceOperation) {
  const check = await isDriverWriteAllowed('create', { source_operation: sourceOperation });
  return check.allowed === true;
}

/**
 * Frontend gate for Driver update operations.
 * Returns true if allowed, false if blocked.
 */
export async function canUpdateDriver(driverId, sourceOperation) {
  const check = await isDriverWriteAllowed('update', {
    driver_id: driverId,
    source_operation: sourceOperation,
  });
  return check.allowed === true;
}