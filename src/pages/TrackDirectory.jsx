import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import TrackCard from '@/components/tracks/TrackCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter } from 'lucide-react';

export default function TrackDirectory() {
  const [filters, setFilters] = useState({
    track_type: 'all',
    surface: 'all',
    state: 'all',
    status: 'all',
  });
  const [sortBy, setSortBy] = useState('name');

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

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-[#232323] mb-2">Tracks</h1>
          <p className="text-gray-600">Find venues, formats, history, and what matters.</p>
        </div>

        <div className="bg-white border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-[#232323]">Filters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Track Type</label>
              <Select value={filters.track_type} onValueChange={(v) => setFilters({ ...filters, track_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Short Course">Short Course</SelectItem>
                  <SelectItem value="Oval">Oval</SelectItem>
                  <SelectItem value="Road Course">Road Course</SelectItem>
                  <SelectItem value="Ice Oval">Ice Oval</SelectItem>
                  <SelectItem value="Mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Surface</label>
              <Select value={filters.surface} onValueChange={(v) => setFilters({ ...filters, surface: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Surfaces</SelectItem>
                  <SelectItem value="Dirt">Dirt</SelectItem>
                  <SelectItem value="Asphalt">Asphalt</SelectItem>
                  <SelectItem value="Ice">Ice</SelectItem>
                  <SelectItem value="Mixed">Mixed</SelectItem>
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

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Seasonal">Seasonal</SelectItem>
                  <SelectItem value="Historic">Historic</SelectItem>
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
                <SelectItem value="state">State</SelectItem>
                <SelectItem value="track_type">Track Type</SelectItem>
                <SelectItem value="content_value">Content Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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