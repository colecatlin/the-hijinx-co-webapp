/**
 * mediaProfileHelpers
 *
 * Shared helpers for MediaProfile operations:
 * - slug generation and uniqueness
 * - directory eligibility computation
 * - completeness scoring
 * - credentialed_media sync
 *
 * NOT a Deno.serve handler — imported logic only via inline use in other functions.
 * Since NO LOCAL IMPORTS are allowed, this module exports helper factory functions
 * that accept a base44 client as a parameter.
 */

/**
 * Normalize a string to a URL-safe slug segment.
 */
export function normalizeToSlug(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a collision-safe unique slug for a MediaProfile.
 * Uses base slug then appends -2, -3, etc. on collision.
 *
 * @param {object} base44client  - service-role capable base44 client
 * @param {string} displayName   - contributor display name
 * @param {string|null} excludeId - MediaProfile ID to exclude from collision check (for updates)
 */
export async function generateUniqueMediaProfileSlug(base44client, displayName, excludeId = null) {
  const base = normalizeToSlug(displayName) || 'contributor';
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await base44client.asServiceRole.entities.MediaProfile
      .filter({ slug: candidate }, '-created_date', 1)
      .catch(() => []);

    const collision = existing.find(p => p.id !== excludeId);
    if (!collision) return candidate;

    counter++;
    candidate = `${base}-${counter}`;
  }
}

/**
 * Compute whether a MediaProfile meets V1 creator directory eligibility.
 * Returns { eligible: boolean, missing: string[] }
 */
export function computeDirectoryEligibility(profile) {
  const missing = [];

  if (!profile.display_name) missing.push('display_name');
  if (!profile.bio) missing.push('bio');
  if (!profile.primary_role) missing.push('primary_role');
  if (!profile.specialties || profile.specialties.length === 0) missing.push('specialties');
  if (!profile.location_city && !profile.location_state && !profile.location_country) missing.push('location');
  if (!profile.creator_terms_accepted) missing.push('creator_terms_accepted');

  const hasExternalPresence =
    profile.website_url ||
    (profile.social_links && Object.keys(profile.social_links).length > 0) ||
    (profile.featured_work_asset_ids && profile.featured_work_asset_ids.length > 0) ||
    (profile.featured_story_ids && profile.featured_story_ids.length > 0);

  if (!hasExternalPresence) missing.push('external_presence (website, social, or featured work)');

  return { eligible: missing.length === 0, missing };
}

/**
 * Compute a 0-100 completeness score for a MediaProfile.
 */
export function computeCompletenessScore(profile) {
  const fields = [
    { key: 'display_name', weight: 15 },
    { key: 'bio', weight: 15 },
    { key: 'primary_role', weight: 10 },
    { key: 'specialties', weight: 10, check: v => Array.isArray(v) && v.length > 0 },
    { key: 'location_city', weight: 5 },
    { key: 'profile_image_url', weight: 10 },
    { key: 'website_url', weight: 5 },
    { key: 'social_links', weight: 5, check: v => v && Object.keys(v).length > 0 },
    { key: 'primary_affiliation_type', weight: 5 },
    { key: 'creator_terms_accepted', weight: 10, check: v => v === true },
    { key: 'creator_rights_acknowledged', weight: 5, check: v => v === true },
    { key: 'availability_status', weight: 5, check: v => v && v !== 'unavailable' },
  ];

  let score = 0;
  for (const f of fields) {
    const val = profile[f.key];
    const passes = f.check ? f.check(val) : !!val;
    if (passes) score += f.weight;
  }

  return Math.min(100, score);
}

/**
 * Derive best-fit primary_role from application_type array.
 */
export function derivePrimaryRoleFromApplicationTypes(applicationTypes = []) {
  const priority = ['editor_interest', 'journalist', 'writer', 'photographer', 'videographer', 'outlet_representative', 'press', 'creator'];
  const roleMap = {
    writer: 'writer',
    journalist: 'journalist',
    photographer: 'photographer',
    videographer: 'videographer',
    editor_interest: 'editor',
    outlet_representative: 'outlet_representative',
    press: 'journalist',
    creator: 'creator',
  };
  for (const p of priority) {
    if (applicationTypes.includes(p)) return roleMap[p];
  }
  return 'creator';
}