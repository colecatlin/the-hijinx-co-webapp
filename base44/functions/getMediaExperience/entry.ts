/**
 * getMediaExperience
 * Phase 16 — Read-only function that computes the complete public media
 * experience for a single media item (article, photo, video, audio, document,
 * or graphic). Returns metadata, publisher, author, related entities,
 * gallery items, SEO, and Schema.org structured data.
 *
 * Read-only — never creates or modifies media state.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  resolveMediaItem,
  resolvePublisher,
  resolveAuthor,
  resolveStoryRelatedEntities,
  resolveAssetRelatedEntities,
  resolveGalleryItems,
  buildMediaSeo,
} from '../../shared/mediaExperienceHelpers.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { media_type, slug, id, allow_draft = false } = body;

    if (!media_type) {
      return Response.json({ error: 'media_type is required (article, photo, video, audio, document, graphic)' }, { status: 400 });
    }
    if (!slug && !id) {
      return Response.json({ error: 'slug or id is required' }, { status: 400 });
    }

    const context = { entities: base44.asServiceRole.entities };

    // Resolve the media item
    const item = await resolveMediaItem(context, media_type, slug, id);
    if (!item) {
      return Response.json({ error: 'Media item not found or not publicly visible', not_found: true }, { status: 404 });
    }

    // Determine canonical URL
    const canonicalSlug = item.slug || item.id;
    const canonicalUrl = `/media/${canonicalSlug}`;

    // Resolve publisher
    const publisher = await resolvePublisher(context, item);

    // Resolve author (articles only)
    const author = media_type === 'article' || media_type === 'story'
      ? await resolveAuthor(context, item)
      : null;

    // Resolve related entities
    const related_entities = media_type === 'article' || media_type === 'story'
      ? await resolveStoryRelatedEntities(context, item)
      : await resolveAssetRelatedEntities(context, item);

    // Resolve gallery items (for assets captured at events)
    const gallery_items = media_type !== 'article' && media_type !== 'story'
      ? await resolveGalleryItems(context, item)
      : [];

    // Build SEO + structured data
    const seo = buildMediaSeo(media_type, item, publisher, author, canonicalUrl);

    return Response.json({
      media_type,
      id: item.id,
      slug: item.slug || null,
      title: item.title || item.file_name || 'Untitled',
      description: item.subtitle || item.description || item.bio || '',
      body: item.body || null,
      subtitle: item.subtitle || null,
      cover_image: item.cover_image || item.thumbnail_url || item.hero_image_url || null,
      thumbnail_url: item.thumbnail_url || null,
      hero_image: item.cover_image || item.hero_image_url || item.thumbnail_url || null,
      file_url: item.file_url || item.drive_file_id || null,
      asset_type: item.asset_type || media_type,
      mime_type: item.mime_type || null,
      file_size: item.file_size || null,
      tags: item.tags || [],
      categories: item.primary_category ? [item.primary_category, item.sub_category].filter(Boolean) : [],
      status: item.status || null,
      published_date: item.published_date || item.captured_date || item.created_date || null,
      captured_date: item.captured_date || null,
      author,
      publisher,
      related_entities,
      gallery_items,
      external_links: [],
      downloads: 0,
      views: 0,
      featured: item.featured || item.featured_on_media_home || false,
      visibility: 'public',
      canonical_url: canonicalUrl,
      seo,
    });
  } catch (err) {
    console.error('[getMediaExperience] Error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
});