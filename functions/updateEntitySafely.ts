import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, entity_id, data } = await req.json();

    // Admins can always update
    if (user.role !== 'admin') {
      // Check if user is a collaborator with editor+ role
      const collaborators = await base44.asServiceRole.entities.EntityCollaborator.filter({
        user_id: user.id,
        entity_type,
        entity_id
      });

      if (collaborators.length === 0) {
        return Response.json({ 
          error: 'You do not have permission to edit this entity' 
        }, { status: 403 });
      }

      const collaborator = collaborators[0];
      if (collaborator.role !== 'owner' && collaborator.role !== 'editor') {
        return Response.json({ 
          error: 'You do not have permission to edit this entity' 
        }, { status: 403 });
      }
    }

    // Perform the update using service role
    const updatedEntity = await base44.asServiceRole.entities[entity_type].update(entity_id, data);

    return Response.json({ success: true, data: updatedEntity });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});