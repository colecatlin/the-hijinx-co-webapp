/**
 * repairDuplicateEventClasses.js
 *
 * Detects duplicate EventClass groups, picks a survivor, marks duplicates Closed,
 * and re-points Entry.event_class_id and Session.event_class_id references.
 *
 * Input:  { dry_run?: boolean }
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeClassName(name) {
  return (name || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}
function buildKey(event_id, class_name) {
  return `event_class:${event_id || 'none'}:${normalizeClassName(class_name)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    const all = await base44.asServiceRole.entities.EventClass.list('-created_date', 5000);

    const byKey       = new Map();
    const byComposite = new Map();

    for (const c of all) {
      if (c.class_status === 'Closed') continue;
      if (c.event_class_identity_key) {
        const a = byKey.get(c.event_class_identity_key) || []; a.push(c); byKey.set(c.event_class_identity_key, a);
      } else if (c.event_id && c.class_name) {
        const k = buildKey(c.event_id, c.class_name);
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
      return Response.json({ success: true, dry_run, groups_detected: 0, groups_processed: 0, survivors: [], duplicates_marked: [], entry_refs_updated: 0, session_refs_updated: 0, warnings: [], message: 'No duplicate EventClass groups detected.' });
    }

    const [allEntries, allSessions] = await Promise.all([
      base44.asServiceRole.entities.Entry.list('-created_date', 10000).catch(() => []),
      base44.asServiceRole.entities.Session.list('-created_date', 10000).catch(() => []),
    ]);

    const report = { dry_run, groups_detected: groups.length, groups_processed: 0, survivors: [], duplicates_marked: [], entry_refs_updated: 0, session_refs_updated: 0, warnings: [] };

    for (const { key, records } of groups) {
      const scored = records.map(r => {
        const ec = allEntries.filter(e => e.event_class_id === r.id).length;
        const sc = allSessions.filter(s => s.event_class_id === r.id).length;
        const hasKey = !!r.event_class_identity_key;
        return { record: r, score: (hasKey ? 4 : 0) + ec + sc, created: new Date(r.created_date || 0).getTime() };
      });
      scored.sort((a, b) => b.score - a.score || a.created - b.created);

      const survivor = scored[0].record;
      const dups     = scored.slice(1).map(s => s.record);
      report.groups_processed++;

      const identityKey = survivor.event_class_identity_key || buildKey(survivor.event_id, survivor.class_name);
      if (!dry_run) {
        await base44.asServiceRole.entities.EventClass.update(survivor.id, { event_class_identity_key: identityKey }).catch(e => report.warnings.push(`survivor:${survivor.id}:${e.message}`));
      }
      report.survivors.push({ id: survivor.id, class_name: survivor.class_name, event_id: survivor.event_id });

      for (const dup of dups) {
        if (!dry_run) {
          await base44.asServiceRole.entities.EventClass.update(dup.id, { class_status: 'Closed', notes: `DUPLICATE_OF:${survivor.id}` }).catch(e => report.warnings.push(`dup:${dup.id}:${e.message}`));
        }
        report.duplicates_marked.push({ id: dup.id, survivor_id: survivor.id, action: dry_run ? 'would_close' : 'closed' });

        // Repair Entry references
        const entryRefs = allEntries.filter(e => e.event_class_id === dup.id);
        for (const e of entryRefs) {
          if (!dry_run) {
            await base44.asServiceRole.entities.Entry.update(e.id, { event_class_id: survivor.id }).catch(err => report.warnings.push(`entry_ref:${e.id}:${err.message}`));
          }
          report.entry_refs_updated++;
        }

        // Repair Session references
        const sessionRefs = allSessions.filter(s => s.event_class_id === dup.id);
        for (const s of sessionRefs) {
          if (!dry_run) {
            await base44.asServiceRole.entities.Session.update(s.id, { event_class_id: survivor.id }).catch(err => report.warnings.push(`session_ref:${s.id}:${err.message}`));
          }
          report.session_refs_updated++;
        }
      }
    }

    if (!dry_run && report.duplicates_marked.length) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'operational_duplicate_repaired',
        entity_name: 'EventClass',
        status: 'success',
        metadata: { entity_type: 'event_class', groups_processed: report.groups_processed, marked_count: report.duplicates_marked.length },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});