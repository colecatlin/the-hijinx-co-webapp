import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { getHomepageData, FALLBACK_DATA } from '@/components/homepage/homepageDataService';
import HeroSection from '@/components/home/HeroSection';
import CultureGrid from '@/components/home/CultureGrid';
import OutletSection from '@/components/home/OutletSection';
import ApparelSection from '@/components/home/ApparelSection';
import EventsSection from '@/components/home/EventsSection';
import RaceCoreSection from '@/components/home/RaceCoreSection';
import RaceCoreBridge from '@/components/home/RaceCoreBridge';
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
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#050A0A' }}>
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

      <CultureGrid />

      {/* Teal glow thread between culture and outlet */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(29,161,161,0.35) 40%, rgba(29,161,161,0.35) 60%, transparent 100%)' }} />

      <OutletSection
        featuredStory={hp.featured_story}
        supportingStories={(hp.featured_stories || []).slice(1, 6)}
      />

      <ApparelSection products={hp.featured_products || []} />

      <EventsSection />

      <RaceCoreSection />

      <RaceCoreBridge />

      <SocialsSection media={hp.featured_media || []} />

      <GetInvolvedCTA />
    </div>
  );
}