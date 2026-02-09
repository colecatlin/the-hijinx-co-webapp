import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Trash2 } from 'lucide-react';

export default function SeriesMediaSection({ seriesId }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    logo_url: '',
    hero_image_url: '',
    broadcast_partners: '',
    website_url: ''
  });

  const { data: media } = useQuery({
    queryKey: ['seriesMedia', seriesId],
    queryFn: () => base44.entities.SeriesMedia.filter({ series_id: seriesId }),
    enabled: !!seriesId,
  });

  const mediaItem = media?.[0];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SeriesMedia.create({ series_id: seriesId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesMedia', seriesId] });
      setEditing(false);
      setFormData({ logo_url: '', hero_image_url: '', broadcast_partners: '', website_url: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.SeriesMedia.update(mediaItem.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesMedia', seriesId] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.SeriesMedia.delete(mediaItem.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seriesMedia', seriesId] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mediaItem) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Logo URL" value={formData.logo_url} onChange={(e) => setFormData({...formData, logo_url: e.target.value})} />
            <Input placeholder="Hero Image URL" value={formData.hero_image_url} onChange={(e) => setFormData({...formData, hero_image_url: e.target.value})} />
            <Textarea placeholder="Broadcast Partners" value={formData.broadcast_partners} onChange={(e) => setFormData({...formData, broadcast_partners: e.target.value})} />
            <Input placeholder="Website URL" value={formData.website_url} onChange={(e) => setFormData({...formData, website_url: e.target.value})} />
            <div className="flex gap-2">
              <Button type="submit" className="bg-[#232323]">Save Media</Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Media</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => {
            setFormData(mediaItem || { logo_url: '', hero_image_url: '', broadcast_partners: '', website_url: '' });
            setEditing(true);
          }}>
            {mediaItem ? 'Edit' : 'Add Media'}
          </Button>
          {mediaItem && (
            <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate()}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {mediaItem ? (
          <div className="space-y-4">
            {mediaItem.logo_url && <div><p className="font-semibold mb-1">Logo</p><img src={mediaItem.logo_url} alt="Logo" className="h-16" /></div>}
            {mediaItem.hero_image_url && <div><p className="font-semibold mb-1">Hero Image</p><img src={mediaItem.hero_image_url} alt="Hero" className="w-full h-48 object-cover rounded" /></div>}
            {mediaItem.broadcast_partners && <div><p className="font-semibold mb-1">Broadcast Partners</p><p className="text-gray-600">{mediaItem.broadcast_partners}</p></div>}
            {mediaItem.website_url && <div><p className="font-semibold mb-1">Website</p><a href={mediaItem.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{mediaItem.website_url}</a></div>}
          </div>
        ) : (
          <p className="text-gray-500">No media added yet</p>
        )}
      </CardContent>
    </Card>
  );
}