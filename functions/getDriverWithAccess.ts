import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { driverId } = await req.json();

    if (!driverId) {
      return Response.json({ error: 'Driver ID is required' }, { status: 400 });
    }

    // Check if user is admin
    const isAdmin = user.role === 'admin';

    // Check if user has access via EntityCollaborator
    let hasAccess = isAdmin;

    if (!isAdmin) {
      const collaborators = await base44.entities.EntityCollaborator.filter({
        user_id: user.id,
        entity_type: 'Driver',
        entity_id: driverId,
      });
      hasAccess = collaborators.length > 0;
    }

    if (!hasAccess) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch the driver
    const driver = await base44.entities.Driver.get(driverId);

    return Response.json({ driver });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});