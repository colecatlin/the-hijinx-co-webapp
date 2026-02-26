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
import TeamDriversSection from '@/components/teams/TeamDriversSection';

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
    <PageShell className="bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-white to-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Link to={createPageUrl('TeamDirectory')} className="text-xs font-medium text-gray-600 hover:text-[#232323] transition-colors mb-6 inline-block">
            ← Back to Teams
          </Link>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Logo & Title */}
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

            {/* Share Button */}
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

      {/* Navigation Tabs */}
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

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Overview Section */}
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

        {/* Drivers Section */}
        <div id="section-drivers" className="mb-16">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h2 className="text-2xl font-black text-[#232323] mb-6">Drivers</h2>
            <TeamDriversSection 
              teamId={team.id} 
              driverPrograms={driverPrograms}
              allDrivers={allDrivers}
            />
          </div>
        </div>

        {/* Programs Section */}
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
                        {driversInSeries.length} driver{driversInSeries.length !== 1 ? 's' : ''} · 2026
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {driversInSeries.map(dp => (
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

        {/* Schedule & Results Section */}
        <div id="section-schedule">
          <TeamScheduleResults teamId={team.id} />
        </div>
      </div>
    </PageShell>
  );
}