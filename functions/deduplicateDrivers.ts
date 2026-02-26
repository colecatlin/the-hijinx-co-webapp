import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no user) and admin-invoked calls
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const drivers = await base44.asServiceRole.entities.Driver.list();

    // Group drivers by first_name + last_name + date_of_birth
    const groups = {};
    for (const driver of drivers) {
      const key = [
        (driver.first_name || '').toLowerCase().trim(),
        (driver.last_name || '').toLowerCase().trim(),
        (driver.date_of_birth || 'unknown'),
      ].join('|');
      if (!groups[key]) groups[key] = [];
      groups[key].push(driver);
    }

    const duplicateSets = Object.values(groups).filter(g => g.length > 1);

    if (duplicateSets.length === 0) {
      return Response.json({ success: true, message: 'No duplicates found.', merged: [] });
    }

    const mergeLog = [];

    // Related entities that reference driver_id
    const relatedEntities = [
      'DriverMedia', 'DriverProgram', 'Results', 'DriverPartnership',
      'DriverPerformance', 'DriverCommunity', 'EntityCollaborator', 'UserFollowDriver'
    ];

    for (const group of duplicateSets) {
      // Sort by created_date ascending — keep the oldest as master
      group.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      const master = group[0];
      const duplicates = group.slice(1);

      const logEntry = {
        master_id: master.id,
        master_name: `${master.first_name} ${master.last_name}`,
        duplicates_removed: [],
        duplicates_kept: [],
      };

      for (const dup of duplicates) {
        // Check if duplicate has any registered programs
        let hasProgram = false;
        try {
          const programs = await base44.asServiceRole.entities.DriverProgram.filter({ driver_id: dup.id });
          hasProgram = programs.length > 0;
        } catch (_e) {
          // DriverProgram entity may not exist — treat as no program
        }

        if (hasProgram) {
          // Keep this duplicate because it has a registered program
          logEntry.duplicates_kept.push({ id: dup.id, name: `${dup.first_name} ${dup.last_name}` });
          continue;
        }

        // Migrate related records to master
        for (const entityName of relatedEntities) {
          try {
            const records = await base44.asServiceRole.entities[entityName].filter({ driver_id: dup.id });
            for (const record of records) {
              await base44.asServiceRole.entities[entityName].update(record.id, { driver_id: master.id });
            }
          } catch (_e) {
            // Entity may not exist or have driver_id field — skip silently
          }
        }

        // Delete the duplicate driver (only if no program)
        await base44.asServiceRole.entities.Driver.delete(dup.id);
        logEntry.duplicates_removed.push({ id: dup.id, name: `${dup.first_name} ${dup.last_name}` });
      }

      mergeLog.push(logEntry);
    }

    return Response.json({
      success: true,
      duplicate_sets_found: duplicateSets.length,
      merged: mergeLog,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});