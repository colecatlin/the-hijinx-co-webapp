import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import PageShell from '@/components/shared/PageShell';
import HomepageHero from '@/components/home/HomepageHero';
import HomepageTicker from '@/components/home/HomepageTicker';
import HomepageFeaturedStory from '@/components/home/HomepageFeaturedStory';
import HomepageFeaturedEntities from '@/components/home/HomepageFeaturedEntities';
import HomepageApparel from '@/components/home/HomepageApparel';
import HomepageFinalCTA from '@/components/home/HomepageFinalCTA';
import { getHomepageData, FALLBACK_DATA } from '@/components/homepage/homepageDataService';



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

  const { data: driverProgramsList = [] } = useQuery({
    queryKey: ['homepageFeaturedDriverPrograms', ...featuredDriverIds],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: { $in: featuredDriverIds } }),
    enabled: featuredDriverIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const mediaByDriver = driverMediaList.reduce((acc, m) => {
    if (m.driver_id) acc[m.driver_id] = m;
    return acc;
  }, {});

  const programsByDriver = driverProgramsList.reduce((acc, p) => {
    if (p.driver_id) {
      if (!acc[p.driver_id]) acc[p.driver_id] = [];
      acc[p.driver_id].push(p);
    }
    return acc;
  }, {});




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
      <HomepageHero
        stats={hp.hero_stats}
        featuredDriver={hp.featured_drivers?.[0] ?? null}
        featuredStory={hp.featured_story ?? null}
      />
      <HomepageTicker
        tickerItems={hp.ticker_items}
        activityItems={hp.activity_feed?.slice(0, 6)}
      />


      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 2 — CULTURE  (stories · discovery)
      ═══════════════════════════════════════════════════════════════════════ */}
      <HomepageFeaturedStory
        featuredStory={hp.featured_story}
        supportingStories={(hp.featured_stories || []).slice(1, 4)}
      />


      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 3 — CORE  (discovery · race platform)
      ═══════════════════════════════════════════════════════════════════════ */}
      <HomepageFeaturedEntities
        drivers={hp.featured_drivers}
        teams={hp.featured_teams || []}
        tracks={hp.featured_tracks}
        series={hp.featured_series}
        events={hp.upcoming_events}
        allSeries={hp.featured_series}
        programsByDriver={programsByDriver}
        mediaByDriver={mediaByDriver}
        isLoading={isLoading}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          ZONE 4 — BRAND  (apparel · CTA)
      ═══════════════════════════════════════════════════════════════════════ */}
      <HomepageApparel products={hp.featured_products} />
      <HomepageFinalCTA />

    </PageShell>
  );
}