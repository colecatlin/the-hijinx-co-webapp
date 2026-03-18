/**
 * findDuplicateSessionGroups.js
 *
 * Groups Session records into duplicate sets using three match dimensions:
 *   1. normalized_session_key exact (strongest)
 *   2. external_uid exact
 *   3. event_id + normalized_name (positional match)
 *
 * Skips records already marked DUPLICATE_OF.
 *
 * Input:  {}
 * Output: { total_sessions, candidates_checked, duplicate_groups: [...] }
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

    const allSessions = await base44.asServiceRole.entities.Session.list('-created_date', 5000);

    // Skip records already explicitly marked as duplicates
    const candidates = allSessions.filter(s =>
      !s.canonical_key?.includes('DUPLICATE_OF') &&
      !(s.notes || '').includes('DUPLICATE_OF')
    );

    const byNormalizedSessionKey = new Map();
    const byExternalUid = new Map();
    const byEventAndName = new Map();

    for (const s of candidates) {
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
    const groups = [];

    function addGroup(match_type, key, records) {
      const fresh = records.filter(r => !processedIds.has(r.id));
      if (fresh.length < 2) return;
      groups.push({
        match_type,
        key,
        count: fresh.length,
        record_ids: fresh.map(s => s.id),
        session_names: fresh.map(s => s.name),
        event_ids: fresh.map(s => s.event_id || null),
        session_types: fresh.map(s => s.session_type || null),
        class_ids: fresh.map(s => s.event_class_id || null),
        created_dates: fresh.map(s => s.created_date || null),
        statuses: fresh.map(s => s.status || 'Draft'),
        external_uids: fresh.map(s => s.external_uid || null),
        canonical_keys: fresh.map(s => s.canonical_key || null),
      });
      fresh.forEach(r => processedIds.add(r.id));
    }

    for (const [key, grp] of byNormalizedSessionKey) if (grp.length > 1) addGroup('normalized_session_key', key, grp);
    for (const [key, grp] of byExternalUid)          if (grp.length > 1) addGroup('external_uid', key, grp);
    for (const [key, grp] of byEventAndName)         if (grp.length > 1) addGroup('event_id_normalized_name', key, grp);

    return Response.json({
      success: true,
      total_sessions: allSessions.length,
      candidates_checked: candidates.length,
      duplicate_groups: groups,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});