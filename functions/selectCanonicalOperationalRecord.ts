/**
 * selectCanonicalOperationalRecord.js
 *
 * Chooses the canonical survivor among a group of duplicate operational records
 * (Results or Standings).
 *
 * Input:  { records: [...], record_type: 'result' | 'standing' }
 * Output: { survivor, duplicates }
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function scoreResult(r) {
  let s = 0;
  if (r.result_identity_key) s += 4;
  if (r.status_state === 'Official' || r.status_state === 'Locked') s += 3;
  if (r.status_state === 'Provisional') s += 2;
  if (r.points != null) s += 1;
  if (r.position != null) s += 1;
  return s;
}

function scoreStanding(r) {
  let s = 0;
  if (r.standing_identity_key) s += 4;
  if (r.points_total != null && r.points_total > 0) s += 3;
  if (r.rank != null) s += 2;
  if (r.wins != null) s += 1;
  return s;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { records = [], record_type = 'result' } = body;

    if (records.length < 2) {
      return Response.json({ error: 'Need at least 2 records to pick a survivor' }, { status: 400 });
    }

    const scored = records.map(r => ({
      record: r,
      score: record_type === 'standing' ? scoreStanding(r) : scoreResult(r),
      created: new Date(r.created_date || 0).getTime(),
    }));

    // Sort: highest score first, then oldest first on tie
    scored.sort((a, b) => b.score - a.score || a.created - b.created);

    const survivor   = scored[0].record;
    const duplicates = scored.slice(1).map(s => s.record);

    return Response.json({ survivor, duplicates, scored: scored.map(s => ({ id: s.record.id, score: s.score })) });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});