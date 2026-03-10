/**
 * homepageDataService
 *
 * Thin frontend wrapper around the getHomepageData backend function.
 * Called via a single React Query in pages/Home.jsx.
 *
 * The canonical React Query cache key for this function is:
 *   QueryKeys.homepageData()  →  ['homepageData']
 *
 * Returns:
 *   { ok: true,  data: HomepageData }
 *   { ok: false, error: string, data: FALLBACK_DATA }
 */

import { base44 } from '@/api/base44Client';
import { homepageFallbackData } from '@/components/data/fallbackContracts';

/** Stable query key for the homepage data fetch. */
export const HOMEPAGE_QUERY_KEY = ['homepageData'];

/** @deprecated use homepageFallbackData from fallbackContracts instead */
export const FALLBACK_DATA = homepageFallbackData;

export async function getHomepageData() {
  const response = await base44.functions.invoke('getHomepageData', {});
  const payload = response?.data;

  if (!payload || payload.error) {
    return { ok: false, error: payload?.error || 'No data returned', data: homepageFallbackData };
  }

  return {
    ok: true,
    data: {
      featured_story:    payload.featured_story    ?? null,
      featured_stories:  Array.isArray(payload.featured_stories)  ? payload.featured_stories  : [],
      featured_drivers:  Array.isArray(payload.featured_drivers)  ? payload.featured_drivers  : [],
      featured_tracks:   Array.isArray(payload.featured_tracks)   ? payload.featured_tracks   : [],
      featured_series:   Array.isArray(payload.featured_series)   ? payload.featured_series   : [],
      upcoming_events:   Array.isArray(payload.upcoming_events)   ? payload.upcoming_events   : [],
      recent_results:    Array.isArray(payload.recent_results)    ? payload.recent_results    : [],
      activity_feed:     Array.isArray(payload.activity_feed)     ? payload.activity_feed     : [],
      featured_media:    Array.isArray(payload.featured_media)    ? payload.featured_media    : [],
      featured_products: Array.isArray(payload.featured_products) ? payload.featured_products : [],
      ticker_items:      Array.isArray(payload.ticker_items) && payload.ticker_items.length ? payload.ticker_items : null,
      spotlight_driver:  payload.spotlight_driver  ?? null,
      spotlight_event:   payload.spotlight_event   ?? null,
      hero_stats:        payload.hero_stats         ?? null,
    },
  };
}