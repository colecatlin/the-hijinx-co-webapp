/**
 * repairDriverReferences.js
 *
 * Updates linked records that reference duplicate Driver IDs so they point to
 * the canonical survivor.
 *
 * Repaired entities:
 *   - Results.driver_id
 *   - Entry.driver_id
 *   - Standings.driver_id
 *   - DriverProgram.driver_id
 *   - DriverMedia.driver_id
 *
 * Input:
 *   {
 *     repairs: [{ survivor_id: string, duplicate_ids: string[] }],
 *     dry_run?: boolean
 *   }
 *
 * Output: repair counts per entity type
 *
 * Admin only. Does not hard-delete anything.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function repairField(model, fieldName, duplicateId, survivorId, dryRun, warnings) {
  const records = await model.filter({ [fieldName]: duplicateId }).catch(() => []);
  let updated = 0;
  if (!dryRun) {
    for (const r of records) {
      await model.update(r.id, { [fieldName]: survivorId })
        .catch(e => warnings.push(`${fieldName}_update_failed:${r.id}:${e.message}`));
      updated++;
    }
  } else {
    updated = records.length;
  }
  return updated;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { repairs = [], dry_run = false } = body;

    if (!repairs.length) {
      return Response.json({ success: true, message: 'No repairs to process.', report: {} });
    }

    const report = {
      dry_run,
      repairs_processed: repairs.length,
      updated_results:        0,
      updated_entries:        0,
      updated_standings:      0,
      updated_driver_programs: 0,
      updated_driver_media:   0,
      warnings: [],
    };

    const models = {
      Results:      base44.asServiceRole.entities.Results,
      Entry:        base44.asServiceRole.entities.Entry,
      Standings:    base44.asServiceRole.entities.Standings,
      DriverProgram: base44.asServiceRole.entities.DriverProgram,
      DriverMedia:  base44.asServiceRole.entities.DriverMedia,
    };

    for (const { survivor_id, duplicate_ids = [] } of repairs) {
      if (!survivor_id || !duplicate_ids.length) continue;

      for (const dupId of duplicate_ids) {
        const [r, e, s, dp, dm] = await Promise.all([
          repairField(models.Results,       'driver_id', dupId, survivor_id, dry_run, report.warnings),
          repairField(models.Entry,         'driver_id', dupId, survivor_id, dry_run, report.warnings),
          repairField(models.Standings,     'driver_id', dupId, survivor_id, dry_run, report.warnings),
          repairField(models.DriverProgram, 'driver_id', dupId, survivor_id, dry_run, report.warnings),
          repairField(models.DriverMedia,   'driver_id', dupId, survivor_id, dry_run, report.warnings),
        ]);

        report.updated_results          += r;
        report.updated_entries          += e;
        report.updated_standings        += s;
        report.updated_driver_programs  += dp;
        report.updated_driver_media     += dm;
      }
    }

    // ── OperationLog ──────────────────────────────────────────────────────────
    if (!dry_run) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'driver_references_repaired',
        entity_name: 'Driver',
        status: 'success',
        metadata: {
          source_path: 'repair_driver_references',
          repairs_processed: report.repairs_processed,
          updated_results:        report.updated_results,
          updated_entries:        report.updated_entries,
          updated_standings:      report.updated_standings,
          updated_driver_programs: report.updated_driver_programs,
          updated_driver_media:   report.updated_driver_media,
        },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});