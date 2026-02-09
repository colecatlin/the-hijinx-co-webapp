import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function StandingsForm({ entry, onClose }) {
  const [formData, setFormData] = useState({
    series_id: entry?.series_id || '',
    series_name: entry?.series_name || '',
    class_name: entry?.class_name || '',
    season: entry?.season || new Date().getFullYear(),
    position: entry?.position || '',
    driver_id: entry?.driver_id || '',
    driver_name: entry?.driver_name || '',
    team_name: entry?.team_name || '',
    points: entry?.points || '',
    wins: entry?.wins || 0,
    podiums: entry?.podiums || 0,
    starts: entry?.starts || 0,
    hometown: entry?.hometown || '',
    vehicle: entry?.vehicle || '',
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => {
      if (entry) {
        return base44.entities.StandingsEntry.update(entry.id, data);
      }
      return base44.entities.StandingsEntry.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      position: parseInt(formData.position),
      season: parseInt(formData.season),
      points: parseInt(formData.points),
      wins: parseInt(formData.wins) || 0,
      podiums: parseInt(formData.podiums) || 0,
      starts: parseInt(formData.starts) || 0,
    });
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{entry ? 'Edit Standings Entry' : 'New Standings Entry'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Series ID *</label>
            <Input
              value={formData.series_id}
              onChange={(e) => handleChange('series_id', e.target.value)}
              placeholder="Series ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Series Name</label>
            <Input
              value={formData.series_name}
              onChange={(e) => handleChange('series_name', e.target.value)}
              placeholder="Series display name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Season *</label>
            <Input
              type="number"
              value={formData.season}
              onChange={(e) => handleChange('season', e.target.value)}
              placeholder={new Date().getFullYear().toString()}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Position *</label>
            <Input
              type="number"
              value={formData.position}
              onChange={(e) => handleChange('position', e.target.value)}
              placeholder="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Driver Name *</label>
            <Input
              value={formData.driver_name}
              onChange={(e) => handleChange('driver_name', e.target.value)}
              placeholder="Driver name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Driver ID</label>
            <Input
              value={formData.driver_id}
              onChange={(e) => handleChange('driver_id', e.target.value)}
              placeholder="Reference to Driver entity"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Team Name</label>
            <Input
              value={formData.team_name}
              onChange={(e) => handleChange('team_name', e.target.value)}
              placeholder="Team name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Class Name</label>
            <Input
              value={formData.class_name}
              onChange={(e) => handleChange('class_name', e.target.value)}
              placeholder="Pro 4, Pro 2, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Points *</label>
            <Input
              type="number"
              value={formData.points}
              onChange={(e) => handleChange('points', e.target.value)}
              placeholder="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Wins</label>
            <Input
              type="number"
              value={formData.wins}
              onChange={(e) => handleChange('wins', e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Podiums</label>
            <Input
              type="number"
              value={formData.podiums}
              onChange={(e) => handleChange('podiums', e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Starts</label>
            <Input
              type="number"
              value={formData.starts}
              onChange={(e) => handleChange('starts', e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Hometown</label>
            <Input
              value={formData.hometown}
              onChange={(e) => handleChange('hometown', e.target.value)}
              placeholder="City, State"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Vehicle</label>
            <Input
              value={formData.vehicle}
              onChange={(e) => handleChange('vehicle', e.target.value)}
              placeholder="Vehicle info"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#232323] hover:bg-[#1A3249]"
            disabled={mutation.isPending || mutation.isSuccess}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mutation.isSuccess && <CheckCircle2 className="w-4 h-4 mr-2" />}
            {entry ? 'Update' : 'Create'} Entry
          </Button>
        </div>
      </form>
    </div>
  );
}