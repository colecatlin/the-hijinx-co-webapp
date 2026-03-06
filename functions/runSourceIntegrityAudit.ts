/**
 * runSourceIntegrityAudit.js
 * Admin-only diagnostic endpoint.
 * Scans all five source entity types for duplicates and returns a summary.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// inline normalizeName
function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

const MODEL_MAP = {
  driver: 'Driver',
  team:   'Team',
  track:  'Track',
  series: 'Series',
  event:  'Event',
};

function resolveDisplayName(entity_type, record) {
  if (entity_type === 'driver') return `${record.first_name || ''} ${record.last_name || ''}`.trim();
  return record.name || record.full_name || record.title || '';
}

async function scanEntity(base44, entity_type) {
  const modelName = MODEL_MAP[entity_type];
  const records = await base44.asServiceRole.entities[modelName].list('-created_date', 2000);

  const byExternalUid  = new Map();
  const byCanonicalKey = new Map();
  const byNormName     = new Map();

  for (const r of records) {
    if (r.external_uid) {
      const arr = byExternalUid.get(r.external_uid) || []; arr.push(r); byExternalUid.set(r.external_uid, arr);
    }
    if (r.canonical_key) {
      const arr = byCanonicalKey.get(r.canonical_key) || []; arr.push(r); byCanonicalKey.set(r.canonical_key, arr);
    }
    const dn = r.normalized_name || normalizeName(resolveDisplayName(entity_type, r));
    if (dn) {
      const arr = byNormName.get(dn) || []; arr.push(r); byNormName.set(dn, arr);
    }
  }

  let dupGroupCount = 0;
  const seen = new Set();
  const sampleDuplicates = [];

  for (const [key, group] of byExternalUid) {
    if (group.length > 1) {
      dupGroupCount++;
      group.forEach(r => seen.add(r.id));
      if (sampleDuplicates.length < 5) sampleDuplicates.push({ match_type: 'external_uid', key, count: group.length });
    }
  }
  for (const [key, group] of byCanonicalKey) {
    if (group.length > 1 && group.some(r => !seen.has(r.id))) {
      dupGroupCount++;
      group.forEach(r => seen.add(r.id));
      if (sampleDuplicates.length < 5) sampleDuplicates.push({ match_type: 'canonical_key', key, count: group.length });
    }
  }
  for (const [key, group] of byNormName) {
    if (group.length > 1 && group.filter(r => !seen.has(r.id)).length > 1) {
      dupGroupCount++;
      group.forEach(r => seen.add(r.id));
      if (sampleDuplicates.length < 5) sampleDuplicates.push({ match_type: 'normalized_name', key, count: group.length });
    }
  }

  // Normalization coverage
  const withNormName    = records.filter(r => r.normalized_name).length;
  const withCanonKey    = records.filter(r => r.canonical_key).length;
  const withExternalUid = records.filter(r => r.external_uid).length;

  return {
    total_records: records.length,
    duplicate_groups: dupGroupCount,
    records_in_duplicate_groups: seen.size,
    normalization_coverage: {
      normalized_name: withNormName,
      canonical_key: withCanonKey,
      external_uid: withExternalUid,
      pct_normalized: records.length ? Math.round((withNormName / records.length) * 100) : 0,
    },
    sample_duplicates: sampleDuplicates,
    status: dupGroupCount === 0 ? 'clean' : 'duplicates_found',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    // Run all five scans in parallel
    const [drivers, teams, tracks, series, events] = await Promise.all([
      scanEntity(base44, 'driver'),
      scanEntity(base44, 'team'),
      scanEntity(base44, 'track'),
      scanEntity(base44, 'series'),
      scanEntity(base44, 'event'),
    ]);

    const totalDupGroups = drivers.duplicate_groups + teams.duplicate_groups +
      tracks.duplicate_groups + series.duplicate_groups + events.duplicate_groups;

    const summary = {
      audited_at: new Date().toISOString(),
      overall_status: totalDupGroups === 0 ? 'clean' : 'action_required',
      total_duplicate_groups: totalDupGroups,
      drivers,
      teams,
      tracks,
      series,
      events,
    };

    // Log the audit run
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'source_integrity_audit',
      entity_name: 'System',
      status: 'success',
      metadata: {
        total_duplicate_groups: totalDupGroups,
        overall_status: summary.overall_status,
        audited_by: user.email,
      },
    }).catch(() => {});

    return Response.json(summary);

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});