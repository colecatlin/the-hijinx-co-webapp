/**
 * submitTeamClaim
 * Phase 11 — Submit a claim for team ownership. Never auto-approves.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { team_id, role, contact_email, notes, attachment_urls } = body;
    if (!team_id) return Response.json({ error: "team_id is required" }, { status: 400 });

    const team = await base44.asServiceRole.entities.Team.get(team_id).catch(() => null);
    if (!team) return Response.json({ error: "Team not found" }, { status: 404 });

    if (team.claim_status === "claimed") return Response.json({ error: "This team is already claimed" }, { status: 409 });
    if (team.claim_status === "pending" && team.claimed_by_user_id === user.id) return Response.json({ error: "You already have a pending claim for this team" }, { status: 409 });

    const now = new Date().toISOString();
    const evidence = { role, contact_email, notes, attachment_urls: attachment_urls || [] };
    const claimHistory = team.claim_history || [];
    claimHistory.push({ action: "submitted", user_id: user.id, timestamp: now, evidence_summary: `${role || "Claim"} — ${contact_email || "no email"} — ${notes || "no notes"}` });

    await base44.asServiceRole.entities.Team.update(team_id, {
      claim_status: "pending", claimed_by_user_id: user.id, claim_submitted_at: now,
      claim_evidence: evidence, claim_history: claimHistory, claim_rejection_reason: null,
    });

    return Response.json({ status: "pending", team_id, message: "Claim submitted successfully — awaiting admin review" });
  } catch (err) {
    console.error("[submitTeamClaim] Error:", err);
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}