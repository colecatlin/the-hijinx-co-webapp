import React from 'react';
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
import { useHomepageData } from '@/components/home/homepageDataService';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function Home() {
  // Current user for future personalization
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  // Single centralized data fetch — distributed to all sections as props
  const hpData = useHomepageData(user);

  return (
    <PageShell>
      {/* Hero — full screen cinematic entry */}
      <HomepageHero />

      {/* Live ticker */}
      <HomepageTicker />

      {/* 1. Live activity feed */}
      <HomepageActivityFeed items={hpData.activity_feed} isLoading={hpData.isLoading} />

      {/* 2. Choose Your Lane — route cards */}
      <HomepageChooseYourLane />

      {/* 3. Featured editorial story */}
      <HomepageFeaturedStory
        featuredStory={hpData.featured_story}
        supportingStories={hpData.featured_stories.slice(1, 4)}
      />

      {/* 4. Featured motorsports — tabbed discovery */}
      <HomepageFeaturedEntities
        drivers={hpData.featured_drivers}
        tracks={hpData.featured_tracks}
        series={hpData.featured_series}
        events={hpData.upcoming_events}
        allSeries={hpData.allSeries}
        programsByDriver={hpData.programsByDriver}
        mediaByDriver={hpData.mediaByDriver}
        isLoading={hpData.isLoading}
      />

      {/* 5. Race Core system feature */}
      <HomepageRaceCoreTeaser />

      {/* 6. Apparel feature */}
      <HomepageApparel products={hpData.featured_products} />

      {/* 7. Movement / culture */}
      <HomepageMovement />

      {/* 8. Final CTA paths */}
      <HomepageFinalCTA />
    </PageShell>
  );
}