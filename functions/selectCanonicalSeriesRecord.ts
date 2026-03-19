/**
 * selectCanonicalSeriesRecord.js
 *
 * Given an array of duplicate Series records, selects the canonical survivor.
 *
 * Priority:
 *   1. Has external_uid (and not already marked as duplicate)
 *   2. Has well-formed canonical_key
 *   3. Most linked Event records
 *   4. Oldest created_date
 *
 * Input:  { series_records: [] }
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
    const { series_records = [] } = body;

    if (!series_records.length) {
      return Response.json({ error: 'series_records is required and must be non-empty' }, { status: 400 });
    }
    if (series_records.length === 1) {
      return Response.json({ survivor: series_records[0], duplicates: [], event_counts: {}, selection_reason: 'only_record' });
    }

    // Fetch event counts per series
    const eventCountsById = {};
    for (const s of series_records) {
      const evts = await base44.asServiceRole.entities.Event.filter({ series_id: s.id }).catch(() => []);
      eventCountsById[s.id] = evts.length;
    }

    let survivor = null;
    let selection_reason = '';

    // 1. external_uid (not already a duplicate marker)
    survivor = series_records.find(s =>
      s.external_uid && !s.canonical_key?.includes('DUPLICATE')
    );
    if (survivor) { selection_reason = 'external_uid'; }

    // 2. Well-formed canonical_key
    if (!survivor) {
      survivor = series_records.find(s =>
        s.canonical_key &&
        s.canonical_key.startsWith('series:') &&
        !s.canonical_key.includes('DUPLICATE')
      );
      if (survivor) { selection_reason = 'canonical_key'; }
    }

    // 3. Most linked events
    if (!survivor) {
      const maxCount = Math.max(...series_records.map(s => eventCountsById[s.id] || 0));
      if (maxCount > 0) {
        survivor = series_records.find(s => (eventCountsById[s.id] || 0) === maxCount);
        if (survivor) { selection_reason = 'most_events'; }
      }
    }

    // 4. Oldest created_date
    if (!survivor) {
      survivor = series_records.slice().sort((a, b) =>
        new Date(a.created_date || 0) - new Date(b.created_date || 0)
      )[0];
      selection_reason = 'oldest_record';
    }

    const duplicates = series_records.filter(s => s.id !== survivor.id);

    return Response.json({ survivor, duplicates, event_counts: eventCountsById, selection_reason });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});