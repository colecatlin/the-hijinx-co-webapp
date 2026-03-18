/**
 * selectCanonicalDriverRecord.js
 *
 * Given a list of duplicate Driver records, picks the best canonical survivor.
 *
 * Priority:
 * 1. Has external_uid
 * 2. Strongest canonical_key (most specific — includes DOB or primary_number)
 * 3. Most linked Results
 * 4. Most linked Entries
 * 5. Oldest created_date
 *
 * Input:  { driver_records: DriverRecord[] }
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
    const { driver_records } = body;

    if (!Array.isArray(driver_records) || driver_records.length < 2) {
      return Response.json({ error: 'Provide at least 2 driver_records to compare' }, { status: 400 });
    }

    // 1. Has external_uid (strongest external authority)
    const withUid = driver_records.find(d => d.external_uid && !d.canonical_key?.includes('DUPLICATE'));
    if (withUid) {
      return Response.json({
        survivor: withUid,
        duplicates: driver_records.filter(d => d.id !== withUid.id),
        selection_reason: 'has_external_uid',
      });
    }

    // 2. Most specific canonical_key (contains DOB or number → more colons)
    const validCk = driver_records.filter(d =>
      d.canonical_key?.startsWith('driver:') && !d.canonical_key.includes('DUPLICATE')
    );
    if (validCk.length > 0) {
      const bestCk = validCk.reduce((best, d) => {
        const bestParts = (best.canonical_key || '').split(':').length;
        const thisParts = (d.canonical_key || '').split(':').length;
        return thisParts > bestParts ? d : best;
      }, validCk[0]);
      return Response.json({
        survivor: bestCk,
        duplicates: driver_records.filter(d => d.id !== bestCk.id),
        selection_reason: 'strongest_canonical_key',
      });
    }

    // 3. Most linked Results
    const resultCounts = {};
    for (const d of driver_records) {
      const res = await base44.asServiceRole.entities.Results.filter({ driver_id: d.id }).catch(() => []);
      resultCounts[d.id] = res.length;
    }
    const maxResults = Math.max(...Object.values(resultCounts));
    if (maxResults > 0) {
      const best = driver_records.find(d => resultCounts[d.id] === maxResults);
      return Response.json({
        survivor: best,
        duplicates: driver_records.filter(d => d.id !== best.id),
        selection_reason: 'most_results',
        result_counts: resultCounts,
      });
    }

    // 4. Most linked Entries
    const entryCounts = {};
    for (const d of driver_records) {
      const res = await base44.asServiceRole.entities.Entry.filter({ driver_id: d.id }).catch(() => []);
      entryCounts[d.id] = res.length;
    }
    const maxEntries = Math.max(...Object.values(entryCounts));
    if (maxEntries > 0) {
      const best = driver_records.find(d => entryCounts[d.id] === maxEntries);
      return Response.json({
        survivor: best,
        duplicates: driver_records.filter(d => d.id !== best.id),
        selection_reason: 'most_entries',
        entry_counts: entryCounts,
      });
    }

    // 5. Oldest created_date
    const oldest = driver_records.slice().sort((a, b) =>
      new Date(a.created_date || 0) - new Date(b.created_date || 0)
    )[0];
    return Response.json({
      survivor: oldest,
      duplicates: driver_records.filter(d => d.id !== oldest.id),
      selection_reason: 'oldest_record',
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});