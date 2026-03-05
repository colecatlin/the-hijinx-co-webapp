/**
 * Guards and badge helpers for credential-gated actions.
 */
import { normalizeCredentialStatus } from './credentialRules';

/**
 * Returns true if there is at least one active credential for the given scope.
 * @param {{ credentials: object[], scopeEntityId: string, now: Date }} params
 */
export function hasActiveCredentialForScope({ credentials = [], scopeEntityId, now = new Date() }) {
  return credentials.some((c) => {
    if (c.scope_entity_id !== scopeEntityId) return false;
    const status = normalizeCredentialStatus({ credential: c, now });
    return status === 'active';
  });
}

/**
 * Returns a badge label + variant for a credential.
 * @param {{ credential: object, now: Date, expiryDate: Date|null }} params
 * @returns {{ label: string, variant: 'active'|'pending'|'expired'|'revoked' }}
 */
export function getCredentialBadgeState({ credential, now = new Date(), expiryDate = null }) {
  const status = normalizeCredentialStatus({ credential, now, expiryDate });
  switch (status) {
    case 'active':   return { label: 'Active',   variant: 'active' };
    case 'revoked':  return { label: 'Revoked',  variant: 'revoked' };
    case 'expired':  return { label: 'Expired',  variant: 'expired' };
    case 'pending':  return { label: 'Pending',  variant: 'pending' };
    default:         return { label: status,     variant: 'pending' };
  }
}