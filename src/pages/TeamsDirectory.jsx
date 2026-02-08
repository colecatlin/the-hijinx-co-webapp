import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import TeamCard from '@/components/teams/TeamCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter } from 'lucide-react';

export default function TeamsDirectory() {
  const [filters, setFilters] = useState({
    discipline: 'all',
    level: 'all',
    status: 'all',
    state: 'all',
  });
  const [sortBy, setSortBy] = useState('name');

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: allPrograms = [] } = useQuery({
    queryKey: ['teamPrograms'],
    queryFn: () => base44.entities.TeamProgram.list(),
  });

  const { data: allRoster = [] } = useQuery({
    queryKey: ['teamRoster'],
    queryFn: () => base44.entities.TeamRoster.list(),
  });

  const { data: allPerformance = [] } = useQuery({
    queryKey: ['teamPerformance'],
    queryFn: () => base44.entities.TeamPerformance.list(),
  });

  const { data: allMedia = [] } = useQuery({
    queryKey: ['teamMedia'],
    queryFn: () => base44.entities.TeamMedia.list(),
  });

  const filteredTeams = teams
    .filter(team => {
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
          <h1 className="text-4xl font-black text-[#232323] mb-2">Teams</h1>
          <p className="text-gray-600">Programs, rosters, results, and who is building what</p>
        </div>

        <div className="bg-white border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-[#232323]">Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Discipline</label>
              <Select value={filters.discipline} onValueChange={(v) => setFilters({ ...filters, discipline: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Disciplines</SelectItem>
                  <SelectItem value="Off Road">Off Road</SelectItem>
                  <SelectItem value="Snowmobile">Snowmobile</SelectItem>
                  <SelectItem value="Asphalt Oval">Asphalt Oval</SelectItem>
                  <SelectItem value="Road Racing">Road Racing</SelectItem>
                  <SelectItem value="Rallycross">Rallycross</SelectItem>
                  <SelectItem value="Drag Racing">Drag Racing</SelectItem>
                  <SelectItem value="Mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Level</label>
              <Select value={filters.level} onValueChange={(v) => setFilters({ ...filters, level: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                  <SelectItem value="National">National</SelectItem>
                  <SelectItem value="Regional">Regional</SelectItem>
                  <SelectItem value="Local">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Part Time">Part Time</SelectItem>
                  <SelectItem value="Historic">Historic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">State</label>
              <Select value={filters.state} onValueChange={(v) => setFilters({ ...filters, state: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Sort by:</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="discipline">Discipline</SelectItem>
                <SelectItem value="level">Level</SelectItem>
                <SelectItem value="founded">Founded</SelectItem>
                <SelectItem value="content_value">Content Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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
              const drivers = allRoster.filter(r => r.team_id === team.id && r.role === 'Driver' && r.active);
              const performance = allPerformance.find(p => p.team_id === team.id);
              const media = allMedia.find(m => m.team_id === team.id);
              
              return (
                <TeamCard
                  key={team.id}
                  team={team}
                  programsCount={programs.length}
                  driversCount={drivers.length}
                  performance={performance}
                  media={media}
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