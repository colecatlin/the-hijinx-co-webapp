/**
 * repairDuplicateEventRecords.js
 *
 * Detects duplicate Event groups and safely consolidates them:
 *   - picks one canonical survivor per group
 *   - marks non-survivors Inactive
 *   - appends DUPLICATE_OF:{survivor_id} to notes
 *   - re-indexes survivor with normalized_event_key + canonical_key
 *   - writes OperationLog
 *   - does NOT hard-delete any records
 *
 * Input:  { dry_run?: boolean }
 * Output: full repair report including `repairs` array for repairEventReferences
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function buildNormalizedEventKey({ name, event_date, track_id, series_id }) {
  const norm = (name || '').trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const date = event_date || 'none';
  const track = track_id || 'none';
  const series = series_id || 'none';
  return `event:${series}:${track}:${date}`;
}

function pickSurvivor(group, sessionCountsById, resultCountsById) {
  // 1. Has external_uid
  const withUid = group.find(e => e.external_uid && !e.canonical_key?.includes('DUPLICATE'));
  if (withUid) return withUid;

  // 2. Most linked Sessions
  if (sessionCountsById) {
    let max = -1, best = null;
    for (const e of group) {
      const c = sessionCountsById[e.id] || 0;
      if (c > max) { max = c; best = e; }
    }
    if (max > 0) return best;
  }

  // 3. Most linked Results
  if (resultCountsById) {
    let max = -1, best = null;
    for (const e of group) {
      const c = resultCountsById[e.id] || 0;
      if (c > max) { max = c; best = e; }
    }
    if (max > 0) return best;
  }

  // 4. Oldest created_date
  return group.slice().sort((a, b) =>
    new Date(a.created_date || 0) - new Date(b.created_date || 0)
  )[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    // ── 1. Fetch all events ─────────────────────────────────────────────
    const allEvents = await base44.asServiceRole.entities.Event.list('-created_date', 5000);

    // ── 2. Group by dimensions (skip already-marked duplicates) ──────────
    const byNormalizedEventKey = new Map();
    const byExternalUid = new Map();
    const byPositional = new Map();

    for (const e of allEvents) {
      if (e.canonical_key?.includes('DUPLICATE_OF')) continue;

      if (e.normalized_event_key) {
        const a = byNormalizedEventKey.get(e.normalized_event_key) || [];
        a.push(e);
        byNormalizedEventKey.set(e.normalized_event_key, a);
      }
      if (e.external_uid) {
        const a = byExternalUid.get(e.external_uid) || [];
        a.push(e);
        byExternalUid.set(e.external_uid, a);
      }
      if (e.series_id && e.track_id && e.event_date) {
        const k = `${e.series_id}:${e.track_id}:${e.event_date}`;
        const a = byPositional.get(k) || [];
        a.push(e);
        byPositional.set(k, a);
      }
    }

    // ── 3. Collect unique duplicate groups ───────────────────────────────
    const processedIds = new Set();
    const groups = [];

    for (const [key, grp] of byNormalizedEventKey) {
      if (grp.length > 1) {
        groups.push({ match_type: 'normalized_event_key', key, records: grp });
        grp.forEach(r => processedIds.add(r.id));
      }
    }
    for (const [key, grp] of byExternalUid) {
      if (grp.length > 1) {
        const u = grp.filter(r => !processedIds.has(r.id));
        if (u.length > 1) { groups.push({ match_type: 'external_uid', key, records: grp }); grp.forEach(r => processedIds.add(r.id)); }
      }
    }
    for (const [key, grp] of byPositional) {
      if (grp.length > 1) {
        const u = grp.filter(r => !processedIds.has(r.id));
        if (u.length > 1) { groups.push({ match_type: 'series_track_date', key, records: grp }); grp.forEach(r => processedIds.add(r.id)); }
      }
    }

    if (groups.length === 0) {
      return Response.json({
        success: true, dry_run,
        groups_processed: 0, survivors: [], duplicates_marked_inactive: [],
        skipped_groups: [], warnings: [], repairs: [],
        message: 'No duplicate Event groups detected.',
      });
    }

    // ── 4. Pre-fetch counts for survivor selection ──────────────────────
    const candidateIds = [...new Set(groups.flatMap(g => g.records.map(r => r.id)))];
    const sessionCounts = {};
    const resultCounts = {};
    for (const id of candidateIds) {
      const [sess, res] = await Promise.all([
        base44.asServiceRole.entities.Session.filter({ event_id: id }).catch(() => []),
        base44.asServiceRole.entities.Results.filter({ event_id: id }).catch(() => []),
      ]);
      sessionCounts[id] = sess.length;
      resultCounts[id] = res.length;
    }

    // ── 5. Process each group ──────────────────────────────────────────
    const report = {
      dry_run,
      total_events: allEvents.length,
      groups_detected: groups.length,
      groups_processed: 0,
      survivors: [],
      duplicates_marked_inactive: [],
      skipped_groups: [],
      warnings: [],
      repairs: [],
    };

    for (const { match_type, key, records } of groups) {
      const active = records.filter(r => r.status !== 'Inactive');
      if (active.length <= 1) {
        report.skipped_groups.push({ key, match_type, reason: 'all_already_inactive_or_single_active' });
        continue;
      }

      const survivor = pickSurvivor(active, sessionCounts, resultCounts);
      const duplicates = active.filter(r => r.id !== survivor.id);

      report.groups_processed++;

      // ── Re-index survivor with canonical fields ──────────────────────
      const evKey = survivor.normalized_event_key || buildNormalizedEventKey({
        name: survivor.name,
        event_date: survivor.event_date,
        track_id: survivor.track_id,
        series_id: survivor.series_id,
      });
      const canonKey = survivor.canonical_key || `event:${(survivor.name || '').toLowerCase()}`;

      if (!dry_run) {
        await base44.asServiceRole.entities.Event.update(survivor.id, {
          normalized_event_key: evKey || survivor.normalized_event_key,
          canonical_key: canonKey,
        }).catch(e => report.warnings.push(`survivor_update_failed:${survivor.id}:${e.message}`));
      }

      report.survivors.push({
        id: survivor.id,
        name: survivor.name,
        event_date: survivor.event_date,
        match_type,
        key,
        session_count: sessionCounts[survivor.id] || 0,
        result_count: resultCounts[survivor.id] || 0,
        external_uid: survivor.external_uid || null,
        duplicate_count: duplicates.length,
        action: dry_run ? 'would_be_survivor' : 'confirmed_survivor',
      });

      const dupIds = [];
      for (const dup of duplicates) {
        const dupMarker = `DUPLICATE_OF:${survivor.id}`;
        const existingNotes = dup.notes || '';
        const newNotes = existingNotes.includes(dupMarker)
          ? existingNotes
          : (existingNotes ? `${existingNotes} | ${dupMarker}` : dupMarker);

        if (!dry_run) {
          await base44.asServiceRole.entities.Event.update(dup.id, {
            status: 'Inactive',
            notes: newNotes,
            canonical_key: `event:DUPLICATE_OF:${survivor.id}`,
          }).catch(e => report.warnings.push(`dup_update_failed:${dup.id}:${e.message}`));
        }

        report.duplicates_marked_inactive.push({
          id: dup.id,
          name: dup.name,
          event_date: dup.event_date,
          survivor_id: survivor.id,
          survivor_name: survivor.name,
          match_type,
          action: dry_run ? 'would_mark_inactive' : 'marked_inactive',
        });
        dupIds.push(dup.id);
      }

      if (dupIds.length > 0) {
        report.repairs.push({ survivor_id: survivor.id, survivor_name: survivor.name, duplicate_ids: dupIds });
      }
    }

    // ── 6. Write OperationLog ──────────────────────────────────────────
    if (!dry_run && report.duplicates_marked_inactive.length > 0) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'source_duplicate_repaired',
        entity_name: 'Event',
        status: 'success',
        metadata: {
          entity_type: 'event',
          source_path: 'repair_duplicate_event_records',
          groups_processed: report.groups_processed,
          marked_count: report.duplicates_marked_inactive.length,
          survivor_ids: report.survivors.map(s => s.id),
          duplicate_ids: report.duplicates_marked_inactive.map(d => d.id),
        },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});