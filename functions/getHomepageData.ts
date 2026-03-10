/**
 * getHomepageData
 *
 * Returns a single structured payload for the HIJINX homepage.
 *
 * Respects homepage_mode from HomepageSettings:
 *   auto       — ignore all manual IDs, use automatic data only
 *   editorial  — use manual IDs; fallback to auto if a manual field is empty or invalid
 *   mixed      — use manual IDs when present; auto when not (default behavior)
 *
 * All buckets are safe — missing or failed entities never crash the page.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const today = new Date().toISOString().split('T')[0];
    const safe = (p) => p.catch(() => null);
    const TARGET = 6;
    const MEDIA_TARGET = 8;

    // ── 1. Load active editorial settings ────────────────────────────────────
    let settings = null;
    try {
      const list = await db.HomepageSettings.filter({ active: true }, '-created_date', 1);
      settings = list?.[0] || null;
    } catch (_) {}

    // Top-level mode — homepage_mode wins; fall back to legacy featured_entities_mode
    const mode = settings?.homepage_mode || settings?.featured_entities_mode || 'mixed';
    // In auto mode we ignore all manual overrides
    const useManual = mode !== 'auto';

    // ── 2. Fetch all auto data in parallel ───────────────────────────────────
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
      // hero stats counts
      allActiveSeries,
      allLiveDrivers,
      allActiveTracks,
      allPublishedEvents,
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
      // counts for hero stats (large limits to get real totals)
      safe(db.Series.filter({ status: 'Active' }, '-created_date', 9999)),
      safe(db.Driver.filter({ profile_status: 'live' }, '-created_date', 9999)),
      safe(db.Track.filter({ status: 'Active' }, '-created_date', 9999)),
      safe(db.Event.filter({ status: 'Published' }, 'event_date', 9999)),
    ]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    // Resolve manual IDs against a fetched pool; silently drop missing ones
    const resolveIds = (ids, pool) => {
      if (!ids?.length || !pool?.length) return [];
      return ids.map(id => pool.find(r => r.id === id)).filter(Boolean);
    };

    // Mix manual items first, then fill remainder from auto pool up to limit
    const mixBucket = (manual, autoPool, limit) => {
      const usedIds = new Set(manual.map(r => r.id));
      return [...manual, ...(autoPool || []).filter(r => !usedIds.has(r.id))].slice(0, limit);
    };

    // Resolve a bucket respecting homepage_mode
    const resolveBucket = (manualIds, autoPool, limit) => {
      if (!useManual || !manualIds?.length) return (autoPool || []).slice(0, limit);
      const manual = resolveIds(manualIds, autoPool || []);
      if (mode === 'editorial') {
        // editorial: manual only; fallback to auto if no valid manual items
        return manual.length ? manual.slice(0, limit) : (autoPool || []).slice(0, limit);
      }
      // mixed: manual first, fill with auto
      return mixBucket(manual, autoPool, limit);
    };

    // ── 3. Apply overrides per bucket ─────────────────────────────────────────

    // featured_story
    let featuredStory = (autoStories || [])[0] || null;
    if (useManual && settings?.featured_story_id) {
      const override = (autoStories || []).find(s => s.id === settings.featured_story_id);
      if (override) featuredStory = override;
    }
    const featuredStories = featuredStory
      ? [featuredStory, ...(autoStories || []).filter(s => s.id !== featuredStory.id)].slice(0, 5)
      : (autoStories || []).slice(0, 5);

    // featured_drivers / tracks / series
    const featuredDrivers = resolveBucket(settings?.featured_driver_ids, autoDrivers, TARGET);
    const featuredTracks  = resolveBucket(settings?.featured_track_ids,  autoTracks,  TARGET);
    const featuredSeries  = resolveBucket(settings?.featured_series_ids, autoSeries,  TARGET);

    // upcoming_events
    const autoUpcoming = (autoEvents || []).filter(e => e.event_date >= today).slice(0, TARGET);
    const upcomingEvents = resolveBucket(settings?.featured_event_ids, autoUpcoming, TARGET);

    // featured_media & products
    const featuredMedia    = resolveBucket(settings?.featured_media_ids,   autoMedia,    MEDIA_TARGET);
    const featuredProducts = resolveBucket(settings?.featured_product_ids, autoProducts, TARGET);

    // ticker_items — prefer ticker_override_items, then legacy hero_ticker_items
    const tickerItems =
      (useManual && settings?.ticker_override_items?.length) ? settings.ticker_override_items :
      (useManual && settings?.hero_ticker_items?.length)     ? settings.hero_ticker_items :
      null;

    // ── 4. Spotlights ─────────────────────────────────────────────────────────
    // Direct driver/event fetch if manual IDs are set (avoids an extra function hop)
    let spotlightDriver = null;
    let spotlightEvent  = null;

    if (useManual && settings?.spotlight_driver_id) {
      try {
        const drivers = await db.Driver.filter({ id: settings.spotlight_driver_id });
        const d = drivers?.[0];
        if (d) {
          spotlightDriver = {
            id:   d.id,
            name: [d.first_name, d.last_name].filter(Boolean).join(' '),
            subtitle: d.primary_discipline || null,
            slug: d.slug || null,
            image: null,
          };
        }
      } catch (_) {}
    }

    if (useManual && settings?.spotlight_event_id) {
      try {
        const events = await db.Event.filter({ id: settings.spotlight_event_id });
        const e = events?.[0];
        if (e) {
          spotlightEvent = {
            id:          e.id,
            name:        e.name,
            event_date:  e.event_date,
            status:      e.status,
            series_name: e.series_name || null,
          };
        }
      } catch (_) {}
    }

    // Fall back to auto spotlight logic if manual IDs weren't set or resolved
    if (!spotlightDriver || !spotlightEvent) {
      try {
        // Use service role so this works with and without a user session (public homepage)
        const spotRes = await base44.asServiceRole.functions.invoke('getHomepageSpotlights', {});
        if (!spotlightDriver) spotlightDriver = spotRes?.spotlight_driver || null;
        if (!spotlightEvent)  spotlightEvent  = spotRes?.spotlight_event  || null;
      } catch (_) {}
    }

    // ── 5. Return payload ────────────────────────────────────────────────────
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