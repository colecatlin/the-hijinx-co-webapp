import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import LocationFields from '@/components/shared/LocationFields';

export default function TeamForm({ team, onClose }) {
  const [formData, setFormData] = useState(team || {
    name: '',
    slug: '',
    headquarters_city: '',
    headquarters_state: '',
    country: 'USA',
    status: 'Active',
    founded_year: new Date().getFullYear(),
    description_summary: '',
    ownership_type: 'Private',
    owner_name: '',
    team_principal: '',
    content_value: 'Unknown',
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (team) {
        return base44.entities.Team.update(team.id, data);
      }
      return base44.entities.Team.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'name' && !team) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-4xl font-black">
            {team ? 'Edit Team' : 'Add Team'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-gray-200 rounded-lg p-6">
          <div>
            <label className="block text-sm font-medium mb-2">Team Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <LocationFields
            cityValue={formData.headquarters_city}
            stateValue={formData.headquarters_state}
            countryValue={formData.country}
            onCityChange={(v) => handleChange('headquarters_city', v)}
            onStateChange={(v) => handleChange('headquarters_state', v)}
            onCountryChange={(v) => handleChange('country', v)}
            cityLabel="City"
            stateLabel="State"
            countryLabel="Country"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Founded Year</label>
              <Input
                type="number"
                value={formData.founded_year}
                onChange={(e) => handleChange('founded_year', parseInt(e.target.value))}
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status *</label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Part Time">Part Time</SelectItem>
                  <SelectItem value="Historic">Historic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ownership Type</label>
            <Select value={formData.ownership_type} onValueChange={(value) => handleChange('ownership_type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Private">Private</SelectItem>
                <SelectItem value="Family">Family</SelectItem>
                <SelectItem value="Corporate">Corporate</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Owner Name</label>
              <Input
                value={formData.owner_name}
                onChange={(e) => handleChange('owner_name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Team Principal</label>
              <Input
                value={formData.team_principal}
                onChange={(e) => handleChange('team_principal', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description Summary * (2-3 sentences, 360 chars max)</label>
            <Textarea
              value={formData.description_summary}
              onChange={(e) => handleChange('description_summary', e.target.value)}
              required
              rows={4}
              maxLength={360}
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.description_summary?.length || 0}/360
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content Value</label>
            <Select value={formData.content_value} onValueChange={(value) => handleChange('content_value', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-gray-900">
              {saveMutation.isPending ? 'Saving...' : team ? 'Update Team' : 'Create Team'}
            </Button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}