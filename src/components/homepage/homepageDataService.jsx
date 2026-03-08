/**
 * components/homepage/homepageDataService.js
 *
 * Frontend service that calls the getHomepageData backend function.
 * Returns { ok: true, data } on success, { ok: false, error } on failure.
 *
 * All buckets are guaranteed to exist (empty array or null) — never undefined.
 */

import { base44 } from '@/api/base44Client';

const EMPTY = {
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

/**
 * getHomepageData()
 * @returns {Promise<{ ok: boolean, data: object, error?: string }>}
 */
export async function getHomepageData() {
  try {
    const response = await base44.functions.invoke('getHomepageData', {});
    const raw = response.data || {};

    // Normalise — ensure every bucket is always present
    const data = {
      featured_story:    raw.featured_story    ?? null,
      featured_drivers:  raw.featured_drivers  ?? [],
      featured_tracks:   raw.featured_tracks   ?? [],
      featured_series:   raw.featured_series   ?? [],
      upcoming_events:   raw.upcoming_events   ?? [],
      recent_results:    raw.recent_results    ?? [],
      activity_feed:     raw.activity_feed     ?? [],
      featured_media:    raw.featured_media    ?? [],
      featured_products: raw.featured_products ?? [],
    };

    return { ok: true, data };
  } catch (error) {
    console.error('[homepageDataService] getHomepageData failed:', error);
    return { ok: false, error: error?.message || 'Unknown error', data: EMPTY };
  }
}