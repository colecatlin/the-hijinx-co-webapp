/**
 * repairDuplicateStandings.js
 *
 * Detects duplicate Standing groups and safely consolidates them:
 *   - picks one canonical survivor
 *   - annotates non-survivors with DUPLICATE_OF note
 *   - re-indexes survivor with standing_identity_key
 *   - does NOT hard-delete records
 *
 * Input:  { dry_run?: boolean }
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function buildKey(series_id, season_year, class_id, driver_id) {
  return `standing:${series_id || 'none'}:${season_year || 'none'}:${class_id || 'none'}:${driver_id || 'none'}`;
}

function scoreStanding(r) {
  let s = 0;
  if (r.standing_identity_key) s += 4;
  if (r.points_total != null && r.points_total > 0) s += 3;
  if (r.rank != null) s += 2;
  if (r.wins != null) s += 1;
  return s;
}

function pickSurvivor(group) {
  return group.slice().sort((a, b) => {
    const ds = scoreStanding(b) - scoreStanding(a);
    if (ds !== 0) return ds;
    return new Date(a.created_date || 0) - new Date(b.created_date || 0);
  })[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    const all = await base44.asServiceRole.entities.Standings.list('-created_date', 10000);

    const byKey       = new Map();
    const byComposite = new Map();

    for (const s of all) {
      if (s.notes?.includes('DUPLICATE_OF:')) continue;
      if (s.standing_identity_key) {
        const a = byKey.get(s.standing_identity_key) || []; a.push(s); byKey.set(s.standing_identity_key, a);
      } else if (s.series_id && s.driver_id && s.season_year) {
        const k = buildKey(s.series_id, s.season_year, s.series_class_id || null, s.driver_id);
        const a = byComposite.get(k) || []; a.push(s); byComposite.set(k, a);
      }
    }

    const processedIds = new Set();
    const groups = [];
    for (const [key, g] of byKey)       if (g.length > 1) { groups.push({ key, type: 'identity_key', records: g }); g.forEach(r => processedIds.add(r.id)); }
    for (const [key, g] of byComposite) if (g.length > 1) {
      const uniq = g.filter(r => !processedIds.has(r.id));
      if (uniq.length > 1) { groups.push({ key, type: 'composite', records: uniq }); uniq.forEach(r => processedIds.add(r.id)); }
    }

    if (!groups.length) {
      return Response.json({ success: true, dry_run, groups_processed: 0, survivors: [], duplicates_marked: [], skipped: [], warnings: [], repairs: [], message: 'No duplicate Standing groups detected.' });
    }

    const report = { dry_run, total_standings: all.length, groups_detected: groups.length, groups_processed: 0, survivors: [], duplicates_marked: [], skipped: [], warnings: [], repairs: [] };

    for (const { key, type, records } of groups) {
      const active = records.filter(r => !r.notes?.includes('DUPLICATE_OF:'));
      if (active.length <= 1) { report.skipped.push({ key, reason: 'already_marked' }); continue; }

      const survivor = pickSurvivor(active);
      const dups     = active.filter(r => r.id !== survivor.id);
      report.groups_processed++;

      const identityKey = survivor.standing_identity_key || buildKey(survivor.series_id, survivor.season_year, survivor.series_class_id || null, survivor.driver_id);
      if (!dry_run) {
        await base44.asServiceRole.entities.Standings.update(survivor.id, { standing_identity_key: identityKey }).catch(e => report.warnings.push(`survivor_update:${survivor.id}:${e.message}`));
      }

      report.survivors.push({ id: survivor.id, series_id: survivor.series_id, season_year: survivor.season_year, driver_id: survivor.driver_id, match_type: type, action: dry_run ? 'would_be_survivor' : 'confirmed_survivor' });

      const dupIds = [];
      for (const dup of dups) {
        const marker = `DUPLICATE_OF:${survivor.id}`;
        const newNotes = (dup.notes || '').includes(marker) ? dup.notes : ((dup.notes || '') ? `${dup.notes} | ${marker}` : marker);
        if (!dry_run) {
          await base44.asServiceRole.entities.Standings.update(dup.id, { notes: newNotes, standing_identity_key: `standing:DUPLICATE_OF:${survivor.id}` }).catch(e => report.warnings.push(`dup_update:${dup.id}:${e.message}`));
        }
        report.duplicates_marked.push({ id: dup.id, survivor_id: survivor.id, action: dry_run ? 'would_annotate' : 'annotated' });
        dupIds.push(dup.id);
      }
      if (dupIds.length) report.repairs.push({ survivor_id: survivor.id, duplicate_ids: dupIds });
    }

    if (!dry_run && report.duplicates_marked.length) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'operational_duplicate_repaired',
        entity_name: 'Standings',
        status: 'success',
        metadata: { entity_type: 'standings', groups_processed: report.groups_processed, marked_count: report.duplicates_marked.length },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});