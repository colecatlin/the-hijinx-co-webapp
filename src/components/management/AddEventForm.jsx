import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AddEventForm({ tracks, onCancel, onSuccess }) {
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newTrackData, setNewTrackData] = useState({ name: '', location_city: '', location_country: '' });
  const [formData, setFormData] = useState({
    name: '',
    track_id: '',
    series: '',
    season: new Date().getFullYear().toString(),
    event_date: '',
    end_date: '',
    status: 'upcoming',
    round_number: ''
  });

  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  const { data: allSeries = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
  });

  const createSeriesMutation = useMutation({
    mutationFn: (data) => base44.entities.Series.create(data),
    onSuccess: (newSeries) => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      handleChange('series', newSeries.name);
      setShowSeriesModal(false);
      setNewSeriesName('');
    },
  });

  const createTrackMutation = useMutation({
    mutationFn: (data) => base44.entities.Track.create(data),
    onSuccess: (newTrack) => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      handleChange('track_id', newTrack.id);
      setShowTrackModal(false);
      setNewTrackData({ name: '', location_city: '', location_country: '' });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const submitData = { ...data };
      if (!submitData.track_id) delete submitData.track_id;
      if (!submitData.end_date) delete submitData.end_date;
      if (!submitData.round_number) delete submitData.round_number;
      return base44.entities.Event.create(submitData);
    },
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onSuccess(newEvent);
    },
    onError: (error) => {
      console.error('Event creation error:', error);
      alert('Error creating event: ' + (error.message || 'Unknown error'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Event name required';
    if (!formData.series.trim()) newErrors.series = 'Series required';
    if (!formData.event_date) newErrors.event_date = 'Event date required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  return (
    <>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Event Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Round 1: Phoenix"
          />
          {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Series *</label>
            <Select value={formData.series} onValueChange={(val) => {
              if (val === '__add_new__') {
                setShowSeriesModal(true);
              } else {
                handleChange('series', val);
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
                  <SelectItem key={series.id} value={series.name}>
                    {series.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.series && <p className="text-red-600 text-xs mt-1">{errors.series}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Season</label>
            <Input
              value={formData.season}
              onChange={(e) => handleChange('season', e.target.value)}
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
              handleChange('track_id', val);
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
              onChange={(e) => handleChange('event_date', e.target.value)}
            />
            {errors.event_date && <p className="text-red-600 text-xs mt-1">{errors.event_date}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Round Number</label>
            <Input
              type="number"
              value={formData.round_number}
              onChange={(e) => handleChange('round_number', e.target.value)}
              placeholder="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
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
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} className="bg-gray-900">
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Event
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