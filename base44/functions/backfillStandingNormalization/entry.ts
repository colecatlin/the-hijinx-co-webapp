import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function buildNormalizedStandingKey(seriesId, seasonYear, driverId, driverName) {
  if (!seriesId || !seasonYear) return null;
  if (driverId) return `standing:${seriesId}:${seasonYear}:${driverId}`;
  if (driverName) return `standing:${seriesId}:${seasonYear}:${normalizeName(driverName)}`;
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role === 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { dry_run = true } = body;

    const standings = await base44.asServiceRole.entities.Standings.list('-created_date', 1000);
    let backfilled_count = 0;
    let skipped = 0;
    const warnings = [];

    for (const standing of standings) {
      if (standing.normalized_standing_key) {
        skipped++;
        continue;
      }

      const key = buildNormalizedStandingKey(standing.series_id, standing.season_year, standing.driver_id, standing.driver_name);
      if (!key) {
        warnings.push(`Standing ${standing.id} cannot generate key`);
        skipped++;
        continue;
      }

      if (!dry_run) {
        await base44.asServiceRole.entities.Standings.update(standing.id, {
          normalized_standing_key: key,
        }).catch(err => {
          warnings.push(`Failed to update ${standing.id}: ${err.message}`);
        });
      }
      backfilled_count++;
    }

    if (!dry_run) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'standings_normalization_backfill_completed',
        entity_name: 'Standings',
        status: 'success',
        metadata: { backfilled: backfilled_count, skipped },
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      dry_run,
      total_standings: standings.length,
      keys_backfilled: backfilled_count,
      skipped,
      warnings,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});