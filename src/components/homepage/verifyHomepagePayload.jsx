/**
 * components/homepage/verifyHomepagePayload.js
 *
 * Validates that a homepage payload includes all expected fields.
 * Used in Diagnostics and optionally in the homepage data service safe-warning path.
 *
 * Returns: { ok: boolean, missing: string[], warnings: string[] }
 */

/** All fields expected in the homepage payload. */
export const HOMEPAGE_REQUIRED_FIELDS = [
  'featured_story',
  'featured_drivers',
  'featured_tracks',
  'featured_series',
  'upcoming_events',
  'recent_results',
  'activity_feed',
  'featured_media',
  'featured_products',
  'ticker_items',
  'spotlight_driver',
  'spotlight_event',
];

/** Fields that should be arrays if present. */
export const HOMEPAGE_ARRAY_FIELDS = [
  'featured_drivers',
  'featured_tracks',
  'featured_series',
  'upcoming_events',
  'recent_results',
  'activity_feed',
  'featured_media',
  'featured_products',
];

/**
 * These were added in the trending extension and are recommended but not blocking.
 * Listed separately so missing trending fields produce warnings, not failures.
 */
export const HOMEPAGE_TRENDING_FIELDS = [
  'trending_drivers',
  'trending_tracks',
  'trending_series',
  'trending_events',
];

/**
 * Validate a homepage payload object.
 *
 * @param {object|null} payload
 * @returns {{ ok: boolean, missing: string[], warnings: string[] }}
 */
export function verifyHomepagePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      missing: HOMEPAGE_REQUIRED_FIELDS,
      warnings: ['Payload is null or not an object'],
    };
  }

  const missing = HOMEPAGE_REQUIRED_FIELDS.filter(k => !(k in payload));
  const warnings = [];

  // Non-array values for array fields
  for (const k of HOMEPAGE_ARRAY_FIELDS) {
    if (k in payload && !Array.isArray(payload[k])) {
      warnings.push(`"${k}" should be an array but is ${typeof payload[k]}`);
    }
  }

  // Trending fields: warn if missing
  for (const k of HOMEPAGE_TRENDING_FIELDS) {
    if (!(k in payload)) {
      warnings.push(`Trending field "${k}" not present — homepage may not show trending section`);
    } else if (!Array.isArray(payload[k])) {
      warnings.push(`Trending field "${k}" should be an array but is ${typeof payload[k]}`);
    }
  }

  // Spotlight fields: should be object or null
  for (const k of ['spotlight_driver', 'spotlight_event']) {
    const v = payload[k];
    if (v !== null && v !== undefined && typeof v !== 'object') {
      warnings.push(`"${k}" should be null or an object but is ${typeof v}`);
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Quick boolean check — returns true if payload passes all required field checks.
 *
 * @param {object|null} payload
 * @returns {boolean}
 */
export function isHomepagePayloadValid(payload) {
  return verifyHomepagePayload(payload).ok;
}