import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, source_entity_id, name, slug, owner_user_id, manager_user_ids } = await req.json();

    if (!entity_type || !source_entity_id || !name) {
      return Response.json({ error: 'entity_type, source_entity_id, and name are required' }, { status: 400 });
    }

    const validTypes = ['driver', 'team', 'track', 'series', 'event'];
    if (!validTypes.includes(entity_type)) {
      return Response.json({ error: `entity_type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    // Check for existing Entity with this (entity_type, source_entity_id) pair
    const existing = await base44.asServiceRole.entities.Entity.filter({
      entity_type,
      source_entity_id,
    });

    if (existing && existing.length > 0) {
      // Return the existing entity — optionally update name/slug if they drifted
      const record = existing[0];
      const needsUpdate = record.name !== name || (slug && record.slug !== slug);
      if (needsUpdate) {
        const now = new Date().toISOString();
        await base44.asServiceRole.entities.Entity.update(record.id, {
          name,
          ...(slug !== undefined && { slug }),
          updated_at: now,
        });
        return Response.json({ entity: { ...record, name, slug: slug ?? record.slug }, created: false, updated: true });
      }
      return Response.json({ entity: record, created: false, updated: false });
    }

    // Create new Entity record
    const now = new Date().toISOString();
    const entity = await base44.asServiceRole.entities.Entity.create({
      entity_type,
      source_entity_id,
      name,
      ...(slug && { slug }),
      ...(owner_user_id && { owner_user_id }),
      ...(manager_user_ids && { manager_user_ids }),
      created_at: now,
      updated_at: now,
    });

    return Response.json({ entity, created: true, updated: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});