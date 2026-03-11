import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function generateNumericCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

async function generateUniqueCode(base44) {
  for (let i = 0; i < 20; i++) {
    const candidate = generateNumericCode();
    const existing = await base44.asServiceRole.entities.EntityCollaborator.filter({ access_code: candidate });
    if (!existing || existing.length === 0) return candidate;
  }
  return null;
}

const ENTITY_APIS = {
  Driver: 'Driver',
  Team: 'Team',
  Track: 'Track',
  Series: 'Series',
};

function getEntityName(entity_type, payload) {
  if (entity_type === 'Driver') {
    return [payload.first_name, payload.last_name].filter(Boolean).join(' ');
  }
  return payload.name || payload.full_name || entity_type;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { entity_type, payload } = await req.json();

  if (!entity_type || !payload) {
    return Response.json({ error: 'Missing required fields: entity_type, payload' }, { status: 400 });
  }

  if (!ENTITY_APIS[entity_type]) {
    return Response.json({ error: `Unsupported entity type: ${entity_type}` }, { status: 400 });
  }

  // Create the entity record
  const entityRecord = await base44.asServiceRole.entities[entity_type].create(payload);

  const entityId = entityRecord.id;
  const entityName = getEntityName(entity_type, entityRecord);

  // Generate access code
  const accessCode = await generateUniqueCode(base44);
  if (!accessCode) {
    return Response.json({ error: 'Failed to generate unique access code' }, { status: 500 });
  }

  // Create owner collaborator
  const collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
    user_id: user.id,
    user_email: user.email,
    entity_type,
    entity_id: entityId,
    entity_name: entityName,
    role: 'owner',
    access_code: accessCode,
  });

  // Log the operation
  await base44.asServiceRole.entities.OperationLog.create({
    operation_type: 'entity_created_with_ownership',
    entity_name: entity_type,
    entity_id: entityId,
    status: 'success',
    message: `${entity_type} "${entityName}" created by ${user.email} via onboarding`,
    initiated_by: user.email,
    metadata: {
      entity_type,
      entity_id: entityId,
      entity_name: entityName,
      acted_by_user_id: user.id,
    },
  });

  return Response.json({
    success: true,
    entity_id: entityId,
    entity_name: entityName,
    entity_type,
    access_code: accessCode,
    collaborator_id: collaborator.id,
  });
});