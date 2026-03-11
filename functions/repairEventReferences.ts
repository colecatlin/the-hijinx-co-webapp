/**
 * repairEventReferences.js
 *
 * Updates linked records that reference duplicate Event IDs so they point to
 * the canonical survivor.
 *
 * Repaired entities:
 *   - Session.event_id
 *   - Entry.event_id
 *   - Results.event_id
 *   - Standings.event_id
 *   - EventClass.event_id
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
      updated_sessions:     0,
      updated_entries:      0,
      updated_results:      0,
      updated_standings:    0,
      updated_event_classes: 0,
      warnings: [],
    };

    const models = {
      Session:    base44.asServiceRole.entities.Session,
      Entry:      base44.asServiceRole.entities.Entry,
      Results:    base44.asServiceRole.entities.Results,
      Standings:  base44.asServiceRole.entities.Standings,
      EventClass: base44.asServiceRole.entities.EventClass,
    };

    for (const { survivor_id, duplicate_ids = [] } of repairs) {
      if (!survivor_id || !duplicate_ids.length) continue;

      for (const dupId of duplicate_ids) {
        const [sess, ent, res, std, ec] = await Promise.all([
          repairField(models.Session,    'event_id', dupId, survivor_id, dry_run, report.warnings),
          repairField(models.Entry,      'event_id', dupId, survivor_id, dry_run, report.warnings),
          repairField(models.Results,    'event_id', dupId, survivor_id, dry_run, report.warnings),
          repairField(models.Standings,  'event_id', dupId, survivor_id, dry_run, report.warnings),
          repairField(models.EventClass, 'event_id', dupId, survivor_id, dry_run, report.warnings),
        ]);

        report.updated_sessions      += sess;
        report.updated_entries       += ent;
        report.updated_results       += res;
        report.updated_standings     += std;
        report.updated_event_classes += ec;
      }
    }

    if (!dry_run) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'event_references_repaired',
        entity_name: 'Event',
        status: 'success',
        metadata: {
          source_path: 'repair_event_references',
          repairs_processed: report.repairs_processed,
          updated_sessions:      report.updated_sessions,
          updated_entries:       report.updated_entries,
          updated_results:       report.updated_results,
          updated_standings:     report.updated_standings,
          updated_event_classes: report.updated_event_classes,
        },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});