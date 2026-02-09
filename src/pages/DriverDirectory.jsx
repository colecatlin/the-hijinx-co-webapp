import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import DriverCard from '@/components/drivers/DriverCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function DriverDirectory() {
  const [filters, setFilters] = useState({
    discipline: 'all',
    series: 'all',
    status: 'all',
    state: 'all'
  });
  const [sortBy, setSortBy] = useState('name');

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list(),
  });

  const { data: allPrograms = [] } = useQuery({
    queryKey: ['driverPrograms'],
    queryFn: () => base44.entities.DriverProgram.list(),
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const { data: allMedia = [] } = useQuery({
    queryKey: ['driverMedia'],
    queryFn: () => base44.entities.DriverMedia.list(),
  });

  const uniqueSeries = [...new Set(allPrograms.map(p => p.series_name))].sort();
  const uniqueStates = [...new Set(drivers.map(d => d.hometown_state).filter(Boolean))].sort();

  const filteredDrivers = drivers.filter(driver => {
    if (!driver.display_name) return false;
    if (filters.discipline !== 'all' && driver.primary_discipline !== filters.discipline) return false;
    if (filters.status !== 'all' && driver.status !== filters.status) return false;
    if (filters.state !== 'all' && driver.hometown_state !== filters.state) return false;
    
    if (filters.series !== 'all') {
      const driverPrograms = allPrograms.filter(p => p.driver_id === driver.id);
      if (!driverPrograms.some(p => p.series_name === filters.series)) return false;
    }
    
    return true;
  });

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.display_name || '').localeCompare(b.display_name || '');
      case 'discipline':
        return (a.primary_discipline || '').localeCompare(b.primary_discipline || '');
      case 'content_value':
        const valueOrder = { High: 0, Medium: 1, Low: 2, Unknown: 3 };
        return (valueOrder[a.content_value] || 3) - (valueOrder[b.content_value] || 3);
      default:
        return 0;
    }
  });

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-[#232323] mb-2">Drivers</h1>
          <p className="text-lg text-gray-600">Competitors across disciplines and series</p>
        </div>

        <div className="bg-white border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Select value={filters.discipline} onValueChange={(value) => setFilters({...filters, discipline: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Discipline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Disciplines</SelectItem>
                <SelectItem value="Off Road">Off Road</SelectItem>
                <SelectItem value="Snowmobile">Snowmobile</SelectItem>
                <SelectItem value="Asphalt Oval">Asphalt Oval</SelectItem>
                <SelectItem value="Road Racing">Road Racing</SelectItem>
                <SelectItem value="Rallycross">Rallycross</SelectItem>
                <SelectItem value="Drag Racing">Drag Racing</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.series} onValueChange={(value) => setFilters({...filters, series: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Series" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Series</SelectItem>
                {uniqueSeries.map(series => (
                  <SelectItem key={series} value={series}>{series}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Part Time">Part Time</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.state} onValueChange={(value) => setFilters({...filters, state: value})}>
              <SelectTrigger>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {uniqueStates.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="discipline">Discipline</SelectItem>
                <SelectItem value="content_value">Content Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {driversLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-[400px]" />
            ))}
          </div>
        ) : sortedDrivers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedDrivers.map(driver => {
              const primaryProgram = allPrograms.find(p => p.driver_id === driver.id && p.primary) || 
                                    allPrograms.find(p => p.driver_id === driver.id);
              const team = primaryProgram?.team_id ? allTeams.find(t => t.id === primaryProgram.team_id) : null;
              const media = allMedia.find(m => m.driver_id === driver.id);
              
              return (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  program={primaryProgram}
                  team={team}
                  media={media}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No drivers found matching your filters.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}