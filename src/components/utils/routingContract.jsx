// Canonical Routing Contract for all entity profiles
// This is the single source of truth for all profile URLs
//
// Driver note:
//   Public driver profile URLs use a dedicated path route: /drivers/:canonical_slug
//   Use getDriverProfileUrl(driver) from lib/driverUrl.js for all driver links.
//   buildProfileUrl('Driver', ...) is kept for legacy compatibility only.

export const PROFILE_ROUTES = {
  Track:  { basePath: 'TrackProfile',  param: 'slug' }, // ?slug={slug}
  Series: { pathPattern: '/series',    param: 'slug' }, // /series/:slug (canonical)
  Team:   { basePath: 'TeamProfile',   param: 'slug' }, // ?slug={slug}
  Driver: { pathPattern: '/drivers',   param: 'slug' }, // /drivers/:slug (canonical) — prefer getDriverProfileUrl()
  Event:  { basePath: 'EventResults',  param: 'id'   }, // ?id={id} (no slug yet)
};

/**
 * getEntityProfileUrl(entityType, entity)
 * Returns canonical profile URL for any entity, with safe fallbacks.
 * @param {string} entityType
 * @param {object} entity - must have slug (or canonical_slug for Driver, or id for Event)
 * @returns {string}
 */
export function getEntityProfileUrl(entityType, entity) {
  if (!entity) return '#';
  const route = PROFILE_ROUTES[entityType];
  if (!route) return '#';

  const slug = entity.canonical_slug || entity.slug;

  if (entityType === 'Event') {
    return entity.id ? `/EventResults?id=${encodeURIComponent(entity.id)}` : '/EventDirectory';
  }

  if (!slug) {
    // No slug: fall back to directory
    const fallbacks = { Driver: '/DriverDirectory', Team: '/TeamDirectory', Track: '/TrackDirectory', Series: '/SeriesHome', Event: '/EventDirectory' };
    return fallbacks[entityType] || '#';
  }

  if (route.pathPattern) {
    return `${route.pathPattern}/${encodeURIComponent(slug)}`;
  }

  return `/${route.basePath}?${route.param}=${encodeURIComponent(slug)}`;
}

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