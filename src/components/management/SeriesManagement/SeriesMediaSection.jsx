import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import MediaUploader from '@/components/shared/MediaUploader';

export default function SeriesMediaSection({ seriesId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    logo_url: '',
    hero_image_url: '',
    broadcast_partners: '',
    website_url: '',
  });
  const [saved, setSaved] = useState(false);

  const { data: media } = useQuery({
    queryKey: ['seriesMedia', seriesId],
    queryFn: () => base44.entities.SeriesMedia.filter({ series_id: seriesId }),
    enabled: !!seriesId,
  });

  const mediaItem = media?.[0];

  useEffect(() => {
    if (mediaItem) {
      setFormData({
        logo_url: mediaItem.logo_url || '',
        hero_image_url: mediaItem.hero_image_url || '',
        broadcast_partners: mediaItem.broadcast_partners || '',
        website_url: mediaItem.website_url || '',
      });
    }
  }, [mediaItem]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (mediaItem?.id) {
        return base44.entities.SeriesMedia.update(mediaItem.id, data);
      }
      return base44.entities.SeriesMedia.create({ series_id: seriesId, ...data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesMedia', seriesId] });
      setSaved(true);
      toast.success('Media saved');
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media</CardTitle>
        <CardDescription>Upload logos, images, and manage broadcast info</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MediaUploader
            label="Series Logo"
            hint="Recommended: 400×400px (square) · Max 5MB"
            value={formData.logo_url}
            onChange={(v) => handleChange('logo_url', v)}
            maxSizeMB={5}
          />
          <MediaUploader
            label="Hero / Banner Image"
            hint="Recommended: 1920×600px (wide) · Max 8MB"
            value={formData.hero_image_url}
            onChange={(v) => handleChange('hero_image_url', v)}
            maxSizeMB={8}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Website URL</Label>
          <Input
            value={formData.website_url}
            onChange={(e) => handleChange('website_url', e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Broadcast Partners</Label>
          <Textarea
            value={formData.broadcast_partners}
            onChange={(e) => handleChange('broadcast_partners', e.target.value)}
            placeholder="e.g. Fox Sports, NBC Sports..."
            rows={3}
          />
        </div>

        <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
          {saved ? 'Saved' : saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}