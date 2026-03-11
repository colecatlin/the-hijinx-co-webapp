import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function generateNumericCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { entity_type, entity_id } = await req.json();
  if (!entity_type || !entity_id) {
    return Response.json({ error: 'Missing required fields: entity_type, entity_id' }, { status: 400 });
  }

  // Verify current user is owner or admin
  const ownerCollabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
    entity_type,
    entity_id,
    role: 'owner',
  });

  const isOwner = ownerCollabs.some(c => c.user_email === user.email || c.user_id === user.id);
  if (!isOwner && user.role !== 'admin') {
    return Response.json({ error: 'Only owners can regenerate access codes' }, { status: 403 });
  }

  if (!ownerCollabs || ownerCollabs.length === 0) {
    return Response.json({ error: 'No owner collaborator found for this entity' }, { status: 404 });
  }

  // Generate unique new code
  let newCode;
  for (let i = 0; i < 20; i++) {
    const candidate = generateNumericCode();
    const existing = await base44.asServiceRole.entities.EntityCollaborator.filter({ access_code: candidate });
    if (!existing || existing.length === 0) { newCode = candidate; break; }
  }
  if (!newCode) return Response.json({ error: 'Failed to generate unique code' }, { status: 500 });

  // Update all owner collaborators for this entity with the new code
  for (const owner of ownerCollabs) {
    await base44.asServiceRole.entities.EntityCollaborator.update(owner.id, { access_code: newCode });
  }

  await base44.asServiceRole.entities.OperationLog.create({
    operation_type: 'owner_access_code_regenerated',
    entity_name: entity_type,
    entity_id,
    status: 'success',
    message: `Access code regenerated for ${entity_type}:${entity_id} by ${user.email}`,
    initiated_by: user.email,
    metadata: { entity_type, entity_id, acted_by_user_id: user.id },
  });

  return Response.json({ success: true, access_code: newCode });
});