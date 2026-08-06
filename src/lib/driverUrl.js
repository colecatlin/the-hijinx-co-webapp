/**
 * driverUrl.js
 *
 * Canonical driver URL helper.
 *
 * Rules:
 *   - Driver.canonical_slug  → public route identity  → /drivers/:canonical_slug
 *   - Driver.slug            → internal/fallback only
 *   - Driver.id              → emergency fallback via query param
 *
 * All public driver links must use getDriverProfileUrl().
 */

/**
 * Returns the canonical public URL for a driver profile page.
 *
 * Priority:
 *   1. /drivers/:canonical_slug   (preferred)
 *   2. /drivers/:slug             (fallback if canonical_slug missing)
 *   3. /DriverProfile?id=:id      (legacy emergency fallback)
 *
 * @param {object} driver - Driver entity record
 * @returns {string}
 */
export function getDriverProfileUrl(driver) {
  if (!driver) return '/Directory?cat=drivers';

  // Phase 7: If the object has a RacerProfile slug, use /racers/:slug
  if (driver.slug && driver._racerProfile) {
    return `/racers/${encodeURIComponent(driver.slug)}`;
  }

  // Phase 7: If the object has a RacerProfile slug directly, use /racers/:slug
  if (driver.slug && !driver.first_name && !driver.last_name && driver.display_name) {
    return `/racers/${encodeURIComponent(driver.slug)}`;
  }

  // Legacy: Driver-shaped object — use /drivers/:slug (will redirect to /racers/:slug)
  if (driver.canonical_slug) {
    return `/drivers/${encodeURIComponent(driver.canonical_slug)}`;
  }

  if (driver.slug) {
    return `/drivers/${encodeURIComponent(driver.slug)}`;
  }

  if (driver.id) {
    return `/DriverProfile?id=${encodeURIComponent(driver.id)}`;
  }

  return '/Directory?cat=drivers';
}