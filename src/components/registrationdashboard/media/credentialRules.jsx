/**
 * Credential rules and expiry logic for event-scoped media credentials.
 */

export const DEFAULT_EVENT_CREDENTIAL_BUFFER_HOURS = 12;

/**
 * Compute the expiry Date for an event credential.
 * @param {{ event: object, bufferHours: number }} params
 * @returns {Date}
 */
export function getEventCredentialExpiry({ event, bufferHours = DEFAULT_EVENT_CREDENTIAL_BUFFER_HOURS }) {
  const baseDate = event?.end_date || event?.event_date;
  if (!baseDate) return null;

  // Parse as date (treat as local midnight UTC for V1 simplification)
  const d = new Date(baseDate);
  // Set to 23:59:59
  d.setUTCHours(23, 59, 59, 0);
  // Add buffer
  d.setTime(d.getTime() + bufferHours * 60 * 60 * 1000);
  return d;
}

/**
 * Normalize a credential's effective status, accounting for computed expiry.
 * @param {{ credential: object, now: Date, expiryDate: Date|null }} params
 * @returns {string} status
 */
export function normalizeCredentialStatus({ credential, now = new Date(), expiryDate = null }) {
  if (!credential) return 'unknown';
  if (credential.status === 'revoked') return 'revoked';
  // Check stored expires_at
  if (credential.expires_at && now > new Date(credential.expires_at)) return 'expired';
  // Check computed expiry from event
  if (expiryDate && now > expiryDate) return 'expired';
  return credential.status || 'active';
}