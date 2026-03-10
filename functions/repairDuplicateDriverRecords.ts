/**
 * repairDuplicateDriverRecords.js
 *
 * Detects duplicate Driver groups and safely consolidates them:
 *   - picks one canonical survivor per group
 *   - marks non-survivors Inactive
 *   - appends DUPLICATE_OF:{survivor_id} to notes
 *   - re-indexes survivor with normalized_name, canonical_slug, canonical_key
 *   - writes OperationLog
 *   - does NOT hard-delete any records
 *
 * Input:  { dry_run?: boolean }  — defaults to false (actually runs)
 * Output: full repair report including `repairs` array for repairDriverReferences
 *
 * Admin only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function driverFullName(d) {
  return `${d.first_name || ''} ${d.last_name || ''}`.trim();
}

function buildDriverCanonicalKey(d, normN) {
  if (d.external_uid) return `driver:${d.external_uid}`;
  if (d.date_of_birth) return `driver:${normN}:${d.date_of_birth}`;
  if (d.primary_number) return `driver:${normN}:${d.primary_number}`;
  return `driver:${normN}`;
}

function pickSurvivor(group, resultCountsById, entryCountsById) {
  // 1. Has external_uid
  const withUid = group.find(d => d.external_uid && !d.canonical_key?.includes('DUPLICATE'));
  if (withUid) return withUid;

  // 2. Most specific canonical_key
  const validCk = group.filter(d =>
    d.canonical_key?.startsWith('driver:') && !d.canonical_key.includes('DUPLICATE')
  );
  if (validCk.length > 0) {
    return validCk.reduce((best, d) => {
      const bp = (best.canonical_key || '').split(':').length;
      const tp = (d.canonical_key || '').split(':').length;
      return tp > bp ? d : best;
    }, validCk[0]);
  }

  // 3. Most linked Results
  if (resultCountsById) {
    let max = -1, best = null;
    for (const d of group) {
      const c = resultCountsById[d.id] || 0;
      if (c > max) { max = c; best = d; }
    }
    if (max > 0) return best;
  }

  // 4. Most linked Entries
  if (entryCountsById) {
    let max = -1, best = null;
    for (const d of group) {
      const c = entryCountsById[d.id] || 0;
      if (c > max) { max = c; best = d; }
    }
    if (max > 0) return best;
  }

  // 5. Oldest created_date
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

    // ── 1. Fetch all drivers ─────────────────────────────────────────────────
    const allDrivers = await base44.asServiceRole.entities.Driver.list('-created_date', 5000);

    // ── 2. Group by dimensions (skip already-marked duplicates) ──────────────
    const byExternalUid  = new Map();
    const byCanonicalKey = new Map();
    const byNormDob      = new Map();
    const byNormNum      = new Map();
    const byNormName     = new Map();

    for (const d of allDrivers) {
      if (d.canonical_key?.includes('DUPLICATE_OF')) continue;

      if (d.external_uid) {
        const a = byExternalUid.get(d.external_uid) || []; a.push(d); byExternalUid.set(d.external_uid, a);
      }
      if (d.canonical_key && !d.canonical_key.includes('DUPLICATE')) {
        const a = byCanonicalKey.get(d.canonical_key) || []; a.push(d); byCanonicalKey.set(d.canonical_key, a);
      }

      const norm = d.normalized_name || normalizeName(driverFullName(d));
      if (norm) {
        if (d.date_of_birth) {
          const k = `${norm}:dob:${d.date_of_birth}`;
          const a = byNormDob.get(k) || []; a.push(d); byNormDob.set(k, a);
        }
        if (d.primary_number) {
          const k = `${norm}:num:${d.primary_number}`;
          const a = byNormNum.get(k) || []; a.push(d); byNormNum.set(k, a);
        }
        const a = byNormName.get(norm) || []; a.push(d); byNormName.set(norm, a);
      }
    }

    // ── 3. Collect unique duplicate groups ───────────────────────────────────
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
        const u = grp.filter(r => !processedIds.has(r.id));
        if (u.length > 1) { groups.push({ match_type: 'canonical_key', key, records: grp }); grp.forEach(r => processedIds.add(r.id)); }
      }
    }
    for (const [key, grp] of byNormDob) {
      if (grp.length > 1) {
        const u = grp.filter(r => !processedIds.has(r.id));
        if (u.length > 1) { groups.push({ match_type: 'normalized_name_dob', key, records: grp }); grp.forEach(r => processedIds.add(r.id)); }
      }
    }
    for (const [key, grp] of byNormNum) {
      if (grp.length > 1) {
        const u = grp.filter(r => !processedIds.has(r.id));
        if (u.length > 1) { groups.push({ match_type: 'normalized_name_number', key, records: grp }); grp.forEach(r => processedIds.add(r.id)); }
      }
    }
    for (const [key, grp] of byNormName) {
      if (grp.length > 1) {
        const u = grp.filter(r => !processedIds.has(r.id));
        if (u.length > 1) { groups.push({ match_type: 'normalized_name', key, records: grp }); grp.forEach(r => processedIds.add(r.id)); }
      }
    }

    if (groups.length === 0) {
      return Response.json({
        success: true, dry_run,
        groups_processed: 0, survivors: [], duplicates_marked_inactive: [],
        skipped_groups: [], warnings: [], repairs: [],
        message: 'No duplicate Driver groups detected.',
      });
    }

    // ── 4. Pre-fetch event counts for survivor selection ─────────────────────
    const candidateIds = [...new Set(groups.flatMap(g => g.records.map(r => r.id)))];
    const resultCounts = {};
    const entryCounts  = {};
    for (const id of candidateIds) {
      const [res, ent] = await Promise.all([
        base44.asServiceRole.entities.Results.filter({ driver_id: id }).catch(() => []),
        base44.asServiceRole.entities.Entry.filter({ driver_id: id }).catch(() => []),
      ]);
      resultCounts[id] = res.length;
      entryCounts[id]  = ent.length;
    }

    // ── 5. Process each group ─────────────────────────────────────────────────
    const report = {
      dry_run,
      total_drivers: allDrivers.length,
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

      // Ambiguity guard: normalized_name-only matches with no other signal are risky
      if (match_type === 'normalized_name') {
        const distinct = active.filter(d => d.date_of_birth);
        const dobs = new Set(distinct.map(d => d.date_of_birth));
        if (dobs.size > 1) {
          report.skipped_groups.push({ key, match_type, reason: 'ambiguous_same_name_different_dob', names: active.map(d => driverFullName(d)) });
          report.warnings.push(`Skipped ambiguous group "${key}" — same name, different DOBs`);
          continue;
        }
      }

      const survivor   = pickSurvivor(active, resultCounts, entryCounts);
      const duplicates = active.filter(r => r.id !== survivor.id);

      report.groups_processed++;

      // ── Re-index survivor with canonical fields ───────────────────────────
      const normN      = normalizeName(driverFullName(survivor));
      const canonSlug  = normN.replace(/\s+/g, '-');
      const canonKey   = buildDriverCanonicalKey(survivor, normN);

      if (!dry_run) {
        await base44.asServiceRole.entities.Driver.update(survivor.id, {
          normalized_name: normN || survivor.normalized_name,
          canonical_slug:  canonSlug || survivor.canonical_slug,
          canonical_key:   canonKey,
        }).catch(e => report.warnings.push(`survivor_update_failed:${survivor.id}:${e.message}`));
      }

      report.survivors.push({
        id: survivor.id,
        name: driverFullName(survivor),
        match_type,
        key,
        result_count: resultCounts[survivor.id] || 0,
        entry_count:  entryCounts[survivor.id]  || 0,
        external_uid: survivor.external_uid || null,
        canonical_key: canonKey,
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
          await base44.asServiceRole.entities.Driver.update(dup.id, {
            status: 'Inactive',
            notes: newNotes,
            canonical_key: `driver:DUPLICATE_OF:${survivor.id}`,
          }).catch(e => report.warnings.push(`dup_update_failed:${dup.id}:${e.message}`));
        }

        report.duplicates_marked_inactive.push({
          id: dup.id,
          name: driverFullName(dup),
          survivor_id: survivor.id,
          survivor_name: driverFullName(survivor),
          match_type,
          action: dry_run ? 'would_mark_inactive' : 'marked_inactive',
        });
        dupIds.push(dup.id);
      }

      if (dupIds.length > 0) {
        report.repairs.push({ survivor_id: survivor.id, survivor_name: driverFullName(survivor), duplicate_ids: dupIds });
      }
    }

    // ── 6. Write OperationLog ────────────────────────────────────────────────
    if (!dry_run && report.duplicates_marked_inactive.length > 0) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'source_duplicate_repaired',
        entity_name: 'Driver',
        status: 'success',
        metadata: {
          entity_type: 'driver',
          source_path: 'repair_duplicate_driver_records',
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