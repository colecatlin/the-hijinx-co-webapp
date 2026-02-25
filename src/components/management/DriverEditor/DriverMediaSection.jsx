import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Check } from 'lucide-react';
import MediaUploader from '@/components/shared/MediaUploader';

export default function DriverMediaSection({ driverId }) {
  const { data: media = [] } = useQuery({
    queryKey: ['driverMedia', driverId],
    queryFn: () => base44.entities.DriverMedia.filter({ driver_id: driverId }),
    enabled: !!driverId && driverId !== 'new',
  });

  const mediaRecord = media[0];
  const [data, setData] = useState({
    headshot_url: '',
    hero_image_url: '',
    gallery_urls: [],
    highlight_video_url: '',
    social_instagram: '',
    social_x: '',
    social_youtube: '',
    social_facebook: '',
    social_threads: '',
    social_linkedin: '',
    website_url: '',
    media_notes: '',
  });

  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (mediaRecord) {
      setData({
        headshot_url: mediaRecord.headshot_url || '',
        hero_image_url: mediaRecord.hero_image_url || '',
        gallery_urls: mediaRecord.gallery_urls || [],
        highlight_video_url: mediaRecord.highlight_video_url || '',
        social_instagram: mediaRecord.social_instagram || '',
        social_x: mediaRecord.social_x || '',
        social_youtube: mediaRecord.social_youtube || '',
        social_facebook: mediaRecord.social_facebook || '',
        social_threads: mediaRecord.social_threads || '',
        social_linkedin: mediaRecord.social_linkedin || '',
        website_url: mediaRecord.website_url || '',
        media_notes: mediaRecord.media_notes || '',
      });
    }
  }, [mediaRecord]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (mediaRecord?.id) {
        return base44.entities.DriverMedia.update(mediaRecord.id, data);
      } else {
        return base44.entities.DriverMedia.create({ ...data, driver_id: driverId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverMedia', driverId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media & Socials</CardTitle>
        <CardDescription>Upload images and manage social media links</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Photos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MediaUploader
            label="Headshot"
            hint="Recommended: 600×800px (3:4) · Max 5MB"
            value={data.headshot_url}
            onChange={(v) => handleChange('headshot_url', v)}
            maxSizeMB={5}
          />
          <MediaUploader
            label="Hero / Banner Image"
            hint="Recommended: 1920×600px (wide) · Max 8MB"
            value={data.hero_image_url}
            onChange={(v) => handleChange('hero_image_url', v)}
            maxSizeMB={8}
          />
        </div>

        <MediaUploader
          label="Gallery"
          hint="Multiple images allowed · Max 8MB each"
          value={data.gallery_urls}
          onChange={(v) => handleChange('gallery_urls', v)}
          multiple
          maxSizeMB={8}
        />

        {/* Video */}
        <div className="border-t pt-4">
          <div className="space-y-1.5">
            <Label>Highlight Video URL</Label>
            <p className="text-xs text-gray-400">YouTube, Vimeo, or direct link</p>
            <Input
              value={data.highlight_video_url}
              onChange={(e) => handleChange('highlight_video_url', e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
        </div>

        {/* Website */}
        <div className="space-y-1.5">
          <Label>Website URL</Label>
          <Input
            value={data.website_url}
            onChange={(e) => handleChange('website_url', e.target.value)}
            placeholder="https://..."
          />
        </div>

        {/* Socials */}
        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Social Media</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'social_instagram', label: 'Instagram', placeholder: '@handle or URL' },
              { key: 'social_x', label: 'X (Twitter)', placeholder: '@handle or URL' },
              { key: 'social_youtube', label: 'YouTube', placeholder: 'Channel URL' },
              { key: 'social_facebook', label: 'Facebook', placeholder: 'Profile URL' },
              { key: 'social_threads', label: 'Threads', placeholder: '@handle or URL' },
              { key: 'social_linkedin', label: 'LinkedIn', placeholder: 'Profile URL' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  value={data[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="border-t pt-6 space-y-1.5">
          <Label>Media Notes</Label>
          <Textarea
            value={data.media_notes}
            onChange={(e) => handleChange('media_notes', e.target.value)}
            placeholder="Additional notes about media assets..."
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}