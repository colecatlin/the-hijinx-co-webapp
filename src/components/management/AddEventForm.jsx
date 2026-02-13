import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AddEventForm({ tracks, onCancel, onSuccess }) {
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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Event.create(data),
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onSuccess(newEvent);
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
            <Input
              value={formData.series}
              onChange={(e) => handleChange('series', e.target.value)}
              placeholder="Series name"
            />
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
          <Select value={formData.track_id} onValueChange={(val) => handleChange('track_id', val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select track" />
            </SelectTrigger>
            <SelectContent>
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
  );
}