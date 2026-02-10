import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, ExternalLink, TrendingUp, Users, Heart, Camera, Briefcase, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import SocialIconsDisplay from '@/components/teams/SocialIconsDisplay';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import CountryFlag from '@/components/shared/CountryFlag';
import { createPageUrl } from '@/components/utils';
import { buildProfileUrl } from '@/components/utils/routingContract';

export default function DriverProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const driverSlug = urlParams.get('slug');
  const [activeSection, setActiveSection] = useState('overview');

  React.useEffect(() => {
    window.scrollTo(0, 0);
    setActiveSection('overview');
  }, [driverSlug]);

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const driver = drivers.find(d => d.slug === driverSlug);

  const { data: programs = [] } = useQuery({
    queryKey: ['driverPrograms', driver?.id],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: driver.id }),
    enabled: !!driver?.id,
  });

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

  const { data: allTeams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  if (isLoading) {
    return (
      <PageShell className="bg-[#FFF8F5]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-96" />
        </div>
      </PageShell>
    );
  }

  if (!driver) {
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

  const sortedPrograms = [...programs].sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return 0;
  });

  const sections = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'programs', label: 'Programs', icon: Briefcase },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'media', label: 'Media', icon: Camera },
    { id: 'partnerships', label: 'Partnerships', icon: Heart },
    { id: 'community', label: 'Community', icon: Heart },
  ];

  const primaryProgram = sortedPrograms.find(p => p.is_primary) || sortedPrograms[0];
  const topSpecialties = performance?.specialties?.slice(0, 2) || [];
  const activeTeams = [...new Set(programs.filter(p => p.team_id && p.program_status === 'Active').map(p => p.team_id))];
  const activePartnerships = partnerships.filter(p => p.active).slice(0, 4);

  const seriesMap = allSeries.reduce((acc, series) => {
    acc[series.id] = series;
    return acc;
  }, {});

  const teamMap = allTeams.reduce((acc, team) => {
    acc[team.id] = team;
    return acc;
  }, {});

  return (
    <PageShell className="bg-[#FFF8F5]">
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

      <div className="sticky top-16 lg:top-[calc(4rem+41px)] bg-white border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link to={createPageUrl('DriverDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA] mb-4 inline-block">
          ← Back to Drivers
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-4xl font-black text-[#232323]">{driver.first_name} {driver.last_name}</h1>
              <SocialShareButtons 
                url={window.location.href}
                title={`${driver.first_name} ${driver.last_name} - Driver Profile`}
                description=""
              />
            </div>

            <div className="bg-white border border-gray-200 p-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Date of Birth</div>
                  <div className="text-lg font-semibold text-[#232323]">
                    {driver.date_of_birth && format(new Date(driver.date_of_birth), 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Hometown</div>
                  <div className="flex items-center gap-2">
                    <CountryFlag country={driver.hometown_country} />
                    <div className="text-lg font-semibold text-[#232323]">
                      {driver.hometown_city}{driver.hometown_state ? `, ${driver.hometown_state}` : ''}, {driver.hometown_country}
                    </div>
                  </div>
                </div>
                {driver.location_city && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Current Racing Base</div>
                    <div className="text-lg font-semibold text-[#232323]">
                      {driver.location_city}{driver.location_state ? `, ${driver.location_state}` : ''} • {driver.location_country}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-600 mb-1">Primary Discipline</div>
                  <div className="text-lg font-semibold text-[#232323]">{driver.primary_discipline}</div>
                </div>
                {primaryProgram && seriesMap[primaryProgram.series_id] && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Primary Series</div>
                    <div className="text-lg font-semibold text-[#232323]">{seriesMap[primaryProgram.series_id].name}</div>
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

          <div className="space-y-6">
            {media?.headshot_url && (
              <div className="bg-white border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-[#232323] mb-4">Driver Photo</h3>
                <div className="flex items-center justify-center bg-gray-50 p-8 border border-gray-200">
                  <img src={media.headshot_url} alt={`${driver.first_name} ${driver.last_name}`} className="w-full h-auto max-w-[200px]" />
                </div>
              </div>
            )}

            {activeTeams.length > 0 && (
              <div className="bg-white border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-[#232323] mb-4">Current Teams</h3>
                <div className="space-y-2">
                  {activeTeams.map(teamId => {
                    const team = allTeams.find(t => t.id === teamId);
                    if (!team) return null;
                    return (
                      <Link 
                        key={teamId}
                        to={buildProfileUrl('Team', team.slug)}
                        className="block text-[#232323] hover:text-[#00FFDA] transition-colors"
                      >
                        {team.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {sortedPrograms.length > 0 && (
              <div className="bg-white border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-[#232323] mb-4">Active Programs</h3>
                <div className="space-y-3">
                  {sortedPrograms.filter(p => p.program_status === 'Active').slice(0, 3).map(prog => {
                    const series = seriesMap[prog.series_id];
                    return (
                      <div key={prog.id}>
                        <div className="font-semibold text-[#232323] text-sm">{series?.name || 'Series'}</div>
                        {prog.class_name && <div className="text-xs text-gray-600">{prog.class_name}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activePartnerships.length > 0 && (
              <div className="bg-white border border-gray-200 p-6">
                <h3 className="text-sm font-bold text-[#232323] mb-4">Key Partners</h3>
                <div className="space-y-2">
                  {activePartnerships.map(partner => (
                    <div key={partner.id} className="text-sm text-gray-700">{partner.partner_name}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-[#232323] mb-4">Connect</h3>
              <div className="flex justify-center">
                <SocialIconsDisplay media={media} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <section id="section-programs" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Programs</h2>
            {sortedPrograms.length > 0 ? (
              <div className="space-y-6">
                {['Active', 'Past'].map(status => {
                  const statusPrograms = sortedPrograms.filter(p => p.program_status === status);
                  if (statusPrograms.length === 0) return null;
                  return (
                    <div key={status}>
                      <h3 className="text-lg font-semibold text-[#232323] mb-3">{status} Programs</h3>
                      <div className="space-y-4">
                        {statusPrograms.map(prog => {
                          const series = seriesMap[prog.series_id];
                          const team = prog.team_id ? teamMap[prog.team_id] : null;
                          const seasonRange = prog.season_end_year ? `${prog.season_start_year}–${prog.season_end_year}` : `${prog.season_start_year}–Present`;
                          return (
                            <div key={prog.id} className="border-l-4 border-[#00FFDA] pl-4">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-bold text-[#232323]">{series?.name || 'Series'}</div>
                                {prog.is_primary && (
                                  <Badge className="bg-[#D33F49] text-white text-xs">Primary</Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">#{prog.bib_number} • {prog.class_name}</div>
                              {team && (
                                <Link to={buildProfileUrl('Team', team.slug)} className="text-sm text-[#00FFDA] hover:underline">
                                  {team.name}
                                </Link>
                              )}
                              <div className="text-sm text-gray-600 mt-1">{seasonRange}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No programs available.</p>
            )}
          </section>

          <section id="section-teams" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Teams</h2>
            {programs.some(p => p.team_id) ? (
              <div className="space-y-6">
                {['Active', 'Past'].map(status => {
                  const teamIds = [...new Set(programs.filter(p => p.team_id && p.program_status === status).map(p => p.team_id))];
                  if (teamIds.length === 0) return null;
                  return (
                    <div key={status}>
                      <h3 className="text-lg font-semibold text-[#232323] mb-3">{status} Teams</h3>
                      <div className="space-y-2">
                        {teamIds.map(teamId => {
                          const team = teamMap[teamId];
                          if (!team) return null;
                          const teamPrograms = programs.filter(p => p.team_id === teamId && p.program_status === status);
                          return (
                            <div key={teamId} className="border border-gray-200 p-4">
                              <Link to={buildProfileUrl('Team', team.slug)} className="font-semibold text-[#232323] hover:text-[#00FFDA] transition-colors">
                                {team.name}
                              </Link>
                              <div className="text-sm text-gray-600 mt-1">
                                {teamPrograms.map(p => {
                                  const series = seriesMap[p.series_id];
                                  return series?.name || 'Series';
                                }).join(', ')}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No team information available.</p>
            )}
          </section>

          <section id="section-performance" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Performance</h2>
            {performance ? (
              <>
                {performance.recent_form && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-2">Current Form</div>
                    <Badge className={
                      performance.recent_form === 'Hot' ? 'bg-red-500 text-white' :
                      performance.recent_form === 'Steady' ? 'bg-blue-500 text-white' :
                      'bg-orange-500 text-white'
                    }>
                      {performance.recent_form}
                    </Badge>
                  </div>
                )}
                {performance.highlights && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-2">Highlights</div>
                    <p className="text-gray-700">{performance.highlights}</p>
                  </div>
                )}
                {performance.championships && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-2">Championships</div>
                    <p className="text-gray-700">{performance.championships}</p>
                  </div>
                )}
                {performance.notable_wins && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-2">Notable Wins</div>
                    <p className="text-gray-700">{performance.notable_wins}</p>
                  </div>
                )}
                {performance.specialties && performance.specialties.length > 0 && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-2">Specialties</div>
                    <div className="flex flex-wrap gap-2">
                      {performance.specialties.map((specialty, idx) => (
                        <Badge key={idx} className="bg-[#00FFDA] text-[#232323]">{specialty}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500">No performance information available.</p>
            )}
          </section>

          <section id="section-media" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Media</h2>
            {media && (media.gallery_urls?.length > 0 || media.highlight_video_url) ? (
              <>
                {media.gallery_urls && media.gallery_urls.length > 0 && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-2">Gallery</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {media.gallery_urls.map((url, idx) => (
                        <img key={idx} src={url} alt={`Gallery ${idx + 1}`} className="w-full border border-gray-200" />
                      ))}
                    </div>
                  </div>
                )}
                {media.highlight_video_url && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-2">Highlight Video</div>
                    <div className="aspect-video">
                      <iframe
                        src={media.highlight_video_url}
                        className="w-full h-full border border-gray-200"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500">No media available.</p>
            )}
          </section>

          <section id="section-partnerships" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Partnerships</h2>
            {partnerships.length > 0 ? (
              <>
                {['Primary Sponsor', 'Associate Sponsor', 'Technical Partner', 'Equipment', 'Media'].map(type => {
                  const typePartnerships = partnerships.filter(p => p.partner_type === type && p.active);
                  if (typePartnerships.length === 0) return null;
                  return (
                    <div key={type} className="mb-6">
                      <h3 className="text-lg font-semibold text-[#232323] mb-3">{type}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {typePartnerships.map(partner => (
                          <div key={partner.id}>
                            {partner.website_url ? (
                              <a
                                href={partner.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-[#232323] hover:text-[#00FFDA] transition-colors"
                              >
                                {partner.partner_name}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <div className="text-[#232323]">{partner.partner_name}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-gray-500">No partnership information available.</p>
            )}
          </section>

          <section id="section-community" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Community</h2>
            {community ? (
              <>
                {community.youth_programs && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-2">Youth Programs</div>
                    <p className="text-gray-700">{community.youth_programs}</p>
                  </div>
                )}
                {community.charity_involvement && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-2">Charity Involvement</div>
                    <p className="text-gray-700">{community.charity_involvement}</p>
                  </div>
                )}
                {community.community_notes && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-2">Community Notes</div>
                    <p className="text-gray-700">{community.community_notes}</p>
                  </div>
                )}
                {community.legacy_notes && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Legacy</div>
                    <p className="text-gray-700">{community.legacy_notes}</p>
                  </div>
                )}
                {!community.youth_programs && !community.charity_involvement && !community.community_notes && !community.legacy_notes && (
                  <p className="text-gray-500">No community information available.</p>
                )}
              </>
            ) : (
              <p className="text-gray-500">No community information available.</p>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}