import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import SocialShareButtons from '@/components/shared/SocialShareButtons';
import CountryFlag from '@/components/shared/CountryFlag';
import { createPageUrl } from '@/components/utils';
import ScheduleSection from '@/components/schedule/ScheduleSection';

export default function TeamProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const teamSlug = urlParams.get('id');

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

  const handleTeamCalendarCreated = async (calendarId) => {
    await base44.functions.invoke('saveEntityCalendarId', {
      entityType: 'Team', entityId: team.id, calendarId
    });
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

  return (
    <PageShell className="bg-white">
      <div className="max-w-7xl mx-auto px-6 pt-4 pb-12">
        <Link to={createPageUrl('TeamDirectory')} className="text-sm text-gray-600 hover:text-[#00FFDA]">
          ← Back to Teams
        </Link>

        {team.logo_url && (
          <div className="w-full h-[300px] relative overflow-hidden mt-6 mb-8 bg-gray-50 border border-gray-200 flex items-center justify-center p-8">
            <img src={team.logo_url} alt={`${team.name} logo`} className="max-w-full max-h-64 object-contain" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <CountryFlag country={team.country} />
                <h1 className="text-4xl font-black text-[#232323]">{team.name}</h1>
              </div>
            </div>

            <div className="bg-white p-8 border border-gray-200 mb-8">
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
                <p className="text-gray-700 leading-relaxed">{team.description_summary}</p>
              )}

              {team.status && (
                <div className="mt-6">
                  <Badge className={team.status === 'Active' ? 'bg-[#00FFDA] text-[#232323]' : 'bg-gray-200 text-gray-700'}>
                    {team.status}
                  </Badge>
                </div>
              )}
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

        {uniqueSeriesPrograms.length > 0 && (
          <section className="bg-white border border-gray-200 p-8 mb-8">
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
          </section>
        )}

        {allDrivers.length > 0 && (
          <section className="bg-white border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-[#232323] mb-6">Drivers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allDrivers.map(driver => {
                const driverProgs = driverPrograms.filter(dp => dp.driver_id === driver.id);
                return (
                  <Link
                    key={driver.id}
                    to={createPageUrl(`DriverProfile?first=${driver.first_name}&last=${driver.last_name}`)}
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
                    {driverProgs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {driverProgs.map(dp => (
                          <Badge key={dp.id} variant="outline" className="text-xs">
                            #{dp.car_number} {dp.participation_status && dp.participation_status !== 'Full-Time' ? `· ${dp.participation_status}` : ''}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="bg-white border border-gray-200 p-8">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5" />
            <h2 className="text-2xl font-bold text-[#232323]">Race Schedule</h2>
          </div>
          <ScheduleSection
            entityType="Team"
            entityId={team.id}
            entityName={team.name}
            calendarId={team.calendar_id}
            onCalendarCreated={handleTeamCalendarCreated}
            isOwner={true}
          />
        </section>
      </div>
    </PageShell>
  );
}