import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import DriverCard from '@/components/drivers/DriverCard';
import DirectoryFilters from '@/components/shared/DirectoryFilters';
import { Skeleton } from '@/components/ui/skeleton';

export default function DriverDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    discipline: 'all',
    series: 'all',
    status: 'all',
    state: 'all'
  });
  const [sortBy, setSortBy] = useState('name');

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

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
    const displayName = driver.display_name || `${driver.first_name} ${driver.last_name}`;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = displayName?.toLowerCase().includes(query) ||
                          driver.first_name?.toLowerCase().includes(query) ||
                          driver.last_name?.toLowerCase().includes(query);
      if (!matchesName) return false;
    }

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
        const nameA = a.display_name || `${a.first_name} ${a.last_name}`;
        const nameB = b.display_name || `${b.first_name} ${b.last_name}`;
        return nameA.localeCompare(nameB);
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
              ]
            },
            {
              key: 'series',
              label: 'Series',
              options: [
                { value: 'all', label: 'All Series' },
                ...uniqueSeries.map(s => ({ value: s, label: s }))
              ]
            },
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Part Time', label: 'Part Time' },
                { value: 'Retired', label: 'Retired' },
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
            { value: 'content_value', label: 'Content Value' },
          ]}
        />

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