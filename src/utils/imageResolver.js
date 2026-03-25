/**
 * getBestImage(entity, type, context, taggedAssets?)
 *
 * Returns the most contextually relevant image URL for a given entity.
 *
 * @param {object} entity        - The entity object
 * @param {string} type          - 'driver' | 'event' | 'track' | 'series' | 'team' | 'story' | 'media' | 'feed'
 * @param {string} context       - 'hero' | 'grid' | 'feed' | 'spotlight'
 * @param {array}  taggedAssets  - Optional pre-fetched MediaAsset[] tagged to this entity
 */

/**
 * Pick the best image from a tagged MediaAsset array for a given context_type priority.
 * Priority: exact match on context_type → is_primary → first available
 */
export function getBestTaggedImage(assets = [], preferredContext = 'card') {
  if (!assets.length) return null;
  const byContext = assets.filter(a => a.context_type === preferredContext);
  const primary = byContext.find(a => a.is_primary) || byContext[0];
  if (primary) return primary.file_url || primary.thumbnail_url;
  // Fallback to action shots
  const action = assets.find(a => a.context_type === 'action');
  if (action) return action.file_url || action.thumbnail_url;
  // Any available
  return assets[0]?.file_url || assets[0]?.thumbnail_url || null;
}

// Legacy unsplash fallbacks — used only where EntityImage/EntityPlaceholderImage cannot be used (e.g. plain <img> in non-entity contexts)
const FALLBACKS = {
  driver:    null,
  event:     'https://images.unsplash.com/photo-1504707748692-419802cf939d?w=800&q=75',
  track:     'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=75',
  story:     'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=75',
  media:     null,
  feed:      null,
};

export function getFallback(type) {
  return FALLBACKS[type] || FALLBACKS.event;
}

export function getBestImage(entity, type = 'event', context = 'grid') {
  if (!entity) return getFallback(type);

  switch (type) {
    case 'driver': {
      if (context === 'hero' || context === 'spotlight') {
        return entity.hero_image_url
          || entity.card_image_url
          || entity.profile_image_url
          || entity.thumbnail_url
          || getFallback('driver');
      }
      return entity.card_image_url
        || entity.profile_image_url
        || entity.hero_image_url
        || entity.thumbnail_url
        || getFallback('driver');
    }

    case 'event': {
      return entity.card_image_url
        || entity.hero_image_url
        || entity.banner_url
        || entity.cover_image
        || entity.track_image
        || entity.image_url
        || getFallback('event');
    }

    case 'track': {
      return entity.card_image_url
        || entity.hero_image_url
        || entity.cover_image
        || entity.aerial_image_url
        || entity.image_url
        || getFallback('track');
    }

    case 'series': {
      return entity.card_image_url
        || entity.hero_image_url
        || entity.banner_url
        || entity.logo_url
        || getFallback('track');
    }

    case 'team': {
      return entity.card_image_url
        || entity.hero_image_url
        || entity.logo_url
        || getFallback('track');
    }

    case 'story': {
      return entity.card_image_url
        || entity.cover_image
        || entity.hero_image_url
        || entity.thumbnail_url
        || entity.image_url
        || getFallback('story');
    }

    case 'media': {
      return entity.thumbnail_url
        || entity.preview_url
        || entity.file_url
        || entity.image_url
        || getFallback('media');
    }

    case 'feed': {
      return entity.card_image_url
        || entity.image_url
        || entity.driver_image
        || entity.cover_image
        || entity.thumbnail_url
        || entity.profile_image_url
        || entity.hero_image_url
        || getFallback('feed');
    }

    default:
      return entity.card_image_url || entity.image_url || entity.cover_image || getFallback('event');
  }
}