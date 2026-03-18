/**
 * repairDuplicateSeriesClasses.js
 *
 * Detects duplicate SeriesClass groups, picks a survivor, marks duplicates inactive,
 * and re-points Entry.series_class_id and Standings.series_class_id references
 * from duplicate IDs to the survivor ID.
 *
 * Input:  { dry_run?: boolean }
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeClassName(name) {
  return (name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}
function buildKey(series_id, class_name) {
  return `series_class:${series_id || 'none'}:${normalizeClassName(class_name)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    const all = await base44.asServiceRole.entities.SeriesClass.list('-created_date', 5000);

    const byKey       = new Map();
    const byComposite = new Map();

    for (const c of all) {
      if (c.active === false) continue;
      if (c.series_class_identity_key) {
        const a = byKey.get(c.series_class_identity_key) || []; a.push(c); byKey.set(c.series_class_identity_key, a);
      } else if (c.series_id && c.class_name) {
        const k = buildKey(c.series_id, c.class_name);
        const a = byComposite.get(k) || []; a.push(c); byComposite.set(k, a);
      }
    }

    const processedIds = new Set();
    const groups = [];
    for (const [key, g] of byKey)       if (g.length > 1) { groups.push({ key, records: g }); g.forEach(r => processedIds.add(r.id)); }
    for (const [key, g] of byComposite) if (g.length > 1) {
      const uniq = g.filter(r => !processedIds.has(r.id));
      if (uniq.length > 1) { groups.push({ key, records: uniq }); uniq.forEach(r => processedIds.add(r.id)); }
    }

    if (!groups.length) {
      return Response.json({ success: true, dry_run, groups_detected: 0, groups_processed: 0, survivors: [], duplicates_marked: [], entry_refs_updated: 0, standing_refs_updated: 0, warnings: [], message: 'No duplicate SeriesClass groups detected.' });
    }

    // Pre-fetch entries and standings for reference repair
    const [allEntries, allStandings] = await Promise.all([
      base44.asServiceRole.entities.Entry.list('-created_date', 10000).catch(() => []),
      base44.asServiceRole.entities.Standings.list('-created_date', 10000).catch(() => []),
    ]);

    const report = { dry_run, groups_detected: groups.length, groups_processed: 0, survivors: [], duplicates_marked: [], entry_refs_updated: 0, standing_refs_updated: 0, warnings: [] };

    for (const { key, records } of groups) {
      // Pick survivor: most entries linked, then oldest
      const scored = await Promise.all(records.map(async r => {
        const ec = allEntries.filter(e => e.series_class_id === r.id).length;
        const sc = allStandings.filter(s => s.series_class_id === r.id).length;
        const hasKey = !!r.series_class_identity_key;
        return { record: r, score: (hasKey ? 4 : 0) + ec + sc, ec, sc, created: new Date(r.created_date || 0).getTime() };
      }));
      scored.sort((a, b) => b.score - a.score || a.created - b.created);

      const survivor = scored[0].record;
      const dups     = scored.slice(1).map(s => s.record);
      report.groups_processed++;

      const identityKey = survivor.series_class_identity_key || buildKey(survivor.series_id, survivor.class_name);
      if (!dry_run) {
        await base44.asServiceRole.entities.SeriesClass.update(survivor.id, { series_class_identity_key: identityKey }).catch(e => report.warnings.push(`survivor:${survivor.id}:${e.message}`));
      }
      report.survivors.push({ id: survivor.id, class_name: survivor.class_name, series_id: survivor.series_id });

      for (const dup of dups) {
        if (!dry_run) {
          await base44.asServiceRole.entities.SeriesClass.update(dup.id, { active: false, notes: `DUPLICATE_OF:${survivor.id}` }).catch(e => report.warnings.push(`dup:${dup.id}:${e.message}`));
        }
        report.duplicates_marked.push({ id: dup.id, survivor_id: survivor.id, action: dry_run ? 'would_deactivate' : 'deactivated' });

        // Repair Entry references
        const entryRefs = allEntries.filter(e => e.series_class_id === dup.id);
        for (const e of entryRefs) {
          if (!dry_run) {
            await base44.asServiceRole.entities.Entry.update(e.id, { series_class_id: survivor.id }).catch(err => report.warnings.push(`entry_ref:${e.id}:${err.message}`));
          }
          report.entry_refs_updated++;
        }

        // Repair Standings references
        const standingRefs = allStandings.filter(s => s.series_class_id === dup.id);
        for (const s of standingRefs) {
          if (!dry_run) {
            await base44.asServiceRole.entities.Standings.update(s.id, { series_class_id: survivor.id }).catch(err => report.warnings.push(`standing_ref:${s.id}:${err.message}`));
          }
          report.standing_refs_updated++;
        }
      }
    }

    if (!dry_run && report.duplicates_marked.length) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'operational_duplicate_repaired',
        entity_name: 'SeriesClass',
        status: 'success',
        metadata: { entity_type: 'series_class', groups_processed: report.groups_processed, marked_count: report.duplicates_marked.length, survivor_id: report.survivors.map(s => s.id) },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});