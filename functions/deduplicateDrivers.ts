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

    // Helper function to normalize names for comparison
    const normalizeName = (name) => {
      return (name || '').toLowerCase().trim();
    };

    // Helper function to check if names are likely variations of each other
    const areNameVariations = (name1, name2) => {
      const n1 = normalizeName(name1);
      const n2 = normalizeName(name2);
      
      // Exact match
      if (n1 === n2) return true;
      
      // One contains the other (e.g., "Perez De Lara" and "Perez")
      if (n1.includes(n2) || n2.includes(n1)) return true;
      
      // Check if all words from shorter name are in longer name
      const shorter = n1.length <= n2.length ? n1 : n2;
      const longer = n1.length > n2.length ? n1 : n2;
      const shorterWords = shorter.split(/\s+/);
      const longerWords = longer.split(/\s+/);
      
      if (shorterWords.length < longerWords.length) {
        const allWordsMatch = shorterWords.every(w => longerWords.some(lw => lw === w || lw.startsWith(w)));
        if (allWordsMatch) return true;
      }
      
      return false;
    };

    // Group drivers by first_name + date_of_birth first, then check last names
    const groups = {};
    for (const driver of drivers) {
      const baseKey = [
        normalizeName(driver.first_name),
        (driver.date_of_birth || 'unknown'),
      ].join('|');
      if (!groups[baseKey]) groups[baseKey] = [];
      groups[baseKey].push(driver);
    }

    // Now refine groups: split groups where last names don't match
    const refinedGroups = [];
    for (const group of Object.values(groups)) {
      const subgroups = {};
      for (const driver of group) {
        let foundGroup = false;
        
        // Try to match with existing subgroups based on last name variations
        for (const lastNameKey of Object.keys(subgroups)) {
          const existing = subgroups[lastNameKey][0];
          if (areNameVariations(driver.last_name, existing.last_name)) {
            subgroups[lastNameKey].push(driver);
            foundGroup = true;
            break;
          }
        }
        
        // If no match found, create new subgroup
        if (!foundGroup) {
          const key = normalizeName(driver.last_name);
          if (!subgroups[key]) subgroups[key] = [];
          subgroups[key].push(driver);
        }
      }
      
      refinedGroups.push(...Object.values(subgroups));
    }

    const duplicateSets = refinedGroups.filter(g => g.length > 1);

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