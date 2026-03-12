import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_ENTITY_TYPES = ['Driver', 'Team', 'Track', 'Series', 'Event'];
const ROLE_RANK = { owner: 2, editor: 1 };

async function resolveEntityName(base44, entity_type, entity_id) {
  try {
    const entityMap = {
      Driver: base44.asServiceRole.entities.Driver,
      Team: base44.asServiceRole.entities.Team,
      Track: base44.asServiceRole.entities.Track,
      Series: base44.asServiceRole.entities.Series,
      Event: base44.asServiceRole.entities.Event,
    };
    const record = await entityMap[entity_type].get(entity_id);
    return record?.name || record?.full_name ||
      (record ? `${record.first_name || ''} ${record.last_name || ''}`.trim() : '') ||
      entity_id;
  } catch (_e) {
    return entity_id;
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { user_id, user_email, entity_type, entity_id, entity_name, role, access_code, source } = await req.json();

  if (!user_id || !user_email || !entity_type || !entity_id || !role) {
    return Response.json({ ok: false, error: 'Missing required fields: user_id, user_email, entity_type, entity_id, role' }, { status: 400 });
  }

  if (!ALLOWED_ENTITY_TYPES.includes(entity_type)) {
    return Response.json({ ok: false, error: `Invalid entity_type. Allowed: ${ALLOWED_ENTITY_TYPES.join(', ')}` }, { status: 400 });
  }

  if (!ROLE_RANK[role]) {
    return Response.json({ ok: false, error: 'Invalid role. Allowed: owner, editor' }, { status: 400 });
  }

  try {
    const existing = await base44.asServiceRole.entities.EntityCollaborator.filter({
      user_id, entity_type, entity_id,
    });

    let collaborator;
    let action;

    if (existing && existing.length > 0) {
      const record = existing[0];
      const existingRank = ROLE_RANK[record.role] || 0;
      const incomingRank = ROLE_RANK[role] || 0;

      if (incomingRank > existingRank) {
        collaborator = await base44.asServiceRole.entities.EntityCollaborator.update(record.id, {
          role,
          ...(access_code ? { access_code } : {}),
        });
        action = 'updated';
      } else if (access_code && !record.access_code) {
        collaborator = await base44.asServiceRole.entities.EntityCollaborator.update(record.id, { access_code });
        action = 'updated';
      } else {
        collaborator = record;
        action = 'unchanged';
      }
    } else {
      const resolvedName = entity_name || await resolveEntityName(base44, entity_type, entity_id);
      collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
        user_id, user_email, entity_type, entity_id,
        entity_name: resolvedName,
        role,
        access_code: access_code || '',
      });
      action = 'created';
    }

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_access_linked',
      entity_name: 'EntityCollaborator',
      status: 'success',
      metadata: { user_id, user_email, entity_type, entity_id, role, action, source: source || 'performEntityAccessGrant' },
    });

    return Response.json({ ok: true, action, collaborator });
  } catch (err) {
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entity_access_link_failed',
      entity_name: 'EntityCollaborator',
      status: 'error',
      metadata: { user_id, user_email, entity_type, entity_id, role, source: source || 'performEntityAccessGrant', error: err.message },
    });
    return Response.json({ ok: false, error: err.message || 'Failed to create collaborator record.' }, { status: 500 });
  }
});