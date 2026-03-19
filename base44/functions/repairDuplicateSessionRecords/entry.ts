/**
 * repairDuplicateSessionRecords.js
 *
 * Detects duplicate Session groups and safely consolidates them:
 *   - picks one canonical survivor per group
 *   - marks non-survivors Inactive
 *   - appends DUPLICATE_OF:{survivor_id} to notes
 *   - re-indexes survivor with normalized_session_key + canonical_key
 *   - writes OperationLog
 *   - does NOT hard-delete any records
 *
 * Input:  { dry_run?: boolean }
 * Output: full repair report including `repairs` array for repairSessionReferences
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildNormalizedSessionKey(event_id, normalized_name) {
  const eid = event_id || 'none';
  return `session:${eid}:${normalized_name}`;
}

function pickSurvivor(group, resultCountsById, entryCountsById) {
  // 1. Has external_uid
  const withUid = group.find(s => s.external_uid && !s.canonical_key?.includes('DUPLICATE'));
  if (withUid) return withUid;

  // 2. Most linked Results
  if (resultCountsById) {
    let max = -1, best = null;
    for (const s of group) {
      const c = resultCountsById[s.id] || 0;
      if (c > max) { max = c; best = s; }
    }
    if (max > 0) return best;
  }

  // 3. Most linked Entries
  if (entryCountsById) {
    let max = -1, best = null;
    for (const s of group) {
      const c = entryCountsById[s.id] || 0;
      if (c > max) { max = c; best = s; }
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

    // ── 1. Fetch all sessions ─────────────────────────────────────────
    const allSessions = await base44.asServiceRole.entities.Session.list('-created_date', 5000);

    // ── 2. Group by dimensions (skip already-marked duplicates) ──────────
    const byNormalizedSessionKey = new Map();
    const byExternalUid = new Map();
    const byEventAndName = new Map();

    for (const s of allSessions) {
      if (s.canonical_key?.includes('DUPLICATE_OF')) continue;

      if (s.normalized_session_key) {
        const a = byNormalizedSessionKey.get(s.normalized_session_key) || [];
        a.push(s);
        byNormalizedSessionKey.set(s.normalized_session_key, a);
      }
      if (s.external_uid) {
        const a = byExternalUid.get(s.external_uid) || [];
        a.push(s);
        byExternalUid.set(s.external_uid, a);
      }
      if (s.event_id && s.name) {
        const norm = normalizeName(s.name);
        const k = `${s.event_id}:${norm}`;
        const a = byEventAndName.get(k) || [];
        a.push(s);
        byEventAndName.set(k, a);
      }
    }

    // ── 3. Collect unique duplicate groups ─────────────────────────────
    const processedIds = new Set();
    const groups = [];

    for (const [key, grp] of byNormalizedSessionKey) {
      if (grp.length > 1) {
        groups.push({ match_type: 'normalized_session_key', key, records: grp });
        grp.forEach(r => processedIds.add(r.id));
      }
    }
    for (const [key, grp] of byExternalUid) {
      if (grp.length > 1) {
        const u = grp.filter(r => !processedIds.has(r.id));
        if (u.length > 1) { groups.push({ match_type: 'external_uid', key, records: grp }); grp.forEach(r => processedIds.add(r.id)); }
      }
    }
    for (const [key, grp] of byEventAndName) {
      if (grp.length > 1) {
        const u = grp.filter(r => !processedIds.has(r.id));
        if (u.length > 1) { groups.push({ match_type: 'event_id_normalized_name', key, records: grp }); grp.forEach(r => processedIds.add(r.id)); }
      }
    }

    if (groups.length === 0) {
      return Response.json({
        success: true, dry_run,
        groups_processed: 0, survivors: [], duplicates_marked_inactive: [],
        skipped_groups: [], warnings: [], repairs: [],
        message: 'No duplicate Session groups detected.',
      });
    }

    // ── 4. Pre-fetch counts for survivor selection ──────────────────────
    const candidateIds = [...new Set(groups.flatMap(g => g.records.map(r => r.id)))];
    const resultCounts = {};
    const entryCounts = {};
    for (const id of candidateIds) {
      const [res, ent] = await Promise.all([
        base44.asServiceRole.entities.Results.filter({ session_id: id }).catch(() => []),
        base44.asServiceRole.entities.Entry.filter({ session_id: id }).catch(() => []),
      ]);
      resultCounts[id] = res.length;
      entryCounts[id] = ent.length;
    }

    // ── 5. Process each group ──────────────────────────────────────────
    const report = {
      dry_run,
      total_sessions: allSessions.length,
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

      const survivor = pickSurvivor(active, resultCounts, entryCounts);
      const duplicates = active.filter(r => r.id !== survivor.id);

      report.groups_processed++;

      // ── Re-index survivor with canonical fields ──────────────────────
      const sessKey = survivor.normalized_session_key || buildNormalizedSessionKey(survivor.event_id, normalizeName(survivor.name));
      const canonKey = survivor.canonical_key || `session:${normalizeName(survivor.name)}`;

      if (!dry_run) {
        await base44.asServiceRole.entities.Session.update(survivor.id, {
          normalized_session_key: sessKey || survivor.normalized_session_key,
          canonical_key: canonKey,
        }).catch(e => report.warnings.push(`survivor_update_failed:${survivor.id}:${e.message}`));
      }

      report.survivors.push({
        id: survivor.id,
        name: survivor.name,
        event_id: survivor.event_id,
        match_type,
        key,
        result_count: resultCounts[survivor.id] || 0,
        entry_count: entryCounts[survivor.id] || 0,
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
          await base44.asServiceRole.entities.Session.update(dup.id, {
            status: 'Inactive',
            notes: newNotes,
            canonical_key: `session:DUPLICATE_OF:${survivor.id}`,
          }).catch(e => report.warnings.push(`dup_update_failed:${dup.id}:${e.message}`));
        }

        report.duplicates_marked_inactive.push({
          id: dup.id,
          name: dup.name,
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
        entity_name: 'Session',
        status: 'success',
        metadata: {
          entity_type: 'session',
          source_path: 'repair_duplicate_session_records',
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