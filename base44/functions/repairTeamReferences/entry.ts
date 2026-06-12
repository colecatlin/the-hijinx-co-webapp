/**
 * repairTeamReferences.js
 *
 * Re-points all records that reference duplicate Team IDs to the canonical survivor.
 *
 * Repairs:
 *   - Entry.team_id
 *   - Results.team_id
 *   - DriverProgram.team_id
 *   - Vehicle.owner_team_id
 *   - Driver.team_id (primary team reference)
 *
 * Input:
 * {
 *   repairs: [{ survivor_id, survivor_name, duplicate_ids: [] }],
 *   dry_run?: boolean
 * }
 *
 * Output: { report: { updated_counts, skipped, warnings } }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { repairs = [], dry_run = false } = body;

    if (!repairs.length) {
      return Response.json({ success: true, message: 'No repairs provided.', report: {
        dry_run,
        updated_entries: 0, updated_results: 0, updated_driver_programs: 0,
        updated_vehicles: 0, updated_drivers: 0, skipped: [], warnings: [],
      }});
    }

    const report = {
      dry_run,
      updated_entries: 0,
      updated_results: 0,
      updated_driver_programs: 0,
      updated_vehicles: 0,
      updated_drivers: 0,
      skipped: [],
      warnings: [],
    };

    const models = {
      Entry:         base44.asServiceRole.entities.Entry,
      Results:       base44.asServiceRole.entities.Results,
      DriverProgram: base44.asServiceRole.entities.DriverProgram,
      Vehicle:       base44.asServiceRole.entities.Vehicle,
      Driver:        base44.asServiceRole.entities.Driver,
    };

    for (const { survivor_id, survivor_name, duplicate_ids = [] } of repairs) {
      if (!survivor_id || !duplicate_ids.length) {
        report.skipped.push({ reason: 'missing_survivor_or_duplicates', survivor_id });
        continue;
      }

      for (const dup_id of duplicate_ids) {
        if (!dup_id || dup_id === survivor_id) {
          report.skipped.push({ reason: 'invalid_dup_id', dup_id });
          continue;
        }

        const [e, r, dp, v, d] = await Promise.all([
          repairField(models.Entry,         'team_id',       dup_id, survivor_id, dry_run, report.warnings),
          repairField(models.Results,       'team_id',       dup_id, survivor_id, dry_run, report.warnings),
          repairField(models.DriverProgram, 'team_id',       dup_id, survivor_id, dry_run, report.warnings),
          repairField(models.Vehicle,       'owner_team_id', dup_id, survivor_id, dry_run, report.warnings),
          repairField(models.Driver,        'team_id',       dup_id, survivor_id, dry_run, report.warnings),
        ]);

        report.updated_entries         += e;
        report.updated_results         += r;
        report.updated_driver_programs += dp;
        report.updated_vehicles        += v;
        report.updated_drivers         += d;
      }
    }

    // OperationLog
    if (!dry_run) {
      const total = report.updated_entries + report.updated_results +
                    report.updated_driver_programs + report.updated_vehicles + report.updated_drivers;
      if (total > 0) {
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'team_references_repaired',
          entity_name: 'Team',
          status: 'success',
          metadata: {
            source_path: 'repairTeamReferences',
            repair_groups: repairs.length,
            updated_entries: report.updated_entries,
            updated_results: report.updated_results,
            updated_driver_programs: report.updated_driver_programs,
            updated_vehicles: report.updated_vehicles,
            updated_drivers: report.updated_drivers,
          },
        }).catch(() => {});
      }
    }

    return Response.json({ success: true, report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});