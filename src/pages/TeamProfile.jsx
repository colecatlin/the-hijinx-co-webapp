import React, { useState, useEffect } from 'react';
import SeoMeta, { buildEntityTitle, SITE_FALLBACK_IMAGE } from '@/components/system/seoMeta';
import Analytics from '@/components/system/analyticsTracker';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { getTeamProfileData } from '@/components/entities/publicPageDataApi';
import PageShell from '@/components/shared/PageShell';
import { EntityNotFound } from '@/components/data/EntityNotFoundState';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar, Flag, Users, TrendingUp, Trophy, AlertCircle, ExternalLink, Camera } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { Link } from 'react-router-dom';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import ProfileClaimFooter from '@/components/onboarding/ProfileClaimFooter';
import CountryFlag from '@/components/shared/CountryFlag';
import { createPageUrl } from '@/components/utils';
import TeamScheduleResults from '@/components/teams/TeamScheduleResults';
import TeamDriversSection from '@/components/teams/TeamDriversSection';
import PublicMediaGallery from '@/components/media/PublicMediaGallery';

function safeDateFormat(dateStr, fmt = 'MMM d, yyyy') {
  if (!dateStr) return 'TBA';
  const d = new Date(dateStr);
  return isValid(d) ? format(d, fmt) : 'TBA';
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: MapPin },
  { id: 'drivers', label: 'Drivers', icon: Users },
  { id: 'programs', label: 'Programs', icon: Flag },
  { id: 'schedule', label: 'Schedule & Results', icon: Calendar },
  { id: 'media', label: 'Media', icon: Camera },
];

