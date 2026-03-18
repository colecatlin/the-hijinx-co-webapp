import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * prepareSourcePayloadForSync.js
 *
 * Normalizes and enriches a raw manual form payload before passing it to
 * syncSourceAndEntityRecord. Populates all dedup/identity fields so the
 * upsert pipeline has the best possible matching signal.
 *
 * Input:  { entity_type, payload }
 * Output: { payload }  — enriched, cleaned payload
 */

// ── Inline normalization helpers (no local imports) ──────────────────────────
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

const SUPPORTED_TYPES = ['driver', 'team', 'track', 'series', 'event'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { entity_type, payload = {} } = body;

    if (!entity_type || !SUPPORTED_TYPES.includes(entity_type)) {
      return Response.json({ error: `Unsupported entity_type: ${entity_type}` }, { status: 400 });
    }

    // ── Resolve display name ──────────────────────────────────────────────────
    let displayName = '';
    if (entity_type === 'driver') {
      const first = (payload.first_name || '').trim();
      const last  = (payload.last_name  || '').trim();
      displayName = `${first} ${last}`.trim();
    } else {
      displayName = (payload.name || payload.full_name || payload.title || '').trim();
    }

    if (!displayName) {
      return Response.json({ error: 'Cannot derive display name from payload' }, { status: 400 });
    }

    // ── Build normalization fields ─────────────────────────────────────────────
    const normalized_name  = normalizeName(displayName);
    const canonical_slug   = buildEntitySlug(displayName);

    // For events: use date+track+series as parent_context for stronger canonical_key
    let parentContext = null;
    if (entity_type === 'event') {
      const parts = [];
      if (payload.event_date) parts.push(payload.event_date);
      if (payload.track_id)   parts.push(payload.track_id);
      if (payload.series_id)  parts.push(payload.series_id);
      parentContext = parts.join(':') || null;
    }

    const canonical_key = buildCanonicalKey({
      entity_type,
      name: displayName,
      external_uid: payload.external_uid || null,
      parent_context: parentContext,
    });

    const enriched = {
      ...payload,
      normalized_name,
      canonical_slug,
      canonical_key,
    };

    // Events also get normalized_event_key
    if (entity_type === 'event') {
      enriched.normalized_event_key = buildNormalizedEventKey({
        name: payload.name || displayName,
        event_date: payload.event_date || null,
        track_id:   payload.track_id   || null,
        series_id:  payload.series_id  || null,
      });
    }

    return Response.json({ payload: enriched });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});