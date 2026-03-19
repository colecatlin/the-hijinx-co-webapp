/**
 * getDriverProfileUrl
 * Returns the canonical URL for a driver profile.
 * Accepts any driver-like object with canonical_slug, slug, or id.
 */
export function getDriverProfileUrl(driver) {
  if (!driver) return '/DriverDirectory';
  const slug = driver.canonical_slug || driver.slug;
  if (slug) return `/DriverProfile?slug=${slug}`;
  if (driver.id) return `/DriverProfile?id=${driver.id}`;
  return '/DriverDirectory';
}