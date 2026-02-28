import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import TeamCard from '@/components/teams/TeamCard';
import DirectoryFilters from '@/components/shared/DirectoryFilters';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeamDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    discipline: 'all',
    level: 'all',
    status: 'all',
    state: 'all',
  });
  const [sortBy, setSortBy] = useState('name');

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: allPrograms = [] } = useQuery({
    queryKey: ['driverPrograms'],
    queryFn: () => base44.entities.DriverProgram.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allDrivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allPerformance = [] } = useQuery({
    queryKey: ['teamPerformance'],
    queryFn: () => base44.entities.TeamPerformance.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allMedia = [] } = useQuery({
    queryKey: ['teamMedia'],
    queryFn: () => base44.entities.TeamMedia.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    staleTime: 10 * 60 * 1000,
  });

  const filteredTeams = teams
    .filter(team => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = team.name?.toLowerCase().includes(query);
        if (!matchesName) return false;
      }

      if (filters.discipline !== 'all' && team.primary_discipline !== filters.discipline) return false;
      if (filters.level !== 'all' && team.team_level !== filters.level) return false;
      if (filters.status !== 'all' && team.status !== filters.status) return false;
      if (filters.state !== 'all' && team.headquarters_state !== filters.state) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'discipline') return (a.primary_discipline || '').localeCompare(b.primary_discipline || '');
      if (sortBy === 'level') {
        const order = { International: 1, National: 2, Regional: 3, Local: 4 };
        return (order[a.team_level] || 5) - (order[b.team_level] || 5);
      }
      if (sortBy === 'founded') return (b.founded_year || 0) - (a.founded_year || 0);
      if (sortBy === 'content_value') {
        const order = { High: 1, Medium: 2, Low: 3, Unknown: 4 };
        return (order[a.content_value] || 4) - (order[b.content_value] || 4);
      }
      return 0;
    });

  const uniqueStates = [...new Set(teams.map(t => t.headquarters_state).filter(Boolean))].sort();

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-[#232323] mb-2">Teams</h1>
          <p className="text-gray-600">Programs, rosters, results, and who is building what</p>
        </div>

        <DirectoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFilterChange={handleFilterChange}
          filterConfig={[
            {
              key: 'discipline',
              label: 'Discipline',
              options: [
                { value: 'all', label: 'All Disciplines' },
                { value: 'Off Road', label: 'Off Road' },
                { value: 'Snowmobile', label: 'Snowmobile' },
                { value: 'Asphalt Oval', label: 'Asphalt Oval' },
                { value: 'Road Racing', label: 'Road Racing' },
                { value: 'Rallycross', label: 'Rallycross' },
                { value: 'Drag Racing', label: 'Drag Racing' },
                { value: 'Mixed', label: 'Mixed' },
              ]
            },
            {
              key: 'level',
              label: 'Level',
              options: [
                { value: 'all', label: 'All Levels' },
                { value: 'International', label: 'International' },
                { value: 'National', label: 'National' },
                { value: 'Regional', label: 'Regional' },
                { value: 'Local', label: 'Local' },
              ]
            },
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Part Time', label: 'Part Time' },
                { value: 'Historic', label: 'Historic' },
              ]
            },
            {
              key: 'state',
              label: 'State',
              options: [
                { value: 'all', label: 'All States' },
                ...uniqueStates.map(s => ({ value: s, label: s }))
              ]
            },
          ]}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'name', label: 'Name' },
            { value: 'discipline', label: 'Discipline' },
            { value: 'level', label: 'Level' },
            { value: 'founded', label: 'Founded Year' },
            { value: 'content_value', label: 'Content Value' },
          ]}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map(team => {
               const programs = allPrograms.filter(p => p.team_id === team.id);
               const driverIdFromPrograms = new Set(programs.map(p => p.driver_id).filter(Boolean));
               const driversFromPrograms = allDrivers.filter(d => driverIdFromPrograms.has(d.id));
               const driversWithTeamId = allDrivers.filter(d => d.team_id === team.id);
               const allTeamDrivers = [...new Map([
                 ...driversFromPrograms.map(d => [d.id, d]),
                 ...driversWithTeamId.map(d => [d.id, d])
               ].map(([id, driver]) => [id, driver])).values()];
               const media = allMedia.find(m => m.team_id === team.id);

               return (
                 <TeamCard
                   key={team.id}
                   team={team}
                   programs={programs}
                   drivers={allTeamDrivers}
                   media={media}
                   series={allSeries}
                 />
               );
             })}
          </div>
        )}

        {!isLoading && filteredTeams.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No teams found matching your filters.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}