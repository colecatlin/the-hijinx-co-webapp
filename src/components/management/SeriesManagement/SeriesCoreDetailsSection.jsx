import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function SeriesCoreDetailsSection({ seriesId }) {
  const [formData, setFormData] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: series } = useQuery({
    queryKey: ['series', seriesId],
    queryFn: () => base44.entities.Series.list({ id: seriesId }),
  });

  useEffect(() => {
    if (series && series.length > 0) {
      setFormData(series[0]);
    }
  }, [series]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Series.update(seriesId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series', seriesId] });
      setIsSaved(true);
      toast.success('Series updated');
      setTimeout(() => setIsSaved(false), 2000);
    },
  });

  const handleSave = () => {
    const { id, created_date, updated_date, created_by, ...updateData } = formData;
    updateMutation.mutate(updateData);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Series Name</label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Slug</label>
            <Input
              value={formData.slug || ''}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Discipline</label>
            <Select value={formData.discipline || ''} onValueChange={(value) => setFormData({ ...formData, discipline: value })}>
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
            <label className="text-sm font-medium">Region</label>
            <Select value={formData.region || ''} onValueChange={(value) => setFormData({ ...formData, region: value })}>
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
            <label className="text-sm font-medium">Competition Level</label>
            <Select value={formData.competition_level || ''} onValueChange={(value) => setFormData({ ...formData, competition_level: value })}>
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={formData.status || ''} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Historic">Historic</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Founded Year</label>
            <Input
              type="number"
              value={formData.founded_year || ''}
              onChange={(e) => setFormData({ ...formData, founded_year: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={formData.description_summary || ''}
            onChange={(e) => setFormData({ ...formData, description_summary: e.target.value })}
            rows={4}
          />
        </div>

        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {isSaved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}