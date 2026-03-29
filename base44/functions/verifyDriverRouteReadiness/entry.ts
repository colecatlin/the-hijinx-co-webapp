/**
 * verifyDriverRouteReadiness.js
 *
 * Verifies that all public-facing Driver records are ready for canonical slug routing.
 *
 * Checks:
 *   - All public drivers have canonical_slug
 *   - No duplicate canonical_slugs among public drivers
 *   - All public drivers have canonical_key
 *   - All public drivers have normalized_name
 *
 * Output: {
 *   drivers_route_ready, missing_canonical_slug, duplicate_canonical_slugs,
 *   broken_driver_routes, inconsistent_link_sources, warnings, failures
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const allDrivers = await base44.asServiceRole.entities.Driver.list('-created_date', 5000);

    const publicDrivers = allDrivers.filter(d => d.visibility_status === 'live');
    const allPublicCount = publicDrivers.length;

    const missingCanonicalSlug = [];
    const missingCanonicalKey = [];
    const missingNormalizedName = [];
    const slugCounts = new Map();
    const warnings = [];
    const failures = [];

    for (const d of publicDrivers) {
      const name = `${d.first_name || ''} ${d.last_name || ''}`.trim() || `id:${d.id}`;

      if (!d.canonical_slug) {
        missingCanonicalSlug.push({ id: d.id, name });
      } else {
        const prev = slugCounts.get(d.canonical_slug) || [];
        prev.push({ id: d.id, name });
        slugCounts.set(d.canonical_slug, prev);
      }

      if (!d.canonical_key) {
        missingCanonicalKey.push({ id: d.id, name });
      }

      if (!d.normalized_name) {
        missingNormalizedName.push({ id: d.id, name });
        warnings.push(`Driver "${name}" (id=${d.id}) missing normalized_name`);
      }
    }

    // Find duplicates
    const duplicateCanonicalSlugs = [];
    for (const [slug, drivers] of slugCounts.entries()) {
      if (drivers.length > 1) {
        duplicateCanonicalSlugs.push({ slug, drivers });
        failures.push(`Duplicate canonical_slug "${slug}" used by ${drivers.length} drivers`);
      }
    }

    const driversRouteReady = allPublicCount
      - missingCanonicalSlug.length
      - duplicateCanonicalSlugs.reduce((sum, d) => sum + d.drivers.length - 1, 0);

    // Broken routes = public drivers without canonical_slug
    const brokenDriverRoutes = missingCanonicalSlug.map(d => ({
      driver_id: d.id,
      driver_name: d.name,
      issue: 'missing_canonical_slug',
    }));

    // Inconsistent link sources = drivers that have slug but no canonical_slug
    // (old routing would fall back to slug which might not match)
    const inconsistentLinkSources = publicDrivers
      .filter(d => d.slug && !d.canonical_slug)
      .map(d => ({
        driver_id: d.id,
        driver_name: `${d.first_name || ''} ${d.last_name || ''}`.trim(),
        has_slug: true,
        has_canonical_slug: false,
      }));

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'driver_route_readiness_verified',
      entity_name: 'Driver',
      status: failures.length === 0 ? 'success' : 'warning',
      metadata: {
        public_drivers_checked: allPublicCount,
        drivers_route_ready: driversRouteReady,
        missing_canonical_slug_count: missingCanonicalSlug.length,
        duplicate_slugs_count: duplicateCanonicalSlugs.length,
        failures_count: failures.length,
      },
    }).catch(() => {});

    return Response.json({
      success: true,
      drivers_route_ready: driversRouteReady,
      public_drivers_checked: allPublicCount,
      missing_canonical_slug: missingCanonicalSlug,
      missing_canonical_key: missingCanonicalKey,
      missing_normalized_name: missingNormalizedName,
      duplicate_canonical_slugs: duplicateCanonicalSlugs,
      broken_driver_routes: brokenDriverRoutes,
      inconsistent_link_sources: inconsistentLinkSources,
      warnings,
      failures,
    });

  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});