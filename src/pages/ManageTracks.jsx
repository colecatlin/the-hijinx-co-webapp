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

export default function ManageTracks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTrack, setEditingTrack] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const queryClient = useQueryClient();

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

  const filteredTracks = tracks.filter(track => {
    const query = searchQuery.toLowerCase();
    return track.name?.toLowerCase().includes(query);
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTracks(filteredTracks.map(t => t.id));
    } else {
      setSelectedTracks([]);
    }
  };

  const handleSelectTrack = (id) => {
    setSelectedTracks(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Delete ${selectedTracks.length} selected track(s)?`)) {
      bulkDeleteMutation.mutate(selectedTracks);
    }
  };

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
    <PageShell>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Management')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-black mb-2">Manage Tracks</h1>
            <p className="text-gray-600">{tracks.length} total tracks</p>
          </div>
          <div className="flex gap-2">
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

        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {selectedTracks.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedTracks.length}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <Checkbox 
                      checked={selectedTracks.length === filteredTracks.length && filteredTracks.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTracks.map((track) => (
                  <tr key={track.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Checkbox 
                        checked={selectedTracks.includes(track.id)}
                        onCheckedChange={() => handleSelectTrack(track.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{track.name}</div>
                      <div className="text-sm text-gray-500">{track.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {track.city}, {track.state}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {track.track_type}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        track.status === 'Active' ? 'bg-green-100 text-green-800' :
                        track.status === 'Seasonal' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {track.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(track)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(track)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredTracks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No tracks found
          </div>
        )}
      </div>
    </PageShell>
  );
}