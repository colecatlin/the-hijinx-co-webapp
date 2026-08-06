/**
 * submitIdentityClaim — Phase 8
 *
 * Allows an authenticated user to submit a claim of ownership over a
 * PersonIdentity (the permanent human anchor). Claims are NEVER auto-approved.
 * The claim is recorded as pending and must be reviewed by an admin via
 * reviewIdentityClaim.
 *
 * Ownership chain: User → PersonIdentity → RacerProfile → SeasonParticipation
 * Driver is NOT an ownership object.
 *
 * Payload:
 *   { identityId?, racerProfileId?, racerProfileSlug?, evidence: { license_number?, date_of_birth?, contact_email?, notes?, attachment_urls? } }
 *
 * Returns:
 *   { status: 'pending', identityId, claim_status, message }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  CLAIM_STATUS,
  requireAuth,
  resolveIdentityForClaim,
  findOtherOwnedIdentities,
  buildClaimHistoryEntry,
  sanitizeEvidence,
  hasMinimumEvidence,
  syncRacerProfileClaimFlag,
} from '../../shared/identityClaimHelpers.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAuth(base44);

    const body = await req.json().catch(() => ({}));
    const { identityId, racerProfileId, racerProfileSlug, evidence: rawEvidence } = body || {};

    if (!identityId && !racerProfileId && !racerProfileSlug) {
      return Response.json({ error: 'identityId, racerProfileId, or racerProfileSlug is required' }, { status: 400 });
    }

    const evidence = sanitizeEvidence(rawEvidence);
    if (!hasMinimumEvidence(evidence)) {
      return Response.json({ error: 'Claim evidence is required (license number, date of birth, contact email, or notes).' }, { status: 400 });
    }

    // Resolve the PersonIdentity (and the RacerProfile if a slug/id was given)
    const { identity, racerProfile } = await resolveIdentityForClaim(base44, { identityId, racerProfileId, racerProfileSlug });
    if (!identity) {
      return Response.json({ error: 'PersonIdentity not found for this racer profile.' }, { status: 404 });
    }

    // Guard: already claimed by someone else
    if (identity.claim_status === CLAIM_STATUS.CLAIMED && identity.owner_user_id && identity.owner_user_id !== user.id) {
      return Response.json({ error: 'This identity is already claimed by another user. Contact an admin if you believe this is an error.' }, { status: 409 });
    }

    // Guard: already owned by this user
    if (identity.owner_user_id === user.id && identity.claim_status === CLAIM_STATUS.CLAIMED) {
      return Response.json({ status: 'claimed', identityId: identity.id, claim_status: CLAIM_STATUS.CLAIMED, message: 'You already own this identity.' });
    }

    // Guard: pending claim by this same user — idempotent re-submission
    if (identity.claim_status === CLAIM_STATUS.PENDING && identity.claimed_by_user_id === user.id) {
      return Response.json({ status: 'pending', identityId: identity.id, claim_status: CLAIM_STATUS.PENDING, message: 'Your claim is already pending review.' });
    }

    // Guard: one user should not silently claim multiple identities. We allow
    // the submission but flag it for the admin reviewer via the history entry.
    const otherOwned = await findOtherOwnedIdentities(base44, user.id, identity.id);
    const multiOwnershipNote = otherOwned.length > 0
      ? `User already owns ${otherOwned.length} other identity record(s). Admin should verify before approval.`
      : null;

    const evidenceSummary = [
      evidence.license_number ? `license: ${evidence.license_number}` : null,
      evidence.date_of_birth ? `dob: ${evidence.date_of_birth}` : null,
      evidence.contact_email ? `email: ${evidence.contact_email}` : null,
      evidence.notes ? `notes: "${evidence.notes.slice(0, 120)}"` : null,
      evidence.attachment_urls?.length ? `attachments: ${evidence.attachment_urls.length}` : null,
      multiOwnershipNote,
    ].filter(Boolean).join(' | ');

    const historyEntry = buildClaimHistoryEntry('submitted', {
      userId: user.id,
      evidenceSummary,
    });

    const updated = await base44.asServiceRole.entities.PersonIdentity.update(identity.id, {
      claim_status: CLAIM_STATUS.PENDING,
      claimed_by_user_id: user.id,
      claim_submitted_at: new Date().toISOString(),
      claim_evidence: evidence,
      claim_rejection_reason: null,
      claim_reviewed_by: null,
      claim_reviewed_at: null,
      claim_history: [...(Array.isArray(identity.claim_history) ? identity.claim_history : []), historyEntry],
    });

    return Response.json({
      status: 'pending',
      identityId: identity.id,
      racerProfileId: racerProfile?.id || null,
      claim_status: CLAIM_STATUS.PENDING,
      message: 'Claim submitted. An admin will review your evidence before ownership is granted.',
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return Response.json({ error: error.message || 'Internal error' }, { status });
  }
}