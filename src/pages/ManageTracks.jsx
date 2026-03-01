import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ManagementLayout from '@/components/management/ManagementLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';
import { Search, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Skeleton } from '@/components/ui/skeleton';
import TrackForm from '@/components/management/TrackForm';
import TrackCoreDetailsSection from '@/components/management/TrackManagement/TrackCoreDetailsSection';
import TrackSeriesSection from '@/components/management/TrackManagement/TrackSeriesSection';

export default function ManageTracks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedTrackForEdit, setSelectedTrackForEdit] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('-updated_date', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      await base44.entities.Track.delete(id);
      await base44.functions.invoke('logDeletion', { entityName: 'Track', recordIds: [id], recordNames: [name] });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tracks'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids, names }) => {
      await Promise.all(ids.map(id => base44.entities.Track.delete(id)));
      await base44.functions.invoke('logDeletion', { entityName: 'Track', recordIds: ids, recordNames: names });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      setSelectedTracks([]);
    },
  });

  const filteredTracks = tracks.filter(track =>
    track.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (track) => {
    if (window.confirm(`Delete ${track.name}?`)) {
      deleteMutation.mutate({ id: track.id, name: track.name });
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
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
      const selectedItems = filteredTracks.filter(t => selectedTracks.includes(t.id));
      bulkDeleteMutation.mutate({ ids: selectedTracks, names: selectedItems.map(t => t.name) });
    }
  };

  if (showForm) {
    return <TrackForm onClose={() => setShowForm(false)} />;
  }

  if (selectedTrackForEdit) {
    return (
      <ManagementLayout currentPage="ManageTracks">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => setSelectedTrackForEdit(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-black mb-2">{selectedTrackForEdit.name}</h1>
              <p className="text-gray-600">Manage all track data</p>
            </div>
          </div>

          <Tabs defaultValue="core" className="mt-6">
            <TabsList>
              <TabsTrigger value="core">Core Details</TabsTrigger>
              <TabsTrigger value="series">Series</TabsTrigger>
            </TabsList>
            <TabsContent value="core" className="mt-6">
              <TrackCoreDetailsSection trackId={selectedTrackForEdit.id} />
            </TabsContent>
            <TabsContent value="series" className="mt-6">
              <TrackSeriesSection trackId={selectedTrackForEdit.id} trackName={selectedTrackForEdit.name} />
            </TabsContent>
          </Tabs>
        </div>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage="ManageTracks">
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
          <Button onClick={() => setShowForm(true)} className="bg-gray-900">
            <Plus className="w-4 h-4 mr-2" />
            Add Track
          </Button>
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
              {bulkDeleteMutation.isPending ? (
                <BurnoutSpinner />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedTracks.length}`}
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
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {track.location_city}, {track.location_state}
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
                        {track.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTrackForEdit(track)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleDelete(track)}
                           disabled={deleteMutation.isPending}
                           className={deleteMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}
                         >
                           {deleteMutation.isPending ? (
                             <div className="text-gray-400"><BurnoutSpinner /></div>
                           ) : (
                             <Trash2 className="w-4 h-4 text-red-600" />
                           )}
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
    </ManagementLayout>
  );
}