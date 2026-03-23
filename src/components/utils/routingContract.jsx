// Canonical Routing Contract for all entity profiles
// This is the single source of truth for all profile URLs
//
// Driver note:
//   Public driver profile URLs use a dedicated path route: /drivers/:canonical_slug
//   Use getDriverProfileUrl(driver) from lib/driverUrl.js for all driver links.
//   buildProfileUrl('Driver', ...) is kept for legacy compatibility only.

export const PROFILE_ROUTES = {
  Track: { basePath: 'TrackProfile', param: 'slug' }, // Uses ?slug={slug}
  Series: { basePath: null, pathPattern: '/series', param: 'slug' }, // Uses /series/:slug
  Team: { basePath: 'TeamProfile', param: 'slug' }, // Uses ?slug={slug}
  Driver: { basePath: 'DriverProfile', param: 'slug' }, // Legacy fallback — prefer /drivers/:canonical_slug
  Event: { basePath: 'EventResults', param: 'id' }, // Uses ?id={id} (no slug yet)
};

/**
 * Build a profile URL for any entity
 * @param {string} entityType - 'Track', 'Series', 'Team', 'Driver', or 'Event'
 * @param {string} slugOrId - The entity's slug (or id for Event)
 * @returns {string} The complete profile URL
 */
export function buildProfileUrl(entityType, slugOrId) {
  const route = PROFILE_ROUTES[entityType];
  if (!route) {
    console.error(`Unknown entity type: ${entityType}`);
    return '#';
  }
  if (!slugOrId) {
    console.warn(`No ${route.param} provided for ${entityType}`);
    return '#';
  }
  // Path-based routing (e.g. /series/:slug)
  if (route.pathPattern) {
    return `${route.pathPattern}/${encodeURIComponent(slugOrId)}`;
  }
  return `/${route.basePath}?${route.param}=${encodeURIComponent(slugOrId)}`;
}

/**
 * Generate a slug from a name (used for missing slugs)
 * @param {string} name - The entity name
 * @param {string} suffix - Optional unique suffix (city, date, etc.)
 * @returns {string} URL-friendly slug
 */
export function generateSlug(name, suffix = '') {
  if (!name) return '';
  
  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  if (suffix) {
    slug += `-${suffix.toLowerCase().replace(/[^\w]/g, '')}`;
  }
  
  return slug;
}

/**
 * Validate slug uniqueness
 * @param {string} slug - The slug to validate
 * @param {Array} existingSlugs - Array of existing slugs
 * @returns {Object} { isUnique: boolean, suggestion: string }
 */
export function validateSlug(slug, existingSlugs) {
  const isUnique = !existingSlugs.includes(slug);
  
  if (isUnique) {
    return { isUnique: true, suggestion: slug };
  }
  
  // Generate a unique suggestion with numeric suffix
  let counter = 1;
  let suggestion = `${slug}-${counter}`;
  while (existingSlugs.includes(suggestion)) {
    counter++;
    suggestion = `${slug}-${counter}`;
  }
  
  return { isUnique: false, suggestion };
}