import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import MediaUploader from '@/components/shared/MediaUploader';

export default function TeamMediaSection({ teamId }) {
  const [formData, setFormData] = useState({
    logo_url: '',
    hero_image_url: '',
    gallery_urls: [],
  });
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: teamMedia, isLoading } = useQuery({
    queryKey: ['teamMedia', teamId],
    queryFn: () => base44.entities.TeamMedia.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  useEffect(() => {
    if (teamMedia && teamMedia.length > 0) {
      const m = teamMedia[0];
      setFormData({
        logo_url: m.logo_url || '',
        hero_image_url: m.hero_image_url || '',
        gallery_urls: m.gallery_urls || [],
      });
    }
  }, [teamMedia]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const existing = teamMedia?.[0];
      if (existing?.id) {
        return base44.entities.TeamMedia.update(existing.id, data);
      } else {
        return base44.entities.TeamMedia.create({ ...data, team_id: teamId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMedia', teamId] });
      setIsSaved(true);
      toast.success('Team media updated');
      setTimeout(() => setIsSaved(false), 2000);
    },
  });

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const removeGalleryImage = (index) => {
    setFormData(prev => ({
      ...prev,
      gallery_urls: prev.gallery_urls.filter((_, i) => i !== index)
    }));
  };

  if (isLoading) return <Card className="p-6">Loading...</Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media</CardTitle>
        <CardDescription>Upload team logo, hero image, and gallery photos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Team Logo */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Team Logo</h3>
          <p className="text-xs text-gray-500">Recommended: 400×400px (square) · Max 5MB</p>
          {formData.logo_url && (
            <div className="flex justify-center bg-gray-50 rounded-lg p-4 relative">
              <img src={formData.logo_url} alt="Team logo" className="h-24 object-contain" />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 p-1"
                onClick={() => handleChange('logo_url', '')}
              >
                <X className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          )}
          <MediaUploader
            value={formData.logo_url}
            onChange={(v) => handleChange('logo_url', v)}
            maxSizeMB={5}
          />
        </div>

        {/* Hero Image */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Hero / Banner Image</h3>
          <p className="text-xs text-gray-500">Recommended: 1920×600px (wide) · Max 8MB</p>
          {formData.hero_image_url && (
            <div className="rounded-lg overflow-hidden border relative">
              <img src={formData.hero_image_url} alt="Hero" className="w-full h-40 object-cover" />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-white"
                onClick={() => handleChange('hero_image_url', '')}
              >
                <X className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          )}
          <MediaUploader
            value={formData.hero_image_url}
            onChange={(v) => handleChange('hero_image_url', v)}
            maxSizeMB={8}
          />
        </div>

        {/* Gallery */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Gallery Images</h3>
          <p className="text-xs text-gray-500">Multiple images allowed · Max 8MB each</p>
          {formData.gallery_urls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {formData.gallery_urls.map((url, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border">
                  <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-32 object-cover" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => removeGalleryImage(idx)}
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <MediaUploader
            value={formData.gallery_urls}
            onChange={(v) => handleChange('gallery_urls', v)}
            multiple
            maxSizeMB={8}
          />
        </div>

        <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} className="w-full gap-2">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <Check className="w-4 h-4" /> : null}
          {isSaved ? 'Saved' : saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
}