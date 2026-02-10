import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RemoveAccessSection from '@/components/management/RemoveAccessSection';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

const COUNTRIES = [
  'USA',
  'Canada',
  'Mexico',
  'United Kingdom',
  'Australia',
  'Brazil',
  'France',
  'Germany',
  'Italy',
  'Spain',
  'Japan',
  'China',
  'India',
  'Russia',
  'Sweden',
  'Norway',
  'Finland',
  'Netherlands',
  'Belgium',
  'Austria',
  'Switzerland',
  'Denmark',
  'Poland',
  'Argentina',
  'Chile',
  'New Zealand',
  'South Africa'
];

export default function TrackCoreDetailsSection({ trackId }) {
  const [formData, setFormData] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: track } = useQuery({
    queryKey: ['track', trackId],
    queryFn: () => base44.entities.Track.list({ id: trackId }),
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
    <>
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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">City</label>
            <Input
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">State</label>
            <Input
              value={formData.state || ''}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Country</label>
            <Select value={formData.country || 'USA'} onValueChange={(value) => setFormData({ ...formData, country: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Track Type</label>
            <Select value={formData.track_type || ''} onValueChange={(value) => setFormData({ ...formData, track_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Short Course">Short Course</SelectItem>
                <SelectItem value="Oval">Oval</SelectItem>
                <SelectItem value="Road Course">Road Course</SelectItem>
                <SelectItem value="Ice Oval">Ice Oval</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={formData.status || ''} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Seasonal">Seasonal</SelectItem>
                <SelectItem value="Historic">Historic</SelectItem>
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
              value={formData.length_miles || ''}
              onChange={(e) => setFormData({ ...formData, length_miles: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Founded Year</label>
            <Input
              type="number"
              value={formData.founded_year || ''}
              onChange={(e) => setFormData({ ...formData, founded_year: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={formData.description_summary || ''}
            onChange={(e) => setFormData({ ...formData, description_summary: e.target.value })}
            rows={4}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Hero Image</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('track-image-upload').click()}
              disabled={uploadMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Image'}
            </Button>
            <input
              id="track-image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {formData.hero_image_url && (
              <img src={formData.hero_image_url} alt="Track image" className="h-10 rounded" />
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {isSaved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>

    <div className="mt-6">
      <RemoveAccessSection entityType="Track" entityId={trackId} />
    </div>
    </>
  );
}