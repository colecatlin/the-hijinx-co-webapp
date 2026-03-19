import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function buildNormalizedResultKey(sessionId, driverId, driverName) {
  if (!sessionId) return null;
  if (driverId) return `result:${sessionId}:${driverId}`;
  if (driverName) return `result:${sessionId}:${normalizeName(driverName)}`;
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role === 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { dry_run = true } = body;

    const results = await base44.asServiceRole.entities.Results.list('-created_date', 1000);
    let backfilled_count = 0;
    let skipped = 0;
    const warnings = [];

    for (const result of results) {
      if (result.normalized_result_key) {
        skipped++;
        continue;
      }

      if (!result.session_id) {
        warnings.push(`Result ${result.id} missing session_id — cannot generate key`);
        skipped++;
        continue;
      }

      const key = buildNormalizedResultKey(result.session_id, result.driver_id, result.driver_name);
      if (!key) {
        warnings.push(`Result ${result.id} cannot generate key — missing driver_id and driver_name`);
        skipped++;
        continue;
      }

      if (!dry_run) {
        await base44.asServiceRole.entities.Results.update(result.id, {
          normalized_result_key: key,
        }).catch(err => {
          warnings.push(`Failed to update ${result.id}: ${err.message}`);
        });
      }
      backfilled_count++;
    }

    if (!dry_run) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'result_normalization_backfill_completed',
        entity_name: 'Results',
        status: 'success',
        metadata: { backfilled: backfilled_count, skipped, warnings_count: warnings.length },
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      dry_run,
      total_results: results.length,
      keys_backfilled: backfilled_count,
      skipped,
      warnings,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});