import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, entity_id, required_role = 'editor' } = await req.json();

    // Admins always have access
    if (user.role === 'admin') {
      return Response.json({ 
        hasAccess: true, 
        reason: 'admin_user',
        user_id: user.id 
      });
    }

    // Check if user is a collaborator on this entity
    const collaborators = await base44.asServiceRole.entities.EntityCollaborator.filter({
      user_id: user.id,
      entity_type,
      entity_id
    });

    if (collaborators.length === 0) {
      return Response.json({ 
        hasAccess: false, 
        reason: 'no_collaboration_found' 
      }, { status: 403 });
    }

    const collaborator = collaborators[0];
    
    // Check role permissions
    const roleHierarchy = { 'owner': 2, 'editor': 1 };
    const requiredLevel = roleHierarchy[required_role] || 1;
    const userLevel = roleHierarchy[collaborator.role] || 0;

    if (userLevel < requiredLevel) {
      return Response.json({ 
        hasAccess: false, 
        reason: 'insufficient_permissions',
        user_role: collaborator.role,
        required_role
      }, { status: 403 });
    }

    return Response.json({ 
      hasAccess: true, 
      reason: 'collaborator',
      user_role: collaborator.role,
      user_id: user.id 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});