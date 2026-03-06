/**
 * fixKnownSeriesDuplicates.js
 * One-time cleanup helper for known duplicate series like "NASCAR" / "Nascar" / "NASCAR Cup Series".
 * Admin must trigger manually — not auto-run.
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

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false; // default dry_run = true for safety

    // Load all Series
    const allSeries = await base44.asServiceRole.entities.Series.list('-created_date', 2000);

    // ---- Group NASCAR variants ----
    // We look for normalized_name === "nascar" OR name contains "nascar" in any casing
    const nascarPattern = /nascar/i;
    const nascarGroups = new Map(); // normalized_name -> records[]

    for (const s of allSeries) {
      const norm = normalizeName(s.name || s.full_name || '');
      if (nascarPattern.test(s.name || '')) {
        const arr = nascarGroups.get(norm) || [];
        arr.push(s);
        nascarGroups.set(norm, arr);
      }
    }

    // Also check for bare "nascar" key
    const allNascar = allSeries.filter(s => nascarPattern.test(s.name || ''));
    // Group by their normalized name
    const groupedByNorm = new Map();
    for (const s of allNascar) {
      const norm = normalizeName(s.name || '');
      const arr = groupedByNorm.get(norm) || [];
      arr.push(s);
      groupedByNorm.set(norm, arr);
    }

    const report = {
      dry_run,
      groups_found: 0,
      survivors: [],
      marked_duplicate: [],
      already_unique: [],
    };

    for (const [normKey, group] of groupedByNorm) {
      if (group.length === 1) {
        report.already_unique.push({ norm_key: normKey, id: group[0].id, name: group[0].name });
        continue;
      }

      report.groups_found++;

      // Choose survivor: prefer record with external_uid, else oldest created_date
      let survivor = group.find(s => s.external_uid);
      if (!survivor) {
        survivor = group.slice().sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
      }

      report.survivors.push({
        id: survivor.id,
        name: survivor.name,
        norm_key: normKey,
        external_uid: survivor.external_uid || null,
        duplicate_count: group.length - 1,
      });

      const duplicates = group.filter(s => s.id !== survivor.id);
      for (const dup of duplicates) {
        const dupNote = `DUPLICATE_OF:${survivor.id}`;
        const existingNotes = dup.notes || '';
        const patch = {
          status: 'Inactive',
          notes: existingNotes.includes(dupNote) ? existingNotes : (existingNotes ? `${existingNotes} | ${dupNote}` : dupNote),
          canonical_key: `series:DUPLICATE_OF:${survivor.id}`,
        };

        if (!dry_run) {
          await base44.asServiceRole.entities.Series.update(dup.id, patch);
        }

        report.marked_duplicate.push({
          id: dup.id,
          name: dup.name,
          survivor_id: survivor.id,
          action: dry_run ? 'would_mark_inactive' : 'marked_inactive',
        });
      }

      // Ensure survivor has normalized fields set
      if (!dry_run) {
        const norm = normalizeName(survivor.name || '');
        const slug = norm.replace(/\s+/g, '-');
        await base44.asServiceRole.entities.Series.update(survivor.id, {
          normalized_name: norm,
          canonical_slug: slug,
          canonical_key: `series:${norm}`,
          sync_last_seen_at: new Date().toISOString(),
        });
      }
    }

    if (!dry_run && report.marked_duplicate.length > 0) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'source_duplicate_repaired',
        entity_name: 'Series',
        status: 'success',
        metadata: {
          entity_type: 'series',
          repair_type: 'nascar_known_duplicates',
          groups_processed: report.groups_found,
          marked_count: report.marked_duplicate.length,
        },
      }).catch(() => {});
    }

    return Response.json({ success: true, report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});