/**
 * getHomepageData
 *
 * Returns a single structured payload for the HIJINX homepage.
 * All buckets are safe — missing entities return empty arrays / null.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const today = new Date().toISOString().split('T')[0];

    // Run all fetches in parallel — each wrapped so one failure never kills the rest
    const safe = (promise) => promise.catch(() => null);

    const [
      stories,
      drivers,
      tracks,
      series,
      events,
      results,
      activityFeed,
      mediaAssets,
      products,
    ] = await Promise.all([
      // featured_story — newest published story
      safe(db.OutletStory.filter({ status: 'published' }, '-published_date', 1)),

      // featured_drivers — featured live profiles, limit 6
      safe(db.Driver.filter({ featured: true, profile_status: 'live' }, '-created_date', 6)),

      // featured_tracks — active tracks, limit 6
      safe(db.Track.filter({ status: 'Active' }, '-created_date', 6)),

      // featured_series — active series sorted by popularity, limit 6
      safe(db.Series.filter({ status: 'Active' }, '-popularity_rank', 6)),

      // upcoming_events — published events on or after today, soonest first, limit 6
      safe(db.Event.filter({ status: 'Published' }, 'event_date', 6)),

      // recent_results — official results, newest first, limit 6
      safe(db.Results.filter({ is_official: true }, '-created_date', 6)),

      // activity_feed — public items, newest first, limit 12
      safe(db.ActivityFeed.filter({ visibility: 'public' }, '-created_at', 12)),

      // featured_media — newest media assets, limit 8
      safe(db.MediaAsset.list('-created_date', 8)),

      // featured_products — placeholder safe fetch, limit 6
      safe(db.Product.list('-created_date', 6)),
    ]);

    // Filter upcoming events by date client-side since SDK filter doesn't support gte
    const upcomingEvents = (events || []).filter((e) => e.event_date >= today).slice(0, 6);

    return Response.json({
      featured_story:    (stories || [])[0] || null,
      featured_drivers:  (drivers || []).slice(0, 6),
      featured_tracks:   (tracks  || []).slice(0, 6),
      featured_series:   (series  || []).slice(0, 6),
      upcoming_events:   upcomingEvents,
      recent_results:    (results      || []).slice(0, 6),
      activity_feed:     (activityFeed || []).slice(0, 12),
      featured_media:    (mediaAssets  || []).slice(0, 8),
      featured_products: (products     || []).slice(0, 6),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});