import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MapPin, ExternalLink, TrendingUp, Users, Heart, Camera, Briefcase, Calendar, Share2, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import SocialIconsDisplay from '@/components/teams/SocialIconsDisplay';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import CountryFlag from '@/components/shared/CountryFlag';
import { createPageUrl } from '@/components/utils';
import { buildProfileUrl } from '@/components/utils/routingContract';

export default function DriverProfile() {
  const urlParams = new URLSearchParams(window.location.search);
    const firstName = urlParams.get('first')?.trim().toLowerCase();
    const lastName = urlParams.get('last')?.trim().toLowerCase();

    if (!firstName || !lastName) {
      return (
        <PageShell className="bg-[#FFF8F5]">
          <div className="max-w-7xl mx-auto px-6 py-12 text-center">
            <p className="text-gray-600 mb-4">Driver not found</p>
            <Link to={createPageUrl('DriverDirectory')}>
              <Button>Back to Drivers</Button>
            </Link>
          </div>
        </PageShell>
      );
    }
    const [activeSection, setActiveSection] = useState('overview');

    React.useEffect(() => {
      window.scrollTo(0, 0);
      setActiveSection('overview');
    }, [firstName, lastName]);

    const { data: drivers = [], isLoading } = useQuery({
      queryKey: ['drivers'],
      queryFn: () => base44.entities.Driver.list(),
    });

    const driver = drivers.find(d => 
      d.first_name?.toLowerCase() === firstName && 
      d.last_name?.toLowerCase() === lastName
    );



  const { data: performance } = useQuery({
    queryKey: ['driverPerformance', driver?.id],
    queryFn: async () => {
      const results = await base44.entities.DriverPerformance.filter({ driver_id: driver.id });
      return results[0] || null;
    },
    enabled: !!driver?.id,
  });

  const { data: partnerships = [] } = useQuery({
    queryKey: ['driverPartnerships', driver?.id],
    queryFn: () => base44.entities.DriverPartnership.filter({ driver_id: driver.id }),
    enabled: !!driver?.id,
  });

  const { data: media } = useQuery({
    queryKey: ['driverMedia', driver?.id],
    queryFn: async () => {
      const results = await base44.entities.DriverMedia.filter({ driver_id: driver.id });
      return results[0] || null;
    },
    enabled: !!driver?.id,
  });

  const { data: community } = useQuery({
    queryKey: ['driverCommunity', driver?.id],
    queryFn: async () => {
      const results = await base44.entities.DriverCommunity.filter({ driver_id: driver.id });
      return results[0] || null;
    },
    enabled: !!driver?.id,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['driverPrograms', driver?.id],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: driver.id }),
    enabled: !!driver?.id,
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const getSeriesName = (seriesId) => {
    return allSeries.find(s => s.id === seriesId)?.name || 'N/A';
  };



  if (isLoading) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-96" />
        </div>
      </PageShell>
    );
  }

  if (!driver) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-600 mb-4">Driver not found</p>
          <Link to={createPageUrl('DriverDirectory')}>
            <Button>Back to Drivers</Button>
          </Link>
        </div>
      </PageShell>
    );
  }



  const sections = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'social', label: 'Social Media', icon: Share2 },
  ];

  const topSpecialties = performance?.specialties?.slice(0, 2) || [];
  const activePartnerships = partnerships.filter(p => p.active).slice(0, 4);

  return (
    <PageShell className="bg-white">
      {media?.hero_image_url && (
        <div className="w-full h-[400px] relative overflow-hidden">
          <img 
            src={media.hero_image_url} 
            alt={driver.display_name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link to={createPageUrl('DriverDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA] mb-4 inline-block">
          ← Back to Drivers
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
          <div className="lg:col-span-2">
            <Separator className="mb-3" />
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <CountryFlag country={driver.hometown_country} />
                <h1 className="text-4xl font-black text-[#232323] leading-none">{driver.first_name} {driver.last_name}</h1>
              </div>
              {driver.primary_number && (
                <div className="text-4xl font-black text-[#232323] leading-none">#{driver.primary_number}</div>
              )}
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-3">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      if (section.id === 'overview') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        const element = document.getElementById(`section-${section.id}`);
                        if (element) {
                          const offset = element.getBoundingClientRect().top + window.pageYOffset - 120;
                          window.scrollTo({ top: offset, behavior: 'smooth' });
                        }
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                      activeSection === section.id
                        ? 'text-[#232323] border-b-2 border-[#00FFDA]'
                        : 'text-gray-600 hover:text-[#232323]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center mb-4">
              <SocialIconsDisplay media={media} />
            </div>

            <Separator className="mb-3" />
            <div className="bg-white p-8 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Age</div>
                    <div className="text-lg font-semibold text-[#232323]">
                      {driver.date_of_birth ? new Date().getFullYear() - new Date(driver.date_of_birth).getFullYear() : 'N/A'}
                    </div>
                  </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <Home className="w-4 h-4" />
                    Hometown
                  </div>
                  <div className="flex items-center gap-2">
                    <CountryFlag country={driver.hometown_country} />
                    <div className="text-lg font-semibold text-[#232323]">
                      {driver.hometown_city}{driver.hometown_state ? `, ${driver.hometown_state}` : ''}, {driver.hometown_country}
                    </div>
                  </div>
                </div>
                {driver.location_city && (
                  <div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                      <MapPin className="w-4 h-4" />
                      Location
                    </div>
                    <div className="text-lg font-semibold text-[#232323]">
                      {driver.location_city}{driver.location_state ? `, ${driver.location_state}` : ''} • {driver.location_country}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-600 mb-1">Primary Discipline</div>
                  <div className="text-lg font-semibold text-[#232323]">{driver.primary_discipline}</div>
                </div>
                {driver.class_name && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Class</div>
                    <div className="text-lg font-semibold text-[#232323]">{driver.class_name}</div>
                  </div>
                )}
                {programs.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Series</div>
                    <div className="text-lg font-semibold text-[#232323]">
                      {getSeriesName(programs[0].series_id)}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-6">
                {performance?.recent_form && performance.recent_form !== 'Unknown' && (
                  <Badge className="bg-[#D33F49] text-white">{performance.recent_form}</Badge>
                )}
                {topSpecialties.map((specialty, idx) => (
                  <Badge key={idx} className="bg-[#00FFDA] text-[#232323]">{specialty}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 relative -mt-1">
            <div className="absolute -top-12 right-0 z-10">
              <SocialShareButtons 
                url={window.location.href}
                title={`${driver.first_name} ${driver.last_name} - Driver Profile`}
                description=""
              />
            </div>
            {media?.headshot_url && (
              <div className="bg-white">

                <div className="w-full h-[320px] relative bg-gray-50 overflow-hidden">
                  <img src={media.headshot_url} alt={`${driver.first_name} ${driver.last_name}`} className="w-full h-full object-cover" />
                </div>
              </div>
            )}



            {activePartnerships.length > 0 && (
              <div className="bg-white p-6">
                <h3 className="text-sm font-bold text-[#232323] mb-4">Key Partners</h3>
                <div className="space-y-2">
                  {activePartnerships.map(partner => (
                    <div key={partner.id} className="text-sm text-gray-700">{partner.partner_name}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <section id="section-social" className="bg-white p-8">
            <Separator className="mb-3" />
            <h2 className="text-2xl font-bold text-[#232323] mb-6 mt-3">Social Media</h2>
            {media && (media.instagram || media.facebook || media.tiktok || media.x || media.threads || media.youtube || media.website) ? (
              <div className="flex flex-col items-center gap-6">
                <div className="flex justify-center">
                  <SocialIconsDisplay media={media} />
                </div>
                <div className="text-sm text-gray-600 text-center">
                  Connect with {driver.first_name} on social media
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No social media information available.</p>
            )}
          </section>

        </div>
      </div>
    </PageShell>
  );
}