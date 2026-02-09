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

export default function DriverProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const driverSlug = urlParams.get('id');
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

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcomingEvents', driver?.id],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list();
      const today = new Date().toISOString().split('T')[0];
      return allEvents
        .filter(event => 
          event.date >= today && 
          event.status === 'upcoming' &&
          event.results?.some(r => r.driver_id === driver.id)
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5);
    },
    enabled: !!driver?.id,
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
    if (a.primary) return -1;
    if (b.primary) return 1;
    return (a.program_order || 0) - (b.program_order || 0);
  });

  const sections = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'programs', label: 'Programs', icon: Briefcase },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'media', label: 'Media', icon: Camera },
    { id: 'partnerships', label: 'Partnerships', icon: Heart },
    { id: 'community', label: 'Community', icon: Heart },
  ];

  const primaryProgram = sortedPrograms.find(p => p.primary) || sortedPrograms[0];
  const topStrengths = performance?.strengths?.slice(0, 2) || [];
  const activeTeams = [...new Set(programs.filter(p => p.team_id && p.program_status === 'Active').map(p => p.team_id))];
  const activePartnerships = partnerships.filter(p => p.active).slice(0, 4);

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <Link to={createPageUrl('DriverDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA] mb-4 inline-block">
              ← Back to Drivers
            </Link>

            <div className="flex items-start justify-between mb-2">
              <h1 className="text-4xl font-black text-[#232323]">{driver.display_name}</h1>
              <SocialShareButtons 
                url={window.location.href}
                title={`${driver.display_name} - Driver Profile`}
                description={driver.description_summary}
              />
            </div>
            
            {(driver.hometown_city || driver.hometown_state) && (
              <div className="flex items-center gap-2 text-gray-600 mb-6">
                <CountryFlag country={driver.country} />
                <MapPin className="w-4 h-4" />
                {driver.hometown_city}{driver.hometown_city && driver.hometown_state ? ', ' : ''}{driver.hometown_state}
              </div>
            )}

            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              {driver.description_summary}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs text-gray-600 mb-1">Discipline</div>
                <div className="font-bold text-[#232323]">{driver.primary_discipline}</div>
              </div>
              {primaryProgram && (
                <div className="bg-white border border-gray-200 p-4">
                  <div className="text-xs text-gray-600 mb-1">Primary Series</div>
                  <div className="font-bold text-[#232323]">{primaryProgram.series_name}</div>
                </div>
              )}
              {primaryProgram?.vehicle_number && (
                <div className="bg-white border border-gray-200 p-4">
                  <div className="text-xs text-gray-600 mb-1">Number</div>
                  <div className="font-bold text-[#232323]">#{primaryProgram.vehicle_number}</div>
                </div>
              )}
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs text-gray-600 mb-1">Status</div>
                <div className="font-bold text-[#232323]">{driver.status}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {performance?.recent_form && performance.recent_form !== 'Unknown' && (
                <Badge className="bg-[#D33F49] text-white">{performance.recent_form}</Badge>
              )}
              {topStrengths.map((strength, idx) => (
                <Badge key={idx} className="bg-[#00FFDA] text-[#232323]">{strength}</Badge>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-[#232323] mb-4">Driver Photo</h3>
              {media?.headshot_url ? (
                <div className="flex items-center justify-center bg-gray-50 p-8 border border-gray-200">
                  <img src={media.headshot_url} alt={driver.display_name} className="w-full h-auto max-w-[200px]" />
                </div>
              ) : (
                <div className="flex items-center justify-center bg-gray-50 p-12 border border-gray-200">
                  <div className="text-center text-gray-400">
                    <div className="text-4xl font-black mb-2">{driver.first_name?.[0] || ''}{driver.last_name?.[0] || ''}</div>
                    <div className="text-xs">No photo uploaded</div>
                  </div>
                </div>
              )}
            </div>

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
                        to={createPageUrl('TeamProfile', { id: team.slug })}
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
                  {sortedPrograms.slice(0, 3).map(prog => (
                    <div key={prog.id}>
                      <div className="font-semibold text-[#232323] text-sm">{prog.series_name}</div>
                      {prog.class_name && <div className="text-xs text-gray-600">{prog.class_name}</div>}
                    </div>
                  ))}
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
          <section id="section-overview" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Full Name</div>
                <div className="text-lg font-semibold text-[#232323]">{driver.first_name} {driver.last_name}</div>
              </div>
              {driver.hometown_city && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Hometown</div>
                  <div className="text-lg font-semibold text-[#232323]">
                    {driver.hometown_city}{driver.hometown_state ? `, ${driver.hometown_state}` : ''}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-600 mb-1">Primary Discipline</div>
                <div className="text-lg font-semibold text-[#232323]">{driver.primary_discipline}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Status</div>
                <Badge className={driver.status === 'Active' ? 'bg-[#00FFDA] text-[#232323]' : 'bg-gray-200 text-gray-700'}>
                  {driver.status}
                </Badge>
              </div>
            </div>
          </section>

          <section id="section-schedule" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Upcoming Events</h2>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="border border-gray-200 p-4 hover:border-[#00FFDA] transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-[#232323] mb-1">{event.name}</h3>
                        <div className="text-sm text-gray-600">
                          {event.series_name && <span>{event.series_name}</span>}
                          {event.track_name && <span className="ml-2">• {event.track_name}</span>}
                        </div>
                      </div>
                      <Badge className="bg-[#00FFDA] text-[#232323]">
                        {format(new Date(event.date), 'MMM d, yyyy')}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No upcoming events scheduled.</p>
            )}
          </section>

          <section id="section-programs" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Programs</h2>
            {sortedPrograms.length > 0 ? (
              <div className="space-y-4">
                {sortedPrograms.map(prog => {
                  const team = prog.team_id ? allTeams.find(t => t.id === prog.team_id) : null;
                  return (
                    <div key={prog.id} className="border-l-4 border-[#00FFDA] pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-bold text-[#232323]">{prog.series_name}</div>
                        {prog.primary && (
                          <Badge className="bg-[#D33F49] text-white text-xs">Primary</Badge>
                        )}
                      </div>
                      {prog.class_name && <div className="text-sm text-gray-600">{prog.class_name}</div>}
                      {team && (
                        <Link to={createPageUrl('TeamProfile', { id: team.slug })} className="text-sm text-[#00FFDA] hover:underline">
                          {team.name}
                        </Link>
                      )}
                      {prog.vehicle_number && <div className="text-sm text-gray-600">#{prog.vehicle_number}</div>}
                      {prog.seasons_active && <div className="text-sm text-gray-600">{prog.seasons_active}</div>}
                      {prog.program_status && (
                        <Badge variant="outline" className="mt-2">{prog.program_status}</Badge>
                      )}
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
                <div>
                  <h3 className="text-lg font-semibold text-[#232323] mb-3">Active</h3>
                  <div className="space-y-2">
                    {[...new Set(programs.filter(p => p.team_id && p.program_status === 'Active').map(p => p.team_id))].map(teamId => {
                      const team = allTeams.find(t => t.id === teamId);
                      if (!team) return null;
                      const teamPrograms = programs.filter(p => p.team_id === teamId && p.program_status === 'Active');
                      return (
                        <div key={teamId} className="border border-gray-200 p-4">
                          <Link to={createPageUrl('TeamProfile', { id: team.slug })} className="font-semibold text-[#232323] hover:text-[#00FFDA] transition-colors">
                            {team.name}
                          </Link>
                          <div className="text-sm text-gray-600 mt-1">
                            {teamPrograms.map(p => p.series_name).join(', ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {programs.some(p => p.team_id && p.program_status === 'Historic') && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#232323] mb-3">Historic</h3>
                    <div className="space-y-2">
                      {[...new Set(programs.filter(p => p.team_id && p.program_status === 'Historic').map(p => p.team_id))].map(teamId => {
                        const team = allTeams.find(t => t.id === teamId);
                        if (!team) return null;
                        return (
                          <Link key={teamId} to={createPageUrl('TeamProfile', { id: team.slug })} className="block text-gray-600 hover:text-[#00FFDA] transition-colors">
                            {team.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No team information available.</p>
            )}
          </section>

          <section id="section-performance" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Performance</h2>
            {performance ? (
              <>
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
                {performance.career_highlights && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 mb-2">Career Highlights</div>
                    <p className="text-gray-700">{performance.career_highlights}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {performance.strengths && performance.strengths.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Strengths</div>
                      <div className="flex flex-wrap gap-2">
                        {performance.strengths.map((strength, idx) => (
                          <Badge key={idx} className="bg-[#00FFDA] text-[#232323]">{strength}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {performance.weaknesses && performance.weaknesses.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Areas for Growth</div>
                      <div className="flex flex-wrap gap-2">
                        {performance.weaknesses.map((weakness, idx) => (
                          <Badge key={idx} variant="outline" className="border-[#D33F49] text-[#D33F49]">
                            {weakness}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
                {['Title', 'Primary', 'Associate', 'Personal', 'Local'].map(type => {
                  const typePartnerships = partnerships.filter(p => p.partner_type === type && p.active);
                  if (typePartnerships.length === 0) return null;
                  return (
                    <div key={type} className="mb-6">
                      <h3 className="text-lg font-semibold text-[#232323] mb-3">{type} Partners</h3>
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