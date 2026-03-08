import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import HomepageHero from '@/components/home/HomepageHero';
import HomepageTicker from '@/components/home/HomepageTicker';
import HomepageChooseYourLane from '@/components/homepage/HomepageChooseYourLane';
import HomepageFeaturedStory from '@/components/home/HomepageFeaturedStory';
import HomepageFeaturedEntities from '@/components/home/HomepageFeaturedEntities';
import HomepageRaceCoreTeaser from '@/components/home/HomepageRaceCoreTeaser';
import HomepageApparel from '@/components/home/HomepageApparel';
import HomepageMovement from '@/components/home/HomepageMovement';
import HomepageFinalCTA from '@/components/home/HomepageFinalCTA';
import { getHomepageData, FALLBACK_DATA } from '@/components/homepage/homepageDataService';
import HomepageDriverSpotlight from '@/components/homepage/HomepageDriverSpotlight';
import HomepageEventSpotlight from '@/components/homepage/HomepageEventSpotlight';
import HomepageLiveFeedRail from '@/components/homepage/HomepageLiveFeedRail';
import HomepageWhatsHappeningNow from '@/components/homepage/HomepageWhatsHappeningNow';
import { formatActivityFeedItems } from '@/components/homepage/activityFeedFormatter';
import HomepageTrendingNow from '@/components/homepage/HomepageTrendingNow';

export default function Home() {
  // Current user for personalization + Race Core access check
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  const { data: collaboratorEntities } = useQuery({
    queryKey: ['hp_collaborators', user?.id],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_id: user.id }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const hasRaceCoreAccess = (collaboratorEntities || []).some(
    (c) => c.entity_type === 'track' || c.entity_type === 'series'
  );

  // Single centralized homepage data query — all sections read from here
  const { data: hpResult, isLoading } = useQuery({
    queryKey: ['homepageData'],
    queryFn: getHomepageData,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  // Always safe — fallback to empty shapes if result not yet available
  const hp = hpResult?.data ?? FALLBACK_DATA;
  const formattedFeed = formatActivityFeedItems(Array.isArray(hp.activity_feed) ? hp.activity_feed : []);

  const hasDriver  = !!hp.spotlight_driver;
  const hasEvent   = !!hp.spotlight_event;
  const hasSpotlight = hasDriver || hasEvent;

  return (
    <PageShell>

      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <HomepageHero />

      {/* ── Ticker ──────────────────────────────────────────────────────────── */}
      <HomepageTicker
        tickerItems={hp.ticker_items}
        activityItems={hp.activity_feed?.slice(0, 6)}
      />

      {/* ── 2. Live Feed Rail — compact horizontal strip, white bg ──────────── */}
      <HomepageLiveFeedRail items={formattedFeed.slice(0, 10)} />

      {/* ── 3. Spotlights — Driver + Event ──────────────────────────────────── */}
      {hasSpotlight && (
        <section className="bg-white border-b border-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-[#1DA1A1]" />
              <span className="font-mono text-[9px] tracking-[0.4em] text-[#1DA1A1] uppercase font-bold">Spotlight</span>
            </div>
            <div className={`grid gap-4 ${hasDriver && hasEvent ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
              {hasDriver && <HomepageDriverSpotlight driver={hp.spotlight_driver} />}
              {hasEvent  && <HomepageEventSpotlight  event={hp.spotlight_event}  />}
            </div>
          </div>
        </section>
      )}

      {/* ── 4. Choose Your Lane — ecosystem routing ─────────────────────────── */}
      <HomepageChooseYourLane user={user} hasRaceCoreAccess={hasRaceCoreAccess} />

      {/* ── 5. Trending Now — tabbed entity discovery ───────────────────────── */}
      <HomepageTrendingNow
        drivers={hp.featured_drivers}
        tracks={hp.featured_tracks}
        series={hp.featured_series}
        events={hp.upcoming_events}
        isLoading={isLoading}
      />

      {/* ── 6. Featured Story — editorial ───────────────────────────────────── */}
      <HomepageFeaturedStory
        featuredStory={hp.featured_story}
        supportingStories={(hp.featured_stories || []).slice(1, 4)}
      />

      {/* ── 7. What's Happening Now — activity card grid ────────────────────── */}
      <HomepageWhatsHappeningNow items={formattedFeed.slice(0, 6)} />

      {/* ── 8. Featured Motorsports — deeper entity browse ──────────────────── */}
      <HomepageFeaturedEntities
        drivers={hp.featured_drivers}
        tracks={hp.featured_tracks}
        series={hp.featured_series}
        events={hp.upcoming_events}
        allSeries={hp.featured_series}
        programsByDriver={{}}
        mediaByDriver={{}}
        isLoading={isLoading}
      />

      {/* ── 9. Race Core system feature ─────────────────────────────────────── */}
      <HomepageRaceCoreTeaser />

      {/* ── 10. Apparel feature ─────────────────────────────────────────────── */}
      <HomepageApparel products={hp.featured_products} />

      {/* ── 11. Movement / culture ──────────────────────────────────────────── */}
      <HomepageMovement />

      {/* ── 12. Final CTA ───────────────────────────────────────────────────── */}
      <HomepageFinalCTA />

    </PageShell>
  );
}