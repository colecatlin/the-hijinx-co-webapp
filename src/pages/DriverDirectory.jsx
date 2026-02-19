import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import DriverCard from '@/components/drivers/DriverCard';
import DirectoryFilters from '@/components/shared/DirectoryFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { GitCompare } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

export default function DriverDirectory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    discipline: 'all',
    series: 'all',
    status: 'all',
    state: 'all',
    manufacturer: 'all',
    country: 'all',
  });
  const [sortBy, setSortBy] = useState('name');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedDrivers, setSelectedDrivers] = useState([]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleDriverSelection = (driverId) => {
    setSelectedDrivers(prev => {
      if (prev.includes(driverId)) {
        return prev.filter(id => id !== driverId);
      }
      if (prev.length < 2) {
        return [...prev, driverId];
      }
      return prev;
    });
  };

  const handleCompare = () => {
    if (selectedDrivers.length === 2) {
      navigate(`${createPageUrl('DriverComparison')}?driver1=${selectedDrivers[0]}&driver2=${selectedDrivers[1]}`);
    }
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

  const uniqueSeries = [...new Set(allPrograms.map(p => p.series_name).filter(Boolean))].sort();
  const uniqueStates = [...new Set(drivers.map(d => d.hometown_state).filter(Boolean))].sort();
  const uniqueCountries = [...new Set(drivers.map(d => d.hometown_country).filter(Boolean))].sort();
  const uniqueManufacturers = [...new Set(drivers.map(d => d.manufacturer).filter(Boolean))].sort();

  // Pre-compute program map for efficiency
  const programsByDriver = React.useMemo(() => {
    const map = {};
    allPrograms.forEach(p => {
      if (!map[p.driver_id]) map[p.driver_id] = [];
      map[p.driver_id].push(p);
    });
    return map;
  }, [allPrograms]);

  const filteredDrivers = drivers.filter(driver => {
    const displayName = driver.display_name || `${driver.first_name} ${driver.last_name}`;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = displayName?.toLowerCase().includes(query) ||
                          driver.first_name?.toLowerCase().includes(query) ||
                          driver.last_name?.toLowerCase().includes(query);
      const matchesNumber = driver.primary_number?.toString().includes(query);
      const matchesTeam = allTeams.find(t => t.id === driver.team_id)?.name?.toLowerCase().includes(query);
      const matchesHometown = driver.hometown_city?.toLowerCase().includes(query) ||
                              driver.hometown_state?.toLowerCase().includes(query);
      const matchesSeries = (programsByDriver[driver.id] || []).some(p =>
        p.series_name?.toLowerCase().includes(query)
      );
      if (!matchesName && !matchesNumber && !matchesTeam && !matchesHometown && !matchesSeries) return false;
    }

    if (filters.discipline !== 'all' && driver.primary_discipline !== filters.discipline) return false;
    if (filters.status !== 'all' && driver.status !== filters.status) return false;
    if (filters.state !== 'all' && driver.hometown_state !== filters.state) return false;
    if (filters.country !== 'all' && driver.hometown_country !== filters.country) return false;
    if (filters.manufacturer !== 'all' && driver.manufacturer !== filters.manufacturer) return false;

    if (filters.series !== 'all') {
      const driverPrograms = programsByDriver[driver.id] || [];
      if (!driverPrograms.some(p => p.series_name === filters.series)) return false;
    }

    return true;
  });

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc': {
        const nameA = a.display_name || `${a.first_name} ${a.last_name}`;
        const nameB = b.display_name || `${b.first_name} ${b.last_name}`;
        return nameA.localeCompare(nameB);
      }
      case 'name_desc': {
        const nameA = a.display_name || `${a.first_name} ${a.last_name}`;
        const nameB = b.display_name || `${b.first_name} ${b.last_name}`;
        return nameB.localeCompare(nameA);
      }
      case 'name':
      default: {
        const nameA = a.display_name || `${a.first_name} ${a.last_name}`;
        const nameB = b.display_name || `${b.first_name} ${b.last_name}`;
        return nameA.localeCompare(nameB);
      }
      case 'number': {
        const numA = parseInt(a.primary_number) || 9999;
        const numB = parseInt(b.primary_number) || 9999;
        return numA - numB;
      }
      case 'discipline':
        return (a.primary_discipline || '').localeCompare(b.primary_discipline || '');
      case 'newest':
        return new Date(b.created_date) - new Date(a.created_date);
      case 'oldest':
        return new Date(a.created_date) - new Date(b.created_date);
    }
  });

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#232323] mb-1 sm:mb-2">Drivers</h1>
              <p className="text-base sm:text-lg text-gray-600">Competitors across disciplines and series</p>
            </div>
            <div className="flex items-center gap-3">
              {compareMode && selectedDrivers.length === 2 && (
                <Button onClick={handleCompare} className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm">
                  Compare Selected
                </Button>
              )}
              <Button
                variant={compareMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCompareMode(!compareMode);
                  setSelectedDrivers([]);
                }}
              >
                <GitCompare className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{compareMode ? 'Cancel' : 'Compare Drivers'}</span>
                <span className="sm:hidden">{compareMode ? 'Cancel' : 'Compare'}</span>
              </Button>
            </div>
          </div>
          {compareMode && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Select 2 drivers to compare ({selectedDrivers.length}/2 selected)
              </p>
            </div>
          )}
        </div>

        <DirectoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by name, number, series, team, hometown..."
          filters={filters}
          onFilterChange={handleFilterChange}
          filterConfig={[
            {
              key: 'series',
              label: 'Series',
              options: [
                { value: 'all', label: 'All Series' },
                ...uniqueSeries.map(s => ({ value: s, label: s }))
              ]
            },
            {
              key: 'discipline',
              label: 'Discipline',
              options: [
                { value: 'all', label: 'All Disciplines' },
                { value: 'Stock Car', label: 'Stock Car' },
                { value: 'Off Road', label: 'Off Road' },
                { value: 'Dirt Oval', label: 'Dirt Oval' },
                { value: 'Snowmobile', label: 'Snowmobile' },
                { value: 'Dirt Bike', label: 'Dirt Bike' },
                { value: 'Open Wheel', label: 'Open Wheel' },
                { value: 'Sports Car', label: 'Sports Car' },
                { value: 'Touring Car', label: 'Touring Car' },
                { value: 'Rally', label: 'Rally' },
                { value: 'Drag', label: 'Drag' },
                { value: 'Motorcycle', label: 'Motorcycle' },
                { value: 'Karting', label: 'Karting' },
                { value: 'Water', label: 'Water' },
                { value: 'Alternative', label: 'Alternative' },
              ]
            },
            {
              key: 'manufacturer',
              label: 'Manufacturer',
              options: [
                { value: 'all', label: 'All Manufacturers' },
                ...uniqueManufacturers.map(m => ({ value: m, label: m }))
              ]
            },
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Part Time', label: 'Part Time' },
                { value: 'Inactive', label: 'Inactive' },
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
            {
              key: 'country',
              label: 'Country',
              options: [
                { value: 'all', label: 'All Countries' },
                ...uniqueCountries.map(c => ({ value: c, label: c }))
              ]
            },
          ]}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'name_asc', label: 'Name A–Z' },
            { value: 'name_desc', label: 'Name Z–A' },
            { value: 'number', label: 'Car Number' },
            { value: 'discipline', label: 'Discipline' },
            { value: 'newest', label: 'Newest' },
            { value: 'oldest', label: 'Oldest' },
          ]}
        />

        {!driversLoading && sortedDrivers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedDrivers.map(driver => {
              const driverPrograms = programsByDriver[driver.id] || [];
              const primaryProgram = driverPrograms.find(p => p.primary) || driverPrograms[0];
              const team = primaryProgram?.team_id ? allTeams.find(t => t.id === primaryProgram.team_id) : null;
              const media = allMedia.find(m => m.driver_id === driver.id);
              const isSelected = selectedDrivers.includes(driver.id);
              
              return (
                <div key={driver.id} className="relative">
                  {compareMode && (
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        onClick={() => toggleDriverSelection(driver.id)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : 'bg-white border-gray-300 hover:border-blue-400'
                        }`}
                        disabled={!isSelected && selectedDrivers.length >= 2}
                      >
                        {isSelected && '✓'}
                      </button>
                    </div>
                  )}
                  <DriverCard
                    driver={driver}
                    program={primaryProgram}
                    team={team}
                    media={media}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}