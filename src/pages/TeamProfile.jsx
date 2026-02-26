import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, Flag, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import CountryFlag from '@/components/shared/CountryFlag';
import { createPageUrl } from '@/components/utils';
import ScheduleSection from '@/components/schedule/ScheduleSection';
import TeamScheduleResults from '@/components/teams/TeamScheduleResults';

export default function TeamProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const teamSlug = urlParams.get('id');

  const [activeSection, setActiveSection] = useState('overview');

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const team = teams.find(t => t.slug === teamSlug || t.id === teamSlug);

  const { data: driverPrograms = [] } = useQuery({
    queryKey: ['teamDriverPrograms', team?.id],
    queryFn: () => base44.entities.DriverProgram.filter({ team_id: team.id }),
    enabled: !!team?.id,
  });

  const { data: allDrivers = [] } = useQuery({
    queryKey: ['driversForTeam', team?.id],
    queryFn: async () => {
      const driverIdsFromPrograms = [...new Set(driverPrograms.map(dp => dp.driver_id).filter(Boolean))];
      const directDrivers = await base44.entities.Driver.filter({ team_id: team.id });
      const directIds = new Set(directDrivers.map(d => d.id));
      const missingIds = driverIdsFromPrograms.filter(id => !directIds.has(id));
      const programDrivers = missingIds.length > 0
        ? await Promise.all(missingIds.map(id => base44.entities.Driver.filter({ id })))
        : [];
      return [...directDrivers, ...programDrivers.flat()];
    },
    enabled: !!team?.id && driverPrograms.length > 0,
  });

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

  const sections = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'programs', label: 'Programs', icon: Flag },
    { id: 'schedule', label: 'Schedule & Results', icon: Calendar },
  ];

  return (
    <PageShell className="bg-white">
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <Link to={createPageUrl('TeamDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA]">
          ← Back to Teams
        </Link>
      </div>

      {/* Hero Image */}
      {team.logo_url && (
        <div className="w-full h-[400px] relative overflow-hidden mt-3 bg-gray-50 border-b border-gray-200 flex items-center justify-center p-8">
          <img 
            src={team.logo_url} 
            alt={`${team.name} logo`}
            className="max-w-full max-h-64 object-contain"
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Header Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 items-start">
          <div className="lg:col-span-2">
            <Separator className="mb-3" />
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <CountryFlag country={team.country} />
              <h1 className="text-4xl font-black text-[#232323]">{team.name}</h1>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 overflow-x-auto border-b border-gray-200 mb-3">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      const element = document.getElementById(`section-${section.id}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
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

          <div className="relative">
            <div className="absolute -top-12 right-0 z-10">
              <SocialShareButtons 
                url={window.location.href}
                title={`${team.name} - Team Profile`}
                description={team.description_summary}
              />
            </div>
          </div>
        </div>

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div id="section-overview" className="space-y-8">
            <div className="bg-white border border-gray-200 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {team.headquarters_city && (
                  <div>
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
                  <div>
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
                {team.founded_year && (
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Founded</div>
                    <div className="text-lg font-semibold text-[#232323]">{team.founded_year}</div>
                  </div>
                )}
              </div>

              {team.description_summary && (
                <p className="text-gray-700 leading-relaxed mb-6">{team.description_summary}</p>
              )}

              {team.status && (
                <Badge className={team.status === 'Active' ? 'bg-[#00FFDA] text-[#232323]' : 'bg-gray-200 text-gray-700'}>
                  {team.status}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Drivers Section */}
        {activeSection === 'drivers' && (
          <div id="section-drivers" className="space-y-8">
            {allDrivers.length > 0 ? (
              <div className="bg-white border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-[#232323] mb-6">Drivers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allDrivers.map(driver => {
                    const driverProgs = driverPrograms.filter(dp => dp.driver_id === driver.id);
                    return (
                      <Link
                        key={driver.id}
                        to={`/DriverProfile?id=${encodeURIComponent(driver.slug || driver.id)}`}
                        className="border border-gray-200 p-4 hover:border-[#00FFDA] transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 flex items-center justify-center font-bold text-[#232323] text-sm flex-shrink-0">
                            {driver.primary_number || '#'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#232323] group-hover:text-[#00FFDA] transition-colors truncate">
                              {driver.first_name} {driver.last_name}
                            </div>
                            {driverProgs.length > 0 && (
                              <div className="text-xs text-gray-500 truncate">
                                {driverProgs.map(dp => dp.series_name).filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No drivers found for this team</p>
              </div>
            )}
          </div>
        )}

        {/* Programs Section */}
        {activeSection === 'programs' && (
          <div id="section-programs" className="space-y-8">
            {uniqueSeriesPrograms.length > 0 ? (
              <div className="bg-white border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-[#232323] mb-6">Programs</h2>
                <div className="space-y-4">
                  {uniqueSeriesPrograms.map(prog => {
                    const driversInSeries = driverPrograms.filter(dp => dp.series_name === prog.series_name);
                    return (
                      <div key={prog.id} className="border-l-4 border-[#00FFDA] pl-4">
                        <div className="font-bold text-[#232323]">{prog.series_name}</div>
                        {prog.class_name && <div className="text-sm text-gray-600">{prog.class_name}</div>}
                        <div className="text-sm text-gray-500 mt-1">
                          {driversInSeries.length} driver{driversInSeries.length !== 1 ? 's' : ''} · 2026
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {driversInSeries.map(dp => (
                            <Badge key={dp.id} variant="outline" className="text-xs">#{dp.car_number}</Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No programs found for this team</p>
              </div>
            )}
          </div>
        )}

        {/* Schedule & Results Section */}
        {activeSection === 'schedule' && (
          <div id="section-schedule" className="space-y-8">
            <TeamScheduleResults teamId={team.id} />
          </div>
        )}
      </div>
    </PageShell>
  );
}