/**
 * revokeIdentityOwnership — Phase 8
 *
 * Admin-only endpoint to revoke a previously-approved ownership claim.
 * Sets the identity back to unclaimed. Does NOT delete the identity or any
 * related records — only removes the User link.
 *
 * Payload:
 *   { identityId, reason }
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
    const { identityId, reason } = body || {};

    if (!identityId) {
      return Response.json({ error: 'identityId is required' }, { status: 400 });
    }

    const identity = await getIdentityById(base44, identityId);
    if (!identity) {
      return Response.json({ error: 'PersonIdentity not found' }, { status: 404 });
    }

    if (identity.claim_status !== CLAIM_STATUS.CLAIMED) {
      return Response.json({ error: `Identity is not claimed (current: ${identity.claim_status}).` }, { status: 409 });
    }

    const previousOwner = identity.owner_user_id;
    const history = [...(Array.isArray(identity.claim_history) ? identity.claim_history : [])];
    history.push(buildClaimHistoryEntry('revoked', {
      userId: previousOwner,
      reviewedBy: admin.id,
      reason: reason || 'Ownership revoked by admin.',
    }));

    await base44.asServiceRole.entities.PersonIdentity.update(identity.id, {
      owner_user_id: null,
      claim_status: CLAIM_STATUS.UNCLAIMED,
      claimed_at: null,
      claim_reviewed_by: admin.id,
      claim_reviewed_at: new Date().toISOString(),
      claim_history: history,
    });

    await syncRacerProfileClaimFlag(base44, identity.id, false);

    return Response.json({
      status: 'unclaimed',
      identityId: identity.id,
      previous_owner_user_id: previousOwner,
      claim_status: CLAIM_STATUS.UNCLAIMED,
      message: 'Ownership revoked. Identity is now unclaimed.',
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return Response.json({ error: error.message || 'Internal error' }, { status });
  }
}