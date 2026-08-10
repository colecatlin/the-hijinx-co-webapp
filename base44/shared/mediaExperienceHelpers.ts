// ─────────────────────────────────────────────────────────────────────────────
// Phase 16: Media Experience Helpers
// Shared read-only utilities for resolving media items, publishers, authors,
// and entity media aggregation across the Media Platform.
// ─────────────────────────────────────────────────────────────────────────────

export interface MediaResolution {
  media_type: 'article' | 'photo' | 'video' | 'audio' | 'document' | 'graphic' | 'gallery';
  id: string;
  slug?: string;
  title?: string;
  description?: string;
  subtitle?: string;
  body?: string;
  cover_image?: string;
  thumbnail_url?: string;
  hero_image?: string;
  file_url?: string;
  asset_type?: string;
  mime_type?: string;
  file_size?: number;
  duration?: string;
  dimensions?: string;
  resolution?: string;
  tags?: string[];
  categories?: string[];
  status?: string;
  published_date?: string;
  captured_date?: string;
  author?: {
    name?: string;
    title?: string;
    user_id?: string;
    media_profile_id?: string;
    profile_url?: string;
    profile_image_url?: string;
  };
  publisher?: {
    type: 'outlet' | 'creator' | 'platform';
    id?: string;
    name?: string;
    slug?: string;
    logo_url?: string;
    profile_url?: string;
    outlet_type?: string;
  };
  related_entities?: Array<{
    entity_type: string;
    entity_id: string;
    entity_name?: string;
    profile_url?: string;
  }>;
  gallery_items?: Array<{
    id: string;
    title?: string;
    thumbnail_url?: string;
    file_url?: string;
    asset_type?: string;
  }>;
  external_links?: Array<{
    label: string;
    url: string;
  }>;
  downloads?: number;
  views?: number;
  featured?: boolean;
  visibility: 'public' | 'private' | 'draft';
}

// ── Resolve a single media item by type + slug or id ─────────────────────────
export async function resolveMediaItem(context: any, media_type: string, slug?: string, id?: string): Promise<any | null> {
  if (media_type === 'article' || media_type === 'story') {
    return await resolveArticle(context, slug, id);
  }
  return await resolveAsset(context, slug, id);
}

// ── Resolve OutletStory (article) ─────────────────────────────────────────────
export async function resolveArticle(context: any, slug?: string, id?: string): Promise<any | null> {
  const { entities } = context;
  let story: any = null;

  if (slug) {
    const results = await entities.OutletStory.filter({ slug });
    story = results?.[0] || null;
  }
  if (!story && id) {
    try {
      story = await entities.OutletStory.get(id);
    } catch {
      const results = await entities.OutletStory.filter({ id });
      story = results?.[0] || null;
    }
  }

  if (!story) return null;
  if (story.status !== 'published') return null;
  return story;
}

// ── Resolve MediaAsset (photo/video/audio/doc/graphic) ────────────────────────
export async function resolveAsset(context: any, slug?: string, id?: string): Promise<any | null> {
  const { entities } = context;
  let asset: any = null;

  if (id) {
    try {
      asset = await entities.MediaAsset.get(id);
    } catch {
      const results = await entities.MediaAsset.filter({ id });
      asset = results?.[0] || null;
    }
  }

  if (!asset) return null;

  // Public visibility check
  if (!isAssetPublic(asset)) return null;

  return asset;
}

// ── Asset public visibility check ─────────────────────────────────────────────
export function isAssetPublic(asset: any): boolean {
  if (!asset) return false;
  if (asset.status === 'archived' || asset.status === 'rejected') return false;
  if (!asset.public_access) return false;
  if (asset.visibility_scope !== 'public') return false;
  if (asset.rights_status === 'revoked') return false;
  return true;
}

