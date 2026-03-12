import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role === 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const results = await base44.asServiceRole.entities.Results.list('-created_date', 2000);
    const groups = {};

    for (const result of results) {
      const key = result.normalized_result_key;
      if (!key) continue;
      if (!groups[key]) groups[key] = [];
      groups[key].push(result);
    }

    const duplicateGroups = [];
    for (const [key, records] of Object.entries(groups)) {
      if (records.length > 1) {
        duplicateGroups.push({
          key,
          count: records.length,
          record_ids: records.map(r => r.id),
          driver_ids: [...new Set(records.map(r => r.driver_id).filter(Boolean))],
          session_ids: [...new Set(records.map(r => r.session_id).filter(Boolean))],
        });
      }
    }

    return Response.json({
      success: true,
      total_results: results.length,
      candidates_checked: results.filter(r => r.normalized_result_key).length,
      duplicate_groups: duplicateGroups,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});