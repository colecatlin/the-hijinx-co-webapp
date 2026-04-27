import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

const SESSION_TYPES = [
  { value: 'Practice', label: 'Practice' },
  { value: 'Qualifying', label: 'Qualifying' },
  { value: 'Heat', label: 'Heat' },
  { value: 'LCQ', label: 'LCQ (Last Chance Qualifier)' },
  { value: 'Feature', label: 'Feature' },
  { value: 'Final', label: 'Final' },
  { value: 'Time Attack', label: 'Time Attack' },
  { value: 'Other', label: 'Other' },
];

export default function SessionForm({ session, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    session_type: '',
    name: '',
    round_number: '',
    session_number: '',
    scheduled_time: '',
    duration_minutes: '',
    laps: '',
    ...session,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.session_type || !formData.name) {
      alert('Session type and name are required');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{session ? 'Edit Session' : 'Add Session'}</CardTitle>
        <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-4 h-4" />
        </button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Session Type */}
            <div className="space-y-2">
              <Label htmlFor="session_type">Session Type *</Label>
              <Select value={formData.session_type} onValueChange={(value) => handleSelectChange('session_type', value)}>
                <SelectTrigger id="session_type">
                  <SelectValue placeholder="Select session type" />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Session Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Session Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Round 1, Heat 1"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            {/* Round Number */}
            <div className="space-y-2">
              <Label htmlFor="round_number">Round Number</Label>
              <Input
                id="round_number"
                name="round_number"
                type="number"
                placeholder="e.g., 1"
                value={formData.round_number}
                onChange={handleChange}
              />
            </div>

            {/* Session Number */}
            <div className="space-y-2">
              <Label htmlFor="session_number">Session Number (Order)</Label>
              <Input
                id="session_number"
                name="session_number"
                type="number"
                placeholder="e.g., 1"
                value={formData.session_number}
                onChange={handleChange}
              />
            </div>

            {/* Scheduled Time */}
            <div className="space-y-2">
              <Label htmlFor="scheduled_time">Scheduled Time</Label>
              <Input
                id="scheduled_time"
                name="scheduled_time"
                type="datetime-local"
                value={formData.scheduled_time}
                onChange={handleChange}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                placeholder="e.g., 60"
                value={formData.duration_minutes}
                onChange={handleChange}
              />
            </div>

            {/* Laps */}
            <div className="space-y-2">
              <Label htmlFor="laps">Laps</Label>
              <Input
                id="laps"
                name="laps"
                type="number"
                placeholder="e.g., 100"
                value={formData.laps}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit">Save Session</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}