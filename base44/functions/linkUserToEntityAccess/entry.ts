import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_ENTITY_TYPES = ['Driver', 'Team', 'Track', 'Series', 'Event'];
const ROLE_RANK = { owner: 2, editor: 1 };

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id, user_email, entity_type, entity_id, role, access_code, source } = await req.json();

  if (!user_id || !user_email || !entity_type || !entity_id || !role) {
    return Response.json({ error: 'Missing required fields: user_id, user_email, entity_type, entity_id, role' }, { status: 400 });
  }

  if (!ALLOWED_ENTITY_TYPES.includes(entity_type)) {
    return Response.json({ error: `Invalid entity_type. Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}` }, { status: 400 });
  }

  if (!ROLE_RANK[role]) {
    return Response.json({ error: 'Invalid role. Allowed: owner, editor' }, { status: 400 });
  }

  // Check for existing collaborator record
  const existing = await base44.asServiceRole.entities.EntityCollaborator.filter({
    user_id,
    entity_type,
    entity_id,
  });

  let collaborator;
  let action;

  if (existing && existing.length > 0) {
    const record = existing[0];
    const existingRank = ROLE_RANK[record.role] || 0;
    const incomingRank = ROLE_RANK[role] || 0;

    const shouldUpgradeRole = incomingRank > existingRank;
    const shouldPreserveCode = record.access_code && !access_code;

    if (shouldUpgradeRole) {
      collaborator = await base44.asServiceRole.entities.EntityCollaborator.update(record.id, {
        role,
        ...(access_code ? { access_code } : {}),
      });
      action = 'updated';
    } else {
      // Unchanged — but touch access_code if it was missing and we now have one
      if (access_code && !record.access_code) {
        collaborator = await base44.asServiceRole.entities.EntityCollaborator.update(record.id, {
          access_code,
        });
        action = 'updated';
      } else {
        collaborator = record;
        action = 'unchanged';
      }
    }
  } else {
    // Resolve entity_name for the collaborator record
    let entity_name = '';
    try {
      const entityMap = {
        Driver: base44.asServiceRole.entities.Driver,
        Team: base44.asServiceRole.entities.Team,
        Track: base44.asServiceRole.entities.Track,
        Series: base44.asServiceRole.entities.Series,
        Event: base44.asServiceRole.entities.Event,
      };
      const record = await entityMap[entity_type].get(entity_id);
      entity_name = record?.name || record?.full_name || (record ? `${record.first_name || ''} ${record.last_name || ''}`.trim() : '') || entity_id;
    } catch (_) {
      entity_name = entity_id;
    }

    collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
      user_id,
      user_email,
      entity_type,
      entity_id,
      entity_name,
      role,
      access_code: access_code || '',
    });
    action = 'created';
  }

  // Write OperationLog
  await base44.asServiceRole.entities.OperationLog.create({
    operation_type: 'entity_access_linked',
    entity_name: 'EntityCollaborator',
    status: 'success',
    metadata: { user_id, entity_type, entity_id, role, source: source || 'linkUserToEntityAccess' },
  });

  return Response.json({ action, collaborator });
});