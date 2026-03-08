import React from 'react';
import PageShell from '@/components/shared/PageShell';
import HomepageHero from '@/components/home/HomepageHero';
import HomepageTicker from '@/components/home/HomepageTicker';
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
      {/* 1. Full-screen hero */}
      <HomepageHero />

      {/* 2. Live premium ticker */}
      <HomepageTicker />

      {/* 3. Choose Your Lane — route cards */}
      <HomepageChooseYourLane />

      {/* 4. Featured editorial story */}
      <HomepageFeaturedStory />

      {/* 5. Featured drivers / entities */}
      <HomepageFeaturedEntities />

      {/* 6. Race Core platform teaser */}
      <HomepageRaceCoreTeaser />

      {/* 7. Apparel feature */}
      <HomepageApparel />

      {/* 8. Movement / culture section */}
      <HomepageMovement />

      {/* 9. Final CTA paths */}
      <HomepageFinalCTA />
    </PageShell>
  );
}