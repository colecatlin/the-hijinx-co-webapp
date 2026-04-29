import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { getHomepageData, FALLBACK_DATA } from '@/components/homepage/homepageDataService';
import HeroSection from '@/components/home/HeroSection';
import HomepageBridge from '@/components/home/HomepageBridge';
import Index46Preview from '@/components/home/Index46Preview';
import OutletAndCulture from '@/components/home/OutletAndCulture';
import ApparelShowcase from '@/components/home/ApparelShowcase';
import FinalCallToAction from '@/components/home/FinalCallToAction';

export default function Home() {
  const { data: hpResult, isLoading } = useQuery({
    queryKey: ['homepageData'],
    queryFn: getHomepageData,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const hp = hpResult?.data ?? FALLBACK_DATA;

  useEffect(() => { Analytics.pageView('Home'); }, []);

  return (
    <div className="min-h-screen bg-[#050A0A] overflow-x-hidden">
      <SeoMeta
        title="Motorsports, Culture, and Competition"
        description="HIJINX — where motorsports, media, and culture collide."
        noSuffix={false}
      />

      {/* 1. Hero — cinematic entry point */}
      <HeroSection />

      {/* 2. Bridge — one world, three ways in */}
      <HomepageBridge />

      {/* 3. INDEX46 preview — tease the platform */}
      <Index46Preview />

      {/* 4. Outlet & Culture — cream chapter break */}
      <OutletAndCulture
        featuredStory={hp.featured_story ?? null}
        supportingStories={(hp.featured_stories || []).slice(1, 6)}
      />

      {/* 5. Apparel — wear the world */}
      <ApparelShowcase products={hp.featured_products || []} />

      {/* 6. Final CTA — one exit point */}
      <FinalCallToAction />
    </div>
  );
}