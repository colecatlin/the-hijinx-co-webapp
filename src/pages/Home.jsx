import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
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


export default function Home() {
  const { user } = useAuth();

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

  useEffect(() => { Analytics.pageView('Home'); }, []);

  return (
    <PageShell>
      <SeoMeta
        title="Motorsports, Culture, and Competition"
        description="HIJINX — the platform where motorsports, media, and culture collide. Discover drivers, teams, tracks, series, events, and verified results."
        noSuffix={false}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 1 — HERO + LIVE STRIP
      ═══════════════════════════════════════════════════════════════════════ */}
      <HomepageHero stats={hp.hero_stats} />
      <HomepageTicker
        tickerItems={hp.ticker_items}
        activityItems={hp.activity_feed?.slice(0, 6)}
      />
      <HomepageLiveFeedRail items={formattedFeed.slice(0, 10)} />

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 2 — FEATURED  (spotlight · stories · activity)
      ═══════════════════════════════════════════════════════════════════════ */}
      {hasSpotlight && (
        <section className="bg-white border-b border-gray-200 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-8 h-px bg-[#1DA1A1]" />
              <span className="font-mono text-[10px] tracking-[0.4em] text-[#1DA1A1] uppercase font-bold">Spotlight</span>
            </div>
            <div className={`grid gap-4 ${hasDriver && hasEvent ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
              {hasDriver && <HomepageDriverSpotlight driver={hp.spotlight_driver} />}
              {hasEvent  && <HomepageEventSpotlight  event={hp.spotlight_event}  />}
            </div>
          </div>
        </section>
      )}
      <HomepageFeaturedStory
        featuredStory={hp.featured_story}
        supportingStories={(hp.featured_stories || []).slice(1, 4)}
      />
      <HomepageWhatsHappeningNow items={formattedFeed.slice(0, 6)} />

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 3 — CORE  (navigate · browse · race platform)
      ═══════════════════════════════════════════════════════════════════════ */}
      <HomepageChooseYourLane user={user} hasRaceCoreAccess={hasRaceCoreAccess} />
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
      <HomepageRaceCoreTeaser />

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 4 — BRAND  (apparel · movement · CTA)
      ═══════════════════════════════════════════════════════════════════════ */}
      <HomepageApparel products={hp.featured_products} />
      <HomepageMovement />
      <HomepageFinalCTA />

    </PageShell>
  );
}