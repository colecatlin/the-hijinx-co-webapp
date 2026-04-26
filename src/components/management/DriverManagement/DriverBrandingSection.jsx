import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';


export default function DriverBrandingSection({ driver, driverId, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    bio: '',
    tagline: '',
    years_active_start: '',
    years_active_end: '',
    nicknames_raw: '',
  });

  const [isDirty, setIsDirty] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (driver) {
      setFormData({
        bio: driver.bio || '',
        tagline: driver.tagline || '',
        years_active_start: driver.years_active_start || '',
        years_active_end: driver.years_active_end || '',
        nicknames_raw: (driver.nicknames || []).join(', '),
      });
    }
  }, [driver]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const nicknames = data.nicknames_raw
        ? data.nicknames_raw.split(',').map(n => n.trim()).filter(Boolean)
        : [];
      const payload = {
        id: driverId,
        bio: data.bio || null,
        tagline: data.tagline || null,
        years_active_start: data.years_active_start ? Number(data.years_active_start) : null,
        years_active_end: data.years_active_end ? Number(data.years_active_end) : null,
        nicknames,
      };
      return base44.entities.Driver.update(driverId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', driverId] });
      toast.success('Branding & identity saved');
      setIsDirty(false);
      onSaveSuccess?.();
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding & Identity</CardTitle>
        <CardDescription>Bio, tagline, career years, and nicknames</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bio & tagline */}
        <div className="space-y-4">
          <div>
            <Label>Tagline</Label>
            <Input
              className="mt-2"
              value={formData.tagline}
              onChange={e => handleChange('tagline', e.target.value)}
              placeholder="Short identity statement, e.g. 'Racing to win, built to last'"
              maxLength={120}
            />
          </div>
          <div>
            <Label>Full Bio</Label>
            <Textarea
              className="mt-2"
              value={formData.bio}
              onChange={e => handleChange('bio', e.target.value)}
              placeholder="Public biography shown on driver profile..."
              rows={5}
            />
          </div>
        </div>

        {/* Career years & nicknames */}
        <div className="border-t pt-5 space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">Career Identity</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Career Start Year</Label>
              <Input
                className="mt-2"
                type="number"
                value={formData.years_active_start}
                onChange={e => handleChange('years_active_start', e.target.value)}
                placeholder="e.g. 2010"
                min="1950" max="2100"
              />
            </div>
            <div>
              <Label>Career End Year</Label>
              <Input
                className="mt-2"
                type="number"
                value={formData.years_active_end}
                onChange={e => handleChange('years_active_end', e.target.value)}
                placeholder="Leave blank if still active"
                min="1950" max="2100"
              />
            </div>
          </div>
          <div>
            <Label>Nicknames <span className="text-gray-400 font-normal">(comma separated)</span></Label>
            <Input
              className="mt-2"
              value={formData.nicknames_raw}
              onChange={e => handleChange('nicknames_raw', e.target.value)}
              placeholder='e.g. "The Hammer", Maverick'
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending || !isDirty} className="bg-gray-900">
            {saveMutation.isPending ? 'Saving…' : isDirty ? 'Save Branding' : '✓ Saved'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}