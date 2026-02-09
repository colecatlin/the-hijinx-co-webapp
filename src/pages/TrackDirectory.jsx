import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import TrackCard from '@/components/tracks/TrackCard';
import DirectoryFilters from '@/components/shared/DirectoryFilters';
import { Skeleton } from '@/components/ui/skeleton';

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

  const { data: allDisciplines = [] } = useQuery({
    queryKey: ['trackToDisciplines'],
    queryFn: () => base44.entities.TrackToDiscipline.list(),
  });

  const { data: trackMedia = [] } = useQuery({
    queryKey: ['trackMedia'],
    queryFn: () => base44.entities.TrackMedia.list(),
  });

  const { data: trackOperations = [] } = useQuery({
    queryKey: ['trackOperations'],
    queryFn: () => base44.entities.TrackOperations.list(),
  });

  const { data: trackCommunity = [] } = useQuery({
    queryKey: ['trackCommunity'],
    queryFn: () => base44.entities.TrackCommunity.list(),
  });

  const { data: trackPerformance = [] } = useQuery({
    queryKey: ['trackPerformance'],
    queryFn: () => base44.entities.TrackPerformance.list(),
  });

  const getDisciplinesForTrack = (trackId) => {
    return allDisciplines.filter(d => d.track_id === trackId);
  };

  // Filter tracks with complete data
  const tracksWithCompleteData = tracks.filter(track => {
    const hasMedia = trackMedia.some(m => m.track_id === track.id);
    const hasOperations = trackOperations.some(o => o.track_id === track.id);
    const hasCommunity = trackCommunity.some(c => c.track_id === track.id);
    const hasPerformance = trackPerformance.some(p => p.track_id === track.id);
    return hasMedia && hasOperations && hasCommunity && hasPerformance;
  });

  const filteredTracks = tracksWithCompleteData
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
      if (sortBy === 'content_value') {
        const order = { High: 1, Medium: 2, Low: 3, Unknown: 4 };
        return (order[a.content_value] || 4) - (order[b.content_value] || 4);
      }
      return 0;
    });

  const uniqueStates = [...new Set(tracks.map(t => t.state).filter(Boolean))].sort();

  const filterConfig = [
    {
      key: 'track_type',
      label: 'Track Type',
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'Short Course', label: 'Short Course' },
        { value: 'Oval', label: 'Oval' },
        { value: 'Road Course', label: 'Road Course' },
        { value: 'Ice Oval', label: 'Ice Oval' },
        { value: 'Mixed', label: 'Mixed' },
      ]
    },
    {
      key: 'surface',
      label: 'Surface',
      options: [
        { value: 'all', label: 'All Surfaces' },
        { value: 'Dirt', label: 'Dirt' },
        { value: 'Asphalt', label: 'Asphalt' },
        { value: 'Ice', label: 'Ice' },
        { value: 'Mixed', label: 'Mixed' },
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
        { value: 'Active', label: 'Active' },
        { value: 'Seasonal', label: 'Seasonal' },
        { value: 'Historic', label: 'Historic' },
      ]
    },
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'state', label: 'State' },
    { value: 'track_type', label: 'Track Type' },
    { value: 'content_value', label: 'Content Value' },
  ];

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-[#232323] mb-2">Tracks</h1>
          <p className="text-gray-600">Find venues, formats, history, and what matters.</p>
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
            {filteredTracks.map(track => {
              const media = trackMedia.find(m => m.track_id === track.id);
              return (
                <TrackCard
                  key={track.id}
                  track={track}
                  disciplines={getDisciplinesForTrack(track.id)}
                  media={media}
                />
              );
            })}
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