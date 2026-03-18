/**
 * verifyInvitationCode — validation only.
 *
 * This function validates an invitation code and returns invitation details.
 * It does NOT create a collaborator record or mark the invitation accepted.
 *
 * To actually accept an invitation, call redeemEntityAccessCode with
 * { user_id, user_email, code }.
 * This keeps a single canonical redemption path for both invitation codes
 * and owner access codes.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { code, email } = await req.json();
  if (!code) return Response.json({ ok: false, error: 'Missing required field: code' }, { status: 400 });

  const normalizedEmail = (email || user.email || '').trim().toLowerCase();

  // Find pending invitation
  const invitations = await base44.asServiceRole.entities.Invitation.filter({ code, status: 'pending' });
  if (!invitations || invitations.length === 0) {
    return Response.json({ ok: false, error: 'Invitation not found or already used.' }, { status: 404 });
  }

  const invitation = invitations[0];

  // Case-insensitive email check — both sides lowercased
  if (invitation.email?.toLowerCase() !== normalizedEmail) {
    return Response.json({ ok: false, error: 'This invitation is for a different email address.' }, { status: 403 });
  }

  // Check expiration
  if (invitation.expiration_date && new Date(invitation.expiration_date) < new Date()) {
    await base44.asServiceRole.entities.Invitation.update(invitation.id, { status: 'expired' });
    return Response.json({ ok: false, error: 'This invitation has expired.' }, { status: 404 });
  }

  // Return invitation details only — no side effects
  return Response.json({
    ok: true,
    invitation: {
      id: invitation.id,
      entity_type: invitation.entity_type,
      entity_id: invitation.entity_id,
      entity_name: invitation.entity_name,
      role: invitation.role || 'editor',
      expiration_date: invitation.expiration_date,
    },
  });
});