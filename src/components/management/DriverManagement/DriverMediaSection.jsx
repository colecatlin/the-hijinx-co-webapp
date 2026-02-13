import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Check } from 'lucide-react';
import MediaUploader from '@/components/shared/MediaUploader';
import ImageCropModal from '@/components/shared/ImageCropModal';

export default function DriverMediaSection({ driverId }) {
  const queryClient = useQueryClient();

  const { data: mediaRecords = [] } = useQuery({
    queryKey: ['driverMedia', driverId],
    queryFn: () => base44.entities.DriverMedia.filter({ driver_id: driverId }, '-updated_date', 10),
  });

  const mediaRecord = mediaRecords[0];
  const [data, setData] = useState({
    headshot_url: mediaRecord?.headshot_url || '',
    hero_image_url: mediaRecord?.hero_image_url || '',
    gallery_urls: mediaRecord?.gallery_urls?.join('\n') || '',
    highlight_video_url: mediaRecord?.highlight_video_url || '',
    social_instagram: mediaRecord?.social_instagram || '',
    social_x: mediaRecord?.social_x || '',
    social_youtube: mediaRecord?.social_youtube || '',
    social_facebook: mediaRecord?.social_facebook || '',
    social_threads: mediaRecord?.social_threads || '',
    website_url: mediaRecord?.website_url || '',
    media_notes: mediaRecord?.media_notes || '',
  });

  React.useEffect(() => {
    if (mediaRecord) {
      setData({
        headshot_url: mediaRecord.headshot_url || '',
        hero_image_url: mediaRecord.hero_image_url || '',
        gallery_urls: mediaRecord.gallery_urls?.join('\n') || '',
        highlight_video_url: mediaRecord.highlight_video_url || '',
        social_instagram: mediaRecord.social_instagram || '',
        social_x: mediaRecord.social_x || '',
        social_youtube: mediaRecord.social_youtube || '',
        social_facebook: mediaRecord.social_facebook || '',
        social_threads: mediaRecord.social_threads || '',
        website_url: mediaRecord.website_url || '',
        media_notes: mediaRecord.media_notes || '',
      });
    }
  }, [mediaRecord]);

  const [saved, setSaved] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempHeadshotUrl, setTempHeadshotUrl] = useState(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...data,
        gallery_urls: data.gallery_urls
          .split('\n')
          .map((url) => url.trim())
          .filter((url) => url),
      };

      if (mediaRecord?.id) {
        return base44.entities.DriverMedia.update(mediaRecord.id, payload);
      } else {
        return base44.entities.DriverMedia.create({ ...payload, driver_id: driverId });
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

  const handleHeadshotUpload = (url) => {
    setTempHeadshotUrl(url);
    setCropModalOpen(true);
  };

  const handleCropSave = (croppedUrl) => {
    handleChange('headshot_url', croppedUrl);
    setTempHeadshotUrl(null);
    setCropModalOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media & Socials</CardTitle>
        <CardDescription>Manage images, videos, and social media links</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MediaUploader label="Headshot" value={data.headshot_url} onChange={handleHeadshotUpload} accept="image/*" />
          <MediaUploader label="Hero Image" value={data.hero_image_url} onChange={(url) => handleChange('hero_image_url', url)} accept="image/*" />
          <MediaUploader label="Highlight Video" value={data.highlight_video_url} onChange={(url) => handleChange('highlight_video_url', url)} accept="video/*" />
          <div className="space-y-2">
            <Label>Website URL</Label>
            <Input
              value={data.website_url}
              onChange={(e) => handleChange('website_url', e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <MediaUploader label="Gallery" value={data.gallery_urls ? data.gallery_urls.split('\n').filter(u => u) : []} onChange={(urls) => handleChange('gallery_urls', urls.join('\n'))} accept="image/*" multiple />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-semibold mb-4">Social Media</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input
                value={data.social_instagram}
                onChange={(e) => handleChange('social_instagram', e.target.value)}
                placeholder="@handle or URL"
              />
            </div>

            <div className="space-y-2">
              <Label>X (Twitter)</Label>
              <Input
                value={data.social_x}
                onChange={(e) => handleChange('social_x', e.target.value)}
                placeholder="@handle or URL"
              />
            </div>

            <div className="space-y-2">
              <Label>YouTube</Label>
              <Input
                value={data.social_youtube}
                onChange={(e) => handleChange('social_youtube', e.target.value)}
                placeholder="Channel URL"
              />
            </div>

            <div className="space-y-2">
              <Label>Facebook</Label>
              <Input
                value={data.social_facebook}
                onChange={(e) => handleChange('social_facebook', e.target.value)}
                placeholder="Profile URL"
              />
            </div>

            <div className="space-y-2">
              <Label>Threads</Label>
              <Input
                value={data.social_threads}
                onChange={(e) => handleChange('social_threads', e.target.value)}
                placeholder="@handle or URL"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="space-y-2">
            <Label>Media Notes</Label>
            <Textarea
              value={data.media_notes}
              onChange={(e) => handleChange('media_notes', e.target.value)}
              placeholder="Additional notes about media..."
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
        </div>

        <ImageCropModal
          open={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setTempHeadshotUrl(null);
          }}
          imageUrl={tempHeadshotUrl}
          onSave={handleCropSave}
          aspectRatio={3/4}
        />
      </CardContent>
    </Card>
  );
}