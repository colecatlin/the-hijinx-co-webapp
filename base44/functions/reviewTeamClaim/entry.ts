/**
 * reviewTeamClaim
 * Phase 11 — Admin review of a team ownership claim. Approve, deny, or revoke.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Admin access required" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { team_id, action, reason, person_identity_id } = body;
    if (!team_id || !action) return Response.json({ error: "team_id and action are required" }, { status: 400 });
    if (!["approve", "deny", "revoke"].includes(action)) return Response.json({ error: "action must be approve, deny, or revoke" }, { status: 400 });

    const team = await base44.asServiceRole.entities.Team.get(team_id).catch(() => null);
    if (!team) return Response.json({ error: "Team not found" }, { status: 404 });

    const now = new Date().toISOString();
    const claimHistory = team.claim_history || [];
    const claimantId = team.claimed_by_user_id || team.owner_user_id;
    let updateData = { claim_reviewed_by: user.id, claim_reviewed_at: now };

    if (action === "approve") {
      let ownerPersonIdentityId = person_identity_id || null;
      if (!ownerPersonIdentityId && claimantId) {
        const identities = await base44.asServiceRole.entities.PersonIdentity.filter({ owner_user_id: claimantId }).catch(() => []);
        if (Array.isArray(identities) && identities.length > 0) ownerPersonIdentityId = identities[0].id;
      }
      updateData.claim_status = "claimed";
      updateData.owner_user_id = claimantId;
      updateData.owner_person_identity_id = ownerPersonIdentityId;
      updateData.claimed_at = now;
      updateData.claim_rejection_reason = null;
      claimHistory.push({ action: "approved", user_id: claimantId, reviewed_by: user.id, timestamp: now, reason: reason || "Claim approved" });
    } else if (action === "deny") {
      updateData.claim_status = "rejected";
      updateData.claim_rejection_reason = reason || "Claim denied by admin";
      updateData.claimed_by_user_id = null;
      updateData.claim_submitted_at = null;
      claimHistory.push({ action: "rejected", user_id: claimantId, reviewed_by: user.id, timestamp: now, reason: reason || "Claim denied" });
    } else if (action === "revoke") {
      updateData.claim_status = "unclaimed";
      updateData.owner_user_id = null;
      updateData.owner_person_identity_id = null;
      updateData.claimed_at = null;
      updateData.claimed_by_user_id = null;
      updateData.claim_submitted_at = null;
      updateData.claim_rejection_reason = reason || "Ownership revoked";
      claimHistory.push({ action: "revoked", user_id: claimantId, reviewed_by: user.id, timestamp: now, reason: reason || "Ownership revoked" });
    }

    updateData.claim_history = claimHistory;
    await base44.asServiceRole.entities.Team.update(team_id, updateData);

    return Response.json({ status: action === "approve" ? "claimed" : action === "deny" ? "rejected" : "unclaimed", team_id, message: `Claim ${action}d successfully` });
  } catch (err) {
    console.error("[reviewTeamClaim] Error:", err);
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}