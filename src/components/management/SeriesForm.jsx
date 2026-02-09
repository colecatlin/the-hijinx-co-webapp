import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, X } from 'lucide-react';

export default function SeriesForm({ series, onClose, onSeriesCreated }) {
  const [formData, setFormData] = useState({
    name: series?.name || '',
    slug: series?.slug || '',
    governing_body: series?.governing_body || '',
    discipline: series?.discipline || 'Mixed',
    founded_year: series?.founded_year || new Date().getFullYear(),
    status: series?.status || 'Active',
    description_summary: series?.description_summary || '',
    region: series?.region || 'Global',
    competition_level: series?.competition_level || 'Professional',
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (series) {
        return base44.entities.Series.update(series.id, data);
      }
      return base44.entities.Series.create(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      if (!series && onSeriesCreated) {
        onSeriesCreated(data);
      } else {
        onClose();
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (!submitData.slug) {
      submitData.slug = formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    mutation.mutate(submitData);
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    
    if (field === 'name' && !series) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };



  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{series ? 'Edit Series' : 'New Series'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Series name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Discipline *</label>
            <Select value={formData.discipline} onValueChange={(val) => handleChange('discipline', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asphalt Oval">Asphalt Oval</SelectItem>
                <SelectItem value="Road Racing">Road Racing</SelectItem>
                <SelectItem value="Off Road">Off Road</SelectItem>
                <SelectItem value="Snowmobile">Snowmobile</SelectItem>
                <SelectItem value="Rallycross">Rallycross</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Competition Level *</label>
            <Select value={formData.competition_level} onValueChange={(val) => handleChange('competition_level', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Semi Pro">Semi Pro</SelectItem>
                <SelectItem value="Amateur">Amateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Governing Body</label>
            <Input
              value={formData.governing_body}
              onChange={(e) => handleChange('governing_body', e.target.value)}
              placeholder="e.g., NASCAR, FIA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Founded Year</label>
            <Input
              type="number"
              value={formData.founded_year}
              onChange={(e) => handleChange('founded_year', parseInt(e.target.value))}
              placeholder={new Date().getFullYear().toString()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Region</label>
            <Select value={formData.region} onValueChange={(val) => handleChange('region', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Global">Global</SelectItem>
                <SelectItem value="North America">North America</SelectItem>
                <SelectItem value="Europe">Europe</SelectItem>
                <SelectItem value="Regional">Regional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Historic">Historic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Description Summary *</label>
            <Textarea
              value={formData.description_summary}
              onChange={(e) => handleChange('description_summary', e.target.value)}
              placeholder="2-3 sentences, max 360 characters"
              rows={3}
              required
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
            {series ? 'Update' : 'Create'} Series
          </Button>
        </div>
      </form>
    </div>
  );
}