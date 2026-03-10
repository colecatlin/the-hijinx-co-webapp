/**
 * selectCanonicalTrackRecord.js
 *
 * Given an array of duplicate Track records, selects the canonical survivor.
 *
 * Priority:
 *   1. Has external_uid (not already marked as duplicate)
 *   2. Has well-formed canonical_key
 *   3. Most linked Event records
 *   4. Oldest created_date
 *
 * Location is considered before treating records as the same track —
 * caller is responsible for only grouping records that share the same
 * normalized_name + location context.
 *
 * Input:  { track_records: [] }
 * Output: { survivor, duplicates, event_counts, selection_reason }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { track_records = [] } = body;

    if (!track_records.length) {
      return Response.json({ error: 'track_records is required and must be non-empty' }, { status: 400 });
    }
    if (track_records.length === 1) {
      return Response.json({
        survivor: track_records[0],
        duplicates: [],
        event_counts: {},
        selection_reason: 'only_record',
      });
    }

    // Fetch event counts per track
    const eventCountsById = {};
    for (const t of track_records) {
      const evts = await base44.asServiceRole.entities.Event.filter({ track_id: t.id }).catch(() => []);
      eventCountsById[t.id] = evts.length;
    }

    let survivor = null;
    let selection_reason = '';

    // 1. Has external_uid (not already a duplicate)
    survivor = track_records.find(t =>
      t.external_uid && !t.canonical_key?.includes('DUPLICATE')
    );
    if (survivor) { selection_reason = 'external_uid'; }

    // 2. Well-formed canonical_key
    if (!survivor) {
      survivor = track_records.find(t =>
        t.canonical_key &&
        t.canonical_key.startsWith('track:') &&
        !t.canonical_key.includes('DUPLICATE')
      );
      if (survivor) { selection_reason = 'canonical_key'; }
    }

    // 3. Most linked events
    if (!survivor) {
      const maxCount = Math.max(...track_records.map(t => eventCountsById[t.id] || 0));
      if (maxCount > 0) {
        survivor = track_records.find(t => (eventCountsById[t.id] || 0) === maxCount);
        if (survivor) { selection_reason = 'most_events'; }
      }
    }

    // 4. Oldest created_date
    if (!survivor) {
      survivor = track_records.slice().sort((a, b) =>
        new Date(a.created_date || 0) - new Date(b.created_date || 0)
      )[0];
      selection_reason = 'oldest_record';
    }

    const duplicates = track_records.filter(t => t.id !== survivor.id);

    return Response.json({ survivor, duplicates, event_counts: eventCountsById, selection_reason });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});