import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import TrackCard from '@/components/tracks/TrackCard';
import DirectoryFilters from '@/components/shared/DirectoryFilters';
import { Skeleton } from '@/components/ui/skeleton';

const TRACK_TYPES = ['Short Course', 'Oval', 'Road Course', 'Ice Oval', 'Mixed'];
const SURFACES = ['Dirt', 'Asphalt', 'Ice', 'Mixed'];
const STATUSES = ['Active', 'Seasonal', 'Historic'];

export default function TrackDirectory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    track_type: 'all',
    surface: 'all',
    state: 'all',
    status: 'all',
  });
  const [sortBy, setSortBy] = useState('name');

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const filteredTracks = tracks
    .filter(track => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = track.name?.toLowerCase().includes(query);
        if (!matchesName) return false;
      }

      if (filters.track_type !== 'all' && track.track_type !== filters.track_type) return false;
      if (filters.surface !== 'all' && !track.surfaces?.includes(filters.surface)) return false;
      if (filters.state !== 'all' && track.state !== filters.state) return false;
      if (filters.status !== 'all' && track.status !== filters.status) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'state') return (a.state || '').localeCompare(b.state || '');
      if (sortBy === 'track_type') return (a.track_type || '').localeCompare(b.track_type || '');
      return 0;
    });

  const uniqueStates = [...new Set(tracks.map(t => t.state).filter(Boolean))].sort();

  const filterConfig = [
    {
      key: 'track_type',
      label: 'Track Type',
      options: [
        { value: 'all', label: 'All Types' },
        ...TRACK_TYPES.map(t => ({ value: t, label: t }))
      ]
    },
    {
      key: 'surface',
      label: 'Surface',
      options: [
        { value: 'all', label: 'All Surfaces' },
        ...SURFACES.map(s => ({ value: s, label: s }))
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
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Status' },
        ...STATUSES.map(s => ({ value: s, label: s }))
      ]
    },
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'state', label: 'State' },
    { value: 'track_type', label: 'Track Type' },
  ];

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-[#232323] mb-2">Tracks</h1>
          <p className="text-lg text-gray-600">Explore racing venues worldwide.</p>
        </div>

        <DirectoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFilterChange={handleFilterChange}
          filterConfig={filterConfig}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOptions={sortOptions}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTracks.map(track => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        )}

        {!isLoading && filteredTracks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No tracks found matching your filters.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}