import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check } from 'lucide-react';
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

  if (isLoading) return <Card className="p-6">Loading...</Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media</CardTitle>
        <CardDescription>Upload team logo, hero image, and gallery photos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
         <div className="space-y-4">
           <div>
             <h3 className="text-sm font-semibold mb-3">Team Logo</h3>
             {formData.logo_url && (
               <div className="mb-3 flex justify-center bg-gray-50 rounded-lg p-4">
                 <img src={formData.logo_url} alt="Team logo" className="h-24 object-contain" />
               </div>
             )}
             <MediaUploader
               label="Upload Team Logo"
               hint="Recommended: 400×400px (square) · Max 5MB"
               value={formData.logo_url}
               onChange={(v) => handleChange('logo_url', v)}
               maxSizeMB={5}
             />
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <MediaUploader
             label="Hero / Banner Image"
             hint="Recommended: 1920×600px (wide) · Max 8MB"
             value={formData.hero_image_url}
             onChange={(v) => handleChange('hero_image_url', v)}
             maxSizeMB={8}
           />
         </div>

        <MediaUploader
          label="Gallery"
          hint="Multiple images allowed · Max 8MB each"
          value={formData.gallery_urls}
          onChange={(v) => handleChange('gallery_urls', v)}
          multiple
          maxSizeMB={8}
        />

        <div className="pt-2">
          <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <Check className="w-4 h-4" /> : null}
            {isSaved ? 'Saved' : saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}