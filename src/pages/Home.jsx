import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SeoMeta from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import PageShell from '@/components/shared/PageShell';
import { getHomepageData, FALLBACK_DATA } from '@/components/homepage/homepageDataService';
import { formatActivityFeedItems } from '@/components/homepage/activityFeedFormatter';

// ── v2 section components ─────────────────────────────────────────────────────
import HeroSection      from '@/components/homev2/HeroSection';
import LiveNowSection   from '@/components/homev2/LiveNowSection';
import DiscoverySection from '@/components/homev2/DiscoverySection';
import SpotlightSection from '@/components/homev2/SpotlightSection';
import ExploreSection   from '@/components/homev2/ExploreSection';
import RaceCoreSection  from '@/components/homev2/RaceCoreSection';
import ApparelSection   from '@/components/homev2/ApparelSection';
import MovementSection  from '@/components/homev2/MovementSection';
import FinalCTASection  from '@/components/homev2/FinalCTASection';

export default function Home() {
  // Current user for personalization + Race Core access check
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

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

  // Single centralized homepage data query — all sections read from here
  const { data: hpResult, isLoading } = useQuery({
    queryKey: ['homepageData'],
    queryFn: getHomepageData,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  // Always safe — fallback to empty shapes if result not yet available
  const hp = hpResult?.data ?? FALLBACK_DATA;
  const formattedFeed = formatActivityFeedItems(Array.isArray(hp.activity_feed) ? hp.activity_feed : []);

  const hasDriver  = !!hp.spotlight_driver;
  const hasEvent   = !!hp.spotlight_event;
  const hasSpotlight = hasDriver || hasEvent;

  useEffect(() => { Analytics.pageView('Home'); }, []);

  return (
    <PageShell>
      <SeoMeta
        title="Motorsports, Culture, and Competition"
        description="HIJINX — the platform where motorsports, media, and culture collide. Discover drivers, teams, tracks, series, events, and verified results."
        noSuffix={false}
      />

      {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
      <HeroSection
        stats={hp.hero_stats}
        featuredDrivers={hp.featured_drivers}
        featuredStory={hp.featured_story}
      />

      {/* ── 2. Live Now ──────────────────────────────────────────────────── */}
      <LiveNowSection feedItems={formattedFeed.slice(0, 10)} />

      {/* ── 3. Discovery ─────────────────────────────────────────────────── */}
      <DiscoverySection
        featuredDrivers={hp.featured_drivers}
        featuredStories={hp.featured_stories}
        upcomingEvents={hp.upcoming_events}
      />

      {/* ── 4. Spotlight ─────────────────────────────────────────────────── */}
      <SpotlightSection
        spotlightDriver={hp.spotlight_driver}
        spotlightEvent={hp.spotlight_event}
        featuredStory={hp.featured_story}
      />

      {/* ── 5. Explore ───────────────────────────────────────────────────── */}
      <ExploreSection />

      {/* ── 6. Race Core ─────────────────────────────────────────────────── */}
      <RaceCoreSection
        upcomingEvents={hp.upcoming_events}
        recentResults={hp.recent_results}
      />

      {/* ── 7. Apparel ───────────────────────────────────────────────────── */}
      <ApparelSection products={hp.featured_products} />

      {/* ── 8. Movement ──────────────────────────────────────────────────── */}
      <MovementSection />

      {/* ── 9. Final CTA ─────────────────────────────────────────────────── */}
      <FinalCTASection />

    </PageShell>
  );
}