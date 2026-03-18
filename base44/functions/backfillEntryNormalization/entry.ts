/**
 * backfillEntryNormalization.js
 * Populates normalized_entry_key on all Entry records.
 * 
 * For each entry:
 * - generate normalized_entry_key based on event_id, driver_id, and class_id
 * - if driver_id missing, use normalized driver_name as fallback
 * - skip entries missing event_id
 * 
 * Returns count of backfilled, skipped, and warnings.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function buildNormalizedEntryKey(event_id, driver_id, driver_name, class_id) {
  if (!event_id) return null;
  const classPart = class_id || 'none';
  if (driver_id) return `entry:${event_id}:${driver_id}:${classPart}`;
  if (driver_name) return `entry:${event_id}:${normalizeName(driver_name)}:${classPart}`;
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let total = 0, backfilled = 0, skipped = 0;
    const warnings = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const batch = await base44.asServiceRole.entities.Entry.list('-updated_date', limit, offset);
      if (!batch || batch.length === 0) break;
      offset += batch.length;
      total += batch.length;

      for (const entry of batch) {
        const key = buildNormalizedEntryKey(
          entry.event_id,
          entry.driver_id,
          entry.driver_name,
          entry.event_class_id || entry.series_class_id
        );

        if (!key) {
          skipped++;
          if (!entry.event_id) {
            warnings.push(`Entry ${entry.id}: missing event_id, skipped`);
          }
          continue;
        }

        if (!entry.normalized_entry_key || entry.normalized_entry_key !== key) {
          await base44.asServiceRole.entities.Entry.update(entry.id, {
            normalized_entry_key: key,
          }).catch((err) => {
            warnings.push(`Entry ${entry.id}: update failed — ${err.message}`);
          });
          backfilled++;
        }
      }
    }

    // Write audit log
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'entry_normalization_backfill_completed',
      entity_name: 'Entry',
      status: 'success',
      metadata: {
        total_entries: total,
        keys_backfilled: backfilled,
        skipped: skipped,
        warning_count: warnings.length,
      },
    }).catch(() => {});

    return Response.json({
      success: true,
      total_entries: total,
      keys_backfilled: backfilled,
      skipped: skipped,
      warnings: warnings,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});