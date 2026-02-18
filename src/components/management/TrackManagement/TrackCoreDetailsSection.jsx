import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import LocationFields from '@/components/shared/LocationFields';

export default function TrackCoreDetailsSection({ trackId }) {
  const [formData, setFormData] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

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
    mutationFn: (data) => base44.entities.Track.update(trackId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      setIsSaved(true);
      toast.success('Track updated');
      setTimeout(() => setIsSaved(false), 2000);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => base44.integrations.Core.UploadFile({ file }),
    onSuccess: (data) => {
      setFormData({ ...formData, hero_image_url: data.file_url });
      toast.success('Image uploaded');
    },
  });

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

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
            <Select value={formData.status || 'Active'} onValueChange={(value) => setFormData({ ...formData, status: value })}>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Logo URL</label>
            <div className="flex items-center gap-3">
              <Input
                value={formData.logo_url || ''}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://..."
              />
              {formData.logo_url && (
                <img src={formData.logo_url} alt="Track logo" className="h-10 rounded" />
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Image URL</label>
            <div className="flex items-center gap-3">
              <Input
                value={formData.image_url || ''}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
              {formData.image_url && (
                <img src={formData.image_url} alt="Track image" className="h-10 rounded" />
              )}
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {isSaved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}