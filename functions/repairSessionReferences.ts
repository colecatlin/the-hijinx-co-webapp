/**
 * repairSessionReferences.js
 *
 * Updates linked records that reference duplicate Session IDs so they point to
 * the canonical survivor.
 *
 * Repaired entities:
 *   - Results.session_id
 *   - Standings.session_id (if field exists)
 *   - Entry.session_id (if field exists)
 *
 * Input:
 *   {
 *     repairs: [{ survivor_id: string, duplicate_ids: string[] }],
 *     dry_run?: boolean
 *   }
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
      return Response.json({ success: true, message: 'No repairs to process.' });
    }

    const report = {
      dry_run,
      repairs_processed: repairs.length,
      updated_results:   0,
      updated_standings: 0,
      updated_entries:   0,
      warnings: [],
    };

    for (const { survivor_id, duplicate_ids = [] } of repairs) {
      if (!survivor_id || !duplicate_ids.length) continue;
      for (const dupId of duplicate_ids) {
        const [res, std, ent] = await Promise.all([
          repairField(base44.asServiceRole.entities.Results,   'session_id', dupId, survivor_id, dry_run, report.warnings),
          repairField(base44.asServiceRole.entities.Standings, 'session_id', dupId, survivor_id, dry_run, report.warnings),
          repairField(base44.asServiceRole.entities.Entry,     'session_id', dupId, survivor_id, dry_run, report.warnings),
        ]);
        report.updated_results   += res;
        report.updated_standings += std;
        report.updated_entries   += ent;
      }
    }

    if (!dry_run) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'session_references_repaired',
        entity_name: 'Session',
        status: 'success',
        metadata: { source_path: 'repair_session_references', repairs_processed: report.repairs_processed, updated_results: report.updated_results, updated_standings: report.updated_standings, updated_entries: report.updated_entries },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});