import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const GEOGRAPHIC_SCOPE_OPTIONS = ['Local', 'Regional', 'National', 'International', 'Global'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Upcoming'];

export default function SeriesGovernanceSection({ seriesId }) {
  const [formData, setFormData] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: seriesRecord } = useQuery({
    queryKey: ['series', seriesId],
    queryFn: () => base44.entities.Series.get(seriesId),
    enabled: !!seriesId,
  });

  useEffect(() => {
    if (seriesRecord) setFormData(seriesRecord);
  }, [seriesRecord]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Series.update(seriesId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series', seriesId] });
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setIsSaved(true);
      toast.success('Governance details saved');
      setTimeout(() => setIsSaved(false), 2000);
    },
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    const { id, created_date, updated_date, created_by, ...updateData } = formData;
    updateMutation.mutate(updateData);
  };

  return (
    <div className="space-y-6">
      {/* Sanctioning & Ownership */}
      <Card className="p-6">
        <h3 className="font-semibold text-sm mb-4 text-gray-700 uppercase tracking-wide">Sanctioning & Ownership</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Sanctioning Body</Label>
              <Input
                className="mt-1"
                value={formData.sanctioning_body || ''}
                onChange={e => set('sanctioning_body', e.target.value)}
                placeholder="e.g. SCORE International, NHRA, NASCAR"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={formData.status || ''} onValueChange={v => set('status', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Geographic Scope</Label>
              <Select value={formData.geographic_scope || ''} onValueChange={v => set('geographic_scope', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  {GEOGRAPHIC_SCOPE_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Season Year</Label>
              <Input
                className="mt-1"
                value={formData.season_year || ''}
                onChange={e => set('season_year', e.target.value)}
                placeholder="e.g. 2025"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Competition Level & Scoring */}
      <Card className="p-6">
        <h3 className="font-semibold text-sm mb-4 text-gray-700 uppercase tracking-wide">Competition Level</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Override Competition Level</Label>
              <p className="text-xs text-gray-500 mb-1">Manually override the derived level (1=Foundation → 5=World). Leave blank to use derived value from classes.</p>
              <Input
                type="number"
                min="1"
                max="5"
                className="mt-1"
                value={formData.override_competition_level || ''}
                onChange={e => set('override_competition_level', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="1–5 (optional)"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Popularity Rank</Label>
              <p className="text-xs text-gray-500 mb-1">Lower = higher prominence on site. Leave blank to auto-sort.</p>
              <Input
                type="number"
                className="mt-1"
                value={formData.popularity_rank || ''}
                onChange={e => set('popularity_rank', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 1, 2, 10..."
              />
            </div>
          </div>

          {formData.override_competition_level && (
            <div>
              <Label className="text-sm font-medium">Override Reason</Label>
              <Input
                className="mt-1"
                value={formData.override_reason || ''}
                onChange={e => set('override_reason', e.target.value)}
                placeholder="Why is this overridden?"
              />
            </div>
          )}

          {/* Read-only derived values */}
          {(formData.derived_competition_level || formData.derived_competition_score) && (
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Derived Competition Level:</span>
                <span className="ml-2 font-semibold">{formData.derived_competition_level ?? '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Derived Competition Score:</span>
                <span className="ml-2 font-semibold">{formData.derived_competition_score ?? '—'}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Full Name & Slug */}
      <Card className="p-6">
        <h3 className="font-semibold text-sm mb-4 text-gray-700 uppercase tracking-wide">Identity</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Full Official Name</Label>
            <Input
              className="mt-1"
              value={formData.full_name || ''}
              onChange={e => set('full_name', e.target.value)}
              placeholder="e.g. AMSOIL Championship Off-Road presented by Brunt"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Slug</Label>
              <Input
                className="mt-1"
                value={formData.slug || ''}
                onChange={e => set('slug', e.target.value)}
                placeholder="e.g. amsoil-championship-off-road"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Series Level (Legacy)</Label>
              <Select value={formData.series_level || ''} onValueChange={v => set('series_level', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {['Local', 'Regional', 'National', 'International'].map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              className="mt-1"
              value={formData.description || ''}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Full series description..."
            />
          </div>
        </div>
      </Card>

      <Button onClick={handleSave} disabled={updateMutation.isPending}>
        {isSaved ? 'Saved ✓' : updateMutation.isPending ? 'Saving...' : 'Save Governance'}
      </Button>
    </div>
  );
}