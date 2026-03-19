/**
 * activityFeedFormatter
 * Normalizes raw ActivityFeed records into a consistent shape for homepage components.
 */

import { createPageUrl } from '@/components/utils';
import { buildProfileUrl } from '@/components/utils/routingContract';
import { formatDistanceToNow } from 'date-fns';

const BADGE_LABELS = {
  driver_registration: 'Registration',
  driver_registered:   'Registration',
  story_published:     'Story',
  media_uploaded:      'Media',
  results_posted:      'Results',
  event_created:       'Event',
  track_added:         'Track',
  series_updated:      'Series',
};

// For activity feed items, we only have IDs (not slugs), so we use ?id= fallbacks
// except for drivers which use /drivers/:id as a fallback via the canonical route
const ENTITY_ROUTES = {
  driver:  (id, slug) => slug ? `/drivers/${encodeURIComponent(slug)}` : `/DriverProfile?id=${id}`,
  track:   (id, slug) => slug ? buildProfileUrl('Track', slug) : `/TrackProfile?id=${id}`,
  series:  (id, slug) => slug ? buildProfileUrl('Series', slug) : `/SeriesDetail?id=${id}`,
  event:   (id) => `/EventProfile?id=${id}`,
  story:   (id, slug) => slug ? `/story/${slug}` : `/OutletStoryPage?id=${id}`,
  results: (id) => `${createPageUrl('EventResults')}?id=${id}`,
};

function resolveHref(item) {
  if (item.related_event_id)  return `/EventProfile?id=${item.related_event_id}`;
  if (item.related_driver_id) {
    const slug = item.related_driver_slug || item.entity_slug;
    return slug ? `/drivers/${encodeURIComponent(slug)}` : `/DriverProfile?id=${item.related_driver_id}`;
  }
  if (item.related_series_id) {
    const slug = item.related_series_slug || item.entity_slug;
    return slug ? buildProfileUrl('Series', slug) : `/SeriesDetail?id=${item.related_series_id}`;
  }
  if (item.entity_type && item.entity_id && ENTITY_ROUTES[item.entity_type]) {
    return ENTITY_ROUTES[item.entity_type](item.entity_id, item.entity_slug);
  }
  return null;
}

function resolveTimestamp(created_at) {
  if (!created_at) return null;
  try {
    return formatDistanceToNow(new Date(created_at), { addSuffix: true });
  } catch (_) {
    return null;
  }
}

export function formatActivityFeedItem(item) {
  if (!item) return null;
  return {
    id:               item.id,
    title:            item.title || 'Platform update',
    description:      item.description || null,
    thumbnail:        item.thumbnail || null,
    timestamp:        resolveTimestamp(item.created_at),
    raw_timestamp:    item.created_at || null,
    entity_type:      item.entity_type || null,
    entity_id:        item.entity_id || null,
    related_driver_id: item.related_driver_id || null,
    related_event_id:  item.related_event_id  || null,
    related_series_id: item.related_series_id || null,
    activity_type:    item.activity_type || null,
    href:             resolveHref(item),
    badge_label:      BADGE_LABELS[item.activity_type] || 'Update',
  };
}

export function formatActivityFeedItems(items = []) {
  return (items || []).map(formatActivityFeedItem).filter(Boolean);
}