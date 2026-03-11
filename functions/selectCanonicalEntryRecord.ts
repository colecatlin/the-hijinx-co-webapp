/**
 * selectCanonicalEntryRecord.js
 *
 * Picks canonical survivor from a group of duplicate Entry records.
 * Input:  { records: [...] }
 * Output: { survivor, duplicates, scored }
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function scoreEntry(r) {
  let s = 0;
  if (r.entry_identity_key) s += 4;
  if (r.entry_status === 'Teched')      s += 3;
  if (r.entry_status === 'Checked In')  s += 2;
  if (r.entry_status === 'Registered')  s += 1;
  if (r.transponder_id)  s += 1;
  if (r.car_number)      s += 1;
  if (r.event_class_id)  s += 1;
  return s;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { records = [] } = body;

    if (records.length < 2) {
      return Response.json({ error: 'Need at least 2 records to pick a survivor' }, { status: 400 });
    }

    const scored = records.map(r => ({
      record: r,
      score: scoreEntry(r),
      created: new Date(r.created_date || 0).getTime(),
    }));

    scored.sort((a, b) => b.score - a.score || a.created - b.created);

    const survivor   = scored[0].record;
    const duplicates = scored.slice(1).map(s => s.record);

    return Response.json({ survivor, duplicates, scored: scored.map(s => ({ id: s.record.id, score: s.score })) });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});