import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EntityImagePanel from '@/components/shared/EntityImagePanel';
import { toast } from 'sonner';

export default function EventCoreDetailsSection({ event, isDraftOnly = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: event.name || '',
    track_id: event.track_id || '',
    series_name: event.series_name || '',
    series_id: event.series_id || '',
    season: event.season || '',
    event_date: event.event_date || '',
    end_date: event.end_date || '',
    status: event.status || 'upcoming',
    round_number: event.round_number || ''
  });

  const isOperational = event.status !== 'Draft';
  const canEditDates = !isOperational;

  useEffect(() => {
    setFormData({
      name: event.name || '',
      track_id: event.track_id || '',
      series_name: event.series_name || '',
      series_id: event.series_id || '',
      season: event.season || '',
      event_date: event.event_date || '',
      end_date: event.end_date || '',
      status: event.status || 'upcoming',
      round_number: event.round_number || ''
    });
  }, [event.id]);
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newTrackData, setNewTrackData] = useState({ name: '', location_city: '', location_country: '' });

  const queryClient = useQueryClient();

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const { data: selectedTrack } = useQuery({
    queryKey: ['track', event.track_id],
    queryFn: () => base44.entities.Track.filter({ id: event.track_id }),
    enabled: !!event.track_id,
    select: (data) => data[0],
  });

  // source_path: event_core_details — routes through syncSourceAndEntityRecord (safe sync pipeline)
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const submitData = { ...data };
      if (!submitData.track_id) delete submitData.track_id;
      if (!submitData.end_date) delete submitData.end_date;
      if (!submitData.round_number) delete submitData.round_number;
      const result = await base44.functions.invoke('syncSourceAndEntityRecord', {
        entity_type: 'event',
        payload: { ...submitData, id: event.id },
        triggered_from: 'event_core_details',
      });
      if (result?.data?.error) throw new Error(result.data.error);
      if (!result?.data?.source_record) throw new Error('syncSourceAndEntityRecord returned no record');
      return result.data.source_record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      setIsEditing(false);
    },
  });

  // source_path: event_core_quick_create_series — routes through sync pipeline (safe sync pipeline)
  const createSeriesMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.functions.invoke('syncSourceAndEntityRecord', {
        entity_type: 'series',
        payload: data,
        triggered_from: 'event_core_quick_create_series',
      });
      if (!result?.data?.source_record) throw new Error(result?.data?.error || 'Failed to create series');
      return result.data.source_record;
    },
    onSuccess: (newSeries) => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setFormData({ ...formData, series_id: newSeries.id, series_name: newSeries.name });
      setShowSeriesModal(false);
      setNewSeriesName('');
    },
  });

  // source_path: event_core_quick_create_track — routes through sync pipeline (safe sync pipeline)
  const createTrackMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.functions.invoke('syncSourceAndEntityRecord', {
        entity_type: 'track',
        payload: data,
        triggered_from: 'event_core_quick_create_track',
      });
      if (!result?.data?.source_record) throw new Error(result?.data?.error || 'Failed to create track');
      return result.data.source_record;
    },
    onSuccess: (newTrack) => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      setFormData({ ...formData, track_id: newTrack.id });
      setShowTrackModal(false);
      setNewTrackData({ name: '', location_city: '', location_country: '' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      name: event.name || '',
      track_id: event.track_id || '',
      series_name: event.series_name || '',
      series_id: event.series_id || '',
      season: event.season || '',
      event_date: event.event_date || '',
      end_date: event.end_date || '',
      status: event.status || 'upcoming',
      round_number: event.round_number || ''
    });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <>
        {isOperational && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800"><strong>Operational Event:</strong> Lifecycle fields are locked. Edit through RegistrationDashboard only.</p>
          </div>
        )}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Core Details</h2>
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" disabled={isOperational}>
              Edit
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Event Name</label>
              <p className="mt-1 text-base">{event.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Series</label>
              <p className="mt-1 text-base">{event.series_name || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Season</label>
              <p className="mt-1 text-base">{event.season || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Track</label>
              <p className="mt-1 text-base">{selectedTrack?.name || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Event Date</label>
              <p className="mt-1 text-base">{event.event_date || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">End Date</label>
              <p className="mt-1 text-base">{event.end_date || 'Single day'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Round Number</label>
              <p className="mt-1 text-base">{event.round_number || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p className="mt-1">
                <span className={`px-2 py-1 text-xs rounded ${
                  event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                  event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                  event.status === 'in_progress' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {event.status}
                </span>
              </p>
            </div>
          </div>
        </Card>
        <EntityImagePanel
          entity={event}
          entityType="Event"
          onSave={async (imgs) => {
            await base44.entities.Event.update(event.id, imgs);
            queryClient.invalidateQueries({ queryKey: ['event', event.id] });
            toast.success('Images saved');
          }}
        />
      </>
    );
  }

  return (
    <>
      {isOperational && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800"><strong>Operational Event:</strong> Lifecycle fields (status, dates, season) are locked for editing. Modify through RegistrationDashboard only.</p>
        </div>
      )}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Event Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Round 1: Phoenix"
              required
              disabled={isOperational}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Series *</label>
              <Select value={formData.series_id} onValueChange={(val) => {
                if (val === '__add_new__') {
                  setShowSeriesModal(true);
                } else {
                  const selectedSeries = allSeries.find(s => s.id === val);
                  setFormData({ ...formData, series_id: val, series_name: selectedSeries?.name || '' });
                }
              }} disabled={isOperational}>
                <SelectTrigger disabled={isOperational}>
                  <SelectValue placeholder="Select series" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__add_new__">
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                      <Plus className="w-4 h-4" />
                      Add Series
                    </div>
                  </SelectItem>
                  {allSeries.map(series => (
                    <SelectItem key={series.id} value={series.id}>
                      {series.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Season {isOperational && '(Locked)'}</label>
              <Input
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                placeholder="2026"
                disabled={isOperational}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Track</label>
            <Select value={formData.track_id} onValueChange={(val) => {
              if (val === '__add_new__') {
                setShowTrackModal(true);
              } else {
                setFormData({ ...formData, track_id: val });
              }
            }} disabled={isOperational}>
              <SelectTrigger disabled={isOperational}>
                <SelectValue placeholder="Select track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__add_new__">
                  <div className="flex items-center gap-2 text-blue-600 font-medium">
                    <Plus className="w-4 h-4" />
                    Add Track
                  </div>
                </SelectItem>
                {tracks.map(track => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Event Date {isOperational && '(Locked)'} *</label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
                disabled={isOperational}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End Date {isOperational && '(Locked)'}</label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                disabled={isOperational}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Round Number</label>
              <Input
                type="number"
                value={formData.round_number}
                onChange={(e) => setFormData({ ...formData, round_number: e.target.value })}
                placeholder="1"
                disabled={isOperational}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status {isOperational && '(Locked)'}</label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })} disabled={isOperational}>
                <SelectTrigger disabled={isOperational}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="bg-gray-900">
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      <Dialog open={showSeriesModal} onOpenChange={setShowSeriesModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Series</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Series Name *</label>
              <Input
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                placeholder="Enter series name"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowSeriesModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (newSeriesName.trim()) {
                    createSeriesMutation.mutate({
                      name: newSeriesName,
                      discipline: 'Off Road',
                      region: 'United States'
                    });
                  }
                }}
                disabled={!newSeriesName.trim() || createSeriesMutation.isPending}
              >
                {createSeriesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Series
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTrackModal} onOpenChange={setShowTrackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Track</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Track Name *</label>
              <Input
                value={newTrackData.name}
                onChange={(e) => setNewTrackData({ ...newTrackData, name: e.target.value })}
                placeholder="Enter track name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">City *</label>
              <Input
                value={newTrackData.location_city}
                onChange={(e) => setNewTrackData({ ...newTrackData, location_city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Country *</label>
              <Input
                value={newTrackData.location_country}
                onChange={(e) => setNewTrackData({ ...newTrackData, location_country: e.target.value })}
                placeholder="Country"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowTrackModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (newTrackData.name.trim() && newTrackData.location_city.trim() && newTrackData.location_country.trim()) {
                    createTrackMutation.mutate(newTrackData);
                  }
                }}
                disabled={!newTrackData.name.trim() || !newTrackData.location_city.trim() || !newTrackData.location_country.trim() || createTrackMutation.isPending}
              >
                {createTrackMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Track
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}