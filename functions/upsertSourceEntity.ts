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
function buildNormalizedEventKey({ name, event_date, track_id, series_id }) {
  const norm = normalizeName(name || '');
  return `${norm}|${event_date || 'none'}|${track_id || 'none'}|${series_id || 'none'}`;
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

// ---- run entity-type-specific match attempts in priority order ----
// Returns { record, matchMethod } or { record: null, matchMethod: null }
async function runEntitySpecificMatching(model, entity_type, payload, normalized, slug, canonicalKey) {
  const eu = payload.external_uid || null;

  // ── Series matching ──────────────────────────────────────────────────────
  if (entity_type === 'series') {
    // 1. external_uid exact
    if (eu) {
      const r = await model.filter({ external_uid: eu });
      if (r?.length) return { record: r[0], matchMethod: 'external_uid' };
    }
    // 2. canonical_key exact
    if (canonicalKey) {
      const r = await model.filter({ canonical_key: canonicalKey });
      if (r?.length) return { record: r[0], matchMethod: 'canonical_key' };
    }
    // 3. normalized_name exact
    if (normalized) {
      const r = await model.filter({ normalized_name: normalized });
      if (r?.length) return { record: r[0], matchMethod: 'normalized_name' };
    }
    // 4. canonical_slug exact
    if (slug) {
      const r = await model.filter({ canonical_slug: slug });
      if (r?.length) return { record: r[0], matchMethod: 'canonical_slug' };
    }
    return { record: null, matchMethod: null };
  }

  // ── Track matching ───────────────────────────────────────────────────────
  if (entity_type === 'track') {
    // 1. external_uid exact
    if (eu) {
      const r = await model.filter({ external_uid: eu });
      if (r?.length) return { record: r[0], matchMethod: 'external_uid' };
    }
    // 2. canonical_key exact
    if (canonicalKey) {
      const r = await model.filter({ canonical_key: canonicalKey });
      if (r?.length) return { record: r[0], matchMethod: 'canonical_key' };
    }
    // 3. normalized_name + optional country
    if (normalized) {
      const filter = { normalized_name: normalized };
      if (payload.location_country) filter.location_country = payload.location_country;
      const r = await model.filter(filter);
      if (r?.length) return { record: r[0], matchMethod: 'normalized_name' };
      // try without country if that failed
      if (payload.location_country) {
        const r2 = await model.filter({ normalized_name: normalized });
        if (r2?.length) return { record: r2[0], matchMethod: 'normalized_name' };
      }
    }
    // 4. canonical_slug exact
    if (slug) {
      const r = await model.filter({ canonical_slug: slug });
      if (r?.length) return { record: r[0], matchMethod: 'canonical_slug' };
    }
    return { record: null, matchMethod: null };
  }

  // ── Team matching ────────────────────────────────────────────────────────
  if (entity_type === 'team') {
    // 1. external_uid exact
    if (eu) {
      const r = await model.filter({ external_uid: eu });
      if (r?.length) return { record: r[0], matchMethod: 'external_uid' };
    }
    // 2. canonical_key exact
    if (canonicalKey) {
      const r = await model.filter({ canonical_key: canonicalKey });
      if (r?.length) return { record: r[0], matchMethod: 'canonical_key' };
    }
    // 3. normalized_name + optional series_id
    if (normalized) {
      const filter = { normalized_name: normalized };
      if (payload.series_id) filter.series_id = payload.series_id;
      const r = await model.filter(filter);
      if (r?.length) return { record: r[0], matchMethod: 'normalized_name' };
      if (payload.series_id) {
        const r2 = await model.filter({ normalized_name: normalized });
        if (r2?.length) return { record: r2[0], matchMethod: 'normalized_name' };
      }
    }
    // 4. canonical_slug exact
    if (slug) {
      const r = await model.filter({ canonical_slug: slug });
      if (r?.length) return { record: r[0], matchMethod: 'canonical_slug' };
    }
    return { record: null, matchMethod: null };
  }

  // ── Driver matching ──────────────────────────────────────────────────────
  if (entity_type === 'driver') {
    // 1. external_uid exact
    if (eu) {
      const r = await model.filter({ external_uid: eu });
      if (r?.length) return { record: r[0], matchMethod: 'external_uid' };
    }
    // 2. canonical_key exact
    if (canonicalKey) {
      const r = await model.filter({ canonical_key: canonicalKey });
      if (r?.length) return { record: r[0], matchMethod: 'canonical_key' };
    }
    // 3. normalized_name + optional birth_date
    if (normalized) {
      const filter = { normalized_name: normalized };
      if (payload.date_of_birth) filter.date_of_birth = payload.date_of_birth;
      const r = await model.filter(filter);
      if (r?.length) return { record: r[0], matchMethod: 'normalized_name' };
      if (payload.date_of_birth) {
        const r2 = await model.filter({ normalized_name: normalized });
        if (r2?.length) return { record: r2[0], matchMethod: 'normalized_name' };
      }
    }
    // 4. canonical_slug exact
    if (slug) {
      const r = await model.filter({ canonical_slug: slug });
      if (r?.length) return { record: r[0], matchMethod: 'canonical_slug' };
    }
    return { record: null, matchMethod: null };
  }

  // ── Event matching ───────────────────────────────────────────────────────
  if (entity_type === 'event') {
    const normalizedEventKey = buildNormalizedEventKey({
      name: payload.name || '',
      event_date: payload.event_date || null,
      track_id: payload.track_id || null,
      series_id: payload.series_id || null,
    });

    // 1. external_uid exact (strongest)
    if (eu) {
      const r = await model.filter({ external_uid: eu });
      if (r?.length) return { record: r[0], matchMethod: 'external_uid' };
    }
    // 2. normalized_event_key exact (composite: name+date+track+series)
    if (normalizedEventKey && normalizedEventKey !== '|none|none|none') {
      const r = await model.filter({ normalized_event_key: normalizedEventKey });
      if (r?.length) return { record: r[0], matchMethod: 'normalized_event_key' };
    }
    // 3. canonical_key exact
    if (canonicalKey) {
      const r = await model.filter({ canonical_key: canonicalKey });
      if (r?.length) return { record: r[0], matchMethod: 'canonical_key' };
    }
    // 4. normalized_name + event_date + track_id (strongest positional match)
    if (normalized && payload.event_date && payload.track_id) {
      const r = await model.filter({ normalized_name: normalized, event_date: payload.event_date, track_id: payload.track_id });
      if (r?.length) return { record: r[0], matchMethod: 'normalized_name_date_track' };
    }
    // 5. normalized_name + event_date + series_id (fallback when track not set)
    if (normalized && payload.event_date && payload.series_id) {
      const r = await model.filter({ normalized_name: normalized, event_date: payload.event_date, series_id: payload.series_id });
      if (r?.length) return { record: r[0], matchMethod: 'normalized_name_date_series' };
    }
    // 6. normalized_name + event_date (last resort — may match wrong year if name is generic)
    if (normalized && payload.event_date) {
      const r = await model.filter({ normalized_name: normalized, event_date: payload.event_date });
      if (r?.length) return { record: r[0], matchMethod: 'normalized_name_date' };
    }
    return { record: null, matchMethod: null };
  }

  return { record: null, matchMethod: null };
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
    } = body;

    if (!entity_type || !MODEL_MAP[entity_type]) {
      return Response.json({ error: `Unknown entity_type: ${entity_type}. Use: ${Object.keys(MODEL_MAP).join(', ')}` }, { status: 400 });
    }

    const modelName = MODEL_MAP[entity_type];
    const model = base44.asServiceRole.entities[modelName];

    // ---- 0. If payload contains id, use it directly as the existing record ----
    // This is the fast path for manual form updates that already know the record id.
    if (payload.id) {
      const directRecord = await model.get(payload.id).catch(() => null);
      if (directRecord) {
        // Strip id from the patch to avoid schema errors
        const { id: _id, ...patchWithoutId } = payload;
        const displayName = resolveDisplayName(entity_type, patchWithoutId);
        const normalized  = normalizeName(displayName);
        const slug        = buildEntitySlug(displayName);
        const parentContext = entity_type === 'event' ? buildEventParentContext(patchWithoutId) : null;
        const canonicalKey  = buildCanonicalKey({ entity_type, name: displayName, external_uid: patchWithoutId.external_uid || null, parent_context: parentContext });
        const normalizedEventKey = entity_type === 'event'
          ? buildNormalizedEventKey({ name: patchWithoutId.name || displayName, event_date: patchWithoutId.event_date || null, track_id: patchWithoutId.track_id || null, series_id: patchWithoutId.series_id || null })
          : null;
        const now2 = new Date().toISOString();
        const updateData = filterNonEmpty({
          ...patchWithoutId,
          normalized_name: normalized,
          canonical_slug: slug,
          canonical_key: canonicalKey,
          sync_last_seen_at: now2,
          ...(normalizedEventKey && { normalized_event_key: normalizedEventKey }),
        });
        const updated = await model.update(directRecord.id, updateData);
        await base44.asServiceRole.entities.OperationLog.create({
          operation_type: 'source_entity_updated',
          entity_name: modelName,
          entity_id: updated.id,
          status: 'success',
          metadata: { entity_type, record_id: updated.id, canonical_key: canonicalKey, match_method: 'id_direct', display_name: displayName },
        }).catch(() => {});
        return Response.json({ action: 'updated', record: updated, match_method: 'id_direct' });
      }
      // id was provided but record not found — fall through to normal match flow with id stripped
      const { id: _stripped, ...payloadWithoutId } = payload;
      Object.assign(payload, payloadWithoutId);
    }

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

    // Compute normalized_event_key for events
    const normalizedEventKey = entity_type === 'event'
      ? buildNormalizedEventKey({
          name: payload.name || displayName,
          event_date: payload.event_date || null,
          track_id: payload.track_id || null,
          series_id: payload.series_id || null,
        })
      : null;

    const now = new Date().toISOString();

    // ---- 2. Entity-type-specific match (strong, ordered) ----
    const { record: existingRecord, matchMethod } = await runEntitySpecificMatching(
      model, entity_type, payload, normalized, slug, canonicalKey
    );

    let action, record;

    if (existingRecord) {
      // ---- 3. Update existing record ----
      const patch = filterNonEmpty({
        ...payload,
        normalized_name: normalized,
        canonical_slug: slug,
        canonical_key: canonicalKey,
        sync_last_seen_at: now,
        ...(normalizedEventKey && { normalized_event_key: normalizedEventKey }),
      });
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
        ...(normalizedEventKey && { normalized_event_key: normalizedEventKey }),
      });
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
        ...(normalizedEventKey && { normalized_event_key: normalizedEventKey }),
      },
    }).catch(() => {}); // non-blocking

    return Response.json({ action, record, match_method: matchMethod });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});