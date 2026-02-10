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

    // Find the entity by numeric_id (access code)
    const drivers = await base44.asServiceRole.entities.Driver.filter({ numeric_id: code });
    if (drivers.length > 0) {
      const driver = drivers[0];
      
      // Create EntityCollaborator record for this user
      const collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
        user_id: user.id,
        user_email: user.email,
        entity_type: 'Driver',
        entity_id: driver.id,
        entity_name: `${driver.first_name} ${driver.last_name}`,
        access_code: code,
        role: 'editor'
      });

      return Response.json({
        success: true,
        entity: driver,
        entityType: 'Driver',
        entityId: driver.id,
        collaborator: collaborator.id
      });
    }

    // Check other entity types similarly
    const series = await base44.asServiceRole.entities.Series.filter({ numeric_id: code });
    if (series.length > 0) {
      const s = series[0];
      const collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
        user_id: user.id,
        user_email: user.email,
        entity_type: 'Series',
        entity_id: s.id,
        entity_name: s.name,
        access_code: code,
        role: 'editor'
      });

      return Response.json({
        success: true,
        entity: s,
        entityType: 'Series',
        entityId: s.id,
        collaborator: collaborator.id
      });
    }

    const teams = await base44.asServiceRole.entities.Team.filter({ numeric_id: code });
    if (teams.length > 0) {
      const t = teams[0];
      const collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
        user_id: user.id,
        user_email: user.email,
        entity_type: 'Team',
        entity_id: t.id,
        entity_name: t.name,
        access_code: code,
        role: 'editor'
      });

      return Response.json({
        success: true,
        entity: t,
        entityType: 'Team',
        entityId: t.id,
        collaborator: collaborator.id
      });
    }

    const tracks = await base44.asServiceRole.entities.Track.filter({ numeric_id: code });
    if (tracks.length > 0) {
      const tr = tracks[0];
      const collaborator = await base44.asServiceRole.entities.EntityCollaborator.create({
        user_id: user.id,
        user_email: user.email,
        entity_type: 'Track',
        entity_id: tr.id,
        entity_name: tr.name,
        access_code: code,
        role: 'editor'
      });

      return Response.json({
        success: true,
        entity: tr,
        entityType: 'Track',
        entityId: tr.id,
        collaborator: collaborator.id
      });
    }

    return Response.json({ error: 'Invalid access code' }, { status: 404 });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});