import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import DirectoryFilters from '@/components/shared/DirectoryFilters';
import { Skeleton } from '@/components/ui/skeleton';
import SeriesCard from '@/components/series/SeriesCard';

export default function SeriesHome() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    discipline: 'all',
    region: 'all',
    level: 'all',
    status: 'all',
  });
  const [sortBy, setSortBy] = useState('name');

  const { data: rawSeries, isLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    staleTime: 10 * 60 * 1000,
  });

  const series = Array.isArray(rawSeries) ? rawSeries : [];

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  let filteredSeries = series.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiscipline = filters.discipline === 'all' || s.discipline === filters.discipline;
    const matchesRegion = filters.region === 'all' || s.region === filters.region || s.geographic_scope === filters.region;
    const effectiveLevel = s.override_competition_level || s.derived_competition_level;
    const matchesLevel = filters.level === 'all' || String(effectiveLevel) === filters.level;
    const matchesStatus = filters.status === 'all' || s.status === filters.status;
    return matchesSearch && matchesDiscipline && matchesRegion && matchesLevel && matchesStatus;
  });

  filteredSeries.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'founded':
        return (b.founded_year || 0) - (a.founded_year || 0);
      case 'discipline':
        return a.discipline.localeCompare(b.discipline);
      case 'contentValue':
        const valueOrder = { High: 3, Medium: 2, Low: 1, Unknown: 0 };
        return (valueOrder[b.content_value] || 0) - (valueOrder[a.content_value] || 0);
      default:
        return 0;
    }
  });

  return (
    <PageShell className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <DirectoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search series..."
          filters={filters}
          onFilterChange={handleFilterChange}
          filterConfig={[
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
              ],
            },
            {
              key: 'region',
              label: 'Region',
              options: [
                { value: 'all', label: 'All Regions' },
                { value: 'Global', label: 'Global' },
                { value: 'North America', label: 'North America' },
                { value: 'Europe', label: 'Europe' },
                { value: 'Regional', label: 'Regional' },
              ],
            },
            {
              key: 'level',
              label: 'Level',
              options: [
                { value: 'all', label: 'All Levels' },
                { value: '1', label: 'L1 — Foundation' },
                { value: '2', label: 'L2 — Development' },
                { value: '3', label: 'L3 — National' },
                { value: '4', label: 'L4 — Premier' },
                { value: '5', label: 'L5 — World' },
              ],
            },
            {
              key: 'status',
              label: 'Status',
              options: [
                { value: 'all', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Historic', label: 'Historic' },
              ],
            },
          ]}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'name', label: 'Name' },
            { value: 'founded', label: 'Founded' },
            { value: 'discipline', label: 'Discipline' },
            { value: 'contentValue', label: 'Content Value' },
          ]}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : filteredSeries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSeries.map((s) => (
              <SeriesCard key={s.id} series={s} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No series found matching your filters.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}