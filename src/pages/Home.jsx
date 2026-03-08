import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import HomepageHero from '@/components/home/HomepageHero';
import HomepageTicker from '@/components/home/HomepageTicker';
import HomepageActivityFeed from '@/components/home/HomepageActivityFeed';
import HomepageChooseYourLane from '@/components/home/HomepageChooseYourLane';
import HomepageFeaturedStory from '@/components/home/HomepageFeaturedStory';
import HomepageFeaturedEntities from '@/components/home/HomepageFeaturedEntities';
import HomepageRaceCoreTeaser from '@/components/home/HomepageRaceCoreTeaser';
import HomepageApparel from '@/components/home/HomepageApparel';
import HomepageMovement from '@/components/home/HomepageMovement';
import HomepageFinalCTA from '@/components/home/HomepageFinalCTA';
import { getHomepageData, FALLBACK_DATA } from '@/components/homepage/homepageDataService';

export default function Home() {
  // Optional: current user for future personalization
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  // Single centralized homepage data query — all sections read from here
  const { data: hpResult, isLoading } = useQuery({
    queryKey: ['homepageData'],
    queryFn: getHomepageData,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  // Always safe — fallback to empty shapes if result not yet available
  const hp = hpResult?.data ?? FALLBACK_DATA;

  return (
    <PageShell>
      {/* Hero — full screen cinematic entry */}
      <HomepageHero />

      {/* Live ticker — passes up to 6 live activity titles */}
      <HomepageTicker activityItems={hp.activity_feed?.slice(0, 6)} />

      {/* 1. Live activity feed */}
      <HomepageActivityFeed
        items={hp.activity_feed}
        isLoading={isLoading}
      />

      {/* 2. Choose Your Lane — route cards */}
      <HomepageChooseYourLane />

      {/* 3. Featured editorial story */}
      <HomepageFeaturedStory
        featuredStory={hp.featured_story}
        supportingStories={(hp.featured_stories || []).slice(1, 4)}
      />

      {/* 4. Featured motorsports — tabbed discovery */}
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

      {/* 5. Race Core system feature */}
      <HomepageRaceCoreTeaser />

      {/* 6. Apparel feature */}
      <HomepageApparel products={hp.featured_products} />

      {/* 7. Movement / culture */}
      <HomepageMovement />

      {/* 8. Final CTA paths */}
      <HomepageFinalCTA />
    </PageShell>
  );
}