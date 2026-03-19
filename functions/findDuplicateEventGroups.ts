/**
 * findDuplicateEventGroups.js
 *
 * Groups Event records into duplicate sets using three match dimensions:
 *   1. normalized_event_key exact (strongest — includes series, track, date)
 *   2. external_uid exact
 *   3. series_id + track_id + event_date (positional match)
 *
 * Skips records already marked DUPLICATE_OF.
 *
 * Input:  {}
 * Output: { total_events, candidates_checked, duplicate_groups: [...] }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const allEvents = await base44.asServiceRole.entities.Event.list('-created_date', 5000);

    // Skip records already explicitly marked as duplicates
    const candidates = allEvents.filter(e =>
      !e.canonical_key?.includes('DUPLICATE_OF') &&
      !(e.notes || '').includes('DUPLICATE_OF')
    );

    const byNormalizedEventKey = new Map();
    const byExternalUid = new Map();
    const byPositional = new Map();

    for (const e of candidates) {
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
    const groups = [];

    function addGroup(match_type, key, records) {
      const fresh = records.filter(r => !processedIds.has(r.id));
      if (fresh.length < 2) return;
      groups.push({
        match_type,
        key,
        count: fresh.length,
        record_ids: fresh.map(e => e.id),
        event_names: fresh.map(e => e.name),
        event_dates: fresh.map(e => e.event_date),
        series_ids: fresh.map(e => e.series_id || null),
        track_ids: fresh.map(e => e.track_id || null),
        created_dates: fresh.map(e => e.created_date || null),
        statuses: fresh.map(e => e.status || 'Draft'),
        external_uids: fresh.map(e => e.external_uid || null),
        canonical_keys: fresh.map(e => e.canonical_key || null),
      });
      fresh.forEach(r => processedIds.add(r.id));
    }

    for (const [key, grp] of byNormalizedEventKey) if (grp.length > 1) addGroup('normalized_event_key', key, grp);
    for (const [key, grp] of byExternalUid)        if (grp.length > 1) addGroup('external_uid', key, grp);
    for (const [key, grp] of byPositional)         if (grp.length > 1) addGroup('series_track_date', key, grp);

    return Response.json({
      success: true,
      total_events: allEvents.length,
      candidates_checked: candidates.length,
      duplicate_groups: groups,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});