export default function TeamProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const teamSlug = (urlParams.get('slug') || urlParams.get('id') || '').trim() || null;
  const [activeTab, setActiveTab] = useState('overview');

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

  useEffect(() => { window.scrollTo(0, 0); setActiveTab('overview'); }, [teamSlug]);
  useEffect(() => { if (team) Analytics.profileViewTeam(team.id, team.name); }, [team?.id]);

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

  if (!team) return <EntityNotFound entityType="Team" />;

  const uniqueSeriesPrograms = [...new Map(
    driverPrograms.filter(dp => dp.series_name).map(dp => [dp.series_name, dp])
  ).values()];

  const activeDriverIds = new Set(
    entries
      .filter(entry => { const ev = allEvents.find(e => e.id === entry.event_id); return ev && ['Draft', 'Published', 'Live'].includes(ev.status); })
      .map(entry => entry.driver_id)
  );
  const activeDrivers = rosterDrivers.filter(d => activeDriverIds.has(d.id));

  const upcomingEntries = entries
    .filter(entry => { const ev = allEvents.find(e => e.id === entry.event_id); return ev && ['Draft', 'Published', 'Live'].includes(ev.status); })
    .map(entry => {
      const ev = allEvents.find(e => e.id === entry.event_id);
      const track = allTracks.find(t => t.id === ev?.track_id);
      const count = entries.filter(e => e.event_id === ev?.id).length;
      return { entry, event: ev, track, count };
    })
    .filter((item, idx, arr) => arr.findIndex(x => x.event?.id === item.event?.id) === idx);

  const completedEntries = entries
    .filter(entry => { const ev = allEvents.find(e => e.id === entry.event_id); return ev && ev.status === 'completed'; })
    .map(entry => {
      const ev = allEvents.find(e => e.id === entry.event_id);
      const track = allTracks.find(t => t.id === ev?.track_id);
      const eventResults = results.filter(r => r.event_id === ev?.id);
      const bestPosition = eventResults.length > 0 ? Math.min(...eventResults.map(r => r.position || 999)) : null;
      return { entry, event: ev, track, bestPosition: bestPosition === 999 ? null : bestPosition };
    })
    .filter((item, idx, arr) => arr.findIndex(x => x.event?.id === item.event?.id) === idx);

  const seasonStats = {
    wins: results.filter(r => r.position === 1).length,
    podiums: results.filter(r => r.position && r.position <= 3).length,
    top5: results.filter(r => r.position && r.position <= 5).length,
  };

  const teamImg = team.logo_url || SITE_FALLBACK_IMAGE;
  const teamDesc = [
    team.primary_discipline || '',
    team.team_level ? `${team.team_level} level team` : '',
    team.headquarters_city ? `Based in ${[team.headquarters_city, team.headquarters_state].filter(Boolean).join(', ')}` : '',
  ].filter(Boolean).join(' · ') || `${team.name} racing team profile on HIJINX.`;

  return (
    <PageShell className="bg-white">
      <SeoMeta
        title={buildEntityTitle(team.name, 'Team Profile')}
        description={team.description_summary || teamDesc}
        image={teamImg}
      />

      {/* ── HERO ── */}
      <div className="relative w-full h-[280px] bg-[#0A0A0A] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0A0A0A]" />
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-6 pb-8">
          <div className="flex items-end gap-5">
            <div className="flex-shrink-0 hidden sm:flex w-24 h-24 rounded-xl bg-white/10 border border-white/20 items-center justify-center p-3">
              {team.logo_url
                ? <img src={team.logo_url} alt={team.name} className="max-w-full max-h-full object-contain" />
                : <Users className="w-10 h-10 text-white/40" />}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-3 mb-1">
                <CountryFlag country={team.country} />
                {team.racing_status && (
                  <Badge className={team.racing_status === 'Active' ? 'bg-[#00FFDA]/20 text-[#00FFDA] border border-[#00FFDA]/30 text-xs' : 'bg-white/10 text-white/70 border border-white/20 text-xs'}>
                    {team.racing_status}
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-none">{team.name}</h1>
              {team.primary_discipline && (
                <p className="text-white/60 mt-1.5 text-sm">{team.primary_discipline}{team.team_level ? ` · ${team.team_level}` : ''}</p>
              )}
              {(team.headquarters_city || team.headquarters_state) && (
                <div className="flex items-center gap-1.5 text-white/50 mt-2 text-sm">
                  <MapPin className="w-3 h-3" />
                  {[team.headquarters_city, team.headquarters_state, team.country].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
            <div className="pb-2 flex-shrink-0">
              <SocialShareButtons url={window.location.href} title={`${team.name} - Team Profile`} description={team.description_summary} />
            </div>
          </div>
        </div>
      </div>

      {/* ── NAV BAR ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-2 pt-2 pb-0">
            <Link to={createPageUrl('TeamDirectory')} className="text-xs text-gray-500 hover:text-[#232323] mr-4">← Teams</Link>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'text-[#232323] border-b-2 border-[#00FFDA] -mb-px'
                      : 'text-gray-500 hover:text-[#232323]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {team.headquarters_city && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2"><MapPin className="w-4 h-4" />Headquarters</div>
                    <div className="text-base font-semibold text-[#232323]">{[team.headquarters_city, team.headquarters_state].filter(Boolean).join(', ')}</div>
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
            {results.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h3 className="text-lg font-semibold text-[#232323] mb-4">Season Performance</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[['Wins', seasonStats.wins], ['Podiums', seasonStats.podiums], ['Top 5', seasonStats.top5]].map(([label, val]) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-black text-[#232323]">{val}</div>
                      <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* DRIVERS */}
        {activeTab === 'drivers' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Drivers</h2>
            <TeamDriversSection teamId={team.id} driverPrograms={driverPrograms} allDrivers={rosterDrivers} />
          </div>
        )}

        {/* PROGRAMS */}
        {activeTab === 'programs' && (
          uniqueSeriesPrograms.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-black text-[#232323] mb-6">Programs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {uniqueSeriesPrograms.map(prog => {
                  const driversInSeries = driverPrograms.filter(dp => dp.series_name === prog.series_name);
                  return (
                    <div key={prog.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="font-bold text-[#232323] text-lg mb-1">{prog.series_name}</div>
                      {prog.class_name && <div className="text-sm text-gray-600 mb-3">{prog.class_name}</div>}
                      <div className="text-xs text-gray-500 mb-3">{driversInSeries.length} driver{driversInSeries.length !== 1 ? 's' : ''}</div>
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
          )
        )}

        {/* SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
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
                            to={driver.canonical_slug ? `/drivers/${driver.canonical_slug}` : `${createPageUrl('DriverProfile')}?id=${driver.id}`}
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
                          <Link key={event.id} to={`${createPageUrl('EventProfile')}?id=${event.id}`} className="block p-4 border border-gray-200 rounded-lg hover:border-[#00FFDA] hover:shadow-md transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-[#232323]">{event.name}</h4>
                                  {event.status === 'Live' && <Badge className="bg-red-500 text-white text-xs">Live</Badge>}
                                </div>
                                <p className="text-sm text-gray-600">{track?.name || 'N/A'} • {safeDateFormat(event.event_date)}</p>
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
                          <Link key={event.id} to={`${createPageUrl('EventProfile')}?id=${event.id}`} className="block p-4 border border-gray-200 rounded-lg hover:border-[#00FFDA] hover:shadow-md transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-[#232323]">{event.name}</h4>
                                <p className="text-sm text-gray-600">{track?.name || 'N/A'} • {safeDateFormat(event.event_date)}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {bestPosition && <Badge className="bg-blue-100 text-blue-800 text-xs">Best: P{bestPosition}</Badge>}
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <TeamScheduleResults teamId={team.id} />
          </div>
        )}

        {/* MEDIA */}
        {activeTab === 'media' && (
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <PublicMediaGallery targetType="team_gallery" targetEntityId={team?.id} title="Media" />
          </div>
        )}

        <ProfileClaimFooter entityType="Team" entityId={team?.id} entityName={team.name} />
      </div>
    </PageShell>
  );
}