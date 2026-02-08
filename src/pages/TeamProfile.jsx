import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import DriverHeroCard from '@/components/teams/DriverHeroCard';
import DriverModal from '@/components/teams/DriverModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, ExternalLink, TrendingUp, Users, Heart, Settings, Camera, Briefcase, Instagram, Youtube, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function TeamProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const teamSlug = urlParams.get('id');
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState(null);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const team = teams.find(t => t.slug === teamSlug);

  const { data: programs = [] } = useQuery({
    queryKey: ['teamPrograms', team?.id],
    queryFn: () => base44.entities.TeamProgram.filter({ team_id: team.id }),
    enabled: !!team?.id,
  });

  const { data: roster = [] } = useQuery({
    queryKey: ['teamRoster', team?.id],
    queryFn: () => base44.entities.TeamRoster.filter({ team_id: team.id }),
    enabled: !!team?.id,
  });

  const { data: performance } = useQuery({
    queryKey: ['teamPerformance', team?.id],
    queryFn: async () => {
      const results = await base44.entities.TeamPerformance.filter({ team_id: team.id });
      return results[0];
    },
    enabled: !!team?.id,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['teamPartners', team?.id],
    queryFn: () => base44.entities.TeamPartner.filter({ team_id: team.id }),
    enabled: !!team?.id,
  });

  const { data: media } = useQuery({
    queryKey: ['teamMedia', team?.id],
    queryFn: async () => {
      const results = await base44.entities.TeamMedia.filter({ team_id: team.id });
      return results[0];
    },
    enabled: !!team?.id,
  });

  const { data: operations } = useQuery({
    queryKey: ['teamOperations', team?.id],
    queryFn: async () => {
      const results = await base44.entities.TeamOperations.filter({ team_id: team.id });
      return results[0];
    },
    enabled: !!team?.id,
  });

  const { data: community } = useQuery({
    queryKey: ['teamCommunity', team?.id],
    queryFn: async () => {
      const results = await base44.entities.TeamCommunity.filter({ team_id: team.id });
      return results[0];
    },
    enabled: !!team?.id,
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

  if (!team) {
    return (
      <PageShell className="bg-[#FFF8F5]">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-600 mb-4">Team not found</p>
          <Link to={createPageUrl('TeamsDirectory')}>
            <Button>Back to Teams</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  const drivers = roster.filter(r => r.role === 'Driver' && r.active);
  const sortedPrograms = [...programs].sort((a, b) => {
    if (a.primary) return -1;
    if (b.primary) return 1;
    return (a.program_order || 0) - (b.program_order || 0);
  });

  const programsWithDrivers = sortedPrograms.filter(p => 
    drivers.some(d => d.program_id === p.id)
  );

  const getDriversForProgram = (programId) => {
    return drivers
      .filter(d => d.program_id === programId)
      .sort((a, b) => {
        if (a.card_priority !== b.card_priority) {
          return (a.card_priority || 50) - (b.card_priority || 50);
        }
        return (a.person_name || '').localeCompare(b.person_name || '');
      });
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'programs', label: 'Programs', icon: Briefcase },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'roster', label: 'Roster', icon: Users },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'partners', label: 'Partners', icon: Heart },
    { id: 'media', label: 'Media', icon: Camera },
    { id: 'operations', label: 'Operations', icon: Settings },
    { id: 'community', label: 'Community', icon: Heart },
  ];

  const primaryPrograms = sortedPrograms.filter(p => p.primary || sortedPrograms.indexOf(p) < 3).slice(0, 3);
  const activePartners = partners.filter(p => p.active).slice(0, 4);
  const topStrengths = performance?.strengths?.slice(0, 2) || [];

  return (
    <PageShell className="bg-[#FFF8F5]">
      {media?.hero_image_url && (
        <div className="w-full h-[400px] relative overflow-hidden">
          <img 
            src={media.hero_image_url} 
            alt={team.name}
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
                    document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth' });
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
            <Link to={createPageUrl('TeamsDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA] mb-4 inline-block">
              ← Back to Teams
            </Link>

            <h1 className="text-4xl font-black text-[#232323] mb-2">{team.name}</h1>
            
            {team.headquarters_city && team.headquarters_state && (
              <div className="flex items-center gap-2 text-gray-600 mb-6">
                <MapPin className="w-4 h-4" />
                {team.headquarters_city}, {team.headquarters_state}
              </div>
            )}

            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              {team.description_summary}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {team.founded_year && (
                <div className="bg-white border border-gray-200 p-4">
                  <div className="text-xs text-gray-600 mb-1">Founded</div>
                  <div className="font-bold text-[#232323]">{team.founded_year}</div>
                </div>
              )}
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs text-gray-600 mb-1">Level</div>
                <div className="font-bold text-[#232323]">{team.team_level}</div>
              </div>
              <div className="bg-white border border-gray-200 p-4">
                <div className="text-xs text-gray-600 mb-1">Discipline</div>
                <div className="font-bold text-[#232323]">{team.primary_discipline}</div>
              </div>
              {team.ownership_type && (
                <div className="bg-white border border-gray-200 p-4">
                  <div className="text-xs text-gray-600 mb-1">Ownership</div>
                  <div className="font-bold text-[#232323]">{team.ownership_type}</div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {performance?.recent_form && performance.recent_form !== 'Unknown' && (
                <Badge className="bg-[#D33F49] text-white">{performance.recent_form}</Badge>
              )}
              {performance?.reliability && performance.reliability !== 'Unknown' && (
                <Badge className="bg-[#1A3249] text-white">{performance.reliability}</Badge>
              )}
              {topStrengths.map((strength, idx) => (
                <Badge key={idx} className="bg-[#00FFDA] text-[#232323]">{strength}</Badge>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 p-6">
              {media?.logo_url && (
                <img src={media.logo_url} alt={team.name} className="w-32 h-auto mb-6" />
              )}

              {primaryPrograms.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-[#232323] mb-3">Primary Programs</h3>
                  {primaryPrograms.map(prog => (
                    <div key={prog.id} className="mb-2">
                      <div className="font-semibold text-[#232323] text-sm">{prog.series_name}</div>
                      {prog.class_name && <div className="text-xs text-gray-600">{prog.class_name}</div>}
                    </div>
                  ))}
                </div>
              )}

              {activePartners.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-[#232323] mb-3">Key Partners</h3>
                  {activePartners.map(partner => (
                    <div key={partner.id} className="text-sm text-[#232323] mb-1">
                      {partner.partner_name}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {media?.website_url && (
                  <a
                    href={media.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#00FFDA] hover:text-[#1A3249] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Website
                  </a>
                )}
                {operations?.merch_url && (
                  <a
                    href={operations.merch_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-[#00FFDA] hover:text-[#1A3249] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Shop Merch
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {drivers.length > 0 && (
          <section id="section-drivers" className="mb-12">
            <h2 className="text-3xl font-black text-[#232323] mb-6">Drivers</h2>

            {programsWithDrivers.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-8">
                <button
                  onClick={() => setSelectedProgram('all')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    selectedProgram === 'all'
                      ? 'bg-[#232323] text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-[#00FFDA]'
                  }`}
                >
                  All Drivers
                </button>
                {programsWithDrivers.map(prog => (
                  <button
                    key={prog.id}
                    onClick={() => setSelectedProgram(prog.id)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      selectedProgram === prog.id
                        ? 'bg-[#232323] text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-[#00FFDA]'
                    }`}
                  >
                    {prog.series_name}{prog.class_name ? ` • ${prog.class_name}` : ''}
                  </button>
                ))}
              </div>
            )}

            {selectedProgram === 'all' ? (
              <div className="space-y-8">
                {sortedPrograms.map(prog => {
                  const progDrivers = getDriversForProgram(prog.id);
                  if (progDrivers.length === 0) return null;
                  
                  return (
                    <div key={prog.id}>
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-[#232323]">
                          {prog.series_name}{prog.class_name ? ` • ${prog.class_name}` : ''}
                        </h3>
                        {prog.seasons_active && (
                          <div className="text-sm text-gray-600">{prog.seasons_active}</div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {progDrivers.map(driver => (
                          <DriverHeroCard
                            key={driver.id}
                            driver={driver}
                            program={prog}
                            onClick={() => setSelectedDriver({ driver, program: prog })}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {getDriversForProgram(selectedProgram).map(driver => {
                  const prog = programs.find(p => p.id === driver.program_id);
                  return (
                    <DriverHeroCard
                      key={driver.id}
                      driver={driver}
                      program={prog}
                      onClick={() => setSelectedDriver({ driver, program: prog })}
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}

        <div className="space-y-8">
          <section id="section-overview" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Status</div>
                <div className="text-lg font-semibold text-[#232323]">{team.status}</div>
              </div>
              {team.owner_name && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Owner</div>
                  <div className="text-lg font-semibold text-[#232323]">{team.owner_name}</div>
                </div>
              )}
              {team.team_principal && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Team Principal</div>
                  <div className="text-lg font-semibold text-[#232323]">{team.team_principal}</div>
                </div>
              )}
            </div>
          </section>

          <section id="section-programs" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Programs</h2>
            <div className="space-y-4">
              {sortedPrograms.map(prog => (
                <div key={prog.id} className="border-l-4 border-[#00FFDA] pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-bold text-[#232323]">{prog.series_name}</div>
                    {prog.primary && (
                      <Badge className="bg-[#D33F49] text-white text-xs">Primary</Badge>
                    )}
                  </div>
                  {prog.class_name && <div className="text-sm text-gray-600">{prog.class_name}</div>}
                  {prog.seasons_active && <div className="text-sm text-gray-600">{prog.seasons_active}</div>}
                  {prog.program_status && (
                    <Badge variant="outline" className="mt-2">{prog.program_status}</Badge>
                  )}
                  {prog.notes && <p className="text-sm text-gray-700 mt-2">{prog.notes}</p>}
                </div>
              ))}
            </div>
          </section>

          <section id="section-roster" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Full Roster</h2>
            
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#232323]">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#232323]">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#232323]">Number</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#232323]">Program</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#232323]">Hometown</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#232323]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map(member => {
                    const prog = programs.find(p => p.id === member.program_id);
                    return (
                      <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-[#232323]">{member.person_name}</td>
                        <td className="py-3 px-4 text-gray-700">{member.role}</td>
                        <td className="py-3 px-4 text-gray-700">{member.number || '—'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {prog ? `${prog.series_name}${prog.class_name ? ` • ${prog.class_name}` : ''}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{member.hometown || '—'}</td>
                        <td className="py-3 px-4">
                          <Badge className={member.active ? 'bg-[#00FFDA] text-[#232323]' : 'bg-gray-200 text-gray-600'}>
                            {member.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {roster.map(member => {
                const prog = programs.find(p => p.id === member.program_id);
                return (
                  <div key={member.id} className="border border-gray-200 p-4">
                    <div className="font-bold text-[#232323] mb-2">{member.person_name}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Role:</span> {member.role}
                      </div>
                      {member.number && (
                        <div>
                          <span className="text-gray-600">Number:</span> {member.number}
                        </div>
                      )}
                      {prog && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Program:</span> {prog.series_name}
                          {prog.class_name ? ` • ${prog.class_name}` : ''}
                        </div>
                      )}
                      {member.hometown && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Hometown:</span> {member.hometown}
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Badge className={member.active ? 'bg-[#00FFDA] text-[#232323]' : 'bg-gray-200 text-gray-600'}>
                        {member.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {performance && (
            <section id="section-performance" className="bg-white border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Performance Snapshot</h2>
              
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

              {performance.highlights && (
                <div className="mb-6">
                  <div className="text-sm text-gray-600 mb-2">Highlights</div>
                  <p className="text-gray-700">{performance.highlights}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                    <div className="text-sm text-gray-600 mb-2">Weaknesses</div>
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

              {performance.trend_notes && (
                <div>
                  <div className="text-sm text-gray-600 mb-2">Trend Notes</div>
                  <p className="text-gray-700">{performance.trend_notes}</p>
                </div>
              )}
            </section>
          )}

          {partners.length > 0 && (
            <section id="section-partners" className="bg-white border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Partners</h2>
              
              {['Title', 'Primary', 'Associate', 'Technical', 'Media', 'Local'].map(type => {
                const typePartners = partners.filter(p => p.partner_type === type && p.active);
                if (typePartners.length === 0) return null;
                
                return (
                  <div key={type} className="mb-6">
                    <h3 className="text-lg font-semibold text-[#232323] mb-3">{type} Partners</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {typePartners.map(partner => (
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
            </section>
          )}

          {media && (
            <section id="section-media" className="bg-white border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Media</h2>
              
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

              {(media.social_instagram || media.social_youtube || media.social_tiktok || media.social_x) && (
                <div>
                  <div className="text-sm text-gray-600 mb-3">Social Media</div>
                  <div className="flex flex-wrap gap-3">
                    {media.social_instagram && (
                      <a href={media.social_instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-[#00FFDA] rounded transition-colors">
                        <Instagram className="w-4 h-4" />
                        Instagram
                      </a>
                    )}
                    {media.social_youtube && (
                      <a href={media.social_youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-[#00FFDA] rounded transition-colors">
                        <Youtube className="w-4 h-4" />
                        YouTube
                      </a>
                    )}
                    {media.social_x && (
                      <a href={`https://x.com/${media.social_x}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-[#00FFDA] rounded transition-colors">
                        <Twitter className="w-4 h-4" />
                        X
                      </a>
                    )}
                    {media.social_tiktok && (
                      <a href={`https://tiktok.com/@${media.social_tiktok}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-[#00FFDA] rounded transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                        </svg>
                        TikTok
                      </a>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {operations && (
            <section id="section-operations" className="bg-white border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Operations</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {operations.shop_location && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Shop Location</div>
                    <div className="font-semibold text-[#232323]">{operations.shop_location}</div>
                  </div>
                )}
                {operations.hiring_status && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Hiring Status</div>
                    <Badge className={operations.hiring_status === 'Hiring' ? 'bg-[#00FFDA] text-[#232323]' : 'bg-gray-200 text-gray-700'}>
                      {operations.hiring_status}
                    </Badge>
                  </div>
                )}
              </div>

              {operations.contact_email && (
                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-2">Contact</div>
                  <div className="text-[#232323]">{operations.contact_email}</div>
                  {operations.contact_phone && <div className="text-[#232323]">{operations.contact_phone}</div>}
                </div>
              )}

              {operations.tryout_info && (
                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-2">Tryout Info</div>
                  <p className="text-gray-700">{operations.tryout_info}</p>
                </div>
              )}

              {operations.operations_notes && (
                <div className="mt-6">
                  <div className="text-sm text-gray-600 mb-2">Notes</div>
                  <p className="text-gray-700">{operations.operations_notes}</p>
                </div>
              )}
            </section>
          )}

          {community && (
            <section id="section-community" className="bg-white border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-[#232323] mb-6">Community</h2>
              
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
            </section>
          )}
        </div>
      </div>

      {selectedDriver && (
        <DriverModal
          driver={selectedDriver.driver}
          program={selectedDriver.program}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </PageShell>
  );
}