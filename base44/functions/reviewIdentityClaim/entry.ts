/**
 * reviewIdentityClaim — Phase 8
 *
 * Admin-only endpoint to approve or reject a pending PersonIdentity claim.
 * Never auto-approves — an explicit admin decision is always required.
 *
 * On approval:
 *   - owner_user_id is set to the claiming user
 *   - claim_status → claimed
 *   - claimed_at is set
 *   - RacerProfile.is_claimed is synced to true
 *
 * On rejection:
 *   - claim_status → rejected (resubmittable with new evidence)
 *   - claim_rejection_reason is set
 *   - owner_user_id is NOT changed
 *
 * Payload:
 *   { identityId, action: 'approve' | 'reject', reason? }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  CLAIM_STATUS,
  requireAdmin,
  getIdentityById,
  buildClaimHistoryEntry,
  syncRacerProfileClaimFlag,
} from '../../shared/identityClaimHelpers.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await requireAdmin(base44);

    const body = await req.json().catch(() => ({}));
    const { identityId, action, reason } = body || {};

    if (!identityId) {
      return Response.json({ error: 'identityId is required' }, { status: 400 });
    }
    if (action !== 'approve' && action !== 'reject') {
      return Response.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const identity = await getIdentityById(base44, identityId);
    if (!identity) {
      return Response.json({ error: 'PersonIdentity not found' }, { status: 404 });
    }

    // Only review pending claims. Already-claimed identities require revoke flow.
    if (identity.claim_status !== CLAIM_STATUS.PENDING) {
      return Response.json({ error: `Identity is not pending (current: ${identity.claim_status}). Use revokeIdentityOwnership for claimed identities.` }, { status: 409 });
    }

    const claimantId = identity.claimed_by_user_id;
    if (!claimantId) {
      return Response.json({ error: 'No pending claimant on this identity.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const history = [...(Array.isArray(identity.claim_history) ? identity.claim_history : [])];

    if (action === 'approve') {
      const historyEntry = buildClaimHistoryEntry('approved', {
        userId: claimantId,
        reviewedBy: admin.id,
        reason: reason || null,
      });
      history.push(historyEntry);

      await base44.asServiceRole.entities.PersonIdentity.update(identity.id, {
        owner_user_id: claimantId,
        claim_status: CLAIM_STATUS.CLAIMED,
        claimed_at: now,
        claim_reviewed_by: admin.id,
        claim_reviewed_at: now,
        claim_rejection_reason: null,
        claim_history: history,
      });

      // Sync derived flag on linked RacerProfile(s)
      await syncRacerProfileClaimFlag(base44, identity.id, true);

      return Response.json({
        status: 'claimed',
        identityId: identity.id,
        owner_user_id: claimantId,
        claim_status: CLAIM_STATUS.CLAIMED,
        message: 'Claim approved. Ownership transferred to the claiming user.',
      });
    } else {
      // reject
      const historyEntry = buildClaimHistoryEntry('rejected', {
        userId: claimantId,
        reviewedBy: admin.id,
        reason: reason || null,
      });
      history.push(historyEntry);

      await base44.asServiceRole.entities.PersonIdentity.update(identity.id, {
        claim_status: CLAIM_STATUS.REJECTED,
        claim_reviewed_by: admin.id,
        claim_reviewed_at: now,
        claim_rejection_reason: reason || 'Claim rejected by admin.',
        // claimed_by_user_id and claim_evidence retained for audit history
        claim_history: history,
      });

      return Response.json({
        status: 'rejected',
        identityId: identity.id,
        claim_status: CLAIM_STATUS.REJECTED,
        message: 'Claim rejected. The user may resubmit with new evidence.',
      });
    }
  } catch (error) {
    const status = error.statusCode || 500;
    return Response.json({ error: error.message || 'Internal error' }, { status });
  }
}