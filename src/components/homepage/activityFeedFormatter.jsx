/**
 * activityFeedFormatter
 * Normalizes raw ActivityFeed records into a consistent shape for homepage components.
 */

import { createPageUrl } from '@/components/utils';
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

const ENTITY_ROUTES = {
  driver:  (id) => `${createPageUrl('DriverProfile')}?id=${id}`,
  track:   (id) => `${createPageUrl('TrackProfile')}?id=${id}`,
  series:  (id) => `${createPageUrl('SeriesDetail')}?id=${id}`,
  event:   (id) => `${createPageUrl('EventProfile')}?id=${id}`,
  story:   (id) => `${createPageUrl('OutletStoryPage')}?id=${id}`,
  results: (id) => `${createPageUrl('EventResults')}?id=${id}`,
};

function resolveHref(item) {
  if (item.related_event_id)  return `${createPageUrl('EventProfile')}?id=${item.related_event_id}`;
  if (item.related_driver_id) return `${createPageUrl('DriverProfile')}?id=${item.related_driver_id}`;
  if (item.related_series_id) return `${createPageUrl('SeriesDetail')}?id=${item.related_series_id}`;
  if (item.entity_type && item.entity_id && ENTITY_ROUTES[item.entity_type]) {
    return ENTITY_ROUTES[item.entity_type](item.entity_id);
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