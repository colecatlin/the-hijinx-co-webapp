/**
 * repairDuplicateSessionRecords.js
 *
 * Detects duplicate Session groups and safely consolidates them:
 *   - picks one canonical survivor per group
 *   - marks non-survivors status='Locked' and appends DUPLICATE_OF:{survivor_id} to notes
 *   - re-indexes survivor with normalized_name, canonical_slug, canonical_key, normalized_session_key
 *   - writes OperationLog
 *   - does NOT hard-delete any records
 *
 * Input:  { dry_run?: boolean }
 * Output: repair report including `repairs` array for repairSessionReferences
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function buildEntitySlug(value) { return normalizeName(value).replace(/\s+/g, '-'); }
function buildSessionCanonicalKey(eventId, normN) { return `session:${eventId || 'none'}:${normN}`; }

function pickSurvivor(group, resultCountsById, entryCountsById) {
  // 1. Most Results
  if (resultCountsById) {
    let max = -1, best = null;
    for (const s of group) {
      const c = resultCountsById[s.id] || 0;
      if (c > max) { max = c; best = s; }
    }
    if (max > 0) return best;
  }
  // 2. Most Entries
  if (entryCountsById) {
    let max = -1, best = null;
    for (const s of group) {
      const c = entryCountsById[s.id] || 0;
      if (c > max) { max = c; best = s; }
    }
    if (max > 0) return best;
  }
  // 3. Oldest created_date
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

    const allSessions = await base44.asServiceRole.entities.Session.list('-created_date', 10000);

    // Group by dimensions
    const byExternalUid     = new Map();
    const byCanonicalKey    = new Map();
    const byNormSessionKey  = new Map();
    const byEventNormName   = new Map();

    for (const s of allSessions) {
      if (s.notes?.includes('DUPLICATE_OF:') || s.canonical_key?.includes('DUPLICATE_OF')) continue;

      if (s.external_uid) {
        const a = byExternalUid.get(s.external_uid) || []; a.push(s); byExternalUid.set(s.external_uid, a);
      }
      if (s.canonical_key && !s.canonical_key.includes('DUPLICATE')) {
        const a = byCanonicalKey.get(s.canonical_key) || []; a.push(s); byCanonicalKey.set(s.canonical_key, a);
      }
      if (s.normalized_session_key) {
        const a = byNormSessionKey.get(s.normalized_session_key) || []; a.push(s); byNormSessionKey.set(s.normalized_session_key, a);
      }
      const normN = s.normalized_name || normalizeName(s.name || '');
      if (normN && s.event_id) {
        const k = `${s.event_id}:${normN}`;
        const a = byEventNormName.get(k) || []; a.push(s); byEventNormName.set(k, a);
      }
    }

    const processedIds = new Set();
    const groups = [];
    const addGroup = (match_type, key, grp) => {
      const unique = grp.filter(r => !processedIds.has(r.id));
      if (unique.length > 1) { groups.push({ match_type, key, records: grp }); grp.forEach(r => processedIds.add(r.id)); }
    };
    for (const [k, g] of byExternalUid)    if (g.length > 1) addGroup('external_uid', k, g);
    for (const [k, g] of byCanonicalKey)   if (g.length > 1) addGroup('canonical_key', k, g);
    for (const [k, g] of byNormSessionKey) if (g.length > 1) addGroup('normalized_session_key', k, g);
    for (const [k, g] of byEventNormName)  if (g.length > 1) addGroup('event_id_normalized_name', k, g);

    if (groups.length === 0) {
      return Response.json({ success: true, dry_run, groups_processed: 0, survivors: [], duplicates_marked_inactive: [], skipped_groups: [], warnings: [], repairs: [], message: 'No duplicate Session groups detected.' });
    }

    // Pre-fetch reference counts
    const candidateIds = [...new Set(groups.flatMap(g => g.records.map(r => r.id)))];
    const resultCounts = {};
    const entryCounts  = {};
    for (const id of candidateIds) {
      const [res, ent] = await Promise.all([
        base44.asServiceRole.entities.Results.filter({ session_id: id }).catch(() => []),
        base44.asServiceRole.entities.Entry.filter({ session_id: id }).catch(() => []),
      ]);
      resultCounts[id] = res.length;
      entryCounts[id]  = ent.length;
    }

    const report = { dry_run, total_sessions: allSessions.length, groups_detected: groups.length, groups_processed: 0, survivors: [], duplicates_marked_inactive: [], skipped_groups: [], warnings: [], repairs: [] };

    for (const { match_type, key, records } of groups) {
      const active = records.filter(r => !r.notes?.includes('DUPLICATE_OF:'));
      if (active.length <= 1) { report.skipped_groups.push({ key, match_type, reason: 'all_already_marked' }); continue; }

      const survivor   = pickSurvivor(active, resultCounts, entryCounts);
      const duplicates = active.filter(r => r.id !== survivor.id);
      report.groups_processed++;

      // Re-index survivor
      const normN    = normalizeName(survivor.name || '');
      const canonKey = buildSessionCanonicalKey(survivor.event_id, normN);
      const normSKey = canonKey;
      const slug     = buildEntitySlug(survivor.name || '');

      if (!dry_run) {
        await base44.asServiceRole.entities.Session.update(survivor.id, {
          normalized_name: normN || survivor.normalized_name,
          canonical_slug:  slug  || survivor.canonical_slug,
          canonical_key:   canonKey,
          normalized_session_key: normSKey,
        }).catch(e => report.warnings.push(`survivor_update_failed:${survivor.id}:${e.message}`));
      }

      report.survivors.push({ id: survivor.id, name: survivor.name, event_id: survivor.event_id, match_type, key, result_count: resultCounts[survivor.id] || 0, duplicate_count: duplicates.length, action: dry_run ? 'would_be_survivor' : 'confirmed_survivor' });

      const dupIds = [];
      for (const dup of duplicates) {
        const marker = `DUPLICATE_OF:${survivor.id}`;
        const newNotes = (dup.notes || '').includes(marker) ? dup.notes : ((dup.notes || '') ? `${dup.notes} | ${marker}` : marker);
        if (!dry_run) {
          await base44.asServiceRole.entities.Session.update(dup.id, {
            status: 'Locked',
            locked: true,
            notes: newNotes,
            canonical_key: `session:DUPLICATE_OF:${survivor.id}`,
          }).catch(e => report.warnings.push(`dup_update_failed:${dup.id}:${e.message}`));
        }
        report.duplicates_marked_inactive.push({ id: dup.id, name: dup.name, event_id: dup.event_id, survivor_id: survivor.id, match_type, action: dry_run ? 'would_mark_locked' : 'marked_locked' });
        dupIds.push(dup.id);
      }
      if (dupIds.length > 0) {
        report.repairs.push({ survivor_id: survivor.id, survivor_name: survivor.name, duplicate_ids: dupIds });
      }
    }

    if (!dry_run && report.duplicates_marked_inactive.length > 0) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'source_duplicate_repaired',
        entity_name: 'Session',
        status: 'success',
        metadata: { entity_type: 'session', source_path: 'repair_duplicate_session_records', groups_processed: report.groups_processed, marked_count: report.duplicates_marked_inactive.length, survivor_ids: report.survivors.map(s => s.id) },
      }).catch(() => {});
    }

    return Response.json({ success: true, ...report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});