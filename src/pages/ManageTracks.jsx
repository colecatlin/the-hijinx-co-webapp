import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Pencil, Trash2, ArrowLeft, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Skeleton } from '@/components/ui/skeleton';
import TrackForm from '@/components/management/TrackForm';

const TRACK_TYPES = ['Short Course', 'Oval', 'Road Course', 'Ice Oval', 'Mixed'];
const SURFACES = ['Dirt', 'Asphalt', 'Ice', 'Mixed'];
const STATUSES = ['Active', 'Seasonal', 'Historic'];

export default function ManageTracks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('-updated_date', 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Track.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tracks'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Track.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      setEditingId(null);
    },
  });

  const filteredTracks = tracks.filter(track =>
    track.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (track) => {
    setEditingId(track.id);
    setEditData({ ...track });
  };

  const handleSave = async () => {
    const { id, created_date, updated_date, created_by, ...dataToSave } = editData;
    updateMutation.mutate({ id: editingId, data: dataToSave });
  };

  const handleDelete = (track) => {
    if (window.confirm(`Delete ${track.name}?`)) {
      deleteMutation.mutate(track.id);
    }
  };

  if (showForm) {
    return <TrackForm onClose={() => setShowForm(false)} />;
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
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTracks.map((track) => (
              <div key={track.id} className="bg-white border border-gray-200 rounded-lg p-6">
                {editingId === track.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Name"
                        placeholder="Track name"
                        value={editData.name || ''}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      />
                      <Input
                        label="City"
                        placeholder="City"
                        value={editData.city || ''}
                        onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                      />
                      <Input
                        label="State"
                        placeholder="State"
                        value={editData.state || ''}
                        onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                      />
                      <Input
                        label="Country"
                        placeholder="Country"
                        value={editData.country || ''}
                        onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Track Type</label>
                        <Select value={editData.track_type || ''} onValueChange={(v) => setEditData({ ...editData, track_type: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRACK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <Select value={editData.status || 'Active'} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Description</label>
                      <Textarea
                        placeholder="Track description"
                        value={editData.description_summary || ''}
                        onChange={(e) => setEditData({ ...editData, description_summary: e.target.value })}
                        className="h-24"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="number"
                        placeholder="Length (miles)"
                        value={editData.length_miles || ''}
                        onChange={(e) => setEditData({ ...editData, length_miles: e.target.value ? parseFloat(e.target.value) : '' })}
                      />
                      <Input
                        type="number"
                        placeholder="Turns count"
                        value={editData.turns_count || ''}
                        onChange={(e) => setEditData({ ...editData, turns_count: e.target.value ? parseInt(e.target.value) : '' })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Contact email"
                        value={editData.contact_email || ''}
                        onChange={(e) => setEditData({ ...editData, contact_email: e.target.value })}
                      />
                      <Input
                        placeholder="Contact phone"
                        value={editData.contact_phone || ''}
                        onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleSave} className="bg-gray-900">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{track.name}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          track.status === 'Active' ? 'bg-green-100 text-green-800' :
                          track.status === 'Seasonal' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {track.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {track.city}, {track.state} • {track.track_type}
                      </p>
                      {track.description_summary && (
                        <p className="text-sm text-gray-600">{track.description_summary}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(track)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(track)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
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