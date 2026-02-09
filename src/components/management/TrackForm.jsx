import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function TrackForm({ track, onClose }) {
  const [formData, setFormData] = useState(track || {
    name: '',
    slug: '',
    city: '',
    state: '',
    country: 'USA',
    status: 'Active',
    founded_year: null,
    description_summary: '',
    track_type: '',
    surfaces: [],
    length_miles: null,
    turns_count: null,
    elevation_profile: 'Unknown',
    content_value: 'Unknown',
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (track) {
        return base44.entities.Track.update(track.id, data);
      }
      return base44.entities.Track.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'name' && !track) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleSurfaceToggle = (surface) => {
    setFormData(prev => ({
      ...prev,
      surfaces: prev.surfaces.includes(surface)
        ? prev.surfaces.filter(s => s !== surface)
        : [...prev.surfaces, surface]
    }));
  };

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-4xl font-black">
            {track ? 'Edit Track' : 'Add Track'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-gray-200 rounded-lg p-6">
          <div>
            <label className="block text-sm font-medium mb-2">Track Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Slug *</label>
            <Input
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              required
              placeholder="url-friendly-name"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <Input
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <Input
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <Input
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Track Type *</label>
            <Select value={formData.track_type} onValueChange={(value) => handleChange('track_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Short Course">Short Course</SelectItem>
                <SelectItem value="Oval">Oval</SelectItem>
                <SelectItem value="Road Course">Road Course</SelectItem>
                <SelectItem value="Ice Oval">Ice Oval</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Surfaces * (select at least one)</label>
            <div className="flex gap-4">
              {['Dirt', 'Asphalt', 'Ice', 'Mixed'].map((surface) => (
                <label key={surface} className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.surfaces.includes(surface)}
                    onCheckedChange={() => handleSurfaceToggle(surface)}
                  />
                  <span className="text-sm">{surface}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Length (miles)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.length_miles || ''}
                onChange={(e) => handleChange('length_miles', e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Turns Count</label>
              <Input
                type="number"
                value={formData.turns_count || ''}
                onChange={(e) => handleChange('turns_count', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Founded Year</label>
              <Input
                type="number"
                value={formData.founded_year || ''}
                onChange={(e) => handleChange('founded_year', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status *</label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Seasonal">Seasonal</SelectItem>
                  <SelectItem value="Historic">Historic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Elevation Profile</label>
              <Select value={formData.elevation_profile} onValueChange={(value) => handleChange('elevation_profile', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Flat">Flat</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
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
              {saveMutation.isPending ? 'Saving...' : track ? 'Update Track' : 'Create Track'}
            </Button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}