/**
 * selectCanonicalClassRecord.js
 *
 * Picks canonical survivor from a group of duplicate SeriesClass or EventClass records.
 * Counts how many Entries reference each candidate to prefer the most-linked record.
 *
 * Input:  { records: [...], record_type: 'series_class'|'event_class' }
 * Output: { survivor, duplicates }
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { records = [], record_type = 'series_class' } = body;

    if (records.length < 2) {
      return Response.json({ error: 'Need at least 2 records to pick a survivor' }, { status: 400 });
    }

    // Count Entry references for each candidate
    const scored = await Promise.all(records.map(async (r) => {
      let entryCount = 0;
      try {
        const filterField = record_type === 'series_class' ? 'series_class_id' : 'event_class_id';
        const entries = await base44.asServiceRole.entities.Entry.filter({ [filterField]: r.id });
        entryCount = entries?.length || 0;
      } catch (_) {}
      const hasKey = record_type === 'series_class' ? !!r.series_class_identity_key : !!r.event_class_identity_key;
      return {
        record: r,
        score: (hasKey ? 4 : 0) + entryCount,
        created: new Date(r.created_date || 0).getTime(),
        entry_count: entryCount,
      };
    }));

    scored.sort((a, b) => b.score - a.score || a.created - b.created);

    const survivor   = scored[0].record;
    const duplicates = scored.slice(1).map(s => s.record);

    return Response.json({ survivor, duplicates, scored: scored.map(s => ({ id: s.record.id, score: s.score, entry_count: s.entry_count })) });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});