import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { useSlugField, generateEntitySlug } from '@/hooks/useSlugField';

export default function SeriesForm({ series, onClose, onSeriesCreated }) {
  const { slug, syncSlugFromSource, setSlugManually } = useSlugField(series?.slug || '');

  const { data: disciplines = [] } = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => base44.entities.Discipline.list('sort_order'),
    staleTime: 5 * 60 * 1000,
  });
  const activeDisciplines = disciplines.filter(d => d.is_active !== false);

  const [formData, setFormData] = useState({
    name: series?.name || '',
    governing_body: series?.governing_body || '',
    discipline: series?.discipline || 'Off Road',
    discipline_id: series?.discipline_id || '',
    founded_year: series?.founded_year || new Date().getFullYear(),
    operational_status: series?.operational_status || 'Active',
    description_summary: series?.description_summary || '',
    region: series?.region || 'Global',
    competition_level: series?.competition_level || 'Professional',
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, ...(series && { id: series.id }) };

      const result = await base44.functions.invoke('syncSourceAndEntityRecord', {
        entity_type: 'series',
        payload,
        triggered_from: 'series_form',
      });

      if (result?.data?.source_record) return result.data.source_record;
      throw new Error(result?.data?.error || 'syncSourceAndEntityRecord returned no record');
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
    const finalSlug = slug || generateEntitySlug(formData.name) || 'series';
    mutation.mutate({ ...formData, slug: finalSlug });
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (field === 'name' && !series) {
      syncSlugFromSource(value);
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

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">URL Slug</label>
            <Input
              value={slug}
              onChange={(e) => setSlugManually(e.target.value)}
              placeholder="auto-generated from name"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Used in public URLs · auto-fills from name</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Discipline *</label>
            {activeDisciplines.length > 0 ? (
              <Select
                value={formData.discipline_id || ''}
                onValueChange={(val) => {
                  const disc = activeDisciplines.find(d => d.id === val);
                  setFormData(prev => ({
                    ...prev,
                    discipline_id: val,
                    discipline: disc?.name || prev.discipline,
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select discipline" /></SelectTrigger>
                <SelectContent>
                  {activeDisciplines.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: d.color_code }} />
                        {d.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={formData.discipline} onValueChange={(val) => handleChange('discipline', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Stock Car','Off Road','Dirt Oval','Snowmobile','Dirt Bike','Open Wheel','Sports Car','Touring Car','Rally','Drag','Motorcycle','Karting','Water','Alternative'].map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            <Select value={formData.operational_status} onValueChange={(val) => handleChange('operational_status', val)}>
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