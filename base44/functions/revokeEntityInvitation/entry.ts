/**
 * revokeEntityInvitation — owner or admin only
 * Marks a pending invitation as revoked.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { invitation_id } = await req.json();
  if (!invitation_id) return Response.json({ error: 'invitation_id is required' }, { status: 400 });

  // Fetch the invitation
  const allInvs = await base44.asServiceRole.entities.Invitation.list('-created_date', 500);
  const inv = allInvs.find(i => i.id === invitation_id);
  if (!inv) return Response.json({ error: 'Invitation not found' }, { status: 404 });
  if (inv.status !== 'pending') return Response.json({ error: 'Invitation is no longer pending' }, { status: 400 });

  // Authorization: owner of entity or admin
  if (user.role !== 'admin') {
    const ownerCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
      entity_type: inv.entity_type,
      entity_id: inv.entity_id,
      role: 'owner',
    });
    const isOwner = ownerCollabs.some(c => c.user_email === user.email || c.user_id === user.id);
    if (!isOwner) return Response.json({ error: 'Only entity owners or admins can revoke invitations' }, { status: 403 });
  }

  await base44.asServiceRole.entities.Invitation.update(invitation_id, {
    status: 'revoked',
  });

  await base44.asServiceRole.entities.OperationLog.create({
    operation_type: 'entity_invitation_revoked',
    entity_name: inv.entity_type,
    entity_id: inv.entity_id,
    status: 'success',
    message: `Invitation to ${inv.email} for ${inv.entity_name} (${inv.entity_type}) revoked by ${user.email}`,
    initiated_by: user.email,
    metadata: {
      entity_type: inv.entity_type,
      entity_id: inv.entity_id,
      target_user_email: inv.email,
      acted_by_user_id: user.id,
      source: 'revokeEntityInvitation',
    },
  });

  return Response.json({ success: true });
});