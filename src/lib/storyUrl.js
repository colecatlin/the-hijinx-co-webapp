/**
 * storyUrl.js
 * Centralized story URL helper — single source of truth for public story link generation.
 *
 * Usage:
 *   import { getOutletStoryUrl } from '@/lib/storyUrl';
 *   <Link to={getOutletStoryUrl(story)}>...</Link>
 */

/**
 * getOutletStoryUrl(story)
 * Returns the canonical public URL for an OutletStory.
 * - Slug-based route is canonical: /story/:slug
 * - Falls back to legacy id route if slug is missing (transitional only)
 */
export function getOutletStoryUrl(story) {
  if (!story) return '/OutletHome';
  if (story.slug) return `/story/${story.slug}`;
  // Legacy fallback for records that haven't been backfilled yet
  return `/OutletStoryPage?id=${story.id}`;
}