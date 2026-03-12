import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list();
    const collaborators = await base44.asServiceRole.entities.EntityCollaborator.list();
    
    let users_checked = 0;
    let users_backfilled = 0;
    const warnings = [];
    const backfilled_users = [];

    for (const u of users) {
      users_checked++;
      
      // Skip if already has valid primary entity
      if (u.primary_entity_type && u.primary_entity_id) {
        const hasAccess = collaborators.some(
          c => c.user_id === u.id && c.entity_type === u.primary_entity_type && c.entity_id === u.primary_entity_id
        );
        if (hasAccess) {
          continue; // Already valid
        }
      }

      // Get this user's collaborators
      const userCollabs = collaborators.filter(c => c.user_id === u.id || c.user_email === u.email);
      
      if (userCollabs.length === 0) {
        warnings.push({
          user_id: u.id,
          email: u.email,
          message: 'No EntityCollaborator records found',
        });
        continue;
      }

      // Choose a sensible primary entity
      // Priority: owned Track/Series > owned other > editor Track/Series > first editor
      const owned = userCollabs.filter(c => c.role === 'owner');
      const edited = userCollabs.filter(c => c.role === 'editor');
      
      const ownedTrackSeries = owned.find(c => ['Track', 'Series'].includes(c.entity_type));
      const ownedOther = owned[0];
      const editedTrackSeries = edited.find(c => ['Track', 'Series'].includes(c.entity_type));
      const editedFirst = edited[0];
      
      const chosen = ownedTrackSeries || ownedOther || editedTrackSeries || editedFirst;
      
      if (!chosen) {
        warnings.push({
          user_id: u.id,
          email: u.email,
          message: 'Could not determine suitable primary entity',
          collab_count: userCollabs.length,
        });
        continue;
      }

      // Update user with primary entity
      await base44.asServiceRole.entities.User.update(u.id, {
        primary_entity_type: chosen.entity_type,
        primary_entity_id: chosen.entity_id,
      });

      users_backfilled++;
      backfilled_users.push({
        user_id: u.id,
        email: u.email,
        primary_entity_type: chosen.entity_type,
        primary_entity_id: chosen.entity_id,
        entity_name: chosen.entity_name,
      });
    }

    // Log operation
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'primary_entity_context_backfill_completed',
      entity_name: 'User',
      status: 'success',
      message: `Backfilled primary entity context for ${users_backfilled} of ${users_checked} users`,
      total_records: users_checked,
      created_records: [{ entity: 'User', ids: backfilled_users.map(u => u.user_id) }],
      metadata: {
        users_backfilled,
        warnings: warnings.length,
      },
      initiated_by: user.email,
    });

    return Response.json({
      success: true,
      users_checked,
      users_backfilled,
      skipped: users_checked - users_backfilled,
      warnings,
      backfilled_users: backfilled_users.slice(0, 50), // Return first 50 as sample
    });
  } catch (error) {
    console.error('backfillPrimaryEntityContext error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});