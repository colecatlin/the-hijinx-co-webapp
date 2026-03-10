/**
 * runDuplicateCleanupPass.js
 *
 * Safe combined cleanup pass for duplicate Track and Series records.
 *  1. Detect duplicates via external_uid → canonical_key → normalized_name
 *  2. Pick canonical survivor (external_uid > canonical_key > most events > oldest)
 *  3. Mark non-survivors Inactive + DUPLICATE_OF:{survivor_id} in notes
 *  4. Repair references in linked entities
 *  5. Refresh survivor normalization fields
 *  6. Write OperationLog entries
 *
 * Input:  { dry_run?: boolean }   default: false (actually runs)
 * Output: { track_cleanup, series_cleanup }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeName(v) {
  if (!v) return '';
  return v.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildSlug(v) {
  return normalizeName(v).replace(/\s+/g, '-');
}

function buildCkSeries(name, external_uid) {
  if (external_uid) return `series:${external_uid}`;
  return `series:${normalizeName(name)}`;
}

function buildCkTrack(name, external_uid, location_state, location_country) {
  if (external_uid) return `track:${external_uid}`;
  const norm = normalizeName(name);
  const loc = normalizeName(location_state || location_country || '');
  return loc ? `track:${norm}:${loc}` : `track:${norm}`;
}

function pickSurvivor(group, eventCounts) {
  // 1. Has external_uid (strongest dedup signal)
  const withUid = group.find(r => r.external_uid && !r.canonical_key?.includes('DUPLICATE'));
  if (withUid) return withUid;

  // 2. Has a well-formed canonical_key
  const withCk = group.find(r =>
    r.canonical_key && !r.canonical_key.includes('DUPLICATE') && r.canonical_key.includes(':')
  );
  if (withCk) return withCk;

  // 3. Most linked events
  if (eventCounts) {
    let best = null, max = -1;
    for (const r of group) {
      const n = eventCounts[r.id] || 0;
      if (n > max) { max = n; best = r; }
    }
    if (max > 0) return best;
  }

  // 4. Oldest created_date
  return [...group].sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
}

async function repairRef(sr, entityName, field, dupIds, survivorId, dry_run) {
  if (!sr.entities[entityName]) return { repaired: 0, warnings: [] };
  let repaired = 0;
  const warnings = [];
  for (const dupId of dupIds) {
    try {
      const recs = await sr.entities[entityName].filter({ [field]: dupId }).catch(() => []);
      for (const rec of recs) {
        if (!dry_run) {
          await sr.entities[entityName].update(rec.id, { [field]: survivorId })
            .catch(e => warnings.push(`${entityName}.${field}[${rec.id}]: ${e.message}`));
        }
        repaired++;
      }
    } catch (e) {
      warnings.push(`${entityName}.${field} filter error dupId=${dupId}: ${e.message}`);
    }
  }
  return { repaired, warnings };
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run === true;

    const sr = base44.asServiceRole;
    const now = new Date().toISOString();

    // ══════════════════════════════════════════════════════════════════════════
    // TRACK CLEANUP
    // ══════════════════════════════════════════════════════════════════════════
    const trackReport = {
      groups_processed: 0,
      survivors: [],
      duplicates_marked_inactive: [],
      references_repaired: 0,
      warnings: [],
    };

    const allTracks = await sr.entities.Track.list('-created_date', 2000);

    const tByUid     = new Map();
    const tByCk      = new Map();
    const tByNormLoc = new Map();

    for (const t of allTracks) {
      if (t.canonical_key?.includes('DUPLICATE_OF')) continue;

      if (t.external_uid) {
        const a = tByUid.get(t.external_uid) || [];
        a.push(t); tByUid.set(t.external_uid, a);
      }

      const ck = t.canonical_key;
      if (ck && !ck.includes('DUPLICATE')) {
        const a = tByCk.get(ck) || [];
        a.push(t); tByCk.set(ck, a);
      }

      const norm = t.normalized_name || normalizeName(t.name || '');
      if (norm) {
        // Location-aware composite: only group same-name tracks at same location
        const loc = normalizeName(t.location_state || '');
        const composite = loc ? `${norm}:${loc}` : `${norm}:__no_loc__`;
        const a = tByNormLoc.get(composite) || [];
        a.push(t); tByNormLoc.set(composite, a);
      }
    }

    const processedTIds = new Set();
    const trackGroups  = [];

    for (const [key, grp] of tByUid) {
      if (grp.length > 1) {
        trackGroups.push({ match_type: 'external_uid', key, records: grp, ambiguous: false });
        grp.forEach(r => processedTIds.add(r.id));
      }
    }
    for (const [key, grp] of tByCk) {
      if (grp.length > 1) {
        const up = grp.filter(r => !processedTIds.has(r.id));
        if (up.length > 1) {
          trackGroups.push({ match_type: 'canonical_key', key, records: grp, ambiguous: false });
          grp.forEach(r => processedTIds.add(r.id));
        }
      }
    }
    for (const [key, grp] of tByNormLoc) {
      if (grp.length > 1) {
        const up = grp.filter(r => !processedTIds.has(r.id));
        if (up.length > 1) {
          const hasLoc = !key.endsWith(':__no_loc__');
          if (hasLoc) {
            // Same name AND same state → safe to collapse
            trackGroups.push({ match_type: 'normalized_name_location', key, records: up, ambiguous: false });
          } else {
            // Same name, no location on any record → collapse only if they look identical
            const names = [...new Set(up.map(r => normalizeName(r.name || '')))];
            const ambiguous = names.length > 1 || up.some(r => r.location_city || r.location_state || r.location_country);
            if (!ambiguous) {
              trackGroups.push({ match_type: 'normalized_name_no_loc', key, records: up, ambiguous: false });
            } else {
              trackReport.warnings.push(`Skipped ambiguous track group "${key.replace(':__no_loc__', '')}" — same name, mixed locations, manual review required`);
            }
          }
          up.forEach(r => processedTIds.add(r.id));
        }
      }
    }

    // Pre-fetch event counts for all track candidates
    const tCandIds = [...new Set(trackGroups.flatMap(g => g.records.map(r => r.id)))];
    const tEvtCounts = {};
    for (const tid of tCandIds) {
      tEvtCounts[tid] = (await sr.entities.Event.filter({ track_id: tid }).catch(() => [])).length;
    }

    for (const { match_type, key, records, ambiguous } of trackGroups) {
      const active = records.filter(r => r.status !== 'Inactive');
      if (active.length <= 1) {
        trackReport.warnings.push(`Skipped track group "${key}" — already single active`);
        continue;
      }
      if (ambiguous) {
        trackReport.warnings.push(`Skipped ambiguous track group "${key}" — manual review required`);
        continue;
      }

      const survivor = pickSurvivor(records, tEvtCounts);
      const dups     = records.filter(r => r.id !== survivor.id);
      const dupIds   = dups.map(r => r.id);
      trackReport.groups_processed++;

      // Refresh survivor normalization fields (Part 5)
      const sNorm = normalizeName(survivor.name || '');
      const sCk   = buildCkTrack(survivor.name, survivor.external_uid, survivor.location_state, survivor.location_country);
      if (!dry_run) {
        await sr.entities.Track.update(survivor.id, {
          normalized_name:  sNorm,
          canonical_slug:   buildSlug(survivor.name || ''),
          canonical_key:    sCk,
          sync_last_seen_at: now,
        }).catch(e => trackReport.warnings.push(`Track survivor norm refresh failed ${survivor.id}: ${e.message}`));
      }

      // Repair references (Part 4)
      const TRACK_REFS = [
        { entity: 'Event',              field: 'track_id' },
        { entity: 'EventCollaboration', field: 'track_id' },
      ];
      const tRefCounts = {};
      for (const { entity, field } of TRACK_REFS) {
        const { repaired, warnings } = await repairRef(sr, entity, field, dupIds, survivor.id, dry_run);
        trackReport.references_repaired += repaired;
        trackReport.warnings.push(...warnings);
        if (repaired > 0) tRefCounts[`${entity}.${field}`] = repaired;
      }

      // Mark duplicates Inactive (Part 3)
      for (const dup of dups) {
        const marker   = `DUPLICATE_OF:${survivor.id}`;
        const newNotes = dup.notes?.includes(marker)
          ? dup.notes
          : (dup.notes ? `${dup.notes} | ${marker}` : marker);
        if (!dry_run) {
          await sr.entities.Track.update(dup.id, {
            status:        'Inactive',
            notes:         newNotes,
            canonical_key: `track:DUPLICATE_OF:${survivor.id}`,
          }).catch(e => trackReport.warnings.push(`Track dup mark failed ${dup.id}: ${e.message}`));
        }
        trackReport.duplicates_marked_inactive.push({
          id: dup.id, name: dup.name,
          survivor_id: survivor.id, survivor_name: survivor.name,
          match_type, action: dry_run ? 'would_mark_inactive' : 'marked_inactive',
        });
      }

      trackReport.survivors.push({
        id: survivor.id, name: survivor.name, match_type,
        event_count: tEvtCounts[survivor.id] || 0,
        duplicate_count: dups.length,
        canonical_key: sCk,
        action: dry_run ? 'would_be_survivor' : 'confirmed_survivor',
      });

      // OperationLog (Part 6)
      if (!dry_run) {
        await sr.entities.OperationLog.create({
          operation_type: 'source_duplicate_repaired',
          entity_name:    'Track',
          entity_id:      survivor.id,
          status:         'success',
          metadata: {
            entity_type: 'track',
            survivor_id: survivor.id, survivor_name: survivor.name,
            duplicate_ids: dupIds, match_type,
            repaired_reference_counts: tRefCounts,
          },
        }).catch(() => {});
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SERIES CLEANUP
    // ══════════════════════════════════════════════════════════════════════════
    const seriesReport = {
      groups_processed: 0,
      survivors: [],
      duplicates_marked_inactive: [],
      references_repaired: 0,
      warnings: [],
    };

    const allSeries = await sr.entities.Series.list('-created_date', 2000);

    const sByUid  = new Map();
    const sByCk   = new Map();
    const sByNorm = new Map();

    for (const s of allSeries) {
      if (s.canonical_key?.includes('DUPLICATE_OF')) continue;

      if (s.external_uid) {
        const a = sByUid.get(s.external_uid) || [];
        a.push(s); sByUid.set(s.external_uid, a);
      }

      const ck = s.canonical_key;
      if (ck && !ck.includes('DUPLICATE')) {
        const a = sByCk.get(ck) || [];
        a.push(s); sByCk.set(ck, a);
      }

      const norm = s.normalized_name || normalizeName(s.name || s.full_name || '');
      if (norm) {
        const a = sByNorm.get(norm) || [];
        a.push(s); sByNorm.set(norm, a);
      }
    }

    const processedSIds = new Set();
    const seriesGroups  = [];

    for (const [key, grp] of sByUid) {
      if (grp.length > 1) {
        seriesGroups.push({ match_type: 'external_uid', key, records: grp });
        grp.forEach(r => processedSIds.add(r.id));
      }
    }
    for (const [key, grp] of sByCk) {
      if (grp.length > 1) {
        const up = grp.filter(r => !processedSIds.has(r.id));
        if (up.length > 1) {
          seriesGroups.push({ match_type: 'canonical_key', key, records: grp });
          grp.forEach(r => processedSIds.add(r.id));
        }
      }
    }
    for (const [key, grp] of sByNorm) {
      if (grp.length > 1) {
        const up = grp.filter(r => !processedSIds.has(r.id));
        if (up.length > 1) {
          seriesGroups.push({ match_type: 'normalized_name', key, records: up });
          up.forEach(r => processedSIds.add(r.id));
        }
      }
    }

    // Pre-fetch event counts
    const sCandIds = [...new Set(seriesGroups.flatMap(g => g.records.map(r => r.id)))];
    const sEvtCounts = {};
    for (const sid of sCandIds) {
      sEvtCounts[sid] = (await sr.entities.Event.filter({ series_id: sid }).catch(() => [])).length;
    }

    const SERIES_REFS = [
      { entity: 'Event',              field: 'series_id' },
      { entity: 'Driver',             field: 'primary_series_id' },
      { entity: 'SeriesClass',        field: 'series_id' },
      { entity: 'DriverProgram',      field: 'series_id' },
      { entity: 'Standings',          field: 'series_id' },
      { entity: 'EventCollaboration', field: 'series_id' },
    ];

    for (const { match_type, key, records } of seriesGroups) {
      const active = records.filter(r => r.status !== 'Inactive');
      if (active.length <= 1) {
        seriesReport.warnings.push(`Skipped series group "${key}" — already single active`);
        continue;
      }

      const survivor = pickSurvivor(records, sEvtCounts);
      const dups     = records.filter(r => r.id !== survivor.id);
      const dupIds   = dups.map(r => r.id);
      seriesReport.groups_processed++;

      // Refresh survivor normalization fields (Part 5)
      const sNorm = normalizeName(survivor.name || '');
      const sCk   = buildCkSeries(survivor.name, survivor.external_uid);
      if (!dry_run) {
        await sr.entities.Series.update(survivor.id, {
          normalized_name:  sNorm,
          canonical_slug:   buildSlug(survivor.name || ''),
          canonical_key:    sCk,
          sync_last_seen_at: now,
        }).catch(e => seriesReport.warnings.push(`Series survivor norm refresh failed ${survivor.id}: ${e.message}`));
      }

      // Repair references (Part 4)
      const sRefCounts = {};
      for (const { entity, field } of SERIES_REFS) {
        const { repaired, warnings } = await repairRef(sr, entity, field, dupIds, survivor.id, dry_run);
        seriesReport.references_repaired += repaired;
        seriesReport.warnings.push(...warnings);
        if (repaired > 0) sRefCounts[`${entity}.${field}`] = repaired;
      }

      // Mark duplicates Inactive (Part 3)
      for (const dup of dups) {
        const marker   = `DUPLICATE_OF:${survivor.id}`;
        const newNotes = dup.notes?.includes(marker)
          ? dup.notes
          : (dup.notes ? `${dup.notes} | ${marker}` : marker);
        if (!dry_run) {
          await sr.entities.Series.update(dup.id, {
            status:        'Inactive',
            notes:         newNotes,
            canonical_key: `series:DUPLICATE_OF:${survivor.id}`,
          }).catch(e => seriesReport.warnings.push(`Series dup mark failed ${dup.id}: ${e.message}`));
        }
        seriesReport.duplicates_marked_inactive.push({
          id: dup.id, name: dup.name,
          survivor_id: survivor.id, survivor_name: survivor.name,
          match_type, action: dry_run ? 'would_mark_inactive' : 'marked_inactive',
        });
      }

      seriesReport.survivors.push({
        id: survivor.id, name: survivor.name, match_type,
        event_count: sEvtCounts[survivor.id] || 0,
        duplicate_count: dups.length,
        canonical_key: sCk,
        action: dry_run ? 'would_be_survivor' : 'confirmed_survivor',
      });

      // OperationLog (Part 6)
      if (!dry_run) {
        await sr.entities.OperationLog.create({
          operation_type: 'source_duplicate_repaired',
          entity_name:    'Series',
          entity_id:      survivor.id,
          status:         'success',
          metadata: {
            entity_type: 'series',
            survivor_id: survivor.id, survivor_name: survivor.name,
            duplicate_ids: dupIds, match_type,
            repaired_reference_counts: sRefCounts,
          },
        }).catch(() => {});
      }
    }

    // ── Final summary log ──────────────────────────────────────────────────────
    const totalDups = trackReport.duplicates_marked_inactive.length + seriesReport.duplicates_marked_inactive.length;
    const totalGroups = trackReport.groups_processed + seriesReport.groups_processed;

    if (!dry_run && totalGroups > 0) {
      await sr.entities.OperationLog.create({
        operation_type: 'source_duplicate_detected',
        entity_name:    'System',
        status:         'success',
        metadata: {
          pass: 'runDuplicateCleanupPass',
          total_groups_processed: totalGroups,
          total_duplicates_marked_inactive: totalDups,
          total_references_repaired: trackReport.references_repaired + seriesReport.references_repaired,
          track_groups: trackReport.groups_processed,
          series_groups: seriesReport.groups_processed,
        },
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      dry_run,
      track_cleanup: trackReport,
      series_cleanup: seriesReport,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});