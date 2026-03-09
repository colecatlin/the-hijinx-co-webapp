/**
 * resolveSourceEntityForImport.js
 *
 * Normalizes a raw import row and attempts to match an existing source record
 * before deciding whether to create or update.
 *
 * Used by importers to pre-check deduplication before calling the sync pipeline.
 *
 * Input  { entity_type, row, context? }
 * Output { matched_record, prepared_payload, match_type }
 *
 * Match order: external_uid → canonical_key → normalized_event_key (events) →
 *              normalized_name (unambiguous only) → canonical_slug (unambiguous only)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Inline normalization helpers ──────────────────────────────────────────────
function normalizeName(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function buildEntitySlug(value) {
  return normalizeName(value).replace(/\s+/g, '-');
}
function buildCanonicalKey({ entity_type, name, external_uid, parent_context }) {
  const type = (entity_type || '').toLowerCase();
  if (external_uid) return `${type}:${external_uid}`;
  const norm = normalizeName(name);
  if (parent_context) return `${type}:${norm}:${parent_context}`;
  return `${type}:${norm}`;
}
function buildNormalizedEventKey({ name, event_date, track_id, series_id }) {
  const norm = normalizeName(name || '');
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
    const { entity_type, row = {} } = body;

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
    const normalized_name = normalizeName(displayName);
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

    // ── Build prepared payload (enriched with identity fields) ────────────────
    const prepared_payload = {
      ...row,
      normalized_name,
      canonical_slug,
      canonical_key,
      ...(normalized_event_key && { normalized_event_key }),
    };

    // ── Attempt to match existing record ─────────────────────────────────────
    let matched_record = null;
    let match_type = null;

    // 1. external_uid (strongest signal)
    if (!matched_record && row.external_uid) {
      const rows = await model.filter({ external_uid: row.external_uid });
      if (rows.length > 0) { matched_record = rows[0]; match_type = 'external_uid'; }
    }

    // 2. canonical_key
    if (!matched_record && canonical_key) {
      const rows = await model.filter({ canonical_key });
      if (rows.length > 0) { matched_record = rows[0]; match_type = 'canonical_key'; }
    }

    // 3. normalized_event_key (events only)
    if (!matched_record && normalized_event_key) {
      const rows = await model.filter({ normalized_event_key });
      if (rows.length > 0) { matched_record = rows[0]; match_type = 'normalized_event_key'; }
    }

    // 4. normalized_name (only if unambiguous)
    if (!matched_record && normalized_name) {
      const rows = await model.filter({ normalized_name });
      if (rows.length === 1) { matched_record = rows[0]; match_type = 'normalized_name'; }
    }

    // 5. canonical_slug (only if unambiguous)
    if (!matched_record && canonical_slug) {
      const rows = await model.filter({ canonical_slug });
      if (rows.length === 1) { matched_record = rows[0]; match_type = 'canonical_slug'; }
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