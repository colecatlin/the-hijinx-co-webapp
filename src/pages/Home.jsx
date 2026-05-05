import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { getHomepageData, FALLBACK_DATA } from '@/components/homepage/homepageDataService';
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
    <div className="min-h-screen overflow-x-hidden" style={{
      background: '#050A0A',
      backgroundImage: 'url(https://media.base44.com/images/public/69875e8c5d41c7f087ed1b90/801616d83_HijinxBackgroundtestimage.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'top center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    }}>
      <SeoMeta
        title="Motorsports, Culture, and Competition"
        description="HIJINX — where motorsports, media, and culture collide."
        noSuffix={false}
      />

      <CultureGrid />

      {/* Teal glow thread — culture → outlet */}
      <div className="relative h-px mx-auto max-w-5xl" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(29,161,161,0.3) 35%, rgba(29,161,161,0.3) 65%, transparent 100%)' }}>
        <div className="absolute inset-x-0 top-0 h-8 -translate-y-1/2 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(29,161,161,0.07) 0%, transparent 100%)' }} />
      </div>

      <OutletSection
        featuredStory={hp.featured_story}
        supportingStories={(hp.featured_stories || []).slice(1, 6)}
      />

      {/* Ambient glow — outlet → apparel */}
      <div className="pointer-events-none h-px" style={{ background: 'radial-gradient(ellipse 80% 1px at 50% 50%, rgba(229,255,0,0.12) 0%, transparent 100%)' }} />

      <ApparelSection products={hp.featured_products || []} />

      {/* Ambient glow — apparel → events */}
      <div className="pointer-events-none" style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(29,161,161,0.15) 40%, rgba(29,161,161,0.15) 60%, transparent 100%)' }} />

      <EventsSection />

      <RaceCoreSection />

      <RaceCoreBridge />

      {/* Ambient glow — bridge → socials */}
      <div className="pointer-events-none" style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(29,161,161,0.2) 30%, rgba(29,161,161,0.2) 70%, transparent 100%)' }} />

      <SocialsSection media={hp.featured_media || []} />

      <GetInvolvedCTA />
    </div>
  );
}