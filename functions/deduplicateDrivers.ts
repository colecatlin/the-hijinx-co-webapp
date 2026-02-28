import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { areNameVariations } from './helpers/stringUtils.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no user) and admin-invoked calls
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const drivers = await base44.asServiceRole.entities.Driver.list('', 5000);

    // Group drivers purely by name similarity, without requiring date_of_birth to match
    const duplicateSets = [];
    const processed = new Set();

    for (let i = 0; i < drivers.length; i++) {
      if (processed.has(drivers[i].id)) continue;

      const driver1 = drivers[i];
      const potentialDupes = [driver1];

      // Look for matches with other drivers
      for (let j = i + 1; j < drivers.length; j++) {
        if (processed.has(drivers[j].id)) continue;

        const driver2 = drivers[j];

        // Check if first names and last names are variations of each other
        if (
          areNameVariations(driver1.first_name, driver2.first_name) &&
          areNameVariations(driver1.last_name, driver2.last_name)
        ) {
          potentialDupes.push(driver2);
          processed.add(driver2.id);
        }
      }

      if (potentialDupes.length > 1) {
        duplicateSets.push(potentialDupes);
        potentialDupes.forEach(d => processed.add(d.id));
      }
    }

    if (duplicateSets.length === 0) {
      return Response.json({ success: true, message: 'No duplicates found.', merged: [] });
    }

    const mergeLog = [];

    // Related entities that reference driver_id
    const relatedEntities = [
      'DriverMedia', 'DriverProgram', 'Results', 'EntityCollaborator', 'UserFollowDriver'
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
              await new Promise(r => setTimeout(r, 50)); // Small delay to avoid rate limits
            }
          } catch (_e) {
            // Entity may not exist or have driver_id field — skip silently
          }
        }

        // Delete the duplicate driver (only if no program)
        await base44.asServiceRole.entities.Driver.delete(dup.id);
        logEntry.duplicates_removed.push({ id: dup.id, name: `${dup.first_name} ${dup.last_name}` });
        await new Promise(r => setTimeout(r, 100)); // Delay between deletions
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