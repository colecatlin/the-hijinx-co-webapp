/**
 * verifyTrackIntegrity.js
 *
 * Verifies Track data integrity after backfill and cleanup:
 *   1. Normalization coverage — all active Tracks have normalized_name, canonical_slug, canonical_key
 *   2. Duplicate groups remaining — no active duplicate groups exist
 *   3. Sync alignment — sync sources converge on the same canonical Track records
 *   4. Suspicious new creates — recent OperationLog entries where match_method = 'none'
 *   5. Survivor re-index — repaired survivors still have all normalization fields
 *
 * Output: {
 *   normalization_ok, duplicate_groups_remaining, sync_alignment_ok,
 *   suspicious_new_creates, warnings, failures,
 *   details: { normalization_coverage, active_duplicates, sync_check, survivors_check },
 *   generated_at
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
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
    const allTracks = await base44.asServiceRole.entities.Track.list('-created_date', 3000);
    const activeTracks = allTracks.filter(t => t.operational_status !== 'Inactive');

    const missingNormalizedName = activeTracks.filter(t => !t.normalized_name);
    const missingCanonicalSlug  = activeTracks.filter(t => !t.canonical_slug);
    const missingCanonicalKey   = activeTracks.filter(t => !t.canonical_key);

    const normalization_ok = (
      missingNormalizedName.length === 0 &&
      missingCanonicalSlug.length  === 0 &&
      missingCanonicalKey.length   === 0
    );

    if (missingNormalizedName.length > 0) failures.push(`${missingNormalizedName.length} active Track(s) missing normalized_name`);
    if (missingCanonicalSlug.length  > 0) failures.push(`${missingCanonicalSlug.length} active Track(s) missing canonical_slug`);
    if (missingCanonicalKey.length   > 0) failures.push(`${missingCanonicalKey.length} active Track(s) missing canonical_key`);

    // ── 2. Active duplicate groups remaining ──────────────────────────────
    const byExternalUid  = new Map();
    const byCanonicalKey = new Map();
    const byNormLocation = new Map();

    for (const t of activeTracks) {
      if (t.canonical_key?.includes('DUPLICATE_OF') || (t.notes || '').includes('DUPLICATE_OF')) continue;

      if (t.external_uid) {
        const arr = byExternalUid.get(t.external_uid) || [];
        arr.push(t);
        byExternalUid.set(t.external_uid, arr);
      }
      if (t.canonical_key && !t.canonical_key.includes('DUPLICATE')) {
        const arr = byCanonicalKey.get(t.canonical_key) || [];
        arr.push(t);
        byCanonicalKey.set(t.canonical_key, arr);
      }
      const norm = t.normalized_name || normalizeName(t.name || '');
      if (norm) {
        const loc = normalizeName(t.location_state || t.location_country || '');
        const compositeKey = loc ? `${norm}:${loc}` : norm;
        const arr = byNormLocation.get(compositeKey) || [];
        arr.push(t);
        byNormLocation.set(compositeKey, arr);
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
          locations: fresh.map(r => `${r.location_city || ''}${r.location_state ? ', ' + r.location_state : ''}${r.location_country ? ' (' + r.location_country + ')' : ''}`),
        });
        fresh.forEach(r => processedIds.add(r.id));
      }
    }

    collectGroups(byExternalUid,  'external_uid');
    collectGroups(byCanonicalKey, 'canonical_key');
    collectGroups(byNormLocation, 'normalized_name_location');

    const duplicate_groups_remaining = activeDuplicateGroups.length;
    if (duplicate_groups_remaining > 0) {
      failures.push(`${duplicate_groups_remaining} active duplicate Track group(s) remain — run Track Cleanup`);
    }

    // ── 3. Sync alignment check ────────────────────────────────────────────
    // Look at recent OperationLog for Track creates — are sync sources converging?
    const recentTrackLogs = await base44.asServiceRole.entities.OperationLog.filter(
      { operation_type: 'source_entity_created', entity_name: 'Track' },
      '-created_date',
      200
    ).catch(() => []);

    // Group creates by display_name to see if repeated names are being re-created
    const createsByName = new Map();
    for (const log of recentTrackLogs) {
      const name = log.metadata?.display_name || '';
      const src  = log.metadata?.source_path || log.metadata?.triggered_from || 'unknown';
      if (!name) continue;
      const arr = createsByName.get(name) || [];
      arr.push({ log_id: log.id, source_path: src, created_at: log.created_date });
      createsByName.set(name, arr);
    }

    // Flag names created more than once by sync — indicates convergence failure
    const convergenceFailures = [];
    for (const [name, entries] of createsByName) {
      const syncEntries = entries.filter(e =>
        e.source_path.includes('nascar') || e.source_path.includes('sync') || e.source_path.includes('import')
      );
      if (syncEntries.length > 1) {
        convergenceFailures.push({ name, create_count: syncEntries.length, sources: syncEntries.map(e => e.source_path) });
      }
    }

    const sync_alignment_ok = convergenceFailures.length === 0;
    if (!sync_alignment_ok) {
      warnings.push(`${convergenceFailures.length} Track name(s) were created multiple times by sync — possible convergence gap`);
    }

    // ── 4. Suspicious new creates (match_method = 'none') ─────────────────
    const recentUnmatchedLogs = recentTrackLogs.filter(log =>
      log.metadata?.match_method === 'none'
    );

    const suspicious_new_creates = recentUnmatchedLogs.map(log => ({
      log_id: log.id,
      name: log.metadata?.display_name || '?',
      source_path: log.metadata?.source_path || log.metadata?.triggered_from || 'unknown',
      created_at: log.created_date,
    }));

    if (suspicious_new_creates.length > 0) {
      warnings.push(`${suspicious_new_creates.length} recent Track create(s) had match_method=none — potential duplicate risk after cleanup`);
    }

    // ── 5. Survivor re-index check ─────────────────────────────────────────
    const repairLogs = await base44.asServiceRole.entities.OperationLog.filter(
      { operation_type: 'source_duplicate_repaired', entity_name: 'Track' },
      '-created_date',
      50
    ).catch(() => []);

    const survivorsMissingNorm = [];
    for (const log of repairLogs) {
      const survivorIds = log.metadata?.survivor_ids || [];
      for (const sid of survivorIds) {
        const survivor = allTracks.find(t => t.id === sid);
        if (!survivor) continue;
        const missing = [];
        if (!survivor.normalized_name) missing.push('normalized_name');
        if (!survivor.canonical_slug)  missing.push('canonical_slug');
        if (!survivor.canonical_key)   missing.push('canonical_key');
        if (missing.length > 0) survivorsMissingNorm.push({ id: sid, name: survivor.name, missing });
      }
    }

    if (survivorsMissingNorm.length > 0) {
      failures.push(`${survivorsMissingNorm.length} repaired Track survivor(s) are missing normalization fields`);
    }

    return Response.json({
      success: true,
      normalization_ok,
      duplicate_groups_remaining,
      sync_alignment_ok,
      suspicious_new_creates,
      warnings,
      failures,
      details: {
        normalization_coverage: {
          total_active: activeTracks.length,
          missing_normalized_name: missingNormalizedName.map(t => ({ id: t.id, name: t.name })),
          missing_canonical_slug:  missingCanonicalSlug.map(t => ({ id: t.id, name: t.name })),
          missing_canonical_key:   missingCanonicalKey.map(t => ({ id: t.id, name: t.name })),
        },
        active_duplicate_groups: activeDuplicateGroups,
        sync_check: {
          recent_creates: recentTrackLogs.length,
          convergence_failures: convergenceFailures,
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