import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role === 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { dry_run = true } = body;

    const standings = await base44.asServiceRole.entities.Standings.list('-created_date', 2000);
    const groups = {};

    for (const standing of standings) {
      const key = standing.normalized_standing_key;
      if (!key) continue;
      if (!groups[key]) groups[key] = [];
      groups[key].push(standing);
    }

    let groups_processed = 0;
    const duplicates_marked_inactive = [];
    const warnings = [];

    for (const [key, records] of Object.entries(groups)) {
      if (records.length <= 1) continue;

      // Select survivor: oldest (smallest created_date)
      const survivor = records.reduce((a, b) => {
        const aDate = new Date(a.created_date).getTime();
        const bDate = new Date(b.created_date).getTime();
        return aDate < bDate ? a : b;
      });

      // Mark duplicates inactive
      for (const dup of records) {
        if (dup.id === survivor.id) continue;
        if (!dry_run) {
          await base44.asServiceRole.entities.Standings.update(dup.id, {
            notes: `${dup.notes ? dup.notes + ' | ' : ''}DUPLICATE_OF:${survivor.id}`,
          }).catch(err => warnings.push(`Failed to mark ${dup.id} inactive: ${err.message}`));
        }
        duplicates_marked_inactive.push({
          id: dup.id,
          survivor_id: survivor.id,
        });
      }

      groups_processed++;
    }

    if (!dry_run) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'standing_duplicate_repair_completed',
        entity_name: 'Standings',
        status: 'success',
        metadata: { groups_processed, duplicates_marked: duplicates_marked_inactive.length },
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      dry_run,
      groups_processed,
      duplicates_marked_inactive,
      warnings,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});