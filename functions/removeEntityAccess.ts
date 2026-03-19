import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { collaborator_id, entity_type, entity_id, target_email } = await req.json();
  if (!collaborator_id || !entity_type || !entity_id) {
    return Response.json({ error: 'Missing required fields: collaborator_id, entity_type, entity_id' }, { status: 400 });
  }

  // Verify current user owns this entity or is admin
  const ownerCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
    entity_type,
    entity_id,
    role: 'owner',
  });

  const isOwner = ownerCollabs.some(c => c.user_email === user.email || c.user_id === user.id);
  if (!isOwner && user.role !== 'admin') {
    return Response.json({ error: 'Only entity owners can remove access' }, { status: 403 });
  }

  // Safety: do not allow removing an owner via this route
  const targetCollab = ownerCollabs.find(c => c.id === collaborator_id);
  if (targetCollab && targetCollab.role === 'owner') {
    return Response.json({ error: 'Cannot remove owner access through this route. Use admin tools.' }, { status: 400 });
  }

  await base44.asServiceRole.entities.EntityCollaborator.delete(collaborator_id);

  await base44.asServiceRole.entities.OperationLog.create({
    operation_type: 'entity_access_removed',
    entity_name: entity_type,
    entity_id,
    status: 'success',
    message: `Access removed for ${target_email || 'user'} from ${entity_type}:${entity_id}`,
    initiated_by: user.email,
    metadata: {
      entity_type,
      entity_id,
      target_user_email: target_email,
      acted_by_user_id: user.id,
    },
  });

  return Response.json({ success: true });
});