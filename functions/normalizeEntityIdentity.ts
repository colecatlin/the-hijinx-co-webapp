/**
 * normalizeEntityIdentity.js
 * Shared helpers for entity deduplication and canonical identification.
 * Exported as plain functions — import this file from other backend functions.
 */

/**
 * normalizeName
 * - trim, lowercase
 * - remove punctuation except alphanumeric and spaces
 * - collapse multiple spaces
 */
export function normalizeName(value) {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')   // replace non-alphanumeric/space with space
    .replace(/\s+/g, ' ')            // collapse multiple spaces
    .trim();
}

/**
 * buildEntitySlug
 * Normalized name with spaces replaced by hyphens.
 */
export function buildEntitySlug(value) {
  return normalizeName(value).replace(/\s+/g, '-');
}

/**
 * buildCanonicalKey
 * Returns the strongest unique identifier available.
 *
 * @param {object} opts
 * @param {string} opts.entity_type   - "driver" | "team" | "track" | "series" | "event"
 * @param {string} opts.name          - Display name (will be normalized)
 * @param {string} [opts.external_uid]
 * @param {string} [opts.parent_context] - e.g. track_id, series_id, or a date for events
 */
export function buildCanonicalKey({ entity_type, name, external_uid, parent_context }) {
  const type = (entity_type || '').toLowerCase();
  if (external_uid) {
    return `${type}:${external_uid}`;
  }
  const norm = normalizeName(name);
  if (parent_context) {
    return `${type}:${norm}:${parent_context}`;
  }
  return `${type}:${norm}`;
}

/**
 * areLikelySameEntity
 * Returns true if two entity objects appear to represent the same real-world entity.
 * Detection only — does not trigger any merge.
 *
 * Both a and b should have fields: external_uid, canonical_key, canonical_slug, name (or normalized_name)
 */
export function areLikelySameEntity(a, b) {
  if (!a || !b) return false;

  // 1. external_uid match (strongest signal)
  if (a.external_uid && b.external_uid && a.external_uid === b.external_uid) return true;

  // 2. canonical_key match
  if (a.canonical_key && b.canonical_key && a.canonical_key === b.canonical_key) return true;

  // 3. canonical_slug match
  if (a.canonical_slug && b.canonical_slug && a.canonical_slug === b.canonical_slug) return true;

  // 4. normalized_name match (fallback)
  const normA = a.normalized_name || normalizeName(a.name || a.full_name || '');
  const normB = b.normalized_name || normalizeName(b.name || b.full_name || '');
  if (normA && normB && normA === normB) return true;

  return false;
}

/**
 * buildNormalizedEventKey
 * Builds a stable composite key for an event to prevent duplicate creation
 * across repeated syncs.
 *
 * Format: normalized_name|event_date|track_id_or_none|series_id_or_none
 *
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} [opts.event_date]  - ISO date string "YYYY-MM-DD"
 * @param {string} [opts.track_id]
 * @param {string} [opts.series_id]
 * @returns {string}
 */
export function buildNormalizedEventKey({ name, event_date, track_id, series_id }) {
  const normalizedEventName = normalizeName(name || '');
  const date    = event_date  || 'none';
  const trackPart  = track_id   || 'none';
  const seriesPart = series_id  || 'none';
  return `${normalizedEventName}|${date}|${trackPart}|${seriesPart}`;
}

// ---- Deno.serve is required but this module is not a standalone HTTP handler.
// We export helpers only. However Base44 requires every function file to export a Deno.serve.
// We make a lightweight passthrough so the file deploys correctly.
Deno.serve(async (_req) => {
  return Response.json({
    ok: true,
    exports: ['normalizeName', 'buildEntitySlug', 'buildCanonicalKey', 'areLikelySameEntity', 'buildNormalizedEventKey'],
  });
});