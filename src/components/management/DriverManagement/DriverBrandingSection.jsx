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
    hero_image_url: '',
    profile_image_url: '',
    website_url: '',
    instagram_url: '',
    facebook_url: '',
    tiktok_url: '',
    x_url: '',
    youtube_url: '',
    years_active_start: '',
    years_active_end: '',
    nicknames_raw: '',
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (driver) {
      setFormData({
        bio: driver.bio || '',
        tagline: driver.tagline || '',
        hero_image_url: driver.hero_image_url || '',
        profile_image_url: driver.profile_image_url || '',
        website_url: driver.website_url || '',
        instagram_url: driver.instagram_url || '',
        facebook_url: driver.facebook_url || '',
        tiktok_url: driver.tiktok_url || '',
        x_url: driver.x_url || '',
        youtube_url: driver.youtube_url || '',
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
        hero_image_url: data.hero_image_url || null,
        profile_image_url: data.profile_image_url || null,
        website_url: data.website_url || null,
        instagram_url: data.instagram_url || null,
        facebook_url: data.facebook_url || null,
        tiktok_url: data.tiktok_url || null,
        x_url: data.x_url || null,
        youtube_url: data.youtube_url || null,
        years_active_start: data.years_active_start ? Number(data.years_active_start) : null,
        years_active_end: data.years_active_end ? Number(data.years_active_end) : null,
        nicknames,
      };
      return base44.entities.Driver.update(driverId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', driverId] });
      toast.success('Branding & identity saved');
      onSaveSuccess?.();
    },
  });

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const uploadImage = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange(field, file_url);
      toast.success('Image uploaded');
    } catch {
      toast.error('Upload failed');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding & Identity</CardTitle>
        <CardDescription>Bio, tagline, images, social links, and career years</CardDescription>
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

        {/* Images */}
        <div className="border-t pt-5 space-y-4">
          <h4 className="font-semibold text-sm text-gray-700">Profile Images</h4>
          {[
            { field: 'profile_image_url', label: 'Profile / Portrait Image' },
            { field: 'hero_image_url', label: 'Hero / Banner Image' },
          ].map(({ field, label }) => (
            <div key={field} className="flex items-start gap-4">
              {formData[field] ? (
                <img src={formData[field]} alt={label} className="w-20 h-14 object-cover rounded border border-gray-200 flex-shrink-0" />
              ) : (
                <div className="w-20 h-14 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">None</div>
              )}
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  className="text-xs"
                  value={formData[field]}
                  onChange={e => handleChange(field, e.target.value)}
                  placeholder="https://..."
                />
                <label className="cursor-pointer inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50">
                  <input type="file" accept="image/*" className="hidden" onChange={e => uploadImage(e, field)} />
                  Upload
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Social links */}
        <div className="border-t pt-5 space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">Social & Web</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { field: 'website_url', label: 'Website', placeholder: 'https://mywebsite.com' },
              { field: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/...' },
              { field: 'x_url', label: 'X / Twitter', placeholder: 'https://x.com/...' },
              { field: 'facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/...' },
              { field: 'tiktok_url', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
              { field: 'youtube_url', label: 'YouTube', placeholder: 'https://youtube.com/...' },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <Label className="text-xs">{label}</Label>
                <Input
                  className="mt-1 text-sm"
                  value={formData[field]}
                  onChange={e => handleChange(field, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
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
          <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} className="bg-gray-900">
            {saveMutation.isPending ? 'Saving…' : 'Save Branding'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}