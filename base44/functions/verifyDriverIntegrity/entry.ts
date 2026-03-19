/**
 * verifyDriverIntegrity.js
 *
 * Verifies Driver data integrity after backfill and cleanup:
 *   1. Normalization coverage — all active Drivers have normalized_name, canonical_slug, canonical_key
 *   2. Duplicate groups remaining — no active duplicate groups exist
 *   3. Import matching — recent imports/results uploads matched existing drivers vs creating new ones
 *   4. Suspicious new creates — recent OperationLog entries where match_method = 'none'
 *   5. Survivor re-index — repaired survivors still have all normalization fields
 *
 * Output: {
 *   normalization_ok, duplicate_groups_remaining, import_matching_ok,
 *   suspicious_new_creates, warnings, failures, details, generated_at
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function driverFullName(d) {
  return `${d.first_name || ''} ${d.last_name || ''}`.trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const warnings = [];
    const failures = [];

    // ── 1. Normalization coverage ──────────────────────────────────────────
    const allDrivers = await base44.asServiceRole.entities.Driver.list('-created_date', 5000);
    const activeDrivers = allDrivers.filter(d => d.status !== 'Inactive');

    const missingNormalizedName = activeDrivers.filter(d => !d.normalized_name);
    const missingCanonicalSlug  = activeDrivers.filter(d => !d.canonical_slug);
    const missingCanonicalKey   = activeDrivers.filter(d => !d.canonical_key);

    const normalization_ok = (
      missingNormalizedName.length === 0 &&
      missingCanonicalSlug.length  === 0 &&
      missingCanonicalKey.length   === 0
    );

    if (missingNormalizedName.length > 0) failures.push(`${missingNormalizedName.length} active Driver(s) missing normalized_name`);
    if (missingCanonicalSlug.length  > 0) failures.push(`${missingCanonicalSlug.length} active Driver(s) missing canonical_slug`);
    if (missingCanonicalKey.length   > 0) failures.push(`${missingCanonicalKey.length} active Driver(s) missing canonical_key`);

    // ── 2. Active duplicate groups remaining ──────────────────────────────
    const byExternalUid  = new Map();
    const byCanonicalKey = new Map();
    const byNormDob      = new Map();
    const byNormNum      = new Map();
    const byNormName     = new Map();

    for (const d of activeDrivers) {
      if (d.canonical_key?.includes('DUPLICATE_OF') || (d.notes || '').includes('DUPLICATE_OF')) continue;

      if (d.external_uid) {
        const a = byExternalUid.get(d.external_uid) || []; a.push(d); byExternalUid.set(d.external_uid, a);
      }
      if (d.canonical_key && !d.canonical_key.includes('DUPLICATE')) {
        const a = byCanonicalKey.get(d.canonical_key) || []; a.push(d); byCanonicalKey.set(d.canonical_key, a);
      }
      const norm = d.normalized_name || normalizeName(driverFullName(d));
      if (norm) {
        if (d.date_of_birth) {
          const k = `${norm}:dob:${d.date_of_birth}`;
          const a = byNormDob.get(k) || []; a.push(d); byNormDob.set(k, a);
        }
        if (d.primary_number) {
          const k = `${norm}:num:${d.primary_number}`;
          const a = byNormNum.get(k) || []; a.push(d); byNormNum.set(k, a);
        }
        const a = byNormName.get(norm) || []; a.push(d); byNormName.set(norm, a);
      }
    }

    const processedIds = new Set();
    const activeDuplicateGroups = [];

    function collectGroups(map, match_type) {
      for (const [key, grp] of map) {
        if (grp.length < 2) continue;
        const fresh = grp.filter(r => !processedIds.has(r.id));
        if (fresh.length < 2) continue;
        activeDuplicateGroups.push({
          match_type, key, count: fresh.length,
          names: fresh.map(d => driverFullName(d)),
          ids: fresh.map(d => d.id),
        });
        fresh.forEach(r => processedIds.add(r.id));
      }
    }

    collectGroups(byExternalUid,  'external_uid');
    collectGroups(byCanonicalKey, 'canonical_key');
    collectGroups(byNormDob,      'normalized_name_dob');
    collectGroups(byNormNum,      'normalized_name_number');
    collectGroups(byNormName,     'normalized_name');

    const duplicate_groups_remaining = activeDuplicateGroups.length;
    if (duplicate_groups_remaining > 0) {
      failures.push(`${duplicate_groups_remaining} active duplicate Driver group(s) remain — run Driver Cleanup`);
    }

    // ── 3. Import matching — recent Driver creates from imports ───────────
    const recentDriverLogs = await base44.asServiceRole.entities.OperationLog.filter(
      { operation_type: 'source_entity_created', entity_name: 'Driver' },
      '-created_date',
      200
    ).catch(() => []);

    // Flag names created more than once by import sources
    const createsByName = new Map();
    for (const log of recentDriverLogs) {
      const name = log.metadata?.display_name || '';
      const src  = log.metadata?.source_path || log.metadata?.triggered_from || 'unknown';
      if (!name) continue;
      const arr = createsByName.get(name) || [];
      arr.push({ log_id: log.id, source_path: src, created_at: log.created_date });
      createsByName.set(name, arr);
    }

    const importConvergenceFailures = [];
    for (const [name, entries] of createsByName) {
      const importEntries = entries.filter(e =>
        e.source_path.includes('import') || e.source_path.includes('csv') || e.source_path.includes('sync') || e.source_path.includes('nascar')
      );
      if (importEntries.length > 1) {
        importConvergenceFailures.push({ name, create_count: importEntries.length, sources: importEntries.map(e => e.source_path) });
      }
    }

    const import_matching_ok = importConvergenceFailures.length === 0;
    if (!import_matching_ok) {
      warnings.push(`${importConvergenceFailures.length} Driver name(s) were created multiple times by import — possible convergence gap`);
    }

    // ── 4. Suspicious new creates (match_method = 'none') ─────────────────
    const suspicious_new_creates = recentDriverLogs
      .filter(log => log.metadata?.match_method === 'none')
      .map(log => ({
        log_id: log.id,
        name: log.metadata?.display_name || '?',
        source_path: log.metadata?.source_path || log.metadata?.triggered_from || 'unknown',
        created_at: log.created_date,
      }));

    if (suspicious_new_creates.length > 0) {
      warnings.push(`${suspicious_new_creates.length} recent Driver create(s) had match_method=none — potential duplicate risk`);
    }

    // ── 5. Survivor re-index check ─────────────────────────────────────────
    const repairLogs = await base44.asServiceRole.entities.OperationLog.filter(
      { operation_type: 'source_duplicate_repaired', entity_name: 'Driver' },
      '-created_date',
      50
    ).catch(() => []);

    const survivorsMissingNorm = [];
    for (const log of repairLogs) {
      const survivorIds = log.metadata?.survivor_ids || [];
      for (const sid of survivorIds) {
        const survivor = allDrivers.find(d => d.id === sid);
        if (!survivor) continue;
        const missing = [];
        if (!survivor.normalized_name) missing.push('normalized_name');
        if (!survivor.canonical_slug)  missing.push('canonical_slug');
        if (!survivor.canonical_key)   missing.push('canonical_key');
        if (missing.length > 0) survivorsMissingNorm.push({ id: sid, name: driverFullName(survivor), missing });
      }
    }

    if (survivorsMissingNorm.length > 0) {
      failures.push(`${survivorsMissingNorm.length} repaired Driver survivor(s) are missing normalization fields`);
    }

    return Response.json({
      success: true,
      normalization_ok,
      duplicate_groups_remaining,
      import_matching_ok,
      suspicious_new_creates,
      warnings,
      failures,
      details: {
        normalization_coverage: {
          total_active: activeDrivers.length,
          missing_normalized_name: missingNormalizedName.map(d => ({ id: d.id, name: driverFullName(d) })),
          missing_canonical_slug:  missingCanonicalSlug.map(d => ({ id: d.id, name: driverFullName(d) })),
          missing_canonical_key:   missingCanonicalKey.map(d => ({ id: d.id, name: driverFullName(d) })),
        },
        active_duplicate_groups: activeDuplicateGroups,
        import_check: {
          recent_creates: recentDriverLogs.length,
          convergence_failures: importConvergenceFailures,
        },
        survivors_missing_normalization: survivorsMissingNorm,
        repair_logs_found: repairLogs.length,
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});