import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import LocationFields from '@/components/shared/LocationFields';
import MediaUploader from '@/components/shared/MediaUploader';

export default function TrackCoreDetailsSection({ trackId }) {
  const [formData, setFormData] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: track } = useQuery({
    queryKey: ['track', trackId],
    queryFn: () => base44.entities.Track.filter({ id: trackId }),
  });

  useEffect(() => {
    if (track && track.length > 0) {
      setFormData(track[0]);
    }
  }, [track]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Route through syncSourceAndEntityRecord so name edits refresh
      // normalized_name, canonical_slug, and canonical_key automatically.
      const prepareRes = await base44.functions.invoke('prepareSourcePayloadForSync', {
        entity_type: 'track',
        payload: { ...data, id: trackId },
      });
      const preparedPayload = prepareRes?.data?.payload ?? { ...data, id: trackId };

      const syncRes = await base44.functions.invoke('syncSourceAndEntityRecord', {
        entity_type: 'track',
        payload: preparedPayload,
        user_id: currentUser?.id,
        triggered_from: 'management_ui',
      });
      if (syncRes?.data?.error) throw new Error(syncRes.data.error);
      return syncRes?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      setIsSaved(true);
      toast.success('Track updated');
      setTimeout(() => setIsSaved(false), 2000);
    },
  });

  const handleSave = () => {
    const { id, created_date, updated_date, created_by, ...updateData } = formData;
    updateMutation.mutate(updateData);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Track Name</label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Slug</label>
            <Input
              value={formData.slug || ''}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
          </div>
        </div>

        <LocationFields
          cityValue={formData.location_city}
          stateValue={formData.location_state}
          countryValue={formData.location_country || 'USA'}
          onCityChange={(v) => setFormData({ ...formData, location_city: v })}
          onStateChange={(v) => setFormData({ ...formData, location_state: v })}
          onCountryChange={(v) => setFormData({ ...formData, location_country: v })}
        />

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Track Type</label>
            <Select value={formData.track_type || ''} onValueChange={(value) => setFormData({ ...formData, track_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Oval">Oval</SelectItem>
                <SelectItem value="Road Course">Road Course</SelectItem>
                <SelectItem value="Street Circuit">Street Circuit</SelectItem>
                <SelectItem value="Short Track">Short Track</SelectItem>
                <SelectItem value="Speedway">Speedway</SelectItem>
                <SelectItem value="Off-Road">Off-Road</SelectItem>
                <SelectItem value="Dirt Track">Dirt Track</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Surface Type</label>
            <Select value={formData.surface_type || ''} onValueChange={(value) => setFormData({ ...formData, surface_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asphalt">Asphalt</SelectItem>
                <SelectItem value="Concrete">Concrete</SelectItem>
                <SelectItem value="Dirt">Dirt</SelectItem>
                <SelectItem value="Clay">Clay</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={formData.operational_status || 'Active'} onValueChange={(value) => setFormData({ ...formData, operational_status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Seasonal">Seasonal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Length (miles)</label>
            <Input
              type="number"
              step="0.1"
              value={formData.length || ''}
              onChange={(e) => setFormData({ ...formData, length: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Banking</label>
            <Input
              value={formData.banking || ''}
              onChange={(e) => setFormData({ ...formData, banking: e.target.value })}
              placeholder="e.g., 14 degrees"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Website URL</label>
            <Input
              value={formData.website_url || ''}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Contact Email</label>
            <Input
              type="email"
              value={formData.contact_email || ''}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              placeholder="contact@track.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <MediaUploader
            label="Track Logo"
            hint="Recommended: 400×400px (square) · Max 5MB"
            value={formData.logo_url || ''}
            onChange={(v) => setFormData({ ...formData, logo_url: v })}
            maxSizeMB={5}
          />
          <MediaUploader
            label="Track Image"
            hint="Recommended: 1200×600px · Max 8MB"
            value={formData.image_url || ''}
            onChange={(v) => setFormData({ ...formData, image_url: v })}
            maxSizeMB={8}
          />
        </div>

        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {isSaved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}