// ── Resolve publisher for a story or asset ───────────────────────────────────
export async function resolvePublisher(context: any, item: any): Promise<any> {
  const { entities } = context;

  // Outlet publisher
  if (item.author_outlet_id || item.owner_outlet_id) {
    const outletId = item.author_outlet_id || item.owner_outlet_id;
    try {
      const outlet = await entities.MediaOutlet.get(outletId);
      if (outlet && isOutletPublic(outlet)) {
        return {
          type: 'outlet',
          id: outlet.id,
          name: outlet.name,
          slug: outlet.slug,
          logo_url: outlet.logo_url,
          profile_url: outlet.slug ? `/media-outlets/${outlet.slug}` : null,
          outlet_type: outlet.outlet_type,
        };
      }
    } catch {}
  }

  // Creator publisher
  if (item.author_media_profile_id || item.owner_profile_id) {
    const profileId = item.author_media_profile_id || item.owner_profile_id;
    try {
      const profile = await entities.MediaProfile.get(profileId);
      if (profile && isProfilePublic(profile)) {
        return {
          type: 'creator',
          id: profile.id,
          name: profile.display_name,
          slug: profile.slug,
          logo_url: profile.profile_image_url,
          profile_url: profile.slug ? `/creators/${profile.slug}` : null,
        };
      }
    } catch {}
  }

  // Fallback: platform
  return {
    type: 'platform',
    name: 'HIJINX',
    profile_url: '/Home',
  };
}

// ── Resolve author for a story ────────────────────────────────────────────────
export async function resolveAuthor(context: any, story: any): Promise<any> {
  const { entities } = context;

  // Linked MediaProfile
  if (story.author_media_profile_id) {
    try {
      const profile = await entities.MediaProfile.get(story.author_media_profile_id);
      if (profile) {
        return {
          name: profile.display_name || story.author,
          title: profile.primary_role,
          user_id: profile.user_id,
          media_profile_id: profile.id,
          profile_url: profile.slug ? `/creators/${profile.slug}` : null,
          profile_image_url: profile.profile_image_url,
        };
      }
    } catch {}
  }

  // Fallback to story fields
  return {
    name: story.author || 'HIJINX Staff',
    title: story.author_title,
  };
}

// ── Profile/outlet public checks ──────────────────────────────────────────────
export function isProfilePublic(profile: any): boolean {
  if (!profile) return false;
  if (profile.profile_status === 'hidden') return false;
  if (!profile.public_visible) return false;
  return true;
}

export function isOutletPublic(outlet: any): boolean {
  if (!outlet) return false;
  if (outlet.outlet_status === 'hidden') return false;
  if (!outlet.public_visible) return false;
  return true;
}

// ── Resolve related entities for a story ─────────────────────────────────────
export async function resolveStoryRelatedEntities(context: any, story: any): Promise<any[]> {
  const { entities } = context;
  const related: any[] = [];

  if (story.driver_id) {
    try {
      const driver = await entities.Driver.get(story.driver_id);
      if (driver) related.push({ entity_type: 'driver', entity_id: driver.id, entity_name: `${driver.first_name} ${driver.last_name}`, profile_url: driver.slug ? `/racers/${driver.slug}` : null });
    } catch {}
  }

  if (story.event_id) {
    try {
      const event = await entities.Event.get(story.event_id);
      if (event) related.push({ entity_type: 'event', entity_id: event.id, entity_name: event.name, profile_url: event.slug ? `/events/${event.slug}` : null });
    } catch {}
  }

  // Tag-based entity matching
  if (story.tags?.length > 0) {
    const tagSet = new Set(story.tags.map((t: string) => t.toLowerCase()));

    // Match series by name in tags
    try {
      const allSeries = await entities.Series.list('-created_date', 200);
      for (const s of allSeries) {
        if (s.visibility_status !== 'live' || s.is_archived) continue;
        if (tagSet.has(s.name?.toLowerCase()) || tagSet.has(s.slug)) {
          related.push({ entity_type: 'series', entity_id: s.id, entity_name: s.name, profile_url: s.slug ? `/series/${s.slug}` : null });
          break;
        }
      }
    } catch {}

    // Match tracks by name in tags
    try {
      const allTracks = await entities.Track.list('-created_date', 200);
      for (const t of allTracks) {
        if (t.visibility_status !== 'live' || t.is_archived) continue;
        if (tagSet.has(t.name?.toLowerCase()) || tagSet.has(t.slug)) {
          related.push({ entity_type: 'track', entity_id: t.id, entity_name: t.name, profile_url: t.slug ? `/tracks/${t.slug}` : null });
          break;
        }
      }
    } catch {}
  }

  return related;
}

