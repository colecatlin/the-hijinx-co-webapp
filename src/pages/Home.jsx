import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
import { getHomepageData, FALLBACK_DATA } from '@/components/homepage/homepageDataService';
import HomepageDriverSpotlight from '@/components/homepage/HomepageDriverSpotlight';
import HomepageEventSpotlight from '@/components/homepage/HomepageEventSpotlight';
import HomepageLiveFeedRail from '@/components/homepage/HomepageLiveFeedRail';
import HomepageWhatsHappeningNow from '@/components/homepage/HomepageWhatsHappeningNow';
import { formatActivityFeedItems } from '@/components/homepage/activityFeedFormatter';

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
  const formattedFeed = formatActivityFeedItems(hp.activity_feed);

  return (
    <PageShell>
      {/* Hero — full screen cinematic entry */}
      <HomepageHero />

      {/* Live ticker — prefers manual ticker_items, falls back to activity feed, then static */}
      <HomepageTicker
        tickerItems={hp.ticker_items}
        activityItems={hp.activity_feed?.slice(0, 6)}
      />

      {/* 1. Live feed rail — compact horizontal strip */}
      <HomepageLiveFeedRail items={formattedFeed.slice(0, 8)} />

      {/* 1b. Spotlights — Driver + Event, shown when at least one exists */}
      {(hp.spotlight_driver || hp.spotlight_event) && (
        <section className="bg-[#060A10] py-10 border-b border-gray-900">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-px bg-[#00FFDA]" />
              <span className="font-mono text-[9px] tracking-[0.4em] text-[#00FFDA]/70 uppercase font-bold">Spotlight</span>
            </div>
            <div className={`grid gap-4 ${hp.spotlight_driver && hp.spotlight_event ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
              <HomepageDriverSpotlight driver={hp.spotlight_driver} />
              <HomepageEventSpotlight  event={hp.spotlight_event} />
            </div>
          </div>
        </section>
      )}

      {/* 1c. What's Happening Now — activity card grid */}
      <HomepageWhatsHappeningNow items={formattedFeed.slice(0, 6)} />

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