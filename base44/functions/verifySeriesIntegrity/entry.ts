/**
 * verifySeriesIntegrity.js
 *
 * Verifies Series data integrity after backfill and cleanup:
 *   1. Normalization coverage — all active Series have normalized_name, canonical_slug, canonical_key
 *   2. Duplicate groups remaining — no active duplicate groups exist (outside explicitly skipped ambiguous)
 *   3. Sync name alignment — NASCAR sync sources converge on canonical names
 *   4. Suspicious new creates — recent OperationLog entries where match_method = 'none'
 *
 * Output: {
 *   normalization_ok, duplicate_groups_remaining, sync_name_alignment_ok,
 *   suspicious_new_creates, warnings, failures,
 *   details: { normalization_coverage, active_duplicates, sync_alignment, recent_creates },
 *   generated_at
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Expected canonical names that both sync sources must converge on
const CANONICAL_SERIES_NAMES = new Set([
  'nascar cup series',
  'nascar xfinity series',
  'nascar craftsman truck series',
  'arca menards series',
  'arca menards series east',
  'arca menards series west',
  'nascar whelen euro series',
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const warnings = [];
    const failures = [];

    // ── 1. Normalization coverage ──────────────────────────────────────────
    const allSeries = await base44.asServiceRole.entities.Series.list('-created_date', 3000);
    const activeSeries = allSeries.filter(s => s.operational_status !== 'Inactive');

    const missingNormalizedName = activeSeries.filter(s => !s.normalized_name);
    const missingCanonicalSlug  = activeSeries.filter(s => !s.canonical_slug);
    const missingCanonicalKey   = activeSeries.filter(s => !s.canonical_key);

    const normalization_ok = (
      missingNormalizedName.length === 0 &&
      missingCanonicalSlug.length === 0 &&
      missingCanonicalKey.length === 0
    );

    if (!normalization_ok) {
      failures.push(`${missingNormalizedName.length} active Series missing normalized_name`);
      if (missingCanonicalSlug.length > 0) failures.push(`${missingCanonicalSlug.length} active Series missing canonical_slug`);
      if (missingCanonicalKey.length > 0)  failures.push(`${missingCanonicalKey.length} active Series missing canonical_key`);
    }

    // ── 2. Active duplicate groups remaining ──────────────────────────────
    const byExternalUid  = new Map();
    const byCanonicalKey = new Map();
    const byNormName     = new Map();

    for (const s of activeSeries) {
      if (s.canonical_key?.includes('DUPLICATE_OF') || (s.notes || '').includes('DUPLICATE_OF')) continue;

      if (s.external_uid) {
        const arr = byExternalUid.get(s.external_uid) || [];
        arr.push(s);
        byExternalUid.set(s.external_uid, arr);
      }
      if (s.canonical_key && !s.canonical_key.includes('DUPLICATE')) {
        const arr = byCanonicalKey.get(s.canonical_key) || [];
        arr.push(s);
        byCanonicalKey.set(s.canonical_key, arr);
      }
      const norm = s.normalized_name || normalizeName(s.name || s.full_name || '');
      if (norm) {
        const arr = byNormName.get(norm) || [];
        arr.push(s);
        byNormName.set(norm, arr);
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
          match_type, key,
          count: fresh.length,
          names: fresh.map(r => r.name || ''),
          ids:   fresh.map(r => r.id),
        });
        fresh.forEach(r => processedIds.add(r.id));
      }
    }

    collectGroups(byExternalUid,  'external_uid');
    collectGroups(byCanonicalKey, 'canonical_key');
    collectGroups(byNormName,     'normalized_name');

    const duplicate_groups_remaining = activeDuplicateGroups.length;
    if (duplicate_groups_remaining > 0) {
      failures.push(`${duplicate_groups_remaining} active duplicate Series group(s) remain — run Series Cleanup`);
    }

    // ── 3. Sync name alignment ─────────────────────────────────────────────
    // Check OperationLog for recent series creates — are the names using canonical names?
    const recentSeriesLogs = await base44.asServiceRole.entities.OperationLog.filter(
      { operation_type: 'source_entity_created', entity_name: 'Series' },
      '-created_date',
      200
    ).catch(() => []);

    const suspiciousNameLogs = [];
    for (const log of recentSeriesLogs) {
      const name = log.metadata?.display_name || '';
      const normN = normalizeName(name);
      if (!normN) continue;
      // Flag generic broad "nascar" creates with no qualifier
      if (normN === 'nascar') {
        suspiciousNameLogs.push({
          log_id: log.id,
          name,
          source_path: log.metadata?.source_path || log.metadata?.triggered_from || 'unknown',
          created_at: log.created_date,
          issue: 'generic_nascar_name',
        });
      }
    }

    // Check for convergence: both sync sources should only create within CANONICAL_SERIES_NAMES
    const syncSourceCreates = recentSeriesLogs.filter(log => {
      const src = log.metadata?.source_path || log.metadata?.triggered_from || '';
      return src.includes('nascar_schedule_sync') || src.includes('nascar_calendar_sync');
    });

    const nonCanonicalSyncCreates = syncSourceCreates.filter(log => {
      const name = log.metadata?.display_name || '';
      const normN = normalizeName(name);
      return normN && !CANONICAL_SERIES_NAMES.has(normN);
    });

    const sync_name_alignment_ok = nonCanonicalSyncCreates.length === 0;
    if (!sync_name_alignment_ok) {
      warnings.push(`${nonCanonicalSyncCreates.length} Series created by sync sources with non-canonical names`);
    }

    // ── 4. Suspicious new creates (match_method = 'none') ─────────────────
    const recentUnmatchedLogs = recentSeriesLogs.filter(log =>
      log.metadata?.match_method === 'none'
    );

    const suspicious_new_creates = recentUnmatchedLogs.map(log => ({
      log_id: log.id,
      name: log.metadata?.display_name || '?',
      source_path: log.metadata?.source_path || log.metadata?.triggered_from || 'unknown',
      created_at: log.created_date,
    }));

    if (suspicious_new_creates.length > 0) {
      warnings.push(`${suspicious_new_creates.length} recent Series create(s) had match_method=none — potential duplicate risk after cleanup`);
    }

    // ── 5. Survivor re-index check ─────────────────────────────────────────
    const repairLogs = await base44.asServiceRole.entities.OperationLog.filter(
      { operation_type: 'source_duplicate_repaired', entity_name: 'Series' },
      '-created_date',
      50
    ).catch(() => []);

    const survivorsMissingNormalization = [];
    for (const log of repairLogs) {
      const survivorIds = log.metadata?.survivor_ids || [];
      for (const sid of survivorIds) {
        const survivor = allSeries.find(s => s.id === sid);
        if (!survivor) continue;
        const missing = [];
        if (!survivor.normalized_name) missing.push('normalized_name');
        if (!survivor.canonical_slug)  missing.push('canonical_slug');
        if (!survivor.canonical_key)   missing.push('canonical_key');
        if (missing.length > 0) {
          survivorsMissingNormalization.push({ id: sid, name: survivor.name, missing });
        }
      }
    }

    if (survivorsMissingNormalization.length > 0) {
      failures.push(`${survivorsMissingNormalization.length} repaired Series survivor(s) are missing normalization fields`);
    }

    const overall_ok = failures.length === 0;

    return Response.json({
      success: true,
      normalization_ok,
      duplicate_groups_remaining,
      sync_name_alignment_ok,
      suspicious_new_creates,
      warnings,
      failures,
      details: {
        normalization_coverage: {
          total_active: activeSeries.length,
          missing_normalized_name: missingNormalizedName.map(s => ({ id: s.id, name: s.name })),
          missing_canonical_slug:  missingCanonicalSlug.map(s => ({ id: s.id, name: s.name })),
          missing_canonical_key:   missingCanonicalKey.map(s => ({ id: s.id, name: s.name })),
        },
        active_duplicate_groups: activeDuplicateGroups,
        sync_name_check: {
          sync_source_creates: syncSourceCreates.length,
          non_canonical_creates: nonCanonicalSyncCreates.map(l => ({
            name: l.metadata?.display_name,
            source_path: l.metadata?.source_path || l.metadata?.triggered_from,
            created_at: l.created_date,
          })),
          suspicious_name_creates: suspiciousNameLogs,
        },
        survivors_missing_normalization: survivorsMissingNormalization,
        repair_logs_found: repairLogs.length,
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});