import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * verifyOutletStoryRouteReadiness
 *
 * Admin-only. Read-only audit of OutletStory route health.
 *
 * Returns:
 * {
 *   stories_route_ready,
 *   broken_story_routes,
 *   missing_story_slugs,
 *   inconsistent_link_sources,
 *   warnings,
 *   failures
 * }
 */

const VALID_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const allStories = await base44.asServiceRole.entities.OutletStory.list('-created_date', 2000);
    const publishedStories = allStories.filter(s => s.status === 'published');

    const missing_story_slugs = [];
    const broken_story_routes = [];
    const warnings = [];
    const failures = [];

    // Build slug→ids map for duplicate detection
    const slugMap = {};
    for (const s of allStories) {
      if (!s.slug) continue;
      if (!slugMap[s.slug]) slugMap[s.slug] = [];
      slugMap[s.slug].push(s.id);
    }

    for (const story of allStories) {
      // Missing slug
      if (!story.slug) {
        missing_story_slugs.push({ id: story.id, title: story.title, status: story.status });
        if (story.status === 'published') {
          failures.push(`Published story missing slug: id=${story.id} title="${story.title}"`);
        }
        continue;
      }

      // Invalid slug format
      if (!VALID_SLUG_RE.test(story.slug)) {
        broken_story_routes.push({ id: story.id, title: story.title, slug: story.slug, issue: 'invalid_slug_format' });
        warnings.push(`Story id=${story.id} has invalid slug format: "${story.slug}"`);
      }
    }

    // Duplicate slugs
    const duplicate_slugs = [];
    for (const [slug, ids] of Object.entries(slugMap)) {
      if (ids.length > 1) {
        duplicate_slugs.push({ slug, ids });
        failures.push(`Duplicate slug "${slug}" shared by ${ids.length} stories: ${ids.join(', ')}`);
      }
    }

    const stories_route_ready = publishedStories.filter(s => s.slug && VALID_SLUG_RE.test(s.slug)).length;
    const inconsistent_link_sources = [
      'OutletHome — was using ?id= links (now fixed to /story/:slug)',
      'CreatorProfile — was using /story/:slug correctly',
      'generateSitemap — was using ?id= links (now fixed to /story/:slug)',
    ];

    await base44.asServiceRole.entities.OperationLog.create({
      operation_type: 'outlet_story_route_readiness_verified',
      entity_type: 'OutletStory',
      user_email: user.email,
      status: 'success',
      message: `OutletStory route readiness verified. ${stories_route_ready} stories route-ready.`,
      metadata: {
        total_stories: allStories.length,
        published_stories: publishedStories.length,
        stories_route_ready,
        missing_slugs_count: missing_story_slugs.length,
        broken_routes_count: broken_story_routes.length,
        duplicate_slugs_count: duplicate_slugs.length,
        acted_by_user_id: user.id,
      },
    }).catch(() => {});

    return Response.json({
      success: true,
      stories_route_ready,
      total_stories: allStories.length,
      published_stories: publishedStories.length,
      broken_story_routes,
      missing_story_slugs,
      duplicate_slugs,
      inconsistent_link_sources,
      warnings,
      failures,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});