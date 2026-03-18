/**
 * normalizeEntityIdentity.js
 * Shared helpers for entity deduplication, canonical identification,
 * and SINGLE SOURCE OF TRUTH for slug generation across the platform.
 *
 * ── Slug API ──────────────────────────────────────────────────────────────
 *   generateEntitySlug(text)
 *     → deterministic URL-safe slug from any string
 *
 *   generateUniqueEntitySlug(base44, entityName, text, excludeId?)
 *     → collision-safe slug for a specific entity collection
 *       appends -2, -3, … until unique
 *
 * All other slug helpers (normalizeToSlug, buildSlug, buildEntitySlug)
 * are DEPRECATED — they delegate here and will be removed after backfill
 * functions are retired.
 * ──────────────────────────────────────────────────────────────────────────
 */

// ── Internal primitive ─────────────────────────────────────────────────────

function _normalizeStringForSlug(value) {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')  // keep existing hyphens, drop everything else unsafe
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens
}

// ── Public slug API ────────────────────────────────────────────────────────

/**
 * generateEntitySlug(text)
 * Converts any string into a deterministic, URL-safe slug.
 *   - lowercase
 *   - trim whitespace
 *   - replace spaces with hyphens
 *   - remove unsafe characters
 *   - collapse multiple hyphens
 *   - never returns empty string (falls back to 'entity')
 */
export function generateEntitySlug(text) {
  return _normalizeStringForSlug(text) || 'entity';
}

/**
 * generateUniqueEntitySlug(base44, entityName, text, excludeId?)
 * Generates a slug guaranteed to be unique within the given entity collection.
 *
 * @param {object}  base44      - Base44 SDK instance (must have asServiceRole)
 * @param {string}  entityName  - e.g. 'MediaProfile', 'MediaOutlet', 'Driver'
 * @param {string}  text        - Source text to slugify
 * @param {string}  [excludeId] - Record ID to exclude from collision check (for updates)
 * @param {string}  [fallback]  - Fallback base if text produces empty slug
 * @returns {Promise<string>}
 */
export async function generateUniqueEntitySlug(base44, entityName, text, excludeId = null, fallback = 'entity') {
  const base = generateEntitySlug(text) || generateEntitySlug(fallback) || 'entity';
  let candidate = base;
  let counter = 1;
  while (true) {
    const existing = await base44.asServiceRole.entities[entityName]
      .filter({ slug: candidate }, '-created_date', 1).catch(() => []);
    const collision = existing.find(r => r.id !== excludeId);
    if (!collision) return candidate;
    counter++;
    candidate = `${base}-${counter}`;
  }
}

// ── Legacy shims (kept for backfill compatibility, do not use in new code) ──

/** @deprecated Use generateEntitySlug instead */
export function normalizeName(value) {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @deprecated Use generateEntitySlug instead */
export function buildEntitySlug(value) {
  return generateEntitySlug(value);
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