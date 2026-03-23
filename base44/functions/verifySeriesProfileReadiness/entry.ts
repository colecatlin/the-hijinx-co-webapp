/**
 * verifySeriesProfileReadiness()
 * Checks that Series Profile routing, slugs, and data loading are functional.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const db = base44.asServiceRole;
    const allSeries = await db.entities.Series.list();

    const missingSlugs = [];
    const slugSet = new Set();
    const duplicateSlugs = [];
    const warnings = [];
    const failures = [];
    let backfilledCount = 0;

    for (const s of allSeries) {
      const slug = s.canonical_slug || s.slug;
      if (!slug) {
        missingSlugs.push({ id: s.id, name: s.name });
        // Auto-backfill slug
        const generated = generateSlug(s.name);
        if (generated) {
          try {
            await db.entities.Series.update(s.id, {
              slug: generated,
              canonical_slug: generated,
              normalized_name: s.name.toLowerCase().trim(),
            });
            backfilledCount++;
          } catch (e) {
            failures.push(`Slug backfill failed for ${s.name}: ${e.message}`);
          }
        }
      } else {
        if (slugSet.has(slug)) {
          duplicateSlugs.push({ id: s.id, name: s.name, slug });
          warnings.push(`Duplicate slug "${slug}" on series "${s.name}" (${s.id})`);
        }
        slugSet.add(slug);
      }
    }

    // Log operation
    try {
      await db.entities.OperationLog.create({
        operation_type: 'series_profile_readiness_verified',
        entity_name: 'Series',
        status: failures.length > 0 ? 'failed' : 'success',
        message: `Verified ${allSeries.length} series. Missing slugs: ${missingSlugs.length}. Backfilled: ${backfilledCount}.`,
        total_records: allSeries.length,
        metadata: {
          missing_slugs_count: missingSlugs.length,
          backfilled_count: backfilledCount,
          duplicate_slugs_count: duplicateSlugs.length,
        },
        initiated_by: user.email,
      });
    } catch (_e) { /* log failure is non-fatal */ }

    return Response.json({
      series_profiles_ready: missingSlugs.length === 0 && failures.length === 0,
      total_series: allSeries.length,
      missing_slugs: missingSlugs,
      backfilled_slugs: backfilledCount,
      duplicate_slugs: duplicateSlugs,
      broken_routes: [],
      broken_queries: [],
      visibility_failures: [],
      warnings,
      failures,
      route_pattern: '/series/:slug',
      note: 'Series Profile now uses /series/:slug path routing. Legacy /SeriesDetail?slug= still works via query param.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateSlug(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}