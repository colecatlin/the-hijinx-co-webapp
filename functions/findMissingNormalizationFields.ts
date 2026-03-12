/**
 * findMissingNormalizationFields.js
 * 
 * Verifies that normalization fields exist where expected.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const sr = base44.asServiceRole;
    const missing_by_entity = {};
    const limit = 100;

    const entities = [
      { name: 'Driver', fields: ['normalized_name', 'canonical_slug'] },
      { name: 'Team', fields: ['normalized_name', 'canonical_slug'] },
      { name: 'Track', fields: ['normalized_name', 'canonical_slug', 'canonical_key'] },
      { name: 'Series', fields: ['normalized_name', 'canonical_slug', 'canonical_key'] },
      { name: 'Event', fields: ['normalized_event_key'] },
      { name: 'Session', fields: ['normalized_session_key'] },
      { name: 'Results', fields: ['normalized_result_key'] },
      { name: 'Entry', fields: ['normalized_entry_key'] },
      { name: 'SeriesClass', fields: ['normalized_series_class_key'] },
      { name: 'EventClass', fields: ['normalized_event_class_key'] },
    ];

    for (const entityDef of entities) {
      let offset = 0;
      let missingCount = 0;

      while (true) {
        const batch = await sr.entities[entityDef.name].list('-created_date', limit, offset);
        if (!batch || batch.length === 0) break;
        offset += batch.length;

        for (const record of batch) {
          for (const field of entityDef.fields) {
            if (!record[field]) {
              missingCount++;
              break; // Count once per record, not per field
            }
          }
        }
      }

      missing_by_entity[entityDef.name] = missingCount;
    }

    return Response.json({
      missing_by_entity,
      total_missing: Object.values(missing_by_entity).reduce((sum, v) => sum + v, 0),
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});