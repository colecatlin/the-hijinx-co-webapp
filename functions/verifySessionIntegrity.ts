/**
 * verifySessionIntegrity.js
 *
 * Verifies Session data integrity after backfill and cleanup:
 *   1. Normalization coverage — all active Sessions have normalized_session_key
 *   2. Duplicate groups remaining — no active duplicate groups exist
 *   3. Builder idempotence — event builder saves don't create new sessions
 *   4. Import matching — results imports match existing sessions
 *   5. Suspicious new creates — recent OperationLog entries with weak matching
 *
 * Output: {
 *   normalization_ok, duplicate_groups_remaining, builder_idempotence_ok,
 *   import_matching_ok, suspicious_new_creates, warnings, failures, details
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const warnings = [];
    const failures = [];

    // ── 1. Normalization coverage ──────────────────────────────────────
    const allSessions = await base44.asServiceRole.entities.Session.list('-created_date', 5000);
    const activeSessions = allSessions.filter(s => s.status !== 'Inactive');

    const missingNormalizedSessionKey = activeSessions.filter(s => !s.normalized_session_key);

    const normalization_ok = missingNormalizedSessionKey.length === 0;

    if (missingNormalizedSessionKey.length > 0) {
      failures.push(`${missingNormalizedSessionKey.length} active Session(s) missing normalized_session_key`);
    }

    // ── 2. Active duplicate groups remaining ───────────────────────────
    const byNormalizedSessionKey = new Map();
    const byExternalUid = new Map();
    const byEventAndName = new Map();

    const normalizeName = (value) => {
      if (!value) return '';
      return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    for (const s of activeSessions) {
      if (s.canonical_key?.includes('DUPLICATE_OF') || (s.notes || '').includes('DUPLICATE_OF')) continue;

      if (s.normalized_session_key) {
        const a = byNormalizedSessionKey.get(s.normalized_session_key) || [];
        a.push(s);
        byNormalizedSessionKey.set(s.normalized_session_key, a);
      }
      if (s.external_uid) {
        const a = byExternalUid.get(s.external_uid) || [];
        a.push(s);
        byExternalUid.set(s.external_uid, a);
      }
      if (s.event_id && s.name) {
        const norm = normalizeName(s.name);
        const k = `${s.event_id}:${norm}`;
        const a = byEventAndName.get(k) || [];
        a.push(s);
        byEventAndName.set(k, a);
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
          names: fresh.map(s => s.name),
          ids: fresh.map(s => s.id),
        });
        fresh.forEach(r => processedIds.add(r.id));
      }
    }

    collectGroups(byNormalizedSessionKey, 'normalized_session_key');
    collectGroups(byExternalUid,          'external_uid');
    collectGroups(byEventAndName,         'event_id_normalized_name');

    const duplicate_groups_remaining = activeDuplicateGroups.length;
    if (duplicate_groups_remaining > 0) {
      failures.push(`${duplicate_groups_remaining} active duplicate Session group(s) remain — run Session Cleanup`);
    }

    // ── 3. Builder idempotence & 4. Import matching ────────────────────
    const recentSessionLogs = await base44.asServiceRole.entities.OperationLog.filter(
      { operation_type: 'source_entity_created', entity_name: 'Session' },
      '-created_date',
      100
    ).catch(() => []);

    const createsByName = new Map();
    for (const log of recentSessionLogs) {
      const name = log.metadata?.display_name || '';
      const src  = log.metadata?.source_path || log.metadata?.triggered_from || 'unknown';
      if (!name) continue;
      const arr = createsByName.get(name) || [];
      arr.push({ log_id: log.id, source_path: src, created_at: log.created_date });
      createsByName.set(name, arr);
    }

    const builderAndImportFailures = [];
    for (const [name, entries] of createsByName) {
      const builderEntries = entries.filter(e => e.source_path.includes('builder'));
      const importEntries = entries.filter(e => e.source_path.includes('import') || e.source_path.includes('csv'));
      if (builderEntries.length > 1) {
        builderAndImportFailures.push({ name, type: 'builder', create_count: builderEntries.length, sources: builderEntries.map(e => e.source_path) });
      }
      if (importEntries.length > 1) {
        builderAndImportFailures.push({ name, type: 'import', create_count: importEntries.length, sources: importEntries.map(e => e.source_path) });
      }
    }

    const builder_idempotence_ok = !builderAndImportFailures.some(f => f.type === 'builder');
    const import_matching_ok = !builderAndImportFailures.some(f => f.type === 'import');

    if (!builder_idempotence_ok) {
      warnings.push(`Event builder saved multiple times for same session — builders may not be idempotent`);
    }
    if (!import_matching_ok) {
      warnings.push(`Results imports created multiple sessions for same name — import matching may be weak`);
    }

    // ── 5. Suspicious new creates (match_method = 'none') ───────────────
    const suspicious_new_creates = recentSessionLogs
      .filter(log => log.metadata?.match_method === 'none')
      .map(log => ({
        log_id: log.id,
        name: log.metadata?.display_name || '?',
        source_path: log.metadata?.source_path || log.metadata?.triggered_from || 'unknown',
        created_at: log.created_date,
      }));

    if (suspicious_new_creates.length > 0) {
      warnings.push(`${suspicious_new_creates.length} recent Session create(s) had match_method=none — possible duplicate risk`);
    }

    return Response.json({
      success: true,
      normalization_ok,
      duplicate_groups_remaining,
      builder_idempotence_ok,
      import_matching_ok,
      suspicious_new_creates,
      warnings,
      failures,
      details: {
        normalization_coverage: {
          total_active: activeSessions.length,
          missing_normalized_session_key: missingNormalizedSessionKey.map(s => ({ id: s.id, name: s.name, event_id: s.event_id })),
        },
        active_duplicate_groups: activeDuplicateGroups,
        builder_and_import_check: {
          recent_creates: recentSessionLogs.length,
          convergence_failures: builderAndImportFailures,
        },
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});