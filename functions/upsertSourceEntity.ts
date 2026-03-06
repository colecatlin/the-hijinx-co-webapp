import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ---- inline normalization helpers (no local imports allowed) ----
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

// ---- entity type -> SDK model name ----
const MODEL_MAP = {
  driver: 'Driver',
  team:   'Team',
  track:  'Track',
  series: 'Series',
  event:  'Event',
};

// ---- resolve display name from payload depending on entity type ----
function resolveDisplayName(entity_type, payload) {
  if (entity_type === 'driver') {
    const first = (payload.first_name || '').trim();
    const last  = (payload.last_name  || '').trim();
    if (first || last) return `${first} ${last}`.trim();
  }
  return (payload.name || payload.full_name || payload.title || '').trim();
}

// ---- build parent context key for events ----
function buildEventParentContext(payload) {
  const parts = [];
  if (payload.event_date) parts.push(payload.event_date);
  if (payload.track_id)   parts.push(payload.track_id);
  if (payload.series_id)  parts.push(payload.series_id);
  return parts.join(':') || null;
}

// ---- filter out empty/null values from a patch object ----
function filterNonEmpty(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      entity_type,
      payload = {},
      match_fields = [],          // optional extra fields to filter on
      allow_name_match = true,    // whether to fall back to normalized_name match
    } = body;

    if (!entity_type || !MODEL_MAP[entity_type]) {
      return Response.json({ error: `Unknown entity_type: ${entity_type}. Use: ${Object.keys(MODEL_MAP).join(', ')}` }, { status: 400 });
    }

    const modelName = MODEL_MAP[entity_type];
    const model = base44.asServiceRole.entities[modelName];

    // ---- 1. Derive normalization fields ----
    const displayName   = resolveDisplayName(entity_type, payload);
    const normalized    = normalizeName(displayName);
    const slug          = buildEntitySlug(displayName);
    const parentContext = entity_type === 'event' ? buildEventParentContext(payload) : null;
    const canonicalKey  = buildCanonicalKey({
      entity_type,
      name: displayName,
      external_uid: payload.external_uid || null,
      parent_context: parentContext,
    });

    const now = new Date().toISOString();

    // ---- 2. Attempt match in priority order ----
    let existingRecord = null;
    let matchMethod = null;

    // A. exact external_uid match
    if (payload.external_uid) {
      const results = await model.filter({ external_uid: payload.external_uid });
      if (results && results.length > 0) {
        existingRecord = results[0];
        matchMethod = 'external_uid';
      }
    }

    // B. canonical_key match
    if (!existingRecord && canonicalKey) {
      const results = await model.filter({ canonical_key: canonicalKey });
      if (results && results.length > 0) {
        existingRecord = results[0];
        matchMethod = 'canonical_key';
      }
    }

    // C. canonical_slug + normalized_name match
    if (!existingRecord && slug && normalized) {
      const results = await model.filter({ canonical_slug: slug, normalized_name: normalized });
      if (results && results.length > 0) {
        existingRecord = results[0];
        matchMethod = 'slug_and_name';
      }
    }

    // D. normalized_name fallback (only if allow_name_match)
    if (!existingRecord && allow_name_match && normalized) {
      const results = await model.filter({ normalized_name: normalized });
      if (results && results.length > 0) {
        // For events, also verify parent context matches if available
        if (entity_type === 'event' && parentContext) {
          const matched = results.find(r => r.canonical_key === canonicalKey);
          if (matched) { existingRecord = matched; matchMethod = 'normalized_name_with_context'; }
        } else {
          existingRecord = results[0];
          matchMethod = 'normalized_name';
        }
      }
    }

    let action, record;

    if (existingRecord) {
      // ---- 3. Update existing record ----
      const patch = filterNonEmpty({
        ...payload,
        normalized_name: normalized,
        canonical_slug: slug,
        canonical_key: canonicalKey,
        sync_last_seen_at: now,
      });
      // Never blank out values that already exist if patch would set empty
      const updateData = {};
      for (const [k, v] of Object.entries(patch)) {
        if (v !== null && v !== undefined && v !== '') updateData[k] = v;
      }
      record = await model.update(existingRecord.id, updateData);
      action = 'updated';
    } else {
      // ---- 4. Create new record ----
      const createData = filterNonEmpty({
        ...payload,
        normalized_name: normalized,
        canonical_slug: slug,
        canonical_key: canonicalKey,
        sync_last_seen_at: now,
      });
      // Ensure Event-specific normalized key
      if (entity_type === 'event') {
        createData.normalized_event_key = canonicalKey;
      }
      record = await model.create(createData);
      action = 'created';
    }

    // ---- 5. Log operation ----
    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: action === 'created' ? 'source_entity_created' : 'source_entity_updated',
      entity_name: modelName,
      entity_id: record.id,
      status: 'success',
      metadata: {
        entity_type,
        record_id: record.id,
        canonical_key: canonicalKey,
        external_uid: payload.external_uid || null,
        match_method: matchMethod || 'none',
        display_name: displayName,
      },
    }).catch(() => {}); // non-blocking

    return Response.json({ action, record, match_method: matchMethod });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});