import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { entity_type, entity_id, message } = await req.json();
  if (!entity_type || !entity_id) {
    return Response.json({ error: 'entity_type and entity_id are required' }, { status: 400 });
  }

  const validTypes = ['Driver', 'Team', 'Track', 'Series'];
  if (!validTypes.includes(entity_type)) {
    return Response.json({ error: 'Invalid entity_type' }, { status: 400 });
  }

  // Check if entity exists and get its name
  let entityName = '';
  try {
    const entityMap = {
      Driver: base44.asServiceRole.entities.Driver,
      Team: base44.asServiceRole.entities.Team,
      Track: base44.asServiceRole.entities.Track,
      Series: base44.asServiceRole.entities.Series,
    };
    const found = await entityMap[entity_type].get(entity_id).catch(() => null);
    if (!found) return Response.json({ error: 'Entity not found' }, { status: 404 });
    entityName = found.first_name
      ? `${found.first_name} ${found.last_name}`
      : found.name || entity_id;
  } catch (err) {
    return Response.json({ error: 'Could not verify entity' }, { status: 500 });
  }

  // Prevent duplicate pending claim
  const existing = await base44.asServiceRole.entities.EntityClaimRequest.filter({
    user_id: user.id,
    entity_type,
    entity_id,
    status: 'pending',
  });
  if (existing && existing.length > 0) {
    return Response.json({ error: 'You already have a pending claim for this entity.' }, { status: 409 });
  }

  // Check if user already has collaborator access
  const collabs = await base44.asServiceRole.entities.EntityCollaborator.filter({
    user_id: user.id,
    entity_type,
    entity_id,
  });
  if (collabs && collabs.length > 0) {
    return Response.json({ error: 'You already have access to this entity.' }, { status: 409 });
  }

  // Safety: check if entity already has an owner
  const owners = await base44.asServiceRole.entities.EntityCollaborator.filter({
    entity_type,
    entity_id,
    role: 'owner',
  });
  if (owners && owners.length > 0) {
    return Response.json({ error: 'This entity already has an owner. Contact the current owner or an admin.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const claim = await base44.asServiceRole.entities.EntityClaimRequest.create({
    user_id: user.id,
    user_email: user.email,
    entity_type,
    entity_id,
    entity_name: entityName,
    justification: message || '',
    status: 'pending',
    created_at: now,
    updated_at: now,
  });

  await base44.asServiceRole.entities.OperationLog.create({
    operation_type: 'entity_claim_submitted',
    entity_name: 'EntityClaimRequest',
    entity_id: claim.id,
    status: 'success',
    message: `Claim submitted for ${entityName} (${entity_type}) by ${user.email}`,
    initiated_by: user.email,
    metadata: { entity_type, entity_id, entity_name: entityName },
  });

  return Response.json({ ok: true, claim_id: claim.id, entity_name: entityName });
});