import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code) {
      return Response.json({ error: 'Access code is required' }, { status: 400 });
    }

    // Entity types to check
    const entityTypes = [
      { entityName: 'Driver', displayName: (e) => `${e.first_name} ${e.last_name}` },
      { entityName: 'Series', displayName: (e) => e.name },
      { entityName: 'Team', displayName: (e) => e.name },
      { entityName: 'Track', displayName: (e) => e.name },
    ];

    for (const { entityName, displayName } of entityTypes) {
      const results = await base44.asServiceRole.entities[entityName].filter({ numeric_id: code });
      if (results.length > 0) {
        const entity = results[0];
        const collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
          user_id: user.id,
          user_email: user.email,
          entity_type: entityName,
          entity_id: entity.id,
          entity_name: displayName(entity),
          access_code: code,
          role: 'editor'
        });

        return Response.json({
          success: true,
          entity,
          entityType: entityName,
          entityId: entity.id,
          collaborator: collaborator.id
        });
      }
    }

    return Response.json({ error: 'Invalid access code' }, { status: 404 });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});