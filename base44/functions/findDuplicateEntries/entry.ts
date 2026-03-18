/**
 * findDuplicateEntries.js
 * Groups entries by normalized_entry_key to detect duplicates.
 * 
 * Returns duplicate groups with their record IDs, event_ids, driver_ids, class_ids.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const duplicateGroups = [];
    const keyMap = {};
    let total = 0;
    let offset = 0;
    const limit = 100;

    while (true) {
      const batch = await base44.asServiceRole.entities.Entry.list('-updated_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;
      total += batch.length;

      for (const entry of batch) {
        const key = entry.normalized_entry_key;
        if (!key) continue;

        if (!keyMap[key]) {
          keyMap[key] = {
            key,
            record_ids: [],
            event_ids: new Set(),
            driver_ids: new Set(),
            class_ids: new Set(),
          };
        }

        keyMap[key].record_ids.push(entry.id);
        if (entry.event_id) keyMap[key].event_ids.add(entry.event_id);
        if (entry.driver_id) keyMap[key].driver_ids.add(entry.driver_id);
        if (entry.event_class_id) keyMap[key].class_ids.add(entry.event_class_id);
      }
    }

    // Convert to array and filter duplicates
    for (const [key, group] of Object.entries(keyMap)) {
      if (group.record_ids.length > 1) {
        duplicateGroups.push({
          key,
          record_ids: group.record_ids,
          event_ids: Array.from(group.event_ids),
          driver_ids: Array.from(group.driver_ids),
          class_ids: Array.from(group.class_ids),
        });
      }
    }

    return Response.json({
      success: true,
      total_entries: total,
      candidates_checked: Object.keys(keyMap).length,
      duplicate_groups: duplicateGroups,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});