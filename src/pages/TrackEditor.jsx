import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function TrackEditor() {
  const urlParams = new URLSearchParams(window.location.search);
  const trackId = urlParams.get('id');
  const mode = urlParams.get('mode');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: track } = useQuery({
    queryKey: ['track', trackId],
    queryFn: async () => {
      const tracks = await base44.entities.Track.filter({ id: trackId });
      return tracks[0];
    },
    enabled: !!trackId
  });

  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    location_city: '',
    location_state: '',
    location_country: '',
    latitude: '',
    longitude: '',
    surface_types: [],
    size_length: '',
    size_unit: 'mi',
    website_url: '',
    ticket_url: '',
    social_instagram: '',
    social_facebook: '',
    social_youtube: '',
    social_tiktok: '',
    description: '',
    status: 'Draft'
  });

  React.useEffect(() => {
    if (track) {
      setFormData(track);
    }
  }, [track]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (trackId) {
        return base44.entities.Track.update(trackId, data);
      } else {
        return base44.entities.Track.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTracks'] });
      navigate(createPageUrl('ManageTracksBackend'));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <PageShell className="bg-[#FFF8F5]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-black mb-8">{trackId ? 'Edit Track' : 'Create Track'}</h1>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="core" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="core">Core Details</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="social">Social & Links</TabsTrigger>
            </TabsList>

            <TabsContent value="core" className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Track Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Slug *</label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Track Length</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.size_length}
                      onChange={(e) => setFormData({ ...formData, size_length: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Unit</label>
                    <Select
                      value={formData.size_unit}
                      onValueChange={(v) => setFormData({ ...formData, size_unit: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mi">Miles</SelectItem>
                        <SelectItem value="km">Kilometers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Review">Review</SelectItem>
                      <SelectItem value="Published">Published</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City *</label>
                  <Input
                    value={formData.location_city}
                    onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">State/Region</label>
                  <Input
                    value={formData.location_state}
                    onChange={(e) => setFormData({ ...formData, location_state: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Country *</label>
                  <Input
                    value={formData.location_country}
                    onChange={(e) => setFormData({ ...formData, location_country: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Latitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Longitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="social" className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Website URL</label>
                  <Input
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Ticket URL</label>
                  <Input
                    value={formData.ticket_url}
                    onChange={(e) => setFormData({ ...formData, ticket_url: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Instagram</label>
                  <Input
                    value={formData.social_instagram}
                    onChange={(e) => setFormData({ ...formData, social_instagram: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Facebook</label>
                  <Input
                    value={formData.social_facebook}
                    onChange={(e) => setFormData({ ...formData, social_facebook: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">YouTube</label>
                  <Input
                    value={formData.social_youtube}
                    onChange={(e) => setFormData({ ...formData, social_youtube: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">TikTok</label>
                  <Input
                    value={formData.social_tiktok}
                    onChange={(e) => setFormData({ ...formData, social_tiktok: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 mt-8">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Track'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl('ManageTracksBackend'))}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}