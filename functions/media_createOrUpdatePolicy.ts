import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      policy_id,
      entity_id,
      user_id,
      policy_type,
      title,
      body_rich_text,
      version,
      active = true,
    } = payload;

    // Validate required fields
    if (!entity_id || !user_id || !policy_type || !title || !body_rich_text || version === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Authority check
    const isAdmin = user.role === 'admin';
    if (!isAdmin) {
      const collaborators = await base44.entities.EntityCollaborator.filter({
        user_id,
        entity_id,
      });
      const hasAccess = collaborators.some(c => c.role === 'owner');
      if (!hasAccess) {
        return Response.json({ error: 'Not authorized' }, { status: 403 });
      }
    }

    const now = new Date().toISOString();
    let policy = null;
    let operationType = null;

    if (policy_id) {
      // Update existing policy
      policy = await base44.entities.Policy.update(policy_id, {
        policy_type,
        title,
        body_rich_text,
        version,
        active,
        updated_at: now,
      });
      operationType = 'media_policy_updated';
    } else {
      // Create new policy
      policy = await base44.entities.Policy.create({
        entity_type: 'track', // Will be determined by issuer, but for now use track; in real scenario would need entity type
        entity_id,
        policy_type,
        title,
        body_rich_text,
        version,
        active,
      });
      operationType = 'media_policy_created';
    }

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: operationType,
      source_type: 'media',
      entity_name: 'Policy',
      entity_id: policy.id,
      status: 'success',
      metadata: {
        policy_id: policy.id,
        entity_id,
        user_id,
        policy_type,
      },
      notes: `Policy ${policy_id ? 'updated' : 'created'} by ${user.email}`,
    });

    return Response.json({ policy });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});