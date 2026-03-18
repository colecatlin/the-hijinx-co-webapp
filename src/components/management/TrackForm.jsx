import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import LocationFields from '@/components/shared/LocationFields';
import { useSlugField } from '@/hooks/useSlugField';

export default function TrackForm({ track, onClose }) {
  const [formData, setFormData] = useState(track || {
    name: '',
    location_city: '',
    location_state: '',
    location_country: 'USA',
    status: 'Active',
    founded_year: null,
    description_summary: '',
    track_type: '',
    surfaces: [],
    length_miles: null,
    turns_count: null,
    series_ids: [],
  });

  const queryClient = useQueryClient();

  const { data: series } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, ...(track && { id: track.id }) };

      const result = await base44.functions.invoke('syncSourceAndEntityRecord', {
        entity_type: 'track',
        payload,
        triggered_from: 'track_form',
      });

      if (result?.data?.source_record) return result.data.source_record;
      throw new Error(result?.data?.error || 'syncSourceAndEntityRecord returned no record');
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
  };

  const handleSeriesToggle = (seriesId) => {
    setFormData(prev => ({
      ...prev,
      series_ids: prev.series_ids.includes(seriesId)
        ? prev.series_ids.filter(id => id !== seriesId)
        : [...prev.series_ids, seriesId]
    }));
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

          <LocationFields
            cityValue={formData.location_city}
            stateValue={formData.location_state}
            countryValue={formData.location_country}
            onCityChange={(v) => handleChange('location_city', v)}
            onStateChange={(v) => handleChange('location_state', v)}
            onCountryChange={(v) => handleChange('location_country', v)}
          />

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
            <label className="block text-sm font-medium mb-2">Description Summary (2-3 sentences, 360 chars max)</label>
            <Textarea
              value={formData.description_summary}
              onChange={(e) => handleChange('description_summary', e.target.value)}
              rows={4}
              maxLength={360}
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.description_summary?.length || 0}/360
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Affiliated Race Series</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded p-3">
              {series.length === 0 ? (
                <p className="text-sm text-gray-500">No series available</p>
              ) : (
                series.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <Checkbox
                      checked={formData.series_ids.includes(s.id)}
                      onCheckedChange={() => handleSeriesToggle(s.id)}
                    />
                    <span className="text-sm">{s.name}</span>
                  </label>
                ))
              )}
            </div>
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