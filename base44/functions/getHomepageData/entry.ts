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
      autoTeams,
      autoTracks,
      autoSeries,
      autoEvents,
      results,
      activityFeed,
      autoMedia,
      autoProducts,
      // hero stats counts — fetch with id-only minimal data
      allActiveSeries,
      allLiveDrivers,
      allActiveTracks,
      allPublishedEvents,
    ] = await Promise.all([
      safe(db.OutletStory.filter({ status: 'published' }, '-published_date', 6)),
      safe(db.Driver.filter({ featured: true, profile_status: 'live' }, '-created_date', TARGET)),
      safe(db.Team.filter({ status: 'Active' }, '-created_date', TARGET)),
      safe(db.Track.filter({ status: 'Active' }, '-created_date', TARGET)),
      safe(db.Series.filter({ status: 'Active' }, '-popularity_rank', TARGET)),
      safe(db.Event.filter({ status: 'Published' }, 'event_date', TARGET)),
      safe(db.Results.filter({ is_official: true }, '-created_date', 6)),
      safe(db.ActivityFeed.filter({ visibility: 'public' }, '-created_at', 12)),
      safe(db.MediaAsset.list('-created_date', MEDIA_TARGET)),
      safe(db.Product.list('-created_date', TARGET)),
      // counts for hero stats — capped at 100 for performance
      safe(db.Series.filter({ status: 'Active' }, '-created_date', 100)),
      safe(db.Driver.filter({ profile_status: 'live' }, '-created_date', 100)),
      safe(db.Track.filter({ status: 'Active' }, '-created_date', 100)),
      safe(db.Event.filter({ status: 'Published' }, 'event_date', 100)),
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

    // featured_drivers / teams / tracks / series
    const featuredDrivers = resolveBucket(settings?.featured_driver_ids, autoDrivers, TARGET);
    const featuredTeams   = (autoTeams || []).slice(0, TARGET);
    const featuredTracks  = resolveBucket(settings?.featured_track_ids,  autoTracks,  TARGET);
    const featuredSeries  = resolveBucket(settings?.featured_series_ids, autoSeries,  TARGET);

    // upcoming_events
    const autoUpcoming = (autoEvents || []).filter(e => e.event_date >= today).slice(0, TARGET);
    const upcomingEvents = resolveBucket(settings?.featured_event_ids, autoUpcoming, TARGET);

    // featured_media & products
    const featuredMedia    = resolveBucket(settings?.featured_media_ids,   autoMedia,    MEDIA_TARGET);
    const featuredProducts = resolveBucket(settings?.featured_product_ids, autoProducts, TARGET);

    // ticker_items — Priority 1: editorial override
    let tickerItems =
      (useManual && settings?.ticker_override_items?.length) ? settings.ticker_override_items :
      (useManual && settings?.hero_ticker_items?.length)     ? settings.hero_ticker_items :
      null;

    // Priority 2: build dynamically from real platform data when no editorial override
    if (!tickerItems) {
      const rawItems = [];

      // Recent activity feed titles (most useful — real activity)
      for (const item of (activityFeed || []).slice(0, 4)) {
        const t = (item.title || '').trim();
        if (t && t.length <= 55) rawItems.push(t);
      }

      // Featured story headline
      if (featuredStory?.title) {
        const t = featuredStory.title.trim();
        if (t.length <= 50) rawItems.push(`New story: ${t}`);
      }

      // Nearest upcoming event
      const nextEvent = (autoEvents || []).filter(e => e.event_date >= today)[0];
      if (nextEvent?.name) rawItems.push(`Upcoming: ${nextEvent.name}`);

      // Featured series names
      for (const s of (featuredSeries || []).slice(0, 2)) {
        if (s.name) rawItems.push(s.name);
      }

      // Featured driver names
      for (const d of (featuredDrivers || []).slice(0, 2)) {
        const name = [d.first_name, d.last_name].filter(Boolean).join(' ');
        if (name) rawItems.push(name);
      }

      // Deduplicate and cap
      const seen = new Set();
      const deduped = [];
      for (const item of rawItems) {
        const key = item.toLowerCase().trim();
        if (!seen.has(key) && item.trim()) {
          seen.add(key);
          deduped.push(item.trim());
        }
        if (deduped.length >= 8) break;
      }

      tickerItems = deduped.length > 0 ? deduped : null;
    }

    // ── 4. Spotlights ─────────────────────────────────────────────────────────
    // Direct driver/event fetch if manual IDs are set (avoids an extra function hop)
    let spotlightDriver = null;
    let spotlightEvent  = null;

    if (useManual && settings?.spotlight_driver_id) {
      const d = (autoDrivers || []).find(r => r.id === settings.spotlight_driver_id);
      if (d) {
        spotlightDriver = {
          id:   d.id,
          name: [d.first_name, d.last_name].filter(Boolean).join(' '),
          subtitle: d.primary_discipline || null,
          slug: d.slug || null,
          canonical_slug: d.canonical_slug || d.slug || null,
          image: d.profile_image_url || d.hero_image_url || null,
        };
      }
    }

    if (useManual && settings?.spotlight_event_id) {
      const e = (autoEvents || []).find(r => r.id === settings.spotlight_event_id);
      if (e) {
        spotlightEvent = {
          id:          e.id,
          name:        e.name,
          event_date:  e.event_date,
          status:      e.status,
          series_name: e.series_name || null,
        };
      }
    }

    // Fall back to auto spotlight logic using already-fetched data
    if (!spotlightDriver) {
      const bestDriver = (autoDrivers || []).find(d => d.featured === true) || (autoDrivers || [])[0] || null;
      if (bestDriver) {
        spotlightDriver = {
          id: bestDriver.id,
          name: [bestDriver.first_name, bestDriver.last_name].filter(Boolean).join(' '),
          subtitle: bestDriver.primary_discipline || null,
          slug: bestDriver.slug || null,
          canonical_slug: bestDriver.canonical_slug || bestDriver.slug || null,
          image: bestDriver.profile_image_url || null,
        };
      }
    }
    if (!spotlightEvent) {
      const upcoming = (autoEvents || []).find(e => e.event_date >= today && e.status === 'Published');
      const fallbackEvent = upcoming || (autoEvents || [])[0];
      if (fallbackEvent) {
        spotlightEvent = {
          id: fallbackEvent.id,
          name: fallbackEvent.name,
          event_date: fallbackEvent.event_date || null,
          status: fallbackEvent.status || null,
          series_name: fallbackEvent.series_name || null,
        };
      }
    }

    // ── 5. Return payload ────────────────────────────────────────────────────
    const hero_stats = {
      series_count: (allActiveSeries || []).filter(s => !s.is_sample).length,
      driver_count: (allLiveDrivers  || []).length,
      track_count:  (allActiveTracks || []).length,
      event_count:  (allPublishedEvents || []).length,
    };

    return Response.json({
      featured_story:    featuredStory,
      featured_stories:  featuredStories,
      featured_drivers:  featuredDrivers,
      featured_teams:    featuredTeams,
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
      hero_stats,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});