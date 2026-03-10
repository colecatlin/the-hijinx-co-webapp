/**
 * fixKnownTrackDuplicates.js
 *
 * Finds and safely marks duplicate Track records as Inactive.
 * Groups by: external_uid → canonical_key → normalized_name+location.
 *
 * Does NOT hard-delete. Does NOT rewrite foreign keys (use repairSeriesReferences pattern if needed).
 * Admin-only. dry_run=false by default (actually runs).
 *
 * Input:  { dry_run?: boolean }
 * Output: repair report
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
    const dry_run = body.dry_run === true; // default false — actually runs

    const allTracks = await base44.asServiceRole.entities.Track.list('-created_date', 3000);

    // ── Build duplicate groups ────────────────────────────────────────────
    const byExternalUid  = new Map();
    const byCanonicalKey = new Map();
    const byNormLocation = new Map(); // normalized_name:location composite

    for (const t of allTracks) {
      // Skip records already marked as duplicates
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

      const norm = t.normalized_name || normalizeName(t.name || '');
      if (norm) {
        // Include location to avoid false-positive grouping of same-name tracks at different locations
        const loc = normalizeName(t.location_state || t.location_country || '');
        const compositeKey = loc ? `${norm}:${loc}` : norm;
        const arr = byNormLocation.get(compositeKey) || [];
        arr.push(t);
        byNormLocation.set(compositeKey, arr);
      }
    }

    // ── Collect unique duplicate groups (dedup across passes) ─────────────
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
        success: true, dry_run,
        total_tracks: allTracks.length,
        groups_processed: 0,
        survivors: [],
        duplicates_marked_inactive: [],
        skipped_groups: [],
        warnings: [],
        message: 'No duplicate Track groups detected.',
      });
    }

    // ── Pre-fetch event counts for all candidates ─────────────────────────
    const candidateIds = [...new Set(groups.flatMap(g => g.records.map(r => r.id)))];
    const eventCountsById = {};
    for (const tid of candidateIds) {
      const evts = await base44.asServiceRole.entities.Event.filter({ track_id: tid }).catch(() => []);
      eventCountsById[tid] = evts.length;
    }

    const report = {
      dry_run,
      total_tracks: allTracks.length,
      groups_detected: groups.length,
      groups_processed: 0,
      survivors: [],
      duplicates_marked_inactive: [],
      skipped_groups: [],
      warnings: [],
    };

    for (const { match_type, key, records } of groups) {
      const active = records.filter(r => r.status !== 'Inactive');
      if (active.length <= 1) {
        report.skipped_groups.push({ key, match_type, reason: 'already_single_active' });
        continue;
      }

      // Pick survivor:
      // 1. Has external_uid (not a duplicate marker)
      // 2. Most linked events
      // 3. Oldest created_date
      let survivor = active.find(s => s.external_uid && !s.canonical_key?.includes('DUPLICATE'));

      if (!survivor) {
        let maxEvts = -1;
        for (const t of active) {
          const cnt = eventCountsById[t.id] || 0;
          if (cnt > maxEvts) { maxEvts = cnt; survivor = t; }
        }
      }

      if (!survivor) {
        survivor = active.slice().sort((a, b) =>
          new Date(a.created_date || 0) - new Date(b.created_date || 0)
        )[0];
      }

      report.groups_processed++;

      // Refresh canonical fields on survivor
      const norm = normalizeName(survivor.name || '');
      const canonicalSlug = norm.replace(/\s+/g, '-');
      const loc = normalizeName(survivor.location_state || survivor.location_country || '');
      const canonicalKey = loc ? `track:${norm}:${loc}` : (survivor.external_uid ? `track:${survivor.external_uid}` : `track:${norm}`);

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
        action: dry_run ? 'would_be_survivor' : 'confirmed_survivor',
      });

      const duplicates = active.filter(r => r.id !== survivor.id);

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
      }
    }

    // ── Write OperationLog ────────────────────────────────────────────────
    if (!dry_run && report.duplicates_marked_inactive.length > 0) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'source_duplicate_repaired',
        entity_name: 'Track',
        status: 'success',
        metadata: {
          entity_type: 'track',
          source_path: 'fix_known_track_duplicates',
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