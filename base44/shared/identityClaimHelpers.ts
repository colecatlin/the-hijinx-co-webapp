/**
 * identityClaimHelpers.ts
 *
 * Phase 8 — Shared logic for User → PersonIdentity ownership and claiming.
 *
 * Used by submitIdentityClaim and reviewIdentityClaim backend functions.
 * Extracted here to prevent logic duplication (per platform guidelines).
 *
 * Ownership chain (authoritative):
 *   User → PersonIdentity → RacerProfile → SeasonParticipation
 *
 * Driver is NOT an ownership object. Driver is compatibility only.
 */

// Claim status values — must match PersonIdentity.claim_status enum.
export const CLAIM_STATUS = {
  UNCLAIMED: 'unclaimed',
  PENDING: 'pending',
  CLAIMED: 'claimed',
  REJECTED: 'rejected',
};

// Evidence fields accepted on submission.
export const EVIDENCE_FIELDS = ['license_number', 'date_of_birth', 'contact_email', 'notes', 'attachment_urls'];

/**
 * Validate that the caller is authenticated. Returns the user or throws.
 */
export async function requireAuth(base44) {
  const user = await base44.auth.me();
  if (!user) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }
  return user;
}

/**
 * Validate that the caller is an admin. Returns the user or throws.
 */
export async function requireAdmin(base44) {
  const user = await requireAuth(base44);
  if (user.role !== 'admin') {
    const err = new Error('Admin access required');
    err.statusCode = 403;
    throw err;
  }
  return user;
}

/**
 * Resolve a single PersonIdentity by ID.
 */
export async function getIdentityById(base44, identityId) {
  if (!identityId) return null;
  const list = await base44.asServiceRole.entities.PersonIdentity.filter({ id: identityId });
  return Array.isArray(list) && list.length > 0 ? list[0] : null;
}

/**
 * Resolve a PersonIdentity by RacerProfile slug or ID.
 * Used so the frontend can submit a claim against a public racer profile.
 */
export async function resolveIdentityForClaim(base44, { identityId, racerProfileId, racerProfileSlug }) {
  if (identityId) {
    return { identity: await getIdentityById(base44, identityId), racerProfile: null };
  }
  let racerProfile = null;
  if (racerProfileSlug) {
    const rpList = await base44.asServiceRole.entities.RacerProfile.filter({ slug: racerProfileSlug });
    racerProfile = Array.isArray(rpList) && rpList.length > 0 ? rpList[0] : null;
  } else if (racerProfileId) {
    const rpList = await base44.asServiceRole.entities.RacerProfile.filter({ id: racerProfileId });
    racerProfile = Array.isArray(rpList) && rpList.length > 0 ? rpList[0] : null;
  }
  if (!racerProfile || !racerProfile.person_identity_id) {
    return { identity: null, racerProfile };
  }
  const identity = await getIdentityById(base44, racerProfile.person_identity_id);
  return { identity, racerProfile };
}

/**
 * Check whether a user already owns a different PersonIdentity.
 * Prevents one user from claiming multiple identities without admin override.
 * Returns the list of other identities owned by this user.
 */
export async function findOtherOwnedIdentities(base44, userId, excludeIdentityId) {
  const all = await base44.asServiceRole.entities.PersonIdentity.list('-created_date', 500);
  return (Array.isArray(all) ? all : []).filter(
    (id) => id.owner_user_id === userId && id.id !== excludeIdentityId
  );
}

/**
 * Build a claim_history entry. Always appended, never mutated.
 */
export function buildClaimHistoryEntry(action, opts = {}) {
  return {
    action,
    user_id: opts.userId || null,
    reviewed_by: opts.reviewedBy || null,
    timestamp: new Date().toISOString(),
    reason: opts.reason || null,
    evidence_summary: opts.evidenceSummary || null,
  };
}

/**
 * Sanitize and validate the evidence payload submitted by a user.
 * Returns a clean evidence object (only allowed fields).
 */
export function sanitizeEvidence(input) {
  if (!input || typeof input !== 'object') return {};
  const clean = {};
  for (const key of EVIDENCE_FIELDS) {
    if (input[key] !== undefined && input[key] !== null) {
      clean[key] = input[key];
    }
  }
  if (Array.isArray(clean.attachment_urls)) {
    clean.attachment_urls = clean.attachment_urls.filter((u) => typeof u === 'string').slice(0, 10);
  } else {
    clean.attachment_urls = [];
  }
  return clean;
}

/**
 * Determine whether a claim has minimum viable evidence.
 * Does NOT auto-approve — only blocks empty submissions.
 */
export function hasMinimumEvidence(evidence) {
  if (!evidence) return false;
  return !!(evidence.license_number || evidence.date_of_birth || evidence.contact_email || evidence.notes);
}

/**
 * Sync the derived is_claimed flag on RacerProfile(s) linked to this identity.
 * Called after a claim is approved or revoked so the public badge stays accurate.
 */
export async function syncRacerProfileClaimFlag(base44, identityId, isClaimed) {
  if (!identityId) return;
  const rpList = await base44.asServiceRole.entities.RacerProfile.filter({ person_identity_id: identityId });
  for (const rp of (Array.isArray(rpList) ? rpList : [])) {
    if (rp.is_claimed !== isClaimed) {
      await base44.asServiceRole.entities.RacerProfile.update(rp.id, { is_claimed: isClaimed });
    }
  }
}