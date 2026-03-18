/**
 * repairDuplicateTrackRecords.js
 *
 * Detects duplicate Track groups and safely consolidates them:
 *   - picks one canonical survivor per group
 *   - marks non-survivors Inactive
 *   - appends DUPLICATE_OF:{survivor_id} to notes
 *   - refreshes canonical fields on survivor
 *   - writes OperationLog
 *   - does NOT hard-delete any records
 *
 * Input:  { dry_run?: boolean }  — defaults to false (actually runs)
 * Output: full repair report including `repairs` array for repairTrackReferences
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function pickSurvivor(group, eventCountsById) {
  // 1. Has external_uid, not already a duplicate
  const withUid = group.find(t => t.external_uid && !t.canonical_key?.includes('DUPLICATE'));
  if (withUid) return withUid;

  // 2. Well-formed canonical_key
  const withCk = group.find(t =>
    t.canonical_key &&
    t.canonical_key.startsWith('track:') &&
    !t.canonical_key.includes('DUPLICATE')
  );
  if (withCk) return withCk;

  // 3. Most linked events
  if (eventCountsById) {
    let maxCount = -1;
    let best = null;
    for (const t of group) {
      const cnt = eventCountsById[t.id] || 0;
      if (cnt > maxCount) { maxCount = cnt; best = t; }
    }
    if (maxCount > 0) return best;
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
    const dry_run = body.dry_run === true; // default false — actually runs

    // ── 1. Fetch all tracks ───────────────────────────────────────────────
    const allTracks = await base44.asServiceRole.entities.Track.list('-created_date', 3000);

    // ── 2. Group by three dimensions (skip already-marked duplicates) ─────
    const byExternalUid  = new Map();
    const byCanonicalKey = new Map();
    const byNormLocation = new Map(); // normalized_name:location composite

    for (const t of allTracks) {
      if (t.canonical_key?.includes('DUPLICATE_OF')) continue;

      if (t.external_uid) {
        const arr = byExternalUid.get(t.external_uid) || [];
        arr.push(t);
        byExternalUid.set(t.external_uid, arr);
      }

      const ck = t.canonical_key;
      if (ck && !ck.includes('DUPLICATE')) {
        const arr = byCanonicalKey.get(ck) || [];
        arr.push(t);
        byCanonicalKey.set(ck, arr);
      }

      // Location-aware composite key to avoid false-positive grouping
      const norm = t.normalized_name || normalizeName(t.name || '');
      if (norm) {
        const loc = normalizeName(t.location_state || t.location_country || '');
        const compositeKey = loc ? `${norm}:${loc}` : norm;
        const arr = byNormLocation.get(compositeKey) || [];
        arr.push(t);
        byNormLocation.set(compositeKey, arr);
      }
    }

    // ── 3. Collect unique duplicate groups (dedup across passes) ──────────
    const processedIds = new Set();
    const groups = [];

    for (const [key, grp] of byExternalUid) {
      if (grp.length > 1) {
        groups.push({ match_type: 'external_uid', key, records: grp });
        grp.forEach(r => processedIds.add(r.id));
      }
    }

    for (const [key, grp] of byCanonicalKey) {
      if (grp.length > 1) {
        const unprocessed = grp.filter(r => !processedIds.has(r.id));
        if (unprocessed.length > 1) {
          groups.push({ match_type: 'canonical_key', key, records: grp });
          grp.forEach(r => processedIds.add(r.id));
        }
      }
    }

    for (const [key, grp] of byNormLocation) {
      if (grp.length > 1) {
        const unprocessed = grp.filter(r => !processedIds.has(r.id));
        if (unprocessed.length > 1) {
          groups.push({ match_type: 'normalized_name_location', key, records: grp });
          grp.forEach(r => processedIds.add(r.id));
        }
      }
    }

    if (!groups.length) {
      return Response.json({
        success: true,
        dry_run,
        groups_processed: 0,
        survivors: [],
        duplicates_marked_inactive: [],
        skipped_groups: [],
        warnings: [],
        repairs: [],
        message: 'No duplicate Track groups detected.',
      });
    }

    // ── 4. Pre-fetch event counts for all candidates ──────────────────────
    const candidateIds = [...new Set(groups.flatMap(g => g.records.map(r => r.id)))];
    const eventCountsById = {};
    for (const tid of candidateIds) {
      const evts = await base44.asServiceRole.entities.Event.filter({ track_id: tid }).catch(() => []);
      eventCountsById[tid] = evts.length;
    }

    // ── 5. Process each group ─────────────────────────────────────────────
    const report = {
      dry_run,
      total_tracks: allTracks.length,
      groups_detected: groups.length,
      groups_processed: 0,
      survivors: [],
      duplicates_marked_inactive: [],
      skipped_groups: [],
      warnings: [],
      repairs: [], // consumed by repairTrackReferences
    };

    for (const { match_type, key, records } of groups) {
      const active = records.filter(r => r.status !== 'Inactive');
      if (active.length <= 1) {
        report.skipped_groups.push({ key, match_type, reason: 'all_already_inactive_or_single_active' });
        continue;
      }

      const survivor = pickSurvivor(active, eventCountsById);
      const duplicates = active.filter(r => r.id !== survivor.id);

      report.groups_processed++;

      // ── Refresh canonical fields on survivor ──────────────────────────
      const norm = normalizeName(survivor.name || '');
      const canonicalSlug = norm.replace(/\s+/g, '-');
      const loc = normalizeName(survivor.location_state || survivor.location_country || '');
      const canonicalKey = survivor.external_uid
        ? `track:${survivor.external_uid}`
        : (loc ? `track:${norm}:${loc}` : `track:${norm}`);

      if (!dry_run) {
        await base44.asServiceRole.entities.Track.update(survivor.id, {
          normalized_name: norm || survivor.normalized_name,
          canonical_slug:  canonicalSlug || survivor.canonical_slug,
          canonical_key:   canonicalKey,
          sync_last_seen_at: new Date().toISOString(),
        }).catch(e => report.warnings.push(`survivor_update_failed:${survivor.id}:${e.message}`));
      }

      report.survivors.push({
        id: survivor.id,
        name: survivor.name,
        location: `${survivor.location_city || ''}${survivor.location_state ? ', ' + survivor.location_state : ''}`,
        match_type,
        key,
        event_count: eventCountsById[survivor.id] || 0,
        external_uid: survivor.external_uid || null,
        canonical_key: canonicalKey,
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
          await base44.asServiceRole.entities.Track.update(dup.id, {
            status: 'Inactive',
            notes: newNotes,
            canonical_key: `track:DUPLICATE_OF:${survivor.id}`,
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
        report.repairs.push({
          survivor_id: survivor.id,
          survivor_name: survivor.name,
          duplicate_ids: dupIds,
        });
      }
    }

    // ── 6. Write OperationLog ─────────────────────────────────────────────
    if (!dry_run && report.duplicates_marked_inactive.length > 0) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'source_duplicate_repaired',
        entity_name: 'Track',
        status: 'success',
        metadata: {
          entity_type: 'track',
          source_path: 'repair_duplicate_track_records',
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