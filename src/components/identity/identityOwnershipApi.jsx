/**
 * identityOwnershipApi.jsx
 *
 * Phase 8 — Frontend helpers for the User → PersonIdentity ownership
 * and claiming system. Wraps the backend functions and provides
 * read-only helpers for determining ownership state on public pages.
 */

import { base44 } from '@/api/base44Client';

/**
 * Submit a claim of ownership over a PersonIdentity.
 * The claim is recorded as pending and must be admin-reviewed.
 *
 * @param {{ identityId?: string, racerProfileId?: string, racerProfileSlug?: string, evidence: object }}
 * @returns {Promise<{ status: string, message: string }>}
 */
export async function submitIdentityClaim(payload) {
  const res = await base44.functions.invoke('submitIdentityClaim', payload);
  return res?.data ?? res;
}

/**
 * Admin: approve or reject a pending claim.
 * @param {{ identityId: string, action: 'approve'|'reject', reason?: string }}
 */
export async function reviewIdentityClaim(payload) {
  const res = await base44.functions.invoke('reviewIdentityClaim', payload);
  return res?.data ?? res;
}

/**
 * Admin: revoke a previously-approved ownership claim.
 * @param {{ identityId: string, reason?: string }}
 */
export async function revokeIdentityOwnership(payload) {
  const res = await base44.functions.invoke('revokeIdentityOwnership', payload);
  return res?.data ?? res;
}

/**
 * Admin: run the read-only ownership audit.
 */
export async function runIdentityOwnershipAudit() {
  const res = await base44.functions.invoke('auditIdentityOwnership', {});
  return res?.data ?? res;
}

/**
 * Determine the ownership state for the current user given a PersonIdentity.
 * Returns { isOwner, canClaim, claimState, hasPendingClaim }.
 */
export function resolveOwnershipState(identity, currentUserId) {
  if (!identity) {
    return { isOwner: false, canClaim: false, claimState: 'unknown', hasPendingClaim: false };
  }
  const claimStatus = identity.claim_status || 'unclaimed';
  const isOwner = !!currentUserId && identity.owner_user_id === currentUserId && claimStatus === 'claimed';
  const hasPendingClaim = !!currentUserId && identity.claimed_by_user_id === currentUserId && claimStatus === 'pending';
  const canClaim = !!currentUserId && !isOwner && !hasPendingClaim && claimStatus !== 'claimed';
  return {
    isOwner,
    canClaim,
    claimState: claimStatus,
    hasPendingClaim,
    claimedByOther: claimStatus === 'claimed' && identity.owner_user_id !== currentUserId,
  };
}