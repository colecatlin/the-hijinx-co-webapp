/**
 * homepageDataService — centralized data layer for the HIJINX homepage.
 *
 * Single hook: useHomepageData()
 * Runs all homepage queries in parallel via useQueries, returns structured data
 * that is distributed to each homepage section as props — eliminating redundant
 * per-component fetches.
 *
 * Future personalization: pass `user` to filter activity_feed by followed
 * drivers/series/tracks (related_driver_id, related_series_id, etc.).
 */

import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { base44 } from '@/api/base44Client';

const S5  = 5  * 60 * 1000;
const S10 = 10 * 60 * 1000;
const S2  = 2  * 60 * 1000;

// ── Placeholder feed items shown when ActivityFeed entity has no records yet ─
const FEED_PLACEHOLDERS = [
  { id: 'ph1', activity_type: 'driver_registered', title: 'Driver registered for Pro 4', description: 'At Bark River International Raceway', entity_type: 'driver', visibility: 'public', created_at: new Date(Date.now() - 2  * 3600000).toISOString() },
  { id: 'ph2', activity_type: 'results_posted',    title: 'Results posted',               description: 'Round 3 — Lucas Oil Off Road Racing',    entity_type: 'results', visibility: 'public', created_at: new Date(Date.now() - 5  * 3600000).toISOString() },
  { id: 'ph3', activity_type: 'story_published',   title: 'New story published',          description: 'Behind the build — Greaves Motorsports',  entity_type: 'story',   visibility: 'public', created_at: new Date(Date.now() - 8  * 3600000).toISOString() },
  { id: 'ph4', activity_type: 'track_added',       title: 'Track added to database',      description: 'Crandon International Off-Road Raceway',  entity_type: 'track',   visibility: 'public', created_at: new Date(Date.now() - 11 * 3600000).toISOString() },
  { id: 'ph5', activity_type: 'series_updated',    title: 'Series schedule updated',      description: 'Pro Snowmobile Racing — 2025 Season',     entity_type: 'series',  visibility: 'public', created_at: new Date(Date.now() - 14 * 3600000).toISOString() },
  { id: 'ph6', activity_type: 'media_uploaded',    title: 'Media package uploaded',       description: 'Event photography — Round 5',             entity_type: 'media',   visibility: 'public', created_at: new Date(Date.now() - 18 * 3600000).toISOString() },
  { id: 'ph7', activity_type: 'driver_registered', title: 'Driver profile activated',     description: 'Pro 2 Open class — Western Series',       entity_type: 'driver',  visibility: 'public', created_at: new Date(Date.now() - 22 * 3600000).toISOString() },
  { id: 'ph8', activity_type: 'results_posted',    title: 'Standings recalculated',       description: 'Championship points updated — Round 7',   entity_type: 'results', visibility: 'public', created_at: new Date(Date.now() - 26 * 3600000).toISOString() },
];

/**
 * useHomepageData(user?)
 *
 * @param {object} [user] - optional authenticated user for future personalization
 * @returns structured homepage data distributed to section components
 */
export function useHomepageData(user) {
  const results = useQueries({
    queries: [
      // 0 — featured stories
      {
        queryKey: ['hp_stories'],
        queryFn: () => base44.entities.OutletStory.filter({ status: 'published' }, '-published_date', 5),
        staleTime: S5,
      },
      // 1 — featured drivers
      {
        queryKey: ['hp_drivers'],
        queryFn: () => base44.entities.Driver.filter({ featured: true, profile_status: 'live' }),
        staleTime: S5,
        select: (d) => d.slice(0, 4),
      },
      // 2 — active tracks
      {
        queryKey: ['hp_tracks'],
        queryFn: () => base44.entities.Track.filter({ status: 'Active' }, '-created_date', 8),
        staleTime: S10,
        select: (d) => d.slice(0, 8),
      },
      // 3 — series list (used for both FeaturedEntities tabs and DriverCard labels)
      {
        queryKey: ['hp_series'],
        queryFn: () => base44.entities.Series.list('-popularity_rank', 20),
        staleTime: S10,
      },
      // 4 — upcoming/published events
      {
        queryKey: ['hp_events'],
        queryFn: () => base44.entities.Event.filter({ status: 'Published' }, '-event_date', 8),
        staleTime: S5,
        select: (d) => d.slice(0, 8),
      },
      // 5 — ActivityFeed (live platform activity)
      {
        queryKey: ['hp_activity_feed'],
        queryFn: () => base44.entities.ActivityFeed.filter({ visibility: 'public' }, '-created_at', 20),
        staleTime: S2,
      },
      // 6 — driver programs (for DriverCard)
      {
        queryKey: ['hp_programs'],
        queryFn: () => base44.entities.DriverProgram.list(),
        staleTime: S10,
      },
      // 7 — driver media (for DriverCard)
      {
        queryKey: ['hp_driver_media'],
        queryFn: () => base44.entities.DriverMedia.list(),
        staleTime: S5,
      },
      // 8 — recent official results
      {
        queryKey: ['hp_results'],
        queryFn: () => base44.entities.Results.filter({ is_official: true }, '-created_date', 6),
        staleTime: S5,
      },
      // 9 — featured products
      {
        queryKey: ['hp_products'],
        queryFn: () => base44.entities.Product.list('-created_date', 6),
        staleTime: S10,
      },
    ],
  });

  const [
    storiesQ, driversQ, tracksQ, seriesQ, eventsQ,
    activityQ, programsQ, driverMediaQ, resultsQ, productsQ,
  ] = results;

  const isLoading = results.some((r) => r.isLoading);

  // ── Computed maps for DriverCard ─────────────────────────────────────────
  const programsByDriver = useMemo(() => {
    const map = {};
    (programsQ.data || []).forEach((p) => {
      if (!map[p.driver_id]) map[p.driver_id] = [];
      map[p.driver_id].push(p);
    });
    return map;
  }, [programsQ.data]);

  const mediaByDriver = useMemo(() => {
    const map = {};
    (driverMediaQ.data || []).forEach((m) => { map[m.driver_id] = m; });
    return map;
  }, [driverMediaQ.data]);

  // ── Activity feed: real items + placeholders as fallback ─────────────────
  const activity_feed = useMemo(() => {
    const live = activityQ.data || [];
    const fill = live.length < 6 ? FEED_PLACEHOLDERS.slice(0, 8 - live.length) : [];
    return [...live, ...fill]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 12);
  }, [activityQ.data]);

  const allSeries = seriesQ.data || [];

  return {
    // ── Section data ───────────────────────────────────────────────────────
    featured_story:    (storiesQ.data || [])[0] || null,
    featured_stories:  storiesQ.data || [],
    featured_drivers:  driversQ.data || [],
    featured_tracks:   tracksQ.data || [],
    featured_series:   allSeries.slice(0, 8),
    upcoming_events:   eventsQ.data || [],
    recent_results:    resultsQ.data || [],
    activity_feed,
    featured_products: productsQ.data || [],

    // ── Supporting lookup data ─────────────────────────────────────────────
    allSeries,
    programsByDriver,
    mediaByDriver,

    // ── Loading state ──────────────────────────────────────────────────────
    isLoading,
  };
}