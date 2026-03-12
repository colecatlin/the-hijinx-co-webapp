/**
 * backfillSessionNormalization.js
 *
 * Populates missing session normalization fields on all existing Session records.
 * Only fills missing fields — never overwrites existing values.
 *
 * For each Session:
 *   - normalized_name ← normalizeName(name) if missing
 *   - canonical_slug ← normalized_name with spaces replaced by hyphens if missing
 *   - canonical_key ← generated if missing
 *   - normalized_session_key ← session:{event_id}:{normalized_name} if missing
 *
 * Rules:
 *   - Skip records already marked DUPLICATE_OF
 *   - Log warning if event_id missing (weak key)
 *
 * Input:  { dry_run?: boolean }
 * Output: { total_sessions, backfilled_normalized_name, backfilled_canonical_slug, backfilled_canonical_key, backfilled_normalized_session_key, skipped, warnings }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildNormalizedSessionKey(event_id, normalized_name) {
  const eid = event_id || 'none';
  return `session:${eid}:${normalized_name}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    const allSessions = await base44.asServiceRole.entities.Session.list('-created_date', 5000);

    const stats = {
      total_sessions: allSessions.length,
      backfilled_normalized_name: 0,
      backfilled_canonical_slug: 0,
      backfilled_canonical_key: 0,
      backfilled_normalized_session_key: 0,
      already_complete: 0,
      skipped: 0,
      warnings: [],
    };

    for (const s of allSessions) {
      // Skip records marked as duplicates
      if (s.canonical_key?.includes('DUPLICATE_OF') || (s.notes || '').includes('DUPLICATE_OF')) {
        stats.skipped++;
        continue;
      }

      if (!s.name) {
        stats.skipped++;
        stats.warnings.push(`Session id=${s.id} has no name — skipped`);
        continue;
      }

      const normalized = s.normalized_name || normalizeName(s.name);
      if (!normalized) {
        stats.skipped++;
        stats.warnings.push(`Session id=${s.id} name="${s.name}" produced empty normalized_name — skipped`);
        continue;
      }

      const slug = s.canonical_slug || normalized.replace(/\s+/g, '-');
      const cKey = s.canonical_key || `session:${normalized}`;
      const sessKey = s.normalized_session_key || buildNormalizedSessionKey(s.event_id, normalized);

      // Check if event_id missing (weak key warning)
      if (!s.event_id) {
        stats.warnings.push(`Session id=${s.id} name="${s.name}" missing event_id — normalized_session_key will be weak`);
      }

      const needsNorm = !s.normalized_name;
      const needsSlug = !s.canonical_slug;
      const needsCKey = !s.canonical_key;
      const needsSessKey = !s.normalized_session_key;

      if (!needsNorm && !needsSlug && !needsCKey && !needsSessKey) {
        stats.already_complete++;
        continue;
      }

      const patch = {};
      if (needsNorm) { patch.normalized_name = normalized; stats.backfilled_normalized_name++; }
      if (needsSlug) { patch.canonical_slug = slug; stats.backfilled_canonical_slug++; }
      if (needsCKey) { patch.canonical_key = cKey; stats.backfilled_canonical_key++; }
      if (needsSessKey) { patch.normalized_session_key = sessKey; stats.backfilled_normalized_session_key++; }

      if (!dry_run) {
        await base44.asServiceRole.entities.Session.update(s.id, patch)
          .catch(err => stats.warnings.push(`update_failed id=${s.id}: ${err.message}`));
      }
    }

    // Write OperationLog (live run only)
    if (!dry_run) {
      const totalBackfilled = stats.backfilled_normalized_name + stats.backfilled_canonical_slug + stats.backfilled_canonical_key + stats.backfilled_normalized_session_key;
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'session_normalization_backfill_completed',
        entity_name: 'Session',
        status: 'success',
        metadata: {
          source_path: 'backfill_session_normalization',
          dry_run,
          total_sessions: stats.total_sessions,
          total_backfilled: totalBackfilled,
          backfilled_normalized_name: stats.backfilled_normalized_name,
          backfilled_canonical_slug: stats.backfilled_canonical_slug,
          backfilled_canonical_key: stats.backfilled_canonical_key,
          backfilled_normalized_session_key: stats.backfilled_normalized_session_key,
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