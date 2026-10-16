/**
 * RacerProfile.jsx
 *
 * Canonical public racer profile — /racers/:slug
 *
 * ARCHITECTURE (locked):
 *   canonical RaceCore data
 *     → getRacerProfileExperience   (single read: resolves, computes, projects)
 *     → privacy-safe projections
 *     → INDEX46 public presentation (five client-side views)
 *
 * The page performs NO browser-side entity queries and NO per-view fetching.
 * Changing view is a presentation change, never a new profile resolution.
 * The five views are client-side only: the route, canonical URL, slug
 * resolution, historical aliases and the /drivers/:slug redirect are untouched.
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import SeoMeta, { buildEntityTitle, SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import JsonLd from '@/components/shared/JsonLd';
import Analytics from '@/components/system/analyticsTracker';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { applyDefaultQueryOptions, applyExperienceQueryOptions } from '@/components/utils/queryDefaults';
import PageShell from '@/components/shared/PageShell';
import MobileBackHeader from '@/components/shared/MobileBackHeader';
import EntityBreadcrumbs from '@/components/shared/EntityBreadcrumbs';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { EntityNotFound, EntityUnavailable } from '@/components/data/EntityNotFoundState';
import { Skeleton } from '@/components/ui/skeleton';
import RacerIdentityHeader from '@/components/racerprofile/RacerIdentityHeader';
import RacerViewNav from '@/components/racerprofile/RacerViewNav';
import OverviewView from '@/components/racerprofile/views/OverviewView';
import RacingView from '@/components/racerprofile/views/RacingView';
import CareerView from '@/components/racerprofile/views/CareerView';
import MediaView from '@/components/racerprofile/views/MediaView';
import PartnersView from '@/components/racerprofile/views/PartnersView';

const DQ = applyDefaultQueryOptions();

export const RacerProfileRouteContext = createContext(null);

export function RacerProfileRouteWrapper() {
  const { slug } = useParams();
  return (
    <RacerProfileRouteContext.Provider value={{ slug }}>
      <RacerProfile />
    </RacerProfileRouteContext.Provider>
  );
}

export default function RacerProfile() {
  const { slug: routeSlug } = useContext(RacerProfileRouteContext) || {};
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState('overview');

  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveView('overview');
  }, [routeSlug]);

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    ...DQ,
  });
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
    ...DQ,
  });

  // The viewer's identity decides whether a draft profile may be shown, so the
  // experience request must not fire before that is known: on a cold page load
  // it would ask as an anonymous visitor, get "RacerProfile not found" for a
  // draft racer, and cache that answer for the rest of the session.
  const isAdminViewer = user?.role === 'admin';
  const viewerResolved = isAuthenticated !== undefined && (isAuthenticated === false || user !== undefined);

  // Single source of truth for the whole profile: the computed experience
  // (timeline, statistics, achievements, history, partners, SEO) AND the
  // public-safe page dataset that backs the five views.
  const { data: experienceData, isLoading } = useQuery({
    queryKey: ['racerProfileExperience', routeSlug, isAdminViewer],
    queryFn: () =>
      base44.functions.invoke('getRacerProfileExperience', { slug: routeSlug, allow_draft: isAdminViewer }),
    enabled: !!routeSlug && viewerResolved,
    ...applyExperienceQueryOptions(),
  });

  const experience = experienceData?.data || experienceData || null;
  const pageData = experience?.page_data || null;

  const racerProfile = pageData?.racerProfile ?? null;
  const identity = pageData?.identity ?? null;
  const legacyDriver = pageData?.legacyDriver ?? null;
  const media = pageData?.media ?? null;
  const careerStats = pageData?.careerStats ?? null;
  const participations = pageData?.participations ?? [];
  const entries = pageData?.entries ?? [];
  const results = pageData?.results ?? [];
  const standings = pageData?.standings ?? [];
  const allSeries = pageData?.series ?? [];
  const allClasses = pageData?.classes ?? [];
  const allEvents = pageData?.events ?? [];
  const allTracks = pageData?.tracks ?? [];
  const allSessions = pageData?.sessions ?? [];

  const currentContext = experience?.current_context || pageData?.current_context || null;
  const timeline = experience?.timeline ?? [];
  const statistics = experience?.statistics ?? null;
  const achievements = experience?.achievements ?? [];
  const teamHistory = experience?.team_history ?? [];
  const mediaEcosystem = experience?.media_ecosystem ?? null;
  const sponsorshipData = experience?.sponsorships ?? [];
  const sponsorPresentation = experience?.sponsor_presentation ?? null;

  const galleryPhotos = mediaEcosystem?.gallery_photos || media?.gallery_urls || [];
  const heroImage = racerProfile?.hero_image_url || mediaEcosystem?.hero_image_url || media?.hero_image_url || null;
  const portraitImage = racerProfile?.profile_image_url || mediaEcosystem?.headshot_url || media?.headshot_url || null;
  const highlightVideoUrl = media?.highlight_video_url || null;

  // Profile management is gated by the SERVER-computed permission flag, which
  // is true for an approved owner, an approved manager or an admin. The public
  // page never exposes claim or ownership state.
  const canManage = identity?.can_manage === true;

  useEffect(() => {
    if (racerProfile) {
      Analytics.profileViewDriver(
        racerProfile.id,
        racerProfile.display_name || '',
        racerProfile.primary_discipline || legacyDriver?.primary_discipline
      );
    }
  }, [racerProfile?.id]);

  if (!routeSlug) {
    return (
      <PageShell className="bg-canvas">
        <div className="mx-auto max-w-7xl px-6 py-12 text-center">
          <p className="mb-4 text-foreground-secondary">No racer specified.</p>
          <Link to="/Directory?cat=racers" className="text-sm text-motion underline">
            ← Back to Racers
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!viewerResolved || isLoading) {
    return (
      <PageShell className="bg-canvas">
        <Skeleton className="h-[360px] w-full" />
        <div className="mx-auto max-w-7xl space-y-4 px-6 py-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageShell>
    );
  }

  if (!racerProfile) {
    if (experience?.error === 'Profile not public') return <EntityUnavailable entityType="Racer" />;
    return <EntityNotFound entityType="Racer" />;
  }

  const fullName = racerProfile.display_name || `${legacyDriver?.first_name || ''} ${legacyDriver?.last_name || ''}`;
  const hometown = [racerProfile.hometown_city, racerProfile.hometown_state, racerProfile.hometown_country]
    .filter(Boolean)
    .join(', ');
  const racerDesc =
    experience?.seo?.description ||
    [racerProfile.primary_discipline, hometown ? `from ${hometown}` : ''].filter(Boolean).join(' · ');

  return (
    <PageShell className="bg-canvas">
      <SeoMeta
        title={buildEntityTitle(fullName, 'Racer Profile')}
        description={racerDesc}
        image={heroImage || portraitImage || SITE_FALLBACK_IMAGE}
        type="profile"
      />
      <JsonLd data={experience?.seo?.structured_data} extra={experience?.seo?.structured_data_extra} />

      <PullToRefresh
        onRefresh={async () => {
          await queryClient.invalidateQueries({ queryKey: ['racerProfileExperience', routeSlug] });
        }}
      >
        <MobileBackHeader tone="dark" title={fullName} to="/Directory?cat=racers" />

        {isAdminViewer && racerProfile.visibility !== 'live' && (
          <div className="border-b border-warning/40 bg-warning/10 px-6 py-2 text-center">
            <span className="text-xs font-semibold tracking-wide text-warning">
              ADMIN PREVIEW — This profile is {racerProfile.visibility} and not visible to the public.
            </span>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <EntityBreadcrumbs entityType="Racer" entityName={fullName} />
        </div>

        <RacerIdentityHeader
          experience={experience}
          racerProfile={racerProfile}
          identity={identity}
          legacyDriver={legacyDriver}
          media={media}
          currentContext={currentContext}
          user={user}
          routeSlug={routeSlug}
          canManage={canManage}
          onEditSaved={() => queryClient.invalidateQueries({ queryKey: ['racerProfileExperience', routeSlug] })}
        />

        <RacerViewNav active={activeView} onChange={setActiveView} />

        {activeView === 'overview' && (
          <OverviewView
            racerName={fullName}
            currentContext={currentContext}
            timeline={timeline}
            careerStats={careerStats}
            statistics={statistics}
            mediaEcosystem={mediaEcosystem}
            media={media}
            racerProfile={racerProfile}
            legacyDriver={legacyDriver}
            sponsorships={sponsorshipData}
            sponsorPresentation={sponsorPresentation}
          />
        )}

        {activeView === 'racing' && (
          <RacingView
            participations={participations}
            results={results}
            standings={standings}
            entries={entries}
            allEvents={allEvents}
            allSessions={allSessions}
            allTracks={allTracks}
            allSeries={allSeries}
            allClasses={allClasses}
            statistics={statistics}
            currentContext={currentContext}
          />
        )}

        {activeView === 'career' && (
          <CareerView
            statistics={statistics}
            participations={participations}
            teamHistory={teamHistory}
            careerEntries={pageData?.careerEntries ?? []}
            allSeries={allSeries}
            allClasses={allClasses}
            achievements={achievements}
            galleryPhotos={galleryPhotos}
            heroImage={heroImage}
            portraitImage={portraitImage}
            racerName={fullName}
          />
        )}

        {activeView === 'media' && (
          <MediaView
            galleryPhotos={galleryPhotos}
            heroImage={heroImage}
            portraitImage={portraitImage}
            highlightVideoUrl={highlightVideoUrl}
            racerName={fullName}
          />
        )}

        {activeView === 'partners' && (
          <PartnersView sponsorships={sponsorshipData} sponsorPresentation={sponsorPresentation} />
        )}
      </PullToRefresh>
    </PageShell>
  );
}