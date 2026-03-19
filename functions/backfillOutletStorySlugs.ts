import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * backfillOutletStorySlugs
 *
 * Admin-only. Read-safe backfill for OutletStory.slug.
 * - Generates slug from title if missing
 * - Resolves duplicates safely by appending -2, -3, etc.
 * - Never overwrites existing valid slugs
 * - Supports dry_run mode (default: true)
 *
 * Input:  { dry_run?: boolean }
 * Output: { stories_checked, missing_slugs, duplicates_found, stories_backfilled, warnings, errors }
 */

// ── Unified slug utilities (inlined per platform constraints) ──
function generateEntitySlug(text) {
  if (!text) return '';
  return text.trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dry_run = body.dry_run !== false; // default true — safe

    const allStories = await base44.asServiceRole.entities.OutletStory.list('-created_date', 2000);

    const stats = {
      stories_checked: allStories.length,
      missing_slugs: 0,
      duplicates_found: 0,
      stories_backfilled: 0,
      warnings: [],
      errors: [],
    };

    // Build a map of all existing slugs → id for collision detection
    const existingSlugMap = {};
    for (const s of allStories) {
      if (s.slug) {
        if (!existingSlugMap[s.slug]) existingSlugMap[s.slug] = [];
        existingSlugMap[s.slug].push(s.id);
      }
    }

    // Find duplicates
    for (const [slug, ids] of Object.entries(existingSlugMap)) {
      if (ids.length > 1) {
        stats.duplicates_found++;
        stats.warnings.push(`Duplicate slug "${slug}" found on ${ids.length} stories: ${ids.join(', ')}`);
      }
    }

    // Backfill missing slugs
    // Track slugs we're assigning in this run to avoid collisions between stories being processed
    const claimedSlugs = new Set(Object.keys(existingSlugMap));

    for (const story of allStories) {
      if (story.slug) continue; // already has a slug — skip

      stats.missing_slugs++;

      if (!story.title) {
        stats.warnings.push(`Story id=${story.id} has no title — cannot generate slug, skipped`);
        continue;
      }

      // Generate base slug from title
      let base = generateEntitySlug(story.title) || 'story';
      let candidate = base;
      let counter = 1;

      // Find a unique candidate not already in use
      while (claimedSlugs.has(candidate)) {
        counter++;
        candidate = `${base}-${counter}`;
      }

      claimedSlugs.add(candidate);

      if (!dry_run) {
        const updateResult = await base44.asServiceRole.entities.OutletStory
          .update(story.id, { slug: candidate })
          .catch(e => { stats.errors.push(`Failed to update story id=${story.id}: ${e.message}`); return null; });

        if (updateResult !== null) {
          stats.stories_backfilled++;

          await base44.asServiceRole.entities.OperationLog.create({
            operation_type: 'outlet_story_slug_backfilled',
            entity_type: 'OutletStory',
            entity_id: story.id,
            user_email: user.email,
            status: 'success',
            message: `Slug "${candidate}" backfilled for OutletStory "${story.title}"`,
            metadata: {
              outlet_story_id: story.id,
              previous_slug: null,
              new_slug: candidate,
              acted_by_user_id: user.id,
            },
          }).catch(() => {});
        }
      } else {
        // Dry run — just count what would happen
        stats.stories_backfilled++;
      }
    }

    if (!dry_run) {
      await base44.asServiceRole.entities.OperationLog.create({
        operation_type: 'outlet_story_route_audit_run',
        entity_type: 'OutletStory',
        user_email: user.email,
        status: 'success',
        message: `OutletStory slug backfill completed. ${stats.stories_backfilled} stories updated.`,
        metadata: { ...stats, dry_run },
      }).catch(() => {});
    }

    return Response.json({ success: true, dry_run, ...stats });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});