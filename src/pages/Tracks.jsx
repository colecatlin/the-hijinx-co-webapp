import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import DirectoryFilters from '@/components/shared/DirectoryFilters';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { MapPin, Gauge } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Tracks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    surface: 'all',
    region: 'all',
    state: 'all'
  });
  const [sortBy, setSortBy] = useState('name');

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.filter({ status: 'Published' }),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.filter({ status: 'Published' }),
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.filter({ status: 'Published' }),
  });

  const uniqueStates = [...new Set(tracks.map(t => t.location_state).filter(Boolean))].sort();
  const uniqueRegions = [...new Set(tracks.map(t => t.location_country).filter(Boolean))].sort();
  const uniqueSurfaces = [...new Set(tracks.flatMap(t => t.surface_types || []))].sort();

  const filteredTracks = tracks.filter(track => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = track.name?.toLowerCase().includes(query) ||
                          track.location_city?.toLowerCase().includes(query);
      if (!matchesName) return false;
    }

    if (filters.surface !== 'all' && !track.surface_types?.includes(filters.surface)) return false;
    if (filters.region !== 'all' && track.location_country !== filters.region) return false;
    if (filters.state !== 'all' && track.location_state !== filters.state) return false;

    return true;
  });

  const sortedTracks = [...filteredTracks].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'location':
        return (a.location_state || '').localeCompare(b.location_state || '');
      default:
        return 0;
    }
  });

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-[#232323] mb-2">Tracks</h1>
          <p className="text-lg text-gray-600">Racing venues across all disciplines</p>
        </div>

        <DirectoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
          filterConfig={[
            {
              key: 'surface',
              label: 'Surface',
              options: [
                { value: 'all', label: 'All Surfaces' },
                ...uniqueSurfaces.map(s => ({ value: s, label: s }))
              ]
            },
            {
              key: 'region',
              label: 'Country',
              options: [
                { value: 'all', label: 'All Countries' },
                ...uniqueRegions.map(r => ({ value: r, label: r }))
              ]
            },
            {
              key: 'state',
              label: 'State',
              options: [
                { value: 'all', label: 'All States' },
                ...uniqueStates.map(s => ({ value: s, label: s }))
              ]
            }
          ]}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'name', label: 'Name' },
            { value: 'location', label: 'Location' }
          ]}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTracks.map(track => (
              <Link
                key={track.id}
                to={createPageUrl('TrackHub', { slug: track.slug })}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#232323] hover:shadow-lg transition-all"
              >
                <h3 className="text-xl font-bold mb-2">{track.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{track.location_city}, {track.location_state}</span>
                </div>
                {track.surface_types && track.surface_types.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {track.surface_types.map(surface => (
                      <span key={surface} className="px-2 py-1 bg-gray-100 text-xs rounded">
                        {surface}
                      </span>
                    ))}
                  </div>
                )}
                {track.size_length && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Gauge className="w-4 h-4" />
                    <span>{track.size_length} {track.size_unit}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}