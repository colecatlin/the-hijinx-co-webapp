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

  const featuredDriverIds = (hp.featured_drivers || []).map(d => d.id).filter(Boolean);

  const { data: driverMediaList = [] } = useQuery({
    queryKey: ['homepageFeaturedDriverMedia', ...featuredDriverIds],
    queryFn: () => base44.entities.DriverMedia.filter({ driver_id: { $in: featuredDriverIds } }),
    enabled: featuredDriverIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const mediaByDriver = driverMediaList.reduce((acc, m) => {
    if (m.driver_id) acc[m.driver_id] = m;
    return acc;
  }, {});


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


      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 2 — CULTURE  (spotlight · stories)
      ═══════════════════════════════════════════════════════════════════════ */}
      {hasSpotlight && (
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-0">
          <div className={`grid gap-4 ${hasDriver && hasEvent ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
            {hasDriver && <HomepageDriverSpotlight driver={hp.spotlight_driver} />}
            {hasEvent  && <HomepageEventSpotlight  event={hp.spotlight_event}  />}
          </div>
        </div>
      )}
      <HomepageFeaturedStory
        featuredStory={hp.featured_story}
        supportingStories={(hp.featured_stories || []).slice(1, 4)}
      />


      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 3 — CORE  (explore · browse · race platform)
      ═══════════════════════════════════════════════════════════════════════ */}
      <HomepageChooseYourLane user={user} hasRaceCoreAccess={hasRaceCoreAccess} />
      <HomepageFeaturedEntities
        drivers={hp.featured_drivers}
        teams={hp.featured_teams || []}
        tracks={hp.featured_tracks}
        series={hp.featured_series}
        events={hp.upcoming_events}
        allSeries={hp.featured_series}
        programsByDriver={{}}
        mediaByDriver={mediaByDriver}
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