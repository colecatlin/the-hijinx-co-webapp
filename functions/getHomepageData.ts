/**
 * getHomepageData
 *
 * Returns a single structured payload for the HIJINX homepage.
 * Applies manual editorial overrides from HomepageSettings when present.
 * All buckets are safe — missing entities return empty arrays / null.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const today = new Date().toISOString().split('T')[0];
    const safe = (promise) => promise.catch(() => null);
    const TARGET = 6;
    const MEDIA_TARGET = 8;

    // 1. Load active editorial settings (non-blocking)
    let settings = null;
    try {
      const settingsList = await db.HomepageSettings.filter({ active: true }, '-created_date', 1);
      settings = settingsList?.[0] || null;
    } catch (_) { /* settings stays null */ }

    const entitiesMode = settings?.featured_entities_mode || 'mixed';

    // 2. Fetch all auto data in parallel
    const [
      autoStories,
      autoDrivers,
      autoTracks,
      autoSeries,
      autoEvents,
      results,
      activityFeed,
      autoMedia,
      autoProducts,
    ] = await Promise.all([
      safe(db.OutletStory.filter({ status: 'published' }, '-published_date', 50)),
      safe(db.Driver.filter({ featured: true, profile_status: 'live' }, '-created_date', 20)),
      safe(db.Track.filter({ status: 'Active' }, '-created_date', 20)),
      safe(db.Series.filter({ status: 'Active' }, '-popularity_rank', 20)),
      safe(db.Event.filter({ status: 'Published' }, 'event_date', 20)),
      safe(db.Results.filter({ is_official: true }, '-created_date', 6)),
      safe(db.ActivityFeed.filter({ visibility: 'public' }, '-created_at', 12)),
      safe(db.MediaAsset.list('-created_date', 20)),
      safe(db.Product.list('-created_date', 20)),
    ]);

    // Helper: resolve IDs from a fetched pool, silently skip missing records
    const resolveIds = (ids, pool) => {
      if (!ids?.length || !pool?.length) return [];
      return ids.map(id => pool.find(r => r.id === id)).filter(Boolean);
    };

    // Helper: mix manual + auto fill up to limit
    const mixBucket = (manualItems, autoPool, limit) => {
      const usedIds = new Set(manualItems.map(r => r.id));
      const fill = (autoPool || []).filter(r => !usedIds.has(r.id));
      return [...manualItems, ...fill].slice(0, limit);
    };

    // ── featured_story ───────────────────────────────────────────────────────
    let featuredStory = (autoStories || [])[0] || null;
    if (settings?.featured_story_id) {
      const override = (autoStories || []).find(s => s.id === settings.featured_story_id);
      if (override) featuredStory = override;
    }

    // Build featured_stories: pinned story first, then others
    const featuredStories = featuredStory
      ? [featuredStory, ...(autoStories || []).filter(s => s.id !== featuredStory.id)].slice(0, 5)
      : (autoStories || []).slice(0, 5);

    // ── featured_drivers ─────────────────────────────────────────────────────
    let featuredDrivers;
    if (settings?.featured_driver_ids?.length && entitiesMode !== 'auto') {
      const manual = resolveIds(settings.featured_driver_ids, autoDrivers || []);
      featuredDrivers = entitiesMode === 'mixed'
        ? mixBucket(manual, autoDrivers, TARGET)
        : manual.slice(0, TARGET);
    } else {
      featuredDrivers = (autoDrivers || []).slice(0, TARGET);
    }

    // ── featured_tracks ──────────────────────────────────────────────────────
    let featuredTracks;
    if (settings?.featured_track_ids?.length && entitiesMode !== 'auto') {
      const manual = resolveIds(settings.featured_track_ids, autoTracks || []);
      featuredTracks = entitiesMode === 'mixed'
        ? mixBucket(manual, autoTracks, TARGET)
        : manual.slice(0, TARGET);
    } else {
      featuredTracks = (autoTracks || []).slice(0, TARGET);
    }

    // ── featured_series ──────────────────────────────────────────────────────
    let featuredSeries;
    if (settings?.featured_series_ids?.length && entitiesMode !== 'auto') {
      const manual = resolveIds(settings.featured_series_ids, autoSeries || []);
      featuredSeries = entitiesMode === 'mixed'
        ? mixBucket(manual, autoSeries, TARGET)
        : manual.slice(0, TARGET);
    } else {
      featuredSeries = (autoSeries || []).slice(0, TARGET);
    }

    // ── upcoming_events ──────────────────────────────────────────────────────
    const autoUpcoming = (autoEvents || []).filter(e => e.event_date >= today).slice(0, TARGET);
    let upcomingEvents;
    if (settings?.featured_event_ids?.length) {
      const manual = resolveIds(settings.featured_event_ids, autoEvents || []);
      upcomingEvents = mixBucket(manual, autoUpcoming, TARGET);
    } else {
      upcomingEvents = autoUpcoming;
    }

    // ── featured_media ───────────────────────────────────────────────────────
    let featuredMedia;
    if (settings?.featured_media_ids?.length) {
      const manual = resolveIds(settings.featured_media_ids, autoMedia || []);
      featuredMedia = mixBucket(manual, autoMedia, MEDIA_TARGET);
    } else {
      featuredMedia = (autoMedia || []).slice(0, MEDIA_TARGET);
    }

    // ── featured_products ────────────────────────────────────────────────────
    let featuredProducts;
    if (settings?.featured_product_ids?.length) {
      const manual = resolveIds(settings.featured_product_ids, autoProducts || []);
      featuredProducts = mixBucket(manual, autoProducts, TARGET);
    } else {
      featuredProducts = (autoProducts || []).slice(0, TARGET);
    }

    // ── ticker_items ─────────────────────────────────────────────────────────
    const tickerItems = settings?.hero_ticker_items?.length
      ? settings.hero_ticker_items
      : null;

    // ── spotlights ────────────────────────────────────────────────────────────
    let spotlightDriver = null;
    let spotlightEvent  = null;
    try {
      const spotRes = await base44.functions.invoke('getHomepageSpotlights', {});
      spotlightDriver = spotRes?.spotlight_driver || null;
      spotlightEvent  = spotRes?.spotlight_event  || null;
    } catch (_) { /* spotlights stay null */ }

    return Response.json({
      featured_story:    featuredStory,
      featured_stories:  featuredStories,
      featured_drivers:  featuredDrivers,
      featured_tracks:   featuredTracks,
      featured_series:   featuredSeries,
      upcoming_events:   upcomingEvents,
      recent_results:    (results      || []).slice(0, 6),
      activity_feed:     (activityFeed || []).slice(0, 12),
      featured_media:    featuredMedia,
      featured_products: featuredProducts,
      ticker_items:      tickerItems,
      spotlight_driver:  spotlightDriver,
      spotlight_event:   spotlightEvent,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});