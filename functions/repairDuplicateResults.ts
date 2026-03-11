/**
 * repairDuplicateResults.js
 *
 * Detects duplicate Result groups and safely consolidates them:
 *   - picks one canonical survivor per group (most complete / most official)
 *   - marks non-survivors with status_state='Locked' and DUPLICATE_OF note
 *   - re-indexes survivor with result_identity_key
 *   - does NOT hard-delete records
 *
 * Input:  { dry_run?: boolean }
 * Output: repair report including `repairs` array for reference repair
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function buildKey(event_id, session_id, driver_id) {
  return `result:${event_id || 'none'}:${session_id || 'none'}:${driver_id || 'none'}`;
}

function scoreResult(r) {
  let s = 0;
  if (r.result_identity_key) s += 4;
  if (r.status_state === 'Official' || r.status_state === 'Locked') s += 3;
  if (r.status_state === 'Provisional') s += 2;
  if (r.points != null) s += 1;
  if (r.position != null) s += 1;
  return s;
}

function pickSurvivor(group) {
  return group.slice().sort((a, b) => {
    const ds = scoreResult(b) - scoreResult(a);
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

    const all = await base44.asServiceRole.entities.Results.list('-created_date', 10000);

    const byKey = new Map();
    const byComposite = new Map();

    for (const r of all) {
      if (r.notes?.includes('DUPLICATE_OF:') || r.status_state === 'Locked') continue;
      if (r.result_identity_key) {
        const a = byKey.get(r.result_identity_key) || []; a.push(r); byKey.set(r.result_identity_key, a);
      } else if (r.event_id && r.driver_id) {
        const k = buildKey(r.event_id, r.session_id, r.driver_id);
        const a = byComposite.get(k) || []; a.push(r); byComposite.set(k, a);
      }
    }

    const processedIds = new Set();
    const groups = [];
    for (const [key, g] of byKey)      if (g.length > 1) { groups.push({ key, type: 'identity_key', records: g }); g.forEach(r => processedIds.add(r.id)); }
    for (const [key, g] of byComposite) if (g.length > 1) {
      const uniq = g.filter(r => !processedIds.has(r.id));
      if (uniq.length > 1) { groups.push({ key, type: 'composite', records: uniq }); uniq.forEach(r => processedIds.add(r.id)); }
    }

    if (!groups.length) {
      return Response.json({ success: true, dry_run, groups_processed: 0, survivors: [], duplicates_marked: [], skipped: [], warnings: [], repairs: [], message: 'No duplicate Result groups detected.' });
    }

    const report = { dry_run, total_results: all.length, groups_detected: groups.length, groups_processed: 0, survivors: [], duplicates_marked: [], skipped: [], warnings: [], repairs: [] };

    for (const { key, type, records } of groups) {
      const active = records.filter(r => !r.notes?.includes('DUPLICATE_OF:'));
      if (active.length <= 1) { report.skipped.push({ key, reason: 'already_marked' }); continue; }

      const survivor = pickSurvivor(active);
      const dups     = active.filter(r => r.id !== survivor.id);
      report.groups_processed++;

      const identityKey = survivor.result_identity_key || buildKey(survivor.event_id, survivor.session_id, survivor.driver_id);
      if (!dry_run) {
        await base44.asServiceRole.entities.Results.update(survivor.id, { result_identity_key: identityKey }).catch(e => report.warnings.push(`survivor_update:${survivor.id}:${e.message}`));
      }

      report.survivors.push({ id: survivor.id, event_id: survivor.event_id, session_id: survivor.session_id, driver_id: survivor.driver_id, match_type: type, action: dry_run ? 'would_be_survivor' : 'confirmed_survivor' });

      const dupIds = [];
      for (const dup of dups) {
        const marker = `DUPLICATE_OF:${survivor.id}`;
        const newNotes = (dup.notes || '').includes(marker) ? dup.notes : ((dup.notes || '') ? `${dup.notes} | ${marker}` : marker);
        if (!dry_run) {
          await base44.asServiceRole.entities.Results.update(dup.id, { status_state: 'Locked', notes: newNotes, result_identity_key: `result:DUPLICATE_OF:${survivor.id}` }).catch(e => report.warnings.push(`dup_update:${dup.id}:${e.message}`));
        }
        report.duplicates_marked.push({ id: dup.id, survivor_id: survivor.id, action: dry_run ? 'would_lock' : 'locked' });
        dupIds.push(dup.id);
      }
      if (dupIds.length) report.repairs.push({ survivor_id: survivor.id, duplicate_ids: dupIds });
    }

    if (!dry_run && report.duplicates_marked.length) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'operational_duplicate_repaired',
        entity_name: 'Results',
        status: 'success',
        metadata: { entity_type: 'results', groups_processed: report.groups_processed, marked_count: report.duplicates_marked.length, survivor_ids: report.survivors.map(s => s.id) },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});