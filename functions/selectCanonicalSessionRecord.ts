/**
 * selectCanonicalSessionRecord.js
 *
 * Given a list of duplicate Session records, picks the best canonical survivor.
 *
 * Priority:
 * 1. Has external_uid
 * 2. Most linked Results
 * 3. Most linked Entries
 * 4. Most complete metadata
 * 5. Oldest created_date
 *
 * Input:  { session_records: SessionRecord[] }
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
    const { session_records } = body;

    if (!Array.isArray(session_records) || session_records.length < 2) {
      return Response.json({ error: 'Provide at least 2 session_records to compare' }, { status: 400 });
    }

    // 1. Has external_uid (strongest external authority)
    const withUid = session_records.find(s => s.external_uid && !s.canonical_key?.includes('DUPLICATE'));
    if (withUid) {
      return Response.json({
        survivor: withUid,
        duplicates: session_records.filter(s => s.id !== withUid.id),
        selection_reason: 'has_external_uid',
      });
    }

    // 2. Most linked Results
    const resultCounts = {};
    for (const s of session_records) {
      const results = await base44.asServiceRole.entities.Results.filter({ session_id: s.id }).catch(() => []);
      resultCounts[s.id] = results.length;
    }
    const maxResults = Math.max(...Object.values(resultCounts));
    if (maxResults > 0) {
      const best = session_records.find(s => resultCounts[s.id] === maxResults);
      return Response.json({
        survivor: best,
        duplicates: session_records.filter(s => s.id !== best.id),
        selection_reason: 'most_results',
        result_counts: resultCounts,
      });
    }

    // 3. Most linked Entries
    const entryCounts = {};
    for (const s of session_records) {
      const entries = await base44.asServiceRole.entities.Entry.filter({ session_id: s.id }).catch(() => []);
      entryCounts[s.id] = entries.length;
    }
    const maxEntries = Math.max(...Object.values(entryCounts));
    if (maxEntries > 0) {
      const best = session_records.find(s => entryCounts[s.id] === maxEntries);
      return Response.json({
        survivor: best,
        duplicates: session_records.filter(s => s.id !== best.id),
        selection_reason: 'most_entries',
        entry_counts: entryCounts,
      });
    }

    // 4. Most complete metadata (has more non-null fields)
    const completeness = {};
    for (const s of session_records) {
      let score = 0;
      if (s.session_type) score++;
      if (s.laps) score++;
      if (s.duration_minutes) score++;
      if (s.round_number) score++;
      if (s.event_class_id) score++;
      completeness[s.id] = score;
    }
    const maxComplete = Math.max(...Object.values(completeness));
    if (maxComplete > 0) {
      const best = session_records.find(s => completeness[s.id] === maxComplete);
      return Response.json({
        survivor: best,
        duplicates: session_records.filter(s => s.id !== best.id),
        selection_reason: 'most_complete_metadata',
      });
    }

    // 5. Oldest created_date
    const oldest = session_records.slice().sort((a, b) =>
      new Date(a.created_date || 0) - new Date(b.created_date || 0)
    )[0];
    return Response.json({
      survivor: oldest,
      duplicates: session_records.filter(s => s.id !== oldest.id),
      selection_reason: 'oldest_record',
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});