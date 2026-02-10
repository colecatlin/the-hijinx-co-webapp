import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessCode } = await req.json();

    if (!accessCode) {
      return Response.json({ error: 'Access code required' }, { status: 400 });
    }

    // Check if user is admin
    if (user.role === 'admin') {
      // Admin can access any entity by code - find it
      const drivers = await base44.asServiceRole.entities.Driver.filter({ numeric_id: accessCode });
      if (drivers.length > 0) {
        return Response.json({ entity: drivers[0], entityType: 'Driver', entityId: drivers[0].id });
      }

      const series = await base44.asServiceRole.entities.Series.filter({ numeric_id: accessCode });
      if (series.length > 0) {
        return Response.json({ entity: series[0], entityType: 'Series', entityId: series[0].id });
      }

      const teams = await base44.asServiceRole.entities.Team.filter({ numeric_id: accessCode });
      if (teams.length > 0) {
        return Response.json({ entity: teams[0], entityType: 'Team', entityId: teams[0].id });
      }

      const tracks = await base44.asServiceRole.entities.Track.filter({ numeric_id: accessCode });
      if (tracks.length > 0) {
        return Response.json({ entity: tracks[0], entityType: 'Track', entityId: tracks[0].id });
      }

      const standings = await base44.asServiceRole.entities.StandingsEntry.filter({ numeric_id: accessCode });
      if (standings.length > 0) {
        return Response.json({ entity: standings[0], entityType: 'StandingsEntry', entityId: standings[0].id });
      }

      return Response.json({ error: 'Entity not found' }, { status: 404 });
    }

    // Non-admin users check collaborator status
    const collaborators = await base44.entities.EntityCollaborator.filter({ user_id: user.id });
    const collaborator = collaborators.find(c => {
      // We need to verify the entity has this access code
      return c.access_code === accessCode;
    });

    if (!collaborator) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch the actual entity
    const entity = await base44.entities[collaborator.entity_type].get(collaborator.entity_id);

    return Response.json({
      entity,
      entityType: collaborator.entity_type,
      entityId: collaborator.entity_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});