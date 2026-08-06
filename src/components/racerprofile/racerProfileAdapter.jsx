/**
 * racerProfileAdapter.jsx
 *
 * Phase 7 — Compatibility adapter that maps a RacerProfile (backed by
 * PersonIdentity) into a Driver-shaped object so existing components
 * (DriverCard, StatsSection, ResultsPanel, etc.) can render without
 * modification during the transition.
 *
 * The adapter preserves all field names that existing components read:
 *   first_name, last_name, primary_number, hometown_*, racing_base_*,
 *   primary_discipline, career_status, manufacturer, bio, tagline,
 *   hero_image_url, profile_image_url, social links, nicknames,
 *   visibility_status, slug, canonical_slug, id
 *
 * Components that receive the adapted object work unchanged.
 */

/**
 * Convert a RacerProfile (+ optional legacy Driver) into a Driver-shaped
 * object for backward-compatible component rendering.
 *
 * @param {object} racerProfile - The RacerProfile entity
 * @param {object|null} legacyDriver - Optional legacy Driver for fallback fields
 * @returns {object} Driver-shaped object
 */
export function racerProfileToDriverShape(racerProfile, legacyDriver = null) {
  if (!racerProfile) return null;

  const displayName = racerProfile.display_name || '';
  const nameParts = displayName.split(' ').filter(Boolean);
  const firstName = legacyDriver?.first_name || nameParts[0] || '';
  const lastName = legacyDriver?.last_name || nameParts.slice(1).join(' ') || '';

  return {
    // Identity
    id: legacyDriver?.id || racerProfile.legacy_driver_id || racerProfile.id,
    racecore_id: legacyDriver?.racecore_id || racerProfile.racecore_id || null,

    // Name fields (compatibility)
    first_name: firstName,
    last_name: lastName,
    display_name: displayName,
    canonical_slug: racerProfile.slug || legacyDriver?.canonical_slug || null,
    slug: racerProfile.slug || legacyDriver?.slug || null,

    // Bio and identity fields
    bio: racerProfile.bio || legacyDriver?.bio || '',
    tagline: racerProfile.tagline || legacyDriver?.tagline || '',
    profile_image_url: racerProfile.profile_image_url || legacyDriver?.profile_image_url || null,
    hero_image_url: racerProfile.hero_image_url || legacyDriver?.hero_image_url || null,

    // Career
    career_status: racerProfile.career_status || legacyDriver?.career_status || null,
    primary_discipline: racerProfile.primary_discipline || legacyDriver?.primary_discipline || null,
    racing_status: legacyDriver?.racing_status || 'Active',
    visibility_status: racerProfile.visibility === 'live' ? 'live' : 'draft',

    // Location
    hometown_city: racerProfile.hometown_city || legacyDriver?.hometown_city || null,
    hometown_state: racerProfile.hometown_state || legacyDriver?.hometown_state || null,
    hometown_country: racerProfile.hometown_country || legacyDriver?.hometown_country || null,
    racing_base_city: racerProfile.racing_base_city || legacyDriver?.racing_base_city || null,
    racing_base_state: racerProfile.racing_base_state || legacyDriver?.racing_base_state || null,
    racing_base_country: racerProfile.racing_base_country || legacyDriver?.racing_base_country || null,

    // Social links
    website_url: racerProfile.website_url || legacyDriver?.website_url || null,
    instagram_url: racerProfile.instagram_url || legacyDriver?.instagram_url || null,
    facebook_url: racerProfile.facebook_url || legacyDriver?.facebook_url || null,
    tiktok_url: racerProfile.tiktok_url || legacyDriver?.tiktok_url || null,
    x_url: racerProfile.x_url || legacyDriver?.x_url || null,
    youtube_url: racerProfile.youtube_url || legacyDriver?.youtube_url || null,

    // Other fields
    nicknames: racerProfile.nicknames || legacyDriver?.nicknames || [],
    years_active_start: racerProfile.years_active_start || legacyDriver?.years_active_start || null,
    years_active_end: racerProfile.years_active_end || legacyDriver?.years_active_end || null,
    primary_number: legacyDriver?.primary_number || null,
    manufacturer: legacyDriver?.manufacturer || null,
    team_id: legacyDriver?.team_id || null,
    primary_series_id: legacyDriver?.primary_series_id || null,
    primary_class_id: legacyDriver?.primary_class_id || null,
    calendar_id: legacyDriver?.calendar_id || null,
    represented_by: legacyDriver?.represented_by || null,
    date_of_birth: legacyDriver?.date_of_birth || null,
    contact_email: legacyDriver?.contact_email || null,
    numeric_id: legacyDriver?.numeric_id || null,
    trending_score: legacyDriver?.trending_score || 0,
    featured: legacyDriver?.featured || false,

    // RacerProfile-specific metadata for Phase 7 components
    _racerProfile: racerProfile,
    _isClaimed: racerProfile.is_claimed || false,
    _personIdentityId: racerProfile.person_identity_id || null,
  };
}

/**
 * Get the canonical public URL for a racer profile.
 * Returns /racers/:slug for the new canonical route.
 *
 * @param {object} racerProfileOrDriver - RacerProfile or Driver-shaped object
 * @returns {string}
 */
export function getRacerProfileUrl(racerProfileOrDriver) {
  if (!racerProfileOrDriver) return '/Directory?cat=racers';

  // If it's a RacerProfile with a slug, use /racers/:slug
  if (racerProfileOrDriver.slug) {
    return `/racers/${encodeURIComponent(racerProfileOrDriver.slug)}`;
  }

  // If it has a canonical_slug (Driver-shaped), use /drivers/:slug (will redirect)
  if (racerProfileOrDriver.canonical_slug) {
    return `/drivers/${encodeURIComponent(racerProfileOrDriver.canonical_slug)}`;
  }

  // Fallback to directory
  return '/Directory?cat=racers';
}