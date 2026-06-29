/**
 * resolveSourceEntityForImport.js — R9EB.1
 *
 * Normalizes a raw import row and attempts to match an existing source record
 * before deciding whether to create or update.
 *
 * UNIVERSAL LOOKUP ORDER (enforced — never skip or reorder):
 *   1. external_uid
 *   2. canonical_key
 *   3. EntityAlias exact match (alias_normalized)
 *   4. normalized entity name (unambiguous only)
 *   5. canonical_slug (unambiguous only)
 *   → new entity if no match found
 *
 * Input  { entity_type, row, context? }
 * Output { matched_record, prepared_payload, match_type }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Normalization helpers (aligned with resolveEntityAlias) ───────────────────

function stripQuotedNicknames(name) {
  return name.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/\s+/g, ' ').trim();
}
function detectSurnameFirst(name) {
  return /^[^,]+,\s*.+$/.test(name.trim());
}
function invertSurnameFirst(name) {
  const parts = name.split(',');
  if (parts.length < 2) return name;
  return `${parts.slice(1).join(',').trim()} ${parts[0].trim()}`;
}

function normalizeEntityName(name, entityType) {
  if (!name || typeof name !== 'string') return '';
  let n = name.trim();
  if (!n) return '';
  const isPerson = entityType === 'Driver' || entityType === 'PersonIdentity';
  const isClass = entityType === 'SeriesClass';
  n = stripQuotedNicknames(n);
  if (isPerson && detectSurnameFirst(n)) n = invertSurnameFirst(n);
  n = n.toLowerCase();
  if (isPerson) n = n.replace(/\b(jr\.?|sr\.?|ii|iii|iv)\b/g, '').trim();
  n = n.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (isPerson) {
    let prev = '';
    while (prev !== n) {
      prev = n;
      n = n.replace(/\b([a-z])\s+(?=[a-z](\s|$))/g, '$1');
    }
    n = n.replace(/\s+/g, ' ').trim();
  }
  if (isClass) {
    n = n.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  }
  return n;
}

function buildEntitySlug(value) {
  return normalizeEntityName(value, '').replace(/\s+/g, '-');
}

function buildCanonicalKey({ entity_type, name, external_uid, parent_context }) {
  const type = (entity_type || '').toLowerCase();
  if (external_uid) return `${type}:${external_uid}`;
  const norm = normalizeEntityName(name, entity_type);
  if (parent_context) return `${type}:${norm}:${parent_context}`;
  return `${type}:${norm}`;
}

function buildNormalizedEventKey({ name, event_date, track_id, series_id }) {
  const norm = normalizeEntityName(name || '', 'Event');
  return `${norm}|${event_date || 'none'}|${track_id || 'none'}|${series_id || 'none'}`;
}

const ENTITY_MODEL_MAP = {
  driver: 'Driver',
  team:   'Team',
  track:  'Track',
  series: 'Series',
  event:  'Event',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { entity_type, row = {}, context = {} } = body;

    const et = (entity_type || '').toLowerCase();
    const modelName = ENTITY_MODEL_MAP[et];
    if (!modelName) {
      return Response.json({ error: `Unsupported entity_type: ${entity_type}. Must be one of: driver, team, track, series, event` }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const model = sr.entities[modelName];

    // ── Resolve display name ──────────────────────────────────────────────────
    let displayName = '';
    if (et === 'driver') {
      const first = (row.first_name || '').trim();
      const last  = (row.last_name  || '').trim();
      displayName = `${first} ${last}`.trim();
    } else {
      displayName = (row.name || row.full_name || row.series_name || row.team_name || row.track_name || row.event_name || '').trim();
    }

    // ── Build normalized identity fields ──────────────────────────────────────
    const normalized_name = normalizeEntityName(displayName, modelName);
    const canonical_slug  = buildEntitySlug(displayName);

    let parentContext = null;
    if (et === 'event') {
      const parts = [];
      if (row.event_date) parts.push(row.event_date);
      if (row.track_id)   parts.push(row.track_id);
      if (row.series_id)  parts.push(row.series_id);
      parentContext = parts.join(':') || null;
    }

    const canonical_key = buildCanonicalKey({
      entity_type: et,
      name: displayName,
      external_uid: row.external_uid || null,
      parent_context: parentContext,
    });

    const normalized_event_key = et === 'event'
      ? buildNormalizedEventKey({
          name: row.name || displayName,
          event_date: row.event_date || null,
          track_id:   row.track_id   || null,
          series_id:  row.series_id  || null,
        })
      : null;

    const prepared_payload = {
      ...row,
      normalized_name,
      canonical_slug,
      canonical_key,
      ...(normalized_event_key && { normalized_event_key }),
    };

    // ── Attempt to match existing record ──────────────────────────────────────
    let matched_record = null;
    let match_type = null;

    // Step 1: external_uid (strongest signal)
    if (!matched_record && row.external_uid) {
      const rows = await model.filter({ external_uid: row.external_uid });
      if (rows.length > 0) { matched_record = rows[0]; match_type = 'external_uid'; }
    }

    // Step 2: canonical_key
    if (!matched_record && canonical_key) {
      const rows = await model.filter({ canonical_key });
      if (rows.length > 0) { matched_record = rows[0]; match_type = 'canonical_key'; }
    }

    // Step 3: EntityAlias lookup (R9EB.1 — universal alias authority)
    if (!matched_record && normalized_name) {
      const aliasRows = await sr.entities.EntityAlias.filter({
        entity_type: modelName,
        alias_normalized: normalized_name,
        active: true,
      }).catch(() => []);

      if (aliasRows.length === 1) {
        const canonical = await model.filter({ id: aliasRows[0].entity_id }).catch(() => []);
        if (canonical.length > 0) { matched_record = canonical[0]; match_type = 'entity_alias'; }
      }
    }

    // Step 4: normalized_event_key (events only)
    if (!matched_record && normalized_event_key) {
      const rows = await model.filter({ normalized_event_key });
      if (rows.length > 0) { matched_record = rows[0]; match_type = 'normalized_event_key'; }
    }

    // Step 5: normalized_name (only if unambiguous)
    if (!matched_record && normalized_name) {
      const rows = await model.filter({ normalized_name });
      if (rows.length === 1) { matched_record = rows[0]; match_type = 'normalized_name'; }
    }

    // Step 6: canonical_slug (only if unambiguous)
    if (!matched_record && canonical_slug) {
      const rows = await model.filter({ canonical_slug });
      if (rows.length === 1) { matched_record = rows[0]; match_type = 'canonical_slug'; }
    }

    // Auto-register alias if matched via normalized_name or canonical_slug
    // (meaning this name variant isn't in EntityAlias yet)
    if (matched_record && (match_type === 'normalized_name' || match_type === 'canonical_slug') && normalized_name) {
      const alreadyAliased = await sr.entities.EntityAlias.filter({
        entity_type: modelName,
        entity_id: matched_record.id,
        alias_normalized: normalized_name,
      }).catch(() => []);
      if (!alreadyAliased.length) {
        await sr.entities.EntityAlias.create({
          entity_type: modelName,
          entity_id: matched_record.id,
          alias_name: displayName,
          alias_normalized: normalized_name,
          alias_type: 'import_variant',
          confidence: 80,
          active: true,
          source: 'resolveSourceEntityForImport',
          source_type: 'import',
          created_by: user.id,
        }).catch(() => {});
      }
    }

    return Response.json({
      matched_record: matched_record || null,
      prepared_payload,
      match_type,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});