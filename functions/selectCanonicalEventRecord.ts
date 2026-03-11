/**
 * selectCanonicalEventRecord.js
 *
 * Given a list of duplicate Event records, picks the best canonical survivor.
 *
 * Priority:
 * 1. Has external_uid
 * 2. Most linked Sessions
 * 3. Most linked Results
 * 4. Oldest created_date
 *
 * Input:  { event_records: EventRecord[] }
 * Output: { survivor, duplicates, selection_reason }
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json();
    const { event_records } = body;

    if (!Array.isArray(event_records) || event_records.length < 2) {
      return Response.json({ error: 'Provide at least 2 event_records to compare' }, { status: 400 });
    }

    // 1. Has external_uid
    const withUid = event_records.find(e => e.external_uid && !e.canonical_key?.includes('DUPLICATE'));
    if (withUid) {
      return Response.json({
        survivor: withUid,
        duplicates: event_records.filter(e => e.id !== withUid.id),
        selection_reason: 'has_external_uid',
      });
    }

    // 2. Most linked Sessions
    const sessionCounts = {};
    for (const e of event_records) {
      const sessions = await base44.asServiceRole.entities.Session.filter({ event_id: e.id }).catch(() => []);
      sessionCounts[e.id] = sessions.length;
    }
    const maxSessions = Math.max(...Object.values(sessionCounts));
    if (maxSessions > 0) {
      const best = event_records.find(e => sessionCounts[e.id] === maxSessions);
      return Response.json({
        survivor: best,
        duplicates: event_records.filter(e => e.id !== best.id),
        selection_reason: 'most_sessions',
        session_counts: sessionCounts,
      });
    }

    // 3. Most linked Results
    const resultCounts = {};
    for (const e of event_records) {
      const results = await base44.asServiceRole.entities.Results.filter({ event_id: e.id }).catch(() => []);
      resultCounts[e.id] = results.length;
    }
    const maxResults = Math.max(...Object.values(resultCounts));
    if (maxResults > 0) {
      const best = event_records.find(e => resultCounts[e.id] === maxResults);
      return Response.json({
        survivor: best,
        duplicates: event_records.filter(e => e.id !== best.id),
        selection_reason: 'most_results',
        result_counts: resultCounts,
      });
    }

    // 4. Oldest created_date
    const oldest = event_records.slice().sort((a, b) =>
      new Date(a.created_date || 0) - new Date(b.created_date || 0)
    )[0];
    return Response.json({
      survivor: oldest,
      duplicates: event_records.filter(e => e.id !== oldest.id),
      selection_reason: 'oldest_record',
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});