// ── Resolve related entities for an asset (via AssetLink) ─────────────────────
export async function resolveAssetRelatedEntities(context: any, asset: any): Promise<any[]> {
  const { entities } = context;
  const related: any[] = [];

  // Direct event link
  if (asset.captured_at_event_id) {
    try {
      const event = await entities.Event.get(asset.captured_at_event_id);
      if (event) related.push({ entity_type: 'event', entity_id: event.id, entity_name: event.name, profile_url: event.slug ? `/events/${event.slug}` : null });
    } catch {}
  }

  // AssetLink references
  try {
    const links = await entities.AssetLink.filter({ asset_id: asset.id });
    for (const link of links) {
      const entityName = await resolveEntityName(context, link.subject_type, link.subject_id);
      if (entityName) {
        related.push({
          entity_type: link.subject_type,
          entity_id: link.subject_id,
          entity_name: entityName.name,
          profile_url: entityName.url,
        });
      }
    }
  } catch {}

  return related;
}

// ── Resolve entity name + URL by type ────────────────────────────────────────
export async function resolveEntityName(context: any, entityType: string, entityId: string): Promise<{ name: string; url: string } | null> {
  const { entities } = context;
  try {
    switch (entityType) {
      case 'driver': {
        const d = await entities.Driver.get(entityId);
        return { name: `${d.first_name} ${d.last_name}`, url: d.slug ? `/racers/${d.slug}` : null };
      }
      case 'team': {
        const t = await entities.Team.get(entityId);
        return { name: t.name, url: t.slug ? `/TeamProfile?id=${t.id}` : null };
      }
      case 'track': {
        const t = await entities.Track.get(entityId);
        return { name: t.name, url: t.slug ? `/tracks/${t.slug}` : null };
      }
      case 'series': {
        const s = await entities.Series.get(entityId);
        return { name: s.name, url: s.slug ? `/series/${s.slug}` : null };
      }
      case 'event': {
        const e = await entities.Event.get(entityId);
        return { name: e.name, url: e.slug ? `/events/${e.slug}` : null };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ── Build gallery items from an asset's associated assets ────────────────────
export async function resolveGalleryItems(context: any, asset: any): Promise<any[]> {
  const { entities } = context;

  // If the asset was captured at an event, find sibling assets from the same event
  if (asset.captured_at_event_id) {
    try {
      const eventAssets = await entities.MediaAsset.filter({ captured_at_event_id: asset.captured_at_event_id });
      return eventAssets
        .filter((a: any) => a.id !== asset.id && isAssetPublic(a))
        .slice(0, 20)
        .map((a: any) => ({
          id: a.id,
          title: a.title || a.file_name,
          thumbnail_url: a.thumbnail_url || a.file_url,
          file_url: a.file_url,
          asset_type: a.asset_type,
        }));
    } catch {}
  }

  return [];
}

// ── Build SEO + structured data for a media item ──────────────────────────────
export function buildMediaSeo(mediaType: string, item: any, publisher: any, author: any, canonicalUrl: string): any {
  const title = item.title || item.file_name || 'Media';
  const description = item.subtitle || item.description || item.bio || '';
  const image = item.cover_image || item.thumbnail_url || item.hero_image_url || item.file_url || null;

  const base: any = {
    title: `${title} — HIJINX Media`,
    description: description.slice(0, 160) || `${title} on HIJINX.`,
    image,
    canonical_url: canonicalUrl,
    open_graph: {
      type: mediaType === 'article' ? 'article' : mediaType === 'video' ? 'video.other' : 'website',
      title,
      description: description.slice(0, 160),
      image,
      url: canonicalUrl,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description: description.slice(0, 160),
      image,
    },
  };

  // Schema.org structured data
  if (mediaType === 'article') {
    base.structured_data = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: title,
      description: description.slice(0, 160),
      image: image ? [image] : undefined,
      datePublished: item.published_date,
      author: author?.name ? { '@type': 'Person', name: author.name } : undefined,
      publisher: publisher?.name ? {
        '@type': publisher.type === 'outlet' ? 'Organization' : 'Person',
        name: publisher.name,
        logo: publisher.logo_url ? { '@type': 'ImageObject', url: publisher.logo_url } : undefined,
      } : { '@type': 'Organization', name: 'HIJINX' },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    };
  } else if (mediaType === 'video') {
    base.structured_data = {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: title,
      description: description.slice(0, 160),
      thumbnailUrl: image,
      uploadDate: item.captured_date || item.created_at,
      contentUrl: item.file_url,
    };
  } else if (mediaType === 'photo') {
    base.structured_data = {
      '@context': 'https://schema.org',
      '@type': 'ImageObject',
      name: title,
      description: description.slice(0, 160),
      contentUrl: item.file_url,
      thumbnailUrl: item.thumbnail_url,
      uploadDate: item.captured_date || item.created_at,
    };
  } else if (mediaType === 'audio') {
    base.structured_data = {
      '@context': 'https://schema.org',
      '@type': 'PodcastEpisode',
      name: title,
      description: description.slice(0, 160),
      uploadDate: item.captured_date || item.created_at,
      associatedMedia: item.file_url ? { '@type': 'MediaObject', contentUrl: item.file_url } : undefined,
    };
  } else {
    base.structured_data = {
      '@context': 'https://schema.org',
      '@type': 'MediaObject',
      name: title,
      description: description.slice(0, 160),
      contentUrl: item.file_url,
      uploadDate: item.captured_date || item.created_at,
    };
  }

  return base;
}

// ── Entity Media Aggregation ─────────────────────────────────────────────────
// Given an entity type + ID, fetch all public media (articles + assets + galleries)
export async function aggregateEntityMedia(context: any, entityType: string, entityId: string, entityName?: string): Promise<any> {
  const { entities } = context;

  // 1. OutletStories linked directly
  let stories: any[] = [];
  try {
    if (entityType === 'driver' || entityType === 'racer') {
      stories = await entities.OutletStory.filter({ driver_id: entityId, status: 'published' }, '-published_date', 50);
    } else if (entityType === 'event') {
      stories = await entities.OutletStory.filter({ event_id: entityId, status: 'published' }, '-published_date', 50);
    }
  } catch {}

  // 2. OutletStories matching by tags (name-based)
  if (entityName && stories.length < 10) {
    try {
      const allPublished = await entities.OutletStory.filter({ status: 'published' }, '-published_date', 200);
      const nameLower = entityName.toLowerCase();
      const tagMatches = allPublished.filter((s: any) =>
        s.id !== entityId &&
        !stories.find((ex: any) => ex.id === s.id) &&
        (s.tags?.some((t: string) => t.toLowerCase().includes(nameLower)) ||
         s.title?.toLowerCase().includes(nameLower))
      ).slice(0, 10);
      stories = [...stories, ...tagMatches];
    } catch {}
  }

  // 3. MediaAssets via AssetLink
  let linkedAssets: any[] = [];
  try {
    const links = await entities.AssetLink.filter({ subject_type: entityType === 'racer' ? 'driver' : entityType, subject_id: entityId });
    const assetIds = [...new Set(links.map((l: any) => l.asset_id).filter(Boolean))];
    if (assetIds.length > 0) {
      const allAssets = await entities.MediaAsset.list();
      linkedAssets = allAssets.filter((a: any) => assetIds.includes(a.id) && isAssetPublic(a));
    }
  } catch {}

  // 4. MediaAssets via PublishTarget
  try {
    const targetTypes = entityType === 'driver' || entityType === 'racer' ? ['driver_gallery'] :
      entityType === 'team' ? ['team_gallery'] :
      entityType === 'track' ? ['track_gallery'] :
      entityType === 'event' ? ['event_recap'] :
      entityType === 'series' ? ['series_feed'] : [];

    for (const tt of targetTypes) {
      const pts = await entities.PublishTarget.filter({ target_type: tt, target_entity_id: entityId, status: 'published' });
      const assetIds = [...new Set(pts.map((p: any) => p.asset_id).filter(Boolean))];
      if (assetIds.length > 0) {
        const allAssets = await entities.MediaAsset.list();
        const ptAssets = allAssets.filter((a: any) => assetIds.includes(a.id) && isAssetPublic(a) && !linkedAssets.find((la: any) => la.id === a.id));
        linkedAssets = [...linkedAssets, ...ptAssets];
      }
    }
  } catch {}

  // 5. MediaAssets captured at this event
  if (entityType === 'event') {
    try {
      const eventAssets = await entities.MediaAsset.filter({ captured_at_event_id: entityId });
      const publicEventAssets = eventAssets.filter((a: any) => isAssetPublic(a) && !linkedAssets.find((la: any) => la.id === a.id));
      linkedAssets = [...linkedAssets, ...publicEventAssets];
    } catch {}
  }

  // Categorize assets
  const photos = linkedAssets.filter((a: any) => a.asset_type === 'photo');
  const videos = linkedAssets.filter((a: any) => a.asset_type === 'video');
  const audio = linkedAssets.filter((a: any) => a.asset_type === 'audio');
  const documents = linkedAssets.filter((a: any) => a.asset_type === 'document');
  const graphics = linkedAssets.filter((a: any) => a.asset_type === 'graphic');

  // Sort by date
  const sortByDate = (arr: any[]) => arr.sort((a: any, b: any) =>
    new Date(b.captured_date || b.published_date || b.created_date || 0).getTime() -
    new Date(a.captured_date || a.published_date || a.created_date || 0).getTime()
  );

  const sortedStories = stories.sort((a: any, b: any) =>
    new Date(b.published_date || 0).getTime() - new Date(a.published_date || 0).getTime()
  );

  return {
    articles: sortByDate([...sortedStories].map((s: any) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      subtitle: s.subtitle,
      cover_image: s.cover_image,
      author: s.author,
      published_date: s.published_date,
      primary_category: s.primary_category,
      sub_category: s.sub_category,
      tags: s.tags,
      profile_url: s.slug ? `/story/${s.slug}` : `/OutletStoryPage?id=${s.id}`,
      media_type: 'article',
    }))),
    photos: sortByDate(photos.map((a: any) => ({
      id: a.id,
      title: a.title || a.file_name,
      description: a.description,
      thumbnail_url: a.thumbnail_url || a.file_url,
      file_url: a.file_url,
      captured_date: a.captured_date,
      tags: a.tags,
      profile_url: `/media/${a.id}`,
      media_type: 'photo',
    }))),
    videos: sortByDate(videos.map((a: any) => ({
      id: a.id,
      title: a.title || a.file_name,
      description: a.description,
      thumbnail_url: a.thumbnail_url,
      file_url: a.file_url,
      captured_date: a.captured_date,
      tags: a.tags,
      profile_url: `/media/${a.id}`,
      media_type: 'video',
    }))),
    podcasts: sortByDate(audio.map((a: any) => ({
      id: a.id,
      title: a.title || a.file_name,
      description: a.description,
      file_url: a.file_url,
      captured_date: a.captured_date,
      tags: a.tags,
      profile_url: `/media/${a.id}`,
      media_type: 'audio',
    }))),
    documents: sortByDate(documents.map((a: any) => ({
      id: a.id,
      title: a.title || a.file_name,
      description: a.description,
      file_url: a.file_url,
      captured_date: a.captured_date,
      tags: a.tags,
      profile_url: `/media/${a.id}`,
      media_type: 'document',
    }))),
    graphics: sortByDate(graphics.map((a: any) => ({
      id: a.id,
      title: a.title || a.file_name,
      description: a.description,
      thumbnail_url: a.thumbnail_url || a.file_url,
      file_url: a.file_url,
      captured_date: a.captured_date,
      tags: a.tags,
      profile_url: `/media/${a.id}`,
      media_type: 'graphic',
    }))),
    all_assets: sortByDate(linkedAssets),
    featured: [
      ...sortedStories.filter((s: any) => s.featured).slice(0, 3),
      ...linkedAssets.filter((a: any) => a.featured_on_creator_profile || a.featured_on_media_home || a.featured_on_outlet_profile).slice(0, 3),
    ],
    statistics: {
      total_articles: stories.length,
      total_photos: photos.length,
      total_videos: videos.length,
      total_podcasts: audio.length,
      total_documents: documents.length,
      total_graphics: graphics.length,
      total_media: stories.length + linkedAssets.length,
    },
  };
}