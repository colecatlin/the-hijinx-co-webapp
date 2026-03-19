/**
 * verifyEventIntegrity.js
 *
 * Verifies Event data integrity after backfill and cleanup:
 *   1. Normalization coverage — all active Events have normalized_event_key
 *   2. Duplicate groups remaining — no active duplicate groups exist
 *   3. Sync alignment — recent syncs matched existing events (not creating new ones)
 *   4. Suspicious new creates — recent OperationLog entries where match_method = 'none'
 *
 * Output: {
 *   normalization_ok, duplicate_groups_remaining, sync_alignment_ok,
 *   suspicious_new_creates, warnings, failures, details, generated_at
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
    const allEvents = await base44.asServiceRole.entities.Event.list('-created_date', 5000);
    const activeEvents = allEvents.filter(e => e.status !== 'Inactive');

    const missingNormalizedEventKey = activeEvents.filter(e => !e.normalized_event_key);

    const normalization_ok = missingNormalizedEventKey.length === 0;

    if (missingNormalizedEventKey.length > 0) {
      failures.push(`${missingNormalizedEventKey.length} active Event(s) missing normalized_event_key`);
    }

    // ── 2. Active duplicate groups remaining ───────────────────────────
    const byNormalizedEventKey = new Map();
    const byExternalUid = new Map();
    const byPositional = new Map();

    for (const e of activeEvents) {
      if (e.canonical_key?.includes('DUPLICATE_OF') || (e.notes || '').includes('DUPLICATE_OF')) continue;

      if (e.normalized_event_key) {
        const a = byNormalizedEventKey.get(e.normalized_event_key) || [];
        a.push(e);
        byNormalizedEventKey.set(e.normalized_event_key, a);
      }
      if (e.external_uid) {
        const a = byExternalUid.get(e.external_uid) || [];
        a.push(e);
        byExternalUid.set(e.external_uid, a);
      }
      if (e.series_id && e.track_id && e.event_date) {
        const k = `${e.series_id}:${e.track_id}:${e.event_date}`;
        const a = byPositional.get(k) || [];
        a.push(e);
        byPositional.set(k, a);
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
          names: fresh.map(e => e.name),
          ids: fresh.map(e => e.id),
          dates: fresh.map(e => e.event_date),
        });
        fresh.forEach(r => processedIds.add(r.id));
      }
    }

    collectGroups(byNormalizedEventKey, 'normalized_event_key');
    collectGroups(byExternalUid,        'external_uid');
    collectGroups(byPositional,         'series_track_date');

    const duplicate_groups_remaining = activeDuplicateGroups.length;
    if (duplicate_groups_remaining > 0) {
      failures.push(`${duplicate_groups_remaining} active duplicate Event group(s) remain — run Event Cleanup`);
    }

    // ── 3. Sync alignment — recent Event creates from sync sources ──────
    const recentEventLogs = await base44.asServiceRole.entities.OperationLog.filter(
      { operation_type: 'source_entity_created', entity_name: 'Event' },
      '-created_date',
      200
    ).catch(() => []);

    // Flag names created multiple times by sync sources
    const createsByName = new Map();
    for (const log of recentEventLogs) {
      const name = log.metadata?.display_name || '';
      const src  = log.metadata?.source_path || log.metadata?.triggered_from || 'unknown';
      if (!name) continue;
      const arr = createsByName.get(name) || [];
      arr.push({ log_id: log.id, source_path: src, created_at: log.created_date });
      createsByName.set(name, arr);
    }

    const syncConvergenceFailures = [];
    for (const [name, entries] of createsByName) {
      const syncEntries = entries.filter(e =>
        e.source_path.includes('sync') || e.source_path.includes('nascar') || e.source_path.includes('calendar')
      );
      if (syncEntries.length > 1) {
        syncConvergenceFailures.push({ name, create_count: syncEntries.length, sources: syncEntries.map(e => e.source_path) });
      }
    }

    const sync_alignment_ok = syncConvergenceFailures.length === 0;
    if (!sync_alignment_ok) {
      warnings.push(`${syncConvergenceFailures.length} Event name(s) were created multiple times by sync — sync is not idempotent`);
    }

    // ── 4. Suspicious new creates (match_method = 'none') ───────────────
    const suspicious_new_creates = recentEventLogs
      .filter(log => log.metadata?.match_method === 'none')
      .map(log => ({
        log_id: log.id,
        name: log.metadata?.display_name || '?',
        source_path: log.metadata?.source_path || log.metadata?.triggered_from || 'unknown',
        created_at: log.created_date,
      }));

    if (suspicious_new_creates.length > 0) {
      warnings.push(`${suspicious_new_creates.length} recent Event create(s) had match_method=none — possible duplicate risk`);
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
          total_active: activeEvents.length,
          missing_normalized_event_key: missingNormalizedEventKey.map(e => ({ id: e.id, name: e.name, date: e.event_date })),
        },
        active_duplicate_groups: activeDuplicateGroups,
        sync_check: {
          recent_creates: recentEventLogs.length,
          convergence_failures: syncConvergenceFailures,
        },
      },
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});