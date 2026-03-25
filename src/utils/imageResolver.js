/**
 * getBestImage(entity, type, context)
 *
 * Returns the most contextually relevant image URL for a given entity.
 *
 * @param {object} entity  - The entity object (driver, event, track, story, media, feed item)
 * @param {string} type    - 'driver' | 'event' | 'track' | 'story' | 'media' | 'feed'
 * @param {string} context - 'hero' | 'grid' | 'feed' | 'spotlight' (optional, affects priority)
 */

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
      // Hero context: prefer full cinematic image
      if (context === 'hero' || context === 'spotlight') {
        return entity.hero_image_url
          || entity.profile_image_url
          || entity.thumbnail_url
          || getFallback('driver');
      }
      // Grid / feed: profile image is cleaner
      return entity.profile_image_url
        || entity.hero_image_url
        || entity.thumbnail_url
        || getFallback('driver');
    }

    case 'event': {
      return entity.banner_url
        || entity.hero_image_url
        || entity.cover_image
        || entity.track_image
        || entity.image_url
        || getFallback('event');
    }

    case 'track': {
      return entity.hero_image_url
        || entity.cover_image
        || entity.aerial_image_url
        || entity.image_url
        || getFallback('track');
    }

    case 'story': {
      return entity.cover_image
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
      // Feed items have varied shapes — try all common fields
      return entity.image_url
        || entity.driver_image
        || entity.cover_image
        || entity.thumbnail_url
        || entity.profile_image_url
        || entity.hero_image_url
        || getFallback('feed');
    }

    default:
      return entity.image_url || entity.cover_image || getFallback('event');
  }
}