import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { getTeamProfileData } from '@/components/entities/publicPageDataApi';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, Flag, Users, TrendingUp, Trophy, AlertCircle, ExternalLink } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { Link } from 'react-router-dom';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import CountryFlag from '@/components/shared/CountryFlag';
import { createPageUrl } from '@/components/utils';
import ScheduleSection from '@/components/schedule/ScheduleSection';
import TeamScheduleResults from '@/components/teams/TeamScheduleResults';
import TeamDriversSection from '@/components/teams/TeamDriversSection';
import PublicMediaGallery from '@/components/media/PublicMediaGallery';

function safeDateFormat(dateStr, fmt = 'MMM d, yyyy') {
  if (!dateStr) return 'TBA';
  const d = new Date(dateStr);
  return isValid(d) ? format(d, fmt) : 'TBA';
}

export default function TeamProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const teamSlug = urlParams.get('slug') || urlParams.get('id');

  const [activeSection, setActiveSection] = useState('overview');

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['teamProfileData', teamSlug],
    queryFn: () => getTeamProfileData({ id: teamSlug, slug: teamSlug }),
    enabled: !!teamSlug,
  });

  const team           = profileData?.team           ?? null;
  const rosterDrivers  = profileData?.roster_drivers ?? [];
  const driverPrograms = profileData?.programs       ?? [];
  const entries        = profileData?.entries        ?? [];
  const results        = profileData?.results        ?? [];
  const allEvents      = profileData?.events         ?? [];
  const allTracks      = profileData?.tracks         ?? [];

  React.useEffect(() => {
    window.scrollTo(0, 0);
    setActiveSection('overview');
  }, [teamSlug]);

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

  if (!team) {
    return (
      <PageShell className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <p className="text-gray-600 mb-4">Team not found</p>
          <Link to={createPageUrl('TeamDirectory')}>
            <Button>Back to Teams</Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  const uniqueSeriesPrograms = [...new Map(
    driverPrograms
      .filter(dp => dp.series_name)
      .map(dp => [dp.series_name, dp])
  ).values()];

  const activeDriverIds = new Set(
    entries
      .filter(entry => {
        const event = allEvents.find(e => e.id === entry.event_id);
        return event && ['Draft', 'Published', 'Live'].includes(event.status);
      })
      .map(entry => entry.driver_id)
  );

  const activeDrivers = rosterDrivers.filter(d => activeDriverIds.has(d.id));

  const upcomingEntries = entries
    .filter(entry => {
      const event = allEvents.find(e => e.id === entry.event_id);
      return event && ['Draft', 'Published', 'Live'].includes(event.status);
    })
    .map(entry => {
      const event = allEvents.find(e => e.id === entry.event_id);
      const track = allTracks.find(t => t.id === event?.track_id);
      const count = entries.filter(e => e.event_id === event?.id).length;
      return { entry, event, track, count };
    })
    .filter((item, idx, arr) => arr.findIndex(x => x.event?.id === item.event?.id) === idx);

  const completedEntries = entries
    .filter(entry => {
      const event = allEvents.find(e => e.id === entry.event_id);
      return event && event.status === 'completed';
    })
    .map(entry => {
      const event = allEvents.find(e => e.id === entry.event_id);
      const track = allTracks.find(t => t.id === event?.track_id);
      const eventResults = results.filter(r => r.event_id === event?.id);
      const bestPosition = eventResults.length > 0
        ? Math.min(...eventResults.map(r => r.position || 999))
        : null;
      return { entry, event, track, bestPosition: bestPosition === 999 ? null : bestPosition };
    })
    .filter((item, idx, arr) => arr.findIndex(x => x.event?.id === item.event?.id) === idx);

  const seasonStats = {
    podiums: results.filter(r => r.position && r.position <= 3).length,
    wins: results.filter(r => r.position === 1).length,
    top5: results.filter(r => r.position && r.position <= 5).length,
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'programs', label: 'Programs', icon: Flag },
    { id: 'schedule', label: 'Schedule & Results', icon: Calendar },
  ];

  return (
    <PageShell className="bg-gray-50">
      <div className="bg-gradient-to-b from-white to-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Link to={createPageUrl('TeamDirectory')} className="text-xs font-medium text-gray-600 hover:text-[#232323] transition-colors mb-6 inline-block">
            ← Back to Teams
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              {team.logo_url && (
                <div className="mb-6 bg-white rounded-lg p-6 border border-gray-200 w-fit">
                  <img
                    src={team.logo_url}
                    alt={`${team.name} logo`}
                    className="h-24 object-contain"
                  />
                </div>
              )}
              <div className="flex items-center gap-3 mb-3">
                <CountryFlag country={team.country} />
                <h1 className="text-4xl font-black text-[#232323]">{team.name}</h1>
              </div>
              {team.status && (
                <Badge className={team.status === 'Active' ? 'bg-[#00FFDA] text-[#232323]' : 'bg-gray-200 text-gray-700'}>
                  {team.status}
                </Badge>
              )}
            </div>

            <div className="flex justify-end">
              <SocialShareButtons
                url={window.location.href}
                title={`${team.name} - Team Profile`}
                description={team.description_summary}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8 overflow-x-auto">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    const element = document.getElementById(`section-${section.id}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className={`flex items-center gap-2 px-1 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeSection === section.id
                      ? 'border-[#232323] text-[#232323]'
                      : 'border-transparent text-gray-600 hover:text-[#232323]'
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
        <div id="section-overview" className="mb-16">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {team.headquarters_city && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    <MapPin className="w-4 h-4" />
                    Headquarters
                  </div>
                  <div className="text-base font-semibold text-[#232323]">
                    {[team.headquarters_city, team.headquarters_state].filter(Boolean).join(', ')}
                  </div>
                </div>
              )}
              {team.primary_discipline && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Discipline</div>
                  <div className="text-base font-semibold text-[#232323]">{team.primary_discipline}</div>
                </div>
              )}
              {team.team_level && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Level</div>
                  <div className="text-base font-semibold text-[#232323]">{team.team_level}</div>
                </div>
              )}
              {team.founded_year && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Founded</div>
                  <div className="text-base font-semibold text-[#232323]">{team.founded_year}</div>
                </div>
              )}
            </div>

            {team.description_summary && (
              <p className="text-gray-700 leading-relaxed text-base">{team.description_summary}</p>
            )}
          </div>
        </div>

        <div id="section-overview-events" className="mb-16">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Event Participation</h2>

            {entries.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 text-gray-600">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>This team has no active event participation.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activeDrivers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#232323] mb-3">Active Drivers</h3>
                    <div className="flex flex-wrap gap-2">
                      {activeDrivers.map(driver => (
                        <Link
                          key={driver.id}
                          to={`${createPageUrl('DriverProfile')}?id=${driver.id}`}
                          className="px-3 py-1.5 bg-[#00FFDA] text-[#232323] rounded-full text-sm font-medium hover:bg-[#00E6CC] transition-colors"
                        >
                          {driver.first_name} {driver.last_name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {upcomingEntries.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#232323] mb-3">Upcoming Events</h3>
                    <div className="space-y-3">
                      {upcomingEntries.map(({ event, track, count }) => event && (
                        <Link
                          key={event.id}
                          to={`${createPageUrl('EventProfile')}?id=${event.id}`}
                          className="block p-4 border border-gray-200 rounded-lg hover:border-[#00FFDA] hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-[#232323]">{event.name}</h4>
                                {event.status === 'Live' && (
                                  <Badge className="bg-red-500 text-white text-xs">Live</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {track?.name || 'N/A'} • {safeDateFormat(event.event_date)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="outline" className="text-xs">{count} entries</Badge>
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {completedEntries.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#232323] mb-3">Completed Events</h3>
                    <div className="space-y-3">
                      {completedEntries.map(({ event, track, bestPosition }) => event && (
                        <Link
                          key={event.id}
                          to={`${createPageUrl('EventResults')}?eventId=${event.id}`}
                          className="block p-4 border border-gray-200 rounded-lg hover:border-[#00FFDA] hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-[#232323]">{event.name}</h4>
                              <p className="text-sm text-gray-600">
                                {track?.name || 'N/A'} • {safeDateFormat(event.event_date)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {bestPosition && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">
                                  Best: P{bestPosition}
                                </Badge>
                              )}
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {results.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-[#232323] mb-3">Season Performance</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-black text-[#232323]">{seasonStats.wins}</div>
                        <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Wins</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-black text-[#232323]">{seasonStats.podiums}</div>
                        <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Podiums</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <div className="text-2xl font-black text-[#232323]">{seasonStats.top5}</div>
                        <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Top 5</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div id="section-drivers" className="mb-16">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Drivers</h2>
            <TeamDriversSection
              teamId={team.id}
              driverPrograms={driverPrograms}
              allDrivers={rosterDrivers}
            />
          </div>
        </div>

        <div id="section-programs" className="mb-16">
          {uniqueSeriesPrograms.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-black text-[#232323] mb-6">Programs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {uniqueSeriesPrograms.map(prog => {
                  const driversInSeries = driverPrograms.filter(dp => dp.series_name === prog.series_name);
                  return (
                    <div key={prog.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="font-bold text-[#232323] text-lg mb-1">{prog.series_name}</div>
                      {prog.class_name && <div className="text-sm text-gray-600 mb-3">{prog.class_name}</div>}
                      <div className="text-xs text-gray-500 mb-3">
                        {driversInSeries.length} driver{driversInSeries.length !== 1 ? 's' : ''}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {driversInSeries.map(dp => dp.car_number && (
                          <Badge key={dp.id} className="bg-[#00FFDA] text-[#232323] text-xs font-medium">#{dp.car_number}</Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No programs found for this team</p>
            </div>
          )}
        </div>

        <div id="section-schedule">
          <TeamScheduleResults teamId={team.id} />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8 mt-16">
          <PublicMediaGallery
            targetType="team_gallery"
            targetEntityId={team?.id}
            title="Media"
          />
        </div>
      </div>
    </PageShell>
  );
}