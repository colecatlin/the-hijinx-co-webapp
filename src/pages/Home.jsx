import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { getHomepageData, FALLBACK_DATA } from '@/components/homepage/homepageDataService';
import HeroSection from '@/components/home/HeroSection';
import CultureSection from '@/components/home/CultureSection';
import OutletSection from '@/components/home/OutletSection';
import ApparelSection from '@/components/home/ApparelSection';
import RaceCoreSection from '@/components/home/RaceCoreSection';
import SocialsSection from '@/components/home/SocialsSection';
import GetInvolvedCTA from '@/components/home/GetInvolvedCTA';


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
    <div className="min-h-screen bg-[#0A0A0A] overflow-x-hidden">
      <SeoMeta
        title="Motorsports, Culture, and Competition"
        description="HIJINX — where motorsports, media, and culture collide."
        noSuffix={false}
      />

      <HeroSection
        featuredDriver={hp.featured_drivers?.[0] ?? null}
        featuredStory={hp.featured_story ?? null}
        stats={hp.hero_stats}
      />

      <CultureSection />

      {/* Transition bridge: dark → editorial cream */}
      <div style={{ height: 64, background: 'linear-gradient(to bottom, #0A0A0A, #F5F0E8)', marginTop: 0 }} />

      <OutletSection
        featuredStory={hp.featured_story}
        supportingStories={(hp.featured_stories || []).slice(1, 4)}
      />

      <ApparelSection products={hp.featured_products || []} />

      <RaceCoreSection stats={hp.hero_stats} />

      <SocialsSection media={hp.featured_media || []} />

      <GetInvolvedCTA />


    </div>
  );
}