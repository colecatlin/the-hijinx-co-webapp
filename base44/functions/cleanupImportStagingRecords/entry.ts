/**
 * cleanupImportStagingRecords.js
 *
 * Removes completed import staging records older than configurable retention period.
 * Covers: ImportedResultStaging, ImportedStandingStaging, ImportedEventStaging, ImportedClassStaging.
 *
 * Input:
 *   { dry_run?: boolean, retention_days?: number }
 *
 * Output:
 *   { ok, dry_run, retention_days, cutoff_date, totals: { scanned, deleted, retained }, by_entity }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const COMPLETED_STATUSES = new Set(['created', 'completed', 'applied', 'skipped', 'rejected', 'conflict']);

const STAGING_ENTITIES = [
  'ImportedResultStaging',
  'ImportedStandingStaging',
  'ImportedEventStaging',
  'ImportedClassStaging',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false; // default true (safe)
    const retention_days = body.retention_days || 30;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retention_days);
    const cutoff_date = cutoff.toISOString();

    const db = base44.asServiceRole;
    const totals = { scanned: 0, deleted: 0, retained: 0 };
    const by_entity = {};

    for (const entityName of STAGING_ENTITIES) {
      const entity = db.entities[entityName];
      if (!entity) {
        by_entity[entityName] = { scanned: 0, deleted: 0, retained: 0, note: 'entity_not_found' };
        continue;
      }

      // Load records in batches (max 500 per call)
      let records = [];
      try {
        records = await entity.list('-created_date', 500);
      } catch {
        by_entity[entityName] = { scanned: 0, deleted: 0, retained: 0, note: 'load_error' };
        continue;
      }

      let entityDeleted = 0;
      let entityRetained = 0;

      for (const record of records) {
        totals.scanned++;
        entityRetained++;

        const isCompleted = COMPLETED_STATUSES.has(record.import_status || record.status || '');
        const createdDate = record.created_date ? new Date(record.created_date) : null;
        const isExpired = createdDate && createdDate < cutoff;

        if (isCompleted && isExpired) {
          if (!dry_run) {
            try {
              await entity.delete(record.id);
              entityDeleted++;
              totals.deleted++;
              entityRetained--;
              totals.retained--;
            } catch {
              // Skip records that fail to delete
            }
          } else {
            // In dry-run: count as would-delete
            entityDeleted++;
            entityRetained--;
          }
        } else {
          totals.retained++;
        }
      }

      by_entity[entityName] = {
        scanned: records.length,
        deleted: entityDeleted,
        retained: entityRetained,
      };
    }

    // Adjust totals.retained for dry_run double-count
    if (dry_run) {
      totals.retained = totals.scanned - totals.deleted;
    }

    // Log the operation
    await db.entities.OperationLog.create({
      operation_type: 'import_staging_cleanup',
      status: 'success',
      entity_name: 'ImportedResultStaging',
      message: `${dry_run ? '[DRY RUN] ' : ''}Import staging cleanup: ${totals.deleted} records deleted, ${totals.retained} retained`,
      metadata: {
        dry_run,
        retention_days,
        cutoff_date,
        totals,
        by_entity,
        triggered_by: user.email,
      },
    }).catch(() => {});

    return Response.json({
      ok: true,
      dry_run,
      retention_days,
      cutoff_date,
      totals,
      by_entity,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});