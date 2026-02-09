import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Pencil, Trash2, ArrowLeft, Upload, Download } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import TrackForm from '@/components/management/TrackForm';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadTemplate } from '@/components/shared/downloadTemplate';
import DirectoryFilters from '@/components/shared/DirectoryFilters';

export default function ManageTracks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTrack, setEditingTrack] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    track_type: 'all',
    surface: 'all',
    state: 'all',
    status: 'all',
  });
  const [sortBy, setSortBy] = useState('name');
  const queryClient = useQueryClient();

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('-updated_date', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Track.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.Track.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      setSelectedTracks([]);
    },
  });

  const uniqueStates = [...new Set(tracks.map(t => t.state).filter(Boolean))].sort();

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
      if (sortBy === 'content_value') {
        const order = { High: 1, Medium: 2, Low: 3, Unknown: 4 };
        return (order[a.content_value] || 4) - (order[b.content_value] || 4);
      }
      return 0;
    });

  const handleEdit = (track) => {
    setEditingTrack(track);
    setShowForm(true);
  };

  const handleDelete = async (track) => {
    if (window.confirm(`Delete ${track.name}?`)) {
      deleteMutation.mutate(track.id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTrack(null);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(tracks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tracks-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        const dataArray = Array.isArray(importedData) ? importedData : [importedData];
        
        await base44.entities.Track.bulkCreate(dataArray.map(({ id, created_date, updated_date, created_by, ...rest }) => rest));
        queryClient.invalidateQueries({ queryKey: ['tracks'] });
        alert(`Successfully imported ${dataArray.length} track(s)`);
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (showForm) {
    return <TrackForm track={editingTrack} onClose={handleFormClose} />;
  }

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-[#232323] mb-2">Manage Tracks</h1>
            <p className="text-gray-600">{tracks.length} total tracks</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadTemplate('track', 'Track')} title="Download import template">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => document.getElementById('import-tracks').click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <input
              id="import-tracks"
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button onClick={() => setShowForm(true)} className="bg-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Add Track
            </Button>
          </div>
        </div>

        <DirectoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFilterChange={handleFilterChange}
          filterConfig={[
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
          ]}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { value: 'name', label: 'Name' },
            { value: 'state', label: 'State' },
            { value: 'track_type', label: 'Track Type' },
            { value: 'content_value', label: 'Content Value' },
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
            {filteredTracks.map((track) => (
              <div key={track.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg mb-1">{track.name}</h3>
                    <p className="text-sm text-gray-500">{track.track_type}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(track)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(track)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <p className="text-gray-600"><span className="font-medium">Location:</span> {track.city}, {track.state}</p>
                  <p className="text-gray-600"><span className="font-medium">Length:</span> {track.length_miles ? `${track.length_miles} miles` : 'N/A'}</p>
                  <p className="text-gray-600"><span className="font-medium">Surface:</span> {track.surfaces?.join(', ') || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                    track.status === 'Active' ? 'bg-green-100 text-green-800' :
                    track.status === 'Seasonal' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {track.status}
                  </span>
                </div>
              </div>
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