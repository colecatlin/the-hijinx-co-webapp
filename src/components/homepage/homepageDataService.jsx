/**
 * homepageDataService
 *
 * Thin frontend wrapper around the getHomepageData backend function.
 * Called via a single React Query in pages/Home.jsx.
 *
 * Returns:
 *   { ok: true,  data: HomepageData }
 *   { ok: false, error: string, data: fallbackEmptyData }
 */

import { base44 } from '@/api/base44Client';

export const FALLBACK_DATA = {
  featured_story:    null,
  featured_drivers:  [],
  featured_tracks:   [],
  featured_series:   [],
  upcoming_events:   [],
  recent_results:    [],
  activity_feed:     [],
  featured_media:    [],
  featured_products: [],
};

export async function getHomepageData() {
  const response = await base44.functions.invoke('getHomepageData', {});
  const payload = response?.data;

  if (!payload || payload.error) {
    return { ok: false, error: payload?.error || 'No data returned', data: FALLBACK_DATA };
  }

  return {
    ok: true,
    data: {
      featured_story:    payload.featured_story    ?? null,
      featured_drivers:  payload.featured_drivers  ?? [],
      featured_tracks:   payload.featured_tracks   ?? [],
      featured_series:   payload.featured_series   ?? [],
      upcoming_events:   payload.upcoming_events   ?? [],
      recent_results:    payload.recent_results    ?? [],
      activity_feed:     payload.activity_feed     ?? [],
      featured_media:    payload.featured_media    ?? [],
      featured_products: payload.featured_products ?? [],
    },
  };
}