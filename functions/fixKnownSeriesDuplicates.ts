/**
 * fixKnownSeriesDuplicates.js
 *
 * Finds and safely marks duplicate Series as inactive.
 * Groups by: external_uid → canonical_key → normalized_name.
 * Does NOT hard-delete or merge foreign keys.
 * Admin must trigger manually. Defaults to dry_run=true for safety.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveKey(series) {
  return (
    series.canonical_key ||
    `series:${normalizeName(series.name || series.full_name || '')}`
  );
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false; // default true

    const allSeries = await base44.asServiceRole.entities.Series.list('-created_date', 3000);

    // --- Build duplicate groups ---
    // Priority: external_uid > canonical_key > normalized_name
    const byExternalUid  = new Map();
    const byCanonicalKey = new Map();
    const byNormName     = new Map();

    for (const s of allSeries) {
      if (s.external_uid) {
        const arr = byExternalUid.get(s.external_uid) || [];
        arr.push(s);
        byExternalUid.set(s.external_uid, arr);
      }

      const ck = resolveKey(s);
      if (ck) {
        const arr = byCanonicalKey.get(ck) || [];
        arr.push(s);
        byCanonicalKey.set(ck, arr);
      }

      const norm = normalizeName(s.name || s.full_name || '');
      if (norm) {
        const arr = byNormName.get(norm) || [];
        arr.push(s);
        byNormName.set(norm, arr);
      }
    }

    const report = {
      dry_run,
      total_series: allSeries.length,
      groups_found: 0,
      survivors: [],
      marked_duplicate: [],
      already_unique: [],
    };

    const processedIds = new Set();

    async function processGroup(group, matchType) {
      // Filter out already-processed and already-inactive duplicates
      const active = group.filter(s => !processedIds.has(s.id));
      if (active.length < 2) return;

      // Safety: only merge series whose normalized names are very similar
      // (within the same group key — already guaranteed by grouping)
      report.groups_found++;

      // Pick survivor: prefer has external_uid → oldest created_date
      let survivor = active.find(s => s.external_uid);
      if (!survivor) {
        survivor = active.slice().sort((a, b) =>
          new Date(a.created_date || 0) - new Date(b.created_date || 0)
        )[0];
      }

      // Ensure survivor has normalized fields
      if (!dry_run) {
        const norm = normalizeName(survivor.name || '');
        const slug = norm.replace(/\s+/g, '-');
        await base44.asServiceRole.entities.Series.update(survivor.id, {
          normalized_name: norm,
          canonical_slug: slug,
          canonical_key: `series:${norm}`,
          sync_last_seen_at: new Date().toISOString(),
        });
      }

      report.survivors.push({
        id: survivor.id,
        name: survivor.name,
        match_type: matchType,
        external_uid: survivor.external_uid || null,
        duplicate_count: active.length - 1,
      });

      const duplicates = active.filter(s => s.id !== survivor.id);
      for (const dup of duplicates) {
        processedIds.add(dup.id);
        const dupNote = `DUPLICATE_OF:${survivor.id}`;
        const existingNotes = dup.notes || '';
        const patch = {
          status: 'Inactive',
          notes: existingNotes.includes(dupNote)
            ? existingNotes
            : (existingNotes ? `${existingNotes} | ${dupNote}` : dupNote),
          canonical_key: `series:DUPLICATE_OF:${survivor.id}`,
        };

        if (!dry_run) {
          await base44.asServiceRole.entities.Series.update(dup.id, patch);
        }

        report.marked_duplicate.push({
          id: dup.id,
          name: dup.name,
          survivor_id: survivor.id,
          survivor_name: survivor.name,
          match_type: matchType,
          action: dry_run ? 'would_mark_inactive' : 'marked_inactive',
        });
      }

      processedIds.add(survivor.id);
    }

    // Process in priority order
    for (const [, group] of byExternalUid) {
      if (group.length > 1) await processGroup(group, 'external_uid');
    }
    for (const [, group] of byCanonicalKey) {
      if (group.length > 1) await processGroup(group, 'canonical_key');
    }
    for (const [, group] of byNormName) {
      if (group.length > 1) await processGroup(group, 'normalized_name');
    }

    if (!dry_run && report.marked_duplicate.length > 0) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'source_duplicate_repaired',
        entity_name: 'Series',
        status: 'success',
        metadata: {
          entity_type: 'series',
          source_path: 'fix_known_series_duplicates',
          groups_processed: report.groups_found,
          marked_count: report.marked_duplicate.length,
          survivor_ids: report.survivors.map(s => s.id),
        },
      }).catch(() => {});
    }

    return Response.json({ success: true, report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});