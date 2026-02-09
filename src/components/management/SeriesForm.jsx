import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, X } from 'lucide-react';

export default function SeriesForm({ series, onClose }) {
  const [formData, setFormData] = useState({
    name: series?.name || '',
    slug: series?.slug || '',
    description: series?.description || '',
    classes: series?.classes || [],
    current_season: series?.current_season || new Date().getFullYear(),
    logo_url: series?.logo_url || '',
    status: series?.status || 'active',
  });

  const [classInput, setClassInput] = useState('');

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => {
      if (series) {
        return base44.entities.Series.update(series.id, data);
      }
      return base44.entities.Series.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      onClose();
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

  const handleAddClass = () => {
    if (classInput.trim() && !formData.classes.includes(classInput.trim())) {
      setFormData({ ...formData, classes: [...formData.classes, classInput.trim()] });
      setClassInput('');
    }
  };

  const handleRemoveClass = (cls) => {
    setFormData({ ...formData, classes: formData.classes.filter(c => c !== cls) });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{series ? 'Edit Series' : 'New Series'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Series name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Current Season</label>
            <Input
              type="number"
              value={formData.current_season}
              onChange={(e) => handleChange('current_season', parseInt(e.target.value))}
              placeholder={new Date().getFullYear().toString()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Select value={formData.status} onValueChange={(val) => handleChange('status', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Logo URL</label>
            <Input
              value={formData.logo_url}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Series description"
              rows={3}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2">Classes</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={classInput}
                onChange={(e) => setClassInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddClass())}
                placeholder="Add a class (e.g., Pro 4, Pro 2)"
              />
              <Button type="button" onClick={handleAddClass}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.classes.map((cls) => (
                <span key={cls} className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2">
                  {cls}
                  <button type="button" onClick={() => handleRemoveClass(cls)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
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