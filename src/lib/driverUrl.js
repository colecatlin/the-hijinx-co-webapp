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
  if (!driver) return '/DriverDirectory';

  if (driver.canonical_slug) {
    return `/drivers/${encodeURIComponent(driver.canonical_slug)}`;
  }

  if (driver.slug) {
    return `/drivers/${encodeURIComponent(driver.slug)}`;
  }

  if (driver.id) {
    return `/DriverProfile?id=${encodeURIComponent(driver.id)}`;
  }

  return '/DriverDirectory';
}