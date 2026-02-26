// Canonical Routing Contract for all entity profiles
// This is the single source of truth for all profile URLs

export const PROFILE_ROUTES = {
  Track: { basePath: 'TrackProfile', param: 'slug' }, // Uses ?slug={slug}
  Series: { basePath: 'SeriesDetail', param: 'slug' }, // Uses ?slug={slug}
  Team: { basePath: 'TeamProfile', param: 'slug' }, // Uses ?slug={slug}
  Driver: { basePath: 'DriverProfile', param: 'slug' }, // Uses ?slug={slug}
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