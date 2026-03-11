/**
 * repairDuplicateEntries.js
 *
 * Detects duplicate Entry groups and safely consolidates them:
 * - picks one canonical survivor per group
 * - marks non-survivors as Withdrawn and annotates notes
 * - re-indexes survivor with entry_identity_key
 * - does NOT hard-delete records
 *
 * Input:  { dry_run?: boolean }
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function buildKey(event_id, driver_id, class_id) {
  return `entry:${event_id || 'none'}:${driver_id || 'none'}:${class_id || 'none'}`;
}

function scoreEntry(r) {
  let s = 0;
  if (r.entry_identity_key) s += 4;
  if (r.entry_status === 'Teched')     s += 3;
  if (r.entry_status === 'Checked In') s += 2;
  if (r.entry_status === 'Registered') s += 1;
  if (r.transponder_id) s += 1;
  if (r.car_number)     s += 1;
  if (r.event_class_id) s += 1;
  return s;
}

function pickSurvivor(group) {
  return group.slice().sort((a, b) => {
    const ds = scoreEntry(b) - scoreEntry(a);
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

    const all = await base44.asServiceRole.entities.Entry.list('-created_date', 10000);

    const byKey       = new Map();
    const byComposite = new Map();

    for (const e of all) {
      if (e.notes?.includes('DUPLICATE_OF:') || e.entry_status === 'Withdrawn') continue;
      if (e.entry_identity_key) {
        const a = byKey.get(e.entry_identity_key) || []; a.push(e); byKey.set(e.entry_identity_key, a);
      } else if (e.event_id && e.driver_id) {
        const k = buildKey(e.event_id, e.driver_id, e.event_class_id || e.series_class_id || null);
        const a = byComposite.get(k) || []; a.push(e); byComposite.set(k, a);
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
      return Response.json({ success: true, dry_run, groups_processed: 0, survivors: [], duplicates_marked: [], skipped: [], warnings: [], repairs: [], message: 'No duplicate Entry groups detected.' });
    }

    const report = { dry_run, total_entries: all.length, groups_detected: groups.length, groups_processed: 0, survivors: [], duplicates_marked: [], skipped: [], warnings: [], repairs: [] };

    for (const { key, type, records } of groups) {
      const active = records.filter(r => !r.notes?.includes('DUPLICATE_OF:') && r.entry_status !== 'Withdrawn');
      if (active.length <= 1) { report.skipped.push({ key, reason: 'already_marked' }); continue; }

      const survivor = pickSurvivor(active);
      const dups     = active.filter(r => r.id !== survivor.id);
      report.groups_processed++;

      const identityKey = survivor.entry_identity_key || buildKey(survivor.event_id, survivor.driver_id, survivor.event_class_id || survivor.series_class_id || null);
      if (!dry_run) {
        await base44.asServiceRole.entities.Entry.update(survivor.id, { entry_identity_key: identityKey }).catch(e => report.warnings.push(`survivor_update:${survivor.id}:${e.message}`));
      }

      report.survivors.push({ id: survivor.id, event_id: survivor.event_id, driver_id: survivor.driver_id, match_type: type, action: dry_run ? 'would_be_survivor' : 'confirmed_survivor' });

      const dupIds = [];
      for (const dup of dups) {
        const marker = `DUPLICATE_OF:${survivor.id}`;
        const newNotes = (dup.notes || '').includes(marker) ? dup.notes : ((dup.notes || '') ? `${dup.notes} | ${marker}` : marker);
        if (!dry_run) {
          await base44.asServiceRole.entities.Entry.update(dup.id, {
            entry_status: 'Withdrawn',
            notes: newNotes,
            entry_identity_key: `entry:DUPLICATE_OF:${survivor.id}`,
          }).catch(e => report.warnings.push(`dup_update:${dup.id}:${e.message}`));
        }
        report.duplicates_marked.push({ id: dup.id, survivor_id: survivor.id, action: dry_run ? 'would_withdraw' : 'withdrawn' });
        dupIds.push(dup.id);
      }
      if (dupIds.length) report.repairs.push({ survivor_id: survivor.id, duplicate_ids: dupIds });
    }

    if (!dry_run && report.duplicates_marked.length) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'operational_duplicate_repaired',
        entity_name: 'Entry',
        status: 'success',
        metadata: { entity_type: 'entry', groups_processed: report.groups_processed, marked_count: report.duplicates_marked.length, survivor_ids: report.survivors.map(s => s.id) },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});