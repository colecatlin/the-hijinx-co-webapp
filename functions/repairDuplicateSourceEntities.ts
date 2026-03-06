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

// Status fields that exist per model (for inactive marking)
const STATUS_FIELD = {
  Driver: 'status',
  Team:   'status',
  Track:  'status',
  Series: 'status',
  Event:  'status',
};

const INACTIVE_VALUE = {
  Driver: 'Inactive',
  Team:   'Inactive',
  Track:  'Inactive',
  Series: 'Inactive',
  Event:  'Cancelled',
};

function resolveDisplayName(entity_type, record) {
  if (entity_type === 'driver') {
    return `${record.first_name || ''} ${record.last_name || ''}`.trim();
  }
  return record.name || record.full_name || record.title || '';
}

function chooseSurvivor(group, strategy) {
  // Priority: record with external_uid first
  const withUid = group.find(r => r.external_uid);
  if (withUid) return withUid;

  if (strategy === 'keep_oldest') {
    return group.slice().sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
  }
  // keep_newest fallback
  return group.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
}

// Inline duplicate scan (can't import from other files)
async function scanDuplicates(base44, entity_type) {
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

  const groups = [];
  const seen = new Set();

  for (const [key, group] of byExternalUid) {
    if (group.length > 1) { groups.push({ match_type: 'external_uid', key, records: group }); group.forEach(r => seen.add(r.id)); }
  }
  for (const [key, group] of byCanonicalKey) {
    if (group.length > 1 && group.some(r => !seen.has(r.id))) {
      groups.push({ match_type: 'canonical_key', key, records: group }); group.forEach(r => seen.add(r.id));
    }
  }
  for (const [key, group] of byNormName) {
    if (group.length > 1 && group.filter(r => !seen.has(r.id)).length > 1) {
      groups.push({ match_type: 'normalized_name', key, records: group }); group.forEach(r => seen.add(r.id));
    }
  }

  return groups;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { entity_type, strategy = 'keep_oldest', dry_run = false } = body;

    if (!entity_type || !MODEL_MAP[entity_type]) {
      return Response.json({ error: `Invalid entity_type. Use: ${Object.keys(MODEL_MAP).join(', ')}` }, { status: 400 });
    }

    const modelName = MODEL_MAP[entity_type];
    const model = base44.asServiceRole.entities[modelName];
    const statusField = STATUS_FIELD[modelName];
    const inactiveValue = INACTIVE_VALUE[modelName];

    const duplicateGroups = await scanDuplicates(base44, entity_type);

    const report = {
      entity_type,
      strategy,
      dry_run,
      groups_processed: 0,
      survivors: [],
      marked_duplicate: [],
    };

    for (const group of duplicateGroups) {
      const survivor = chooseSurvivor(group.records, strategy);
      const duplicates = group.records.filter(r => r.id !== survivor.id);

      report.groups_processed++;
      report.survivors.push({
        id: survivor.id,
        name: resolveDisplayName(entity_type, survivor),
        match_type: group.match_type,
        key: group.key,
      });

      for (const dup of duplicates) {
        const patch = {};

        // Mark status inactive if the field exists
        if (statusField) {
          patch[statusField] = inactiveValue;
        }

        // Append duplicate note to notes field if it exists
        const existingNotes = dup.notes || dup.description || '';
        const dupNote = `DUPLICATE_OF:${survivor.id}`;
        if (!existingNotes.includes(dupNote)) {
          if (dup.hasOwnProperty('notes') || modelName === 'Series' || modelName === 'Track') {
            patch.notes = existingNotes ? `${existingNotes} | ${dupNote}` : dupNote;
          }
        }

        patch.canonical_key = dup.canonical_key || `${entity_type}:DUPLICATE_OF:${survivor.id}`;

        if (!dry_run) {
          await model.update(dup.id, patch);
        }

        report.marked_duplicate.push({
          id: dup.id,
          name: resolveDisplayName(entity_type, dup),
          survivor_id: survivor.id,
          patch_applied: dry_run ? 'skipped (dry_run)' : patch,
        });
      }
    }

    if (!dry_run && report.marked_duplicate.length > 0) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'source_duplicate_repaired',
        entity_name: modelName,
        status: 'success',
        metadata: {
          entity_type,
          groups_processed: report.groups_processed,
          marked_count: report.marked_duplicate.length,
          strategy,
        },
      }).catch(() => {});
    }

    return Response.json({ success: true, report });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});