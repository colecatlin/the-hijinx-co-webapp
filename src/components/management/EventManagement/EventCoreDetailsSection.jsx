import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function EventCoreDetailsSection({ event }) {
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

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const submitData = { ...data };
      if (!submitData.track_id) delete submitData.track_id;
      if (!submitData.end_date) delete submitData.end_date;
      if (!submitData.round_number) delete submitData.round_number;
      return base44.entities.Event.update(event.id, submitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEditing(false);
    },
  });

  const createSeriesMutation = useMutation({
   mutationFn: (data) => base44.entities.Series.create(data),
   onSuccess: (newSeries) => {
     queryClient.invalidateQueries({ queryKey: ['series'] });
     setFormData({ ...formData, series_id: newSeries.id, series_name: newSeries.name });
     setShowSeriesModal(false);
     setNewSeriesName('');
   },
  });

  const createTrackMutation = useMutation({
    mutationFn: (data) => base44.entities.Track.create(data),
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
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Core Details</h2>
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
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
      </>
    );
  }

  return (
    <>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Event Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Round 1: Phoenix"
              required
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
              }}>
                <SelectTrigger>
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
              <label className="block text-sm font-medium mb-2">Season</label>
              <Input
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                placeholder="2026"
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
            }}>
              <SelectTrigger>
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
              <label className="block text-sm font-medium mb-2">Event Date *</label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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