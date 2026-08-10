import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertTriangle } from 'lucide-react';
import SeoMeta from '@/components/system/seoMeta';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import SponsorHero from '@/components/sponsor/SponsorHero';
import SponsorSidebar from '@/components/sponsor/SponsorSidebar';
import SponsorOverview from '@/components/sponsor/SponsorOverview';
import SponsorPartnerships from '@/components/sponsor/SponsorPartnerships';
import SponsorEntityGrid from '@/components/sponsor/SponsorEntityGrid';
import SponsorActivationTimeline from '@/components/sponsor/SponsorActivationTimeline';
import SponsorStatistics from '@/components/sponsor/SponsorStatistics';
import SponsorCommercialSummary from '@/components/sponsor/SponsorCommercialSummary';
import SponsorMediaSummary from '@/components/sponsor/SponsorMediaSummary';
import SponsorAssets from '@/components/sponsor/SponsorAssets';
import SponsorTimeline from '@/components/sponsor/SponsorTimeline';

export default function SponsorProfile() {
  const { entityId, section = 'overview' } = useParams();
  const [activeSection, setActiveSection] = useState(section);

  useEffect(() => { setActiveSection(section); }, [section]);

  const expQ = useQuery({
    queryKey: ['sponsorExperience', entityId],
    queryFn: async () => {
      const res = await base44.functions.invoke('getSponsorExperience', { organization_id: entityId });
      return res.data;
    },
    enabled: Boolean(entityId),
  });

  if (expQ.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'hsl(var(--motion))' }} />
      </div>
    );
  }

  if (expQ.error || !expQ.data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <AlertTriangle className="w-6 h-6 mb-2" style={{ color: 'hsl(var(--danger))' }} />
        <p className="text-sm" style={{ color: 'hsl(var(--foreground-secondary))' }}>Sponsor not found.</p>
      </div>
    );
  }

  const data = expQ.data;
  const org = data.organization;
  const seo = data.seo;

  return (
    <>
      <SeoMeta title={seo?.title} description={seo?.description} image={seo?.image} url={seo?.url} type="organization" />
      {seo?.structured_data && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.structured_data) }} />
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <SponsorHero org={org} settings={data.settings} statistics={data.statistics} sharing={data.sharing} />

        <div className="flex flex-col lg:flex-row gap-6">
          <SponsorSidebar
            entityId={entityId}
            activeSection={activeSection}
            statistics={data.statistics}
          />
          <div className="flex-1 min-w-0">
            {activeSection === 'overview' && (
              <SponsorOverview org={org} settings={data.settings} statistics={data.statistics} commercialSummary={data.commercial_summary} completeness={data.completeness} />
            )}
            {activeSection === 'partnerships' && (
              <SponsorPartnerships sponsorships={data.sponsorships} />
            )}
            {activeSection === 'racers' && (
              <SponsorEntityGrid entities={data.sponsored_racers} entityType="racers" title="Sponsored Racers" />
            )}
            {activeSection === 'teams' && (
              <SponsorEntityGrid entities={data.sponsored_teams} entityType="teams" title="Sponsored Teams" />
            )}
            {activeSection === 'vehicles' && (
              <SponsorEntityGrid entities={data.sponsored_vehicles} entityType="vehicles" title="Sponsored Vehicles" />
            )}
            {activeSection === 'series' && (
              <SponsorEntityGrid entities={data.sponsored_series} entityType="series" title="Sponsored Series" />
            )}
            {activeSection === 'events' && (
              <SponsorEntityGrid entities={data.sponsored_events} entityType="events" title="Sponsored Events" />
            )}
            {activeSection === 'tracks' && (
              <SponsorEntityGrid entities={data.sponsored_tracks} entityType="tracks" title="Sponsored Tracks" />
            )}
            {activeSection === 'media' && (
              <SponsorMediaSummary mediaSummary={data.media_summary} />
            )}
            {activeSection === 'activations' && (
              <SponsorActivationTimeline activations={data.activations} />
            )}
            {activeSection === 'timeline' && (
              <SponsorTimeline timeline={data.timeline} />
            )}
            {activeSection === 'statistics' && (
              <SponsorStatistics statistics={data.statistics} commercialSummary={data.commercial_summary} />
            )}
            {activeSection === 'assets' && (
              <SponsorAssets assets={data.assets} />
            )}
            {activeSection === 'about' && (
              <SponsorOverview org={org} settings={data.settings} statistics={data.statistics} commercialSummary={data.commercial_summary} completeness={data.completeness} aboutOnly />
            )}
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <SocialShareButtons url={seo?.url} title={seo?.title} description={seo?.description} />
        </div>
      </div>
    </>
  );
}