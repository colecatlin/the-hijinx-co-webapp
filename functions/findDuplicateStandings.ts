import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role === 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const standings = await base44.asServiceRole.entities.Standings.list('-created_date', 2000);
    const groups = {};

    for (const standing of standings) {
      const key = standing.normalized_standing_key;
      if (!key) continue;
      if (!groups[key]) groups[key] = [];
      groups[key].push(standing);
    }

    const duplicateGroups = [];
    for (const [key, records] of Object.entries(groups)) {
      if (records.length > 1) {
        duplicateGroups.push({
          key,
          count: records.length,
          record_ids: records.map(r => r.id),
          driver_ids: [...new Set(records.map(r => r.driver_id).filter(Boolean))],
          series_ids: [...new Set(records.map(r => r.series_id).filter(Boolean))],
          seasons: [...new Set(records.map(r => r.season_year).filter(Boolean))],
        });
      }
    }

    return Response.json({
      success: true,
      total_standings: standings.length,
      candidates_checked: standings.filter(s => s.normalized_standing_key).length,
      duplicate_groups: duplicateGroups,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});