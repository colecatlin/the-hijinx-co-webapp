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

export default function Home() {
  return (
    <PageShell>
      {/* Hero — full screen cinematic entry */}
      <HomepageHero />

      {/* Live ticker */}
      <HomepageTicker />

      {/* 1. Live activity feed — platform feels alive */}
      <HomepageActivityFeed />

      {/* 2. Choose Your Lane — route cards */}
      <HomepageChooseYourLane />

      {/* 3. Featured editorial story */}
      <HomepageFeaturedStory />

      {/* 4. Featured motorsports — tabbed discovery */}
      <HomepageFeaturedEntities />

      {/* 5. Race Core system feature */}
      <HomepageRaceCoreTeaser />

      {/* 6. Apparel feature */}
      <HomepageApparel />

      {/* 7. Movement / culture */}
      <HomepageMovement />

      {/* 8. Final CTA paths */}
      <HomepageFinalCTA />
    </PageShell>
  );
}