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
    
    let valid_primary_context_count = 0;
    let missing_primary_context_count = 0;
    let invalid_primary_context_count = 0;
    let legacy_conflict_count = 0;
    
    const affected_user_ids = [];
    const warnings = [];
    const failures = [];

    for (const u of users) {
      const userCollabs = collaborators.filter(c => c.user_id === u.id || c.user_email === u.email);
      
      // Check primary entity validity
      if (u.primary_entity_type && u.primary_entity_id) {
        const hasPrimaryAccess = userCollabs.some(
          c => c.entity_type === u.primary_entity_type && c.entity_id === u.primary_entity_id
        );
        
        if (hasPrimaryAccess) {
          valid_primary_context_count++;
        } else {
          invalid_primary_context_count++;
          affected_user_ids.push(u.id);
          warnings.push({
            user_id: u.id,
            email: u.email,
            type: 'invalid_primary_entity',
            primary_type: u.primary_entity_type,
            primary_id: u.primary_entity_id,
            message: 'User has primary entity but no valid EntityCollaborator access',
          });
        }
      } else if (userCollabs.length > 0) {
        missing_primary_context_count++;
        affected_user_ids.push(u.id);
        warnings.push({
          user_id: u.id,
          email: u.email,
          type: 'missing_primary_entity',
          collab_count: userCollabs.length,
          message: 'User has managed entities but primary_entity_type/id not set',
        });
      }

      // Check legacy field conflicts
      const legacy = u.data || {};
      const legacyFields = {
        driver_id: legacy.driver_id,
        team_id: legacy.team_id,
        series_id: legacy.series_id,
        track_id: legacy.track_id,
      };

      for (const [field, entityId] of Object.entries(legacyFields)) {
        if (!entityId) continue;
        
        const entityType = field.replace('_id', '').charAt(0).toUpperCase() + field.slice(1, -3);
        const hasAccess = userCollabs.some(
          c => c.entity_type === entityType && c.entity_id === entityId
        );
        
        if (!hasAccess) {
          legacy_conflict_count++;
          affected_user_ids.push(u.id);
          failures.push({
            user_id: u.id,
            email: u.email,
            type: `legacy_${field}_not_managed`,
            legacy_value: entityId,
            message: `Legacy ${field} has no EntityCollaborator record`,
          });
        }
      }
    }

    // Log operation
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'user_context_integrity_verification_completed',
      entity_name: 'User',
      status: 'success',
      message: `User context integrity check completed`,
      total_records: users.length,
      metadata: {
        valid_primary_context_count,
        missing_primary_context_count,
        invalid_primary_context_count,
        legacy_conflict_count,
        affected_user_count: new Set(affected_user_ids).size,
      },
      initiated_by: user.email,
    });

    return Response.json({
      success: true,
      users_checked: users.length,
      valid_primary_context_count,
      missing_primary_context_count,
      invalid_primary_context_count,
      legacy_conflict_count,
      affected_users: new Set(affected_user_ids).size,
      warnings: warnings.slice(0, 100), // Return first 100
      failures: failures.slice(0, 100),
      all_warnings_count: warnings.length,
      all_failures_count: failures.length,
    });
  } catch (error) {
    console.error('verifyUserContextIntegrity error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});