import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import DriverHeroCard from '@/components/teams/DriverHeroCard';
import DriverModal from '@/components/teams/DriverModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, ExternalLink, TrendingUp, Users, Heart, Settings, Camera, Briefcase, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import SocialIconsDisplay from '@/components/teams/SocialIconsDisplay';
import TeamPerformanceInsights from '@/components/teams/TeamPerformanceInsights';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import CountryFlag from '@/components/shared/CountryFlag';
import { createPageUrl } from '@/components/utils';
import ScheduleSection from '@/components/schedule/ScheduleSection';

export default function TeamProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const teamSlug = urlParams.get('id');
  const [activeSection, setActiveSection] = useState('overview');

  React.useEffect(() => {
    window.scrollTo(0, 0);
    setActiveSection('overview');
  }, [teamSlug]);
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState(null);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const team = teams.find(t => t.slug === teamSlug || t.id === teamSlug);

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
      return results[0] || null;
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
      return results[0] || null;
    },
    enabled: !!team?.id,
  });

  const { data: operations } = useQuery({
    queryKey: ['teamOperations', team?.id],
    queryFn: async () => {
      const results = await base44.entities.TeamOperations.filter({ team_id: team.id });
      return results[0] || null;
    },
    enabled: !!team?.id,
  });

  const { data: community } = useQuery({
    queryKey: ['teamCommunity', team?.id],
    queryFn: async () => {
      const results = await base44.entities.TeamCommunity.filter({ team_id: team.id });
      return results[0] || null;
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
    { id: 'roster', label: 'Roster', icon: Users },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'partners', label: 'Partners', icon: Heart },
    { id: 'media', label: 'Media', icon: Camera },
    { id: 'operations', label: 'Operations', icon: Settings },
    { id: 'community', label: 'Community', icon: Heart },
  ];

  const handleTeamCalendarCreated = async (calendarId) => {
    await base44.functions.invoke('saveEntityCalendarId', {
      entityType: 'Team', entityId: team.id, calendarId
    });
  };

  const primaryPrograms = sortedPrograms.filter(p => p.primary || sortedPrograms.indexOf(p) < 3).slice(0, 3);
  const activePartners = partners.filter(p => p.active).slice(0, 4);
  const topStrengths = performance?.strengths?.slice(0, 2) || [];

  return (
    <PageShell className="bg-white">
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

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-4">
          <Link to={createPageUrl('TeamDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA]">
            ← Back to Teams
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
          <div className="lg:col-span-2">
            <div className="border-b border-gray-200 mb-3" />
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <CountryFlag country={team.country} />
                <h1 className="text-4xl font-black text-[#232323] leading-none">{team.name}</h1>
              </div>
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

            <div className="border-b border-gray-200 mb-3" />

            <div className="bg-white p-8 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {team.headquarters_city && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                        <MapPin className="w-4 h-4" />
                        Headquarters
                      </div>
                      <div className="text-lg font-semibold text-[#232323]">
                        {[team.headquarters_city, team.headquarters_state].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  )}
                  {team.primary_discipline && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Discipline</div>
                      <div className="text-lg font-semibold text-[#232323]">{team.primary_discipline}</div>
                    </div>
                  )}
                  {team.team_level && (
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Level</div>
                      <div className="text-lg font-semibold text-[#232323]">{team.team_level}</div>
                    </div>
                  )}
                </div>
                <div>
                  {team.founded_year && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Founded</div>
                      <div className="text-lg font-semibold text-[#232323]">{team.founded_year}</div>
                    </div>
                  )}
                  {team.status && (
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 mb-1">Status</div>
                      <div className="text-lg font-semibold text-[#232323]">{team.status}</div>
                    </div>
                  )}
                </div>
              </div>
              {team.description_summary && (
                <p className="text-gray-700 leading-relaxed mt-4">{team.description_summary}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-6">
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
          </div>

          <div className="space-y-6 relative -mt-1">
            <div className="absolute -top-12 right-0 z-10">
              <SocialShareButtons 
                url={window.location.href}
                title={`${team.name} - Team Profile`}
                description={team.description_summary}
              />
            </div>
            <div className="bg-white">
              {media?.logo_url ? (
                <div className="w-full relative bg-gray-50 overflow-hidden border border-gray-200 flex items-center justify-center p-8" style={{minHeight: 240}}>
                  <img src={media.logo_url} alt={`${team.name} logo`} className="max-w-full max-h-60 object-contain" />
                </div>
              ) : (
                <div className="w-full bg-gray-50 border border-gray-200 flex items-center justify-center" style={{minHeight: 240}}>
                  <div className="text-center text-gray-400">
                    <div className="text-5xl font-black mb-2">{team.name.split(' ').map(w => w[0]).join('')}</div>
                    <div className="text-xs">No logo uploaded</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <section id="section-overview" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Overview</h2>
            {(team.status || team.owner_name || team.team_principal) ? (
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
            ) : (
              <p className="text-gray-500">No overview information available.</p>
            )}
          </section>

          <section id="section-programs" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Programs</h2>
            {sortedPrograms.length > 0 ? (
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
            ) : (
              <p className="text-gray-500">No programs available.</p>
            )}
          </section>

          <section id="section-roster" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Full Roster</h2>
            
            {roster.length > 0 ? (
              <>
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
              </>
            ) : (
              <p className="text-gray-500">No roster information available.</p>
            )}
          </section>

          <section id="section-schedule" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Race Schedule</h2>
            <ScheduleSection
              entityType="Team"
              entityId={team.id}
              entityName={team.name}
              calendarId={team.calendar_id}
              onCalendarCreated={handleTeamCalendarCreated}
              isOwner={true}
            />
          </section>

          <section id="section-performance" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Performance Snapshot</h2>
            
            {performance ? (
              <>
                <div className="mb-8">
                  <TeamPerformanceInsights 
                    team={team}
                    performance={performance}
                    programs={programs}
                    roster={roster}
                  />
                </div>

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
              </>
            ) : (
              <p className="text-gray-500">No performance information available.</p>
            )}
          </section>

          <section id="section-partners" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Partners</h2>
            
            {partners.length > 0 ? (
              <>
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
              </>
            ) : (
              <p className="text-gray-500">No partner information available.</p>
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

          <section id="section-operations" className="bg-white border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Operations</h2>
            
            {operations ? (
              <>
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
              </>
            ) : (
              <p className="text-gray-500">No operations information available.</p>
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