/**
 * backfillDriverNormalization.js
 *
 * Populates missing normalization fields on all existing Driver records.
 * Only fills missing fields — never overwrites existing values.
 * Does NOT fake sync_last_seen_at.
 *
 * For each Driver:
 *   - normalized_name ← normalizeName(first_name + ' ' + last_name) if missing
 *   - canonical_slug  ← normalized_name with spaces replaced by hyphens if missing
 *   - canonical_key   ← driver:{external_uid}
 *                       else driver:{normalized_name}:{date_of_birth}
 *                       else driver:{normalized_name}:{primary_number}
 *                       else driver:{normalized_name}
 *
 * Input:  { dry_run?: boolean }  — default false (actually runs)
 * Output: {
 *   total_drivers, backfilled_normalized_name, backfilled_canonical_slug,
 *   backfilled_canonical_key, already_complete, skipped, warnings
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Unified slug utilities (inlined per platform constraints) ──
function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function generateEntitySlug(text) {
  if (!text) return '';
  return text.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function driverFullName(d) {
  return `${d.first_name || ''} ${d.last_name || ''}`.trim();
}
function buildDriverCanonicalKey(d, normN) {
  if (d.external_uid) return `driver:${d.external_uid}`;
  if (d.date_of_birth) return `driver:${normN}:${d.date_of_birth}`;
  if (d.primary_number) return `driver:${normN}:${d.primary_number}`;
  return `driver:${normN}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    const allDrivers = await base44.asServiceRole.entities.Driver.list('-created_date', 5000);

    const stats = {
      total_drivers: allDrivers.length,
      backfilled_normalized_name: 0,
      backfilled_canonical_slug: 0,
      backfilled_canonical_key: 0,
      already_complete: 0,
      skipped: 0,
      warnings: [],
    };

    for (const d of allDrivers) {
      // Skip records already marked as duplicates
      if (d.canonical_key?.includes('DUPLICATE_OF') || (d.notes || '').includes('DUPLICATE_OF')) {
        stats.skipped++;
        continue;
      }

      const rawName = driverFullName(d);
      if (!rawName) {
        stats.skipped++;
        stats.warnings.push(`Driver id=${d.id} has no usable name — skipped`);
        continue;
      }

      const normalized = d.normalized_name || normalizeName(rawName);
      if (!normalized) {
        stats.skipped++;
        stats.warnings.push(`Driver id=${d.id} name="${rawName}" produced empty normalized_name — skipped`);
        continue;
      }

      const slug = d.canonical_slug || generateEntitySlug(normalized);
      const cKey = d.canonical_key  || buildDriverCanonicalKey(d, normalized);

      if (!cKey) {
        stats.skipped++;
        stats.warnings.push(`Driver id=${d.id} could not build canonical_key — skipped`);
        continue;
      }

      const needsNorm = !d.normalized_name;
      const needsSlug = !d.canonical_slug;
      const needsKey  = !d.canonical_key;

      if (!needsNorm && !needsSlug && !needsKey) {
        stats.already_complete++;
        continue;
      }

      const patch = {};
      if (needsNorm) { patch.normalized_name = normalized; stats.backfilled_normalized_name++; }
      if (needsSlug) { patch.canonical_slug  = slug;       stats.backfilled_canonical_slug++; }
      if (needsKey)  { patch.canonical_key   = cKey;       stats.backfilled_canonical_key++; }

      if (!dry_run) {
        await base44.asServiceRole.entities.Driver.update(d.id, patch)
          .catch(e => stats.warnings.push(`update_failed id=${d.id}: ${e.message}`));
      }
    }

    // Write OperationLog (live run only)
    if (!dry_run) {
      const totalBackfilled = stats.backfilled_normalized_name + stats.backfilled_canonical_slug + stats.backfilled_canonical_key;
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'driver_normalization_backfill_completed',
        entity_name: 'Driver',
        status: 'success',
        metadata: {
          source_path: 'backfill_driver_normalization',
          dry_run,
          total_drivers: stats.total_drivers,
          total_backfilled: totalBackfilled,
          backfilled_normalized_name: stats.backfilled_normalized_name,
          backfilled_canonical_slug:  stats.backfilled_canonical_slug,
          backfilled_canonical_key:   stats.backfilled_canonical_key,
          already_complete: stats.already_complete,
          skipped: stats.skipped,
        },
      }).catch(() => {});
    }

    return Response.json({ success: true, dry_run, ...stats });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});