import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Trash2 } from 'lucide-react';

export default function SeriesCoreDetailsSection({ seriesId }) {
  const [formData, setFormData] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: seriesRecord } = useQuery({
    queryKey: ['series', seriesId],
    queryFn: () => base44.entities.Series.get(seriesId),
    enabled: !!seriesId,
  });

  useEffect(() => {
    if (seriesRecord) {
      setFormData(seriesRecord);
    }
  }, [seriesRecord]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Series.update(seriesId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series', seriesId] });
      setIsSaved(true);
      toast.success('Series updated');
      setTimeout(() => setIsSaved(false), 2000);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, field }) => base44.integrations.Core.UploadFile({ file }).then(data => ({ url: data.file_url, field })),
    onSuccess: ({ url, field }) => {
      setFormData(prev => ({ ...prev, [field]: url }));
      toast.success('Image uploaded');
    },
  });

  const handleImageUpload = (e, field) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate({ file, field });
  };

  const handleSave = () => {
    const { id, created_date, updated_date, created_by, ...updateData } = formData;
    updateMutation.mutate(updateData);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Series Name</label>
          <Input
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Discipline</label>
            <Select value={formData.discipline || ''} onValueChange={(value) => setFormData({ ...formData, discipline: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Asphalt Oval">Asphalt Oval</SelectItem>
                <SelectItem value="Road Racing">Road Racing</SelectItem>
                <SelectItem value="Off Road">Off Road</SelectItem>
                <SelectItem value="Snowmobile">Snowmobile</SelectItem>
                <SelectItem value="Rallycross">Rallycross</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Region</label>
            <Select value={formData.region || ''} onValueChange={(value) => setFormData({ ...formData, region: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Global">Global</SelectItem>
                <SelectItem value="North America">North America</SelectItem>
                <SelectItem value="Europe">Europe</SelectItem>
                <SelectItem value="Regional">Regional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Competition Level</label>
            <Select value={formData.competition_level || ''} onValueChange={(value) => setFormData({ ...formData, competition_level: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Semi Pro">Semi Pro</SelectItem>
                <SelectItem value="Amateur">Amateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={formData.status || ''} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Historic">Historic</SelectItem>
              </SelectContent>
            </Select>
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

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-4">Social Media & Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Website</label>
              <Input
                value={formData.website_url || ''}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contact Email</label>
              <Input
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="contact@series.com"
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
            <div>
              <label className="text-sm font-medium">Facebook</label>
              <Input
                value={formData.social_facebook || ''}
                onChange={(e) => setFormData({ ...formData, social_facebook: e.target.value })}
                placeholder="Facebook URL"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Instagram</label>
              <Input
                value={formData.social_instagram || ''}
                onChange={(e) => setFormData({ ...formData, social_instagram: e.target.value })}
                placeholder="@handle or URL"
              />
            </div>
            <div>
              <label className="text-sm font-medium">X (Twitter)</label>
              <Input
                value={formData.social_x || ''}
                onChange={(e) => setFormData({ ...formData, social_x: e.target.value })}
                placeholder="@handle or URL"
              />
            </div>
            <div>
              <label className="text-sm font-medium">YouTube</label>
              <Input
                value={formData.social_youtube || ''}
                onChange={(e) => setFormData({ ...formData, social_youtube: e.target.value })}
                placeholder="Channel URL"
              />
            </div>
            <div>
              <label className="text-sm font-medium">LinkedIn</label>
              <Input
                value={formData.social_linkedin || ''}
                onChange={(e) => setFormData({ ...formData, social_linkedin: e.target.value })}
                placeholder="Profile URL"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-4">Title Sponsor</h3>
          <p className="text-xs text-gray-500 mb-3">e.g. "AMSOIL Championship Off-Road" or "Champ Off Road presented by Brunt"</p>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium">Sponsor Name</label>
              <Input
                value={formData.title_sponsor_name || ''}
                onChange={(e) => setFormData({ ...formData, title_sponsor_name: e.target.value })}
                placeholder="e.g. AMSOIL, Brunt"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sponsor Website URL</label>
              <Input
                value={formData.title_sponsor_url || ''}
                onChange={(e) => setFormData({ ...formData, title_sponsor_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sponsor Logo</label>
              <div className="flex items-center gap-3 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('sponsor-logo-upload').click()}
                  disabled={uploadMutation.isPending}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload Logo'}
                </Button>
                <input
                  id="sponsor-logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'title_sponsor_logo_url')}
                  className="hidden"
                />
                {formData.title_sponsor_logo_url && (
                  <img src={formData.title_sponsor_logo_url} alt="Sponsor logo" className="h-8 object-contain" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="text-sm font-medium">Logo</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('series-logo-upload').click()}
              disabled={uploadMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Image'}
            </Button>
            <input
              id="series-logo-upload"
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'logo_url')}
              className="hidden"
            />
            {formData.logo_url && (
              <>
                <img src={formData.logo_url} alt="Series logo" className="h-10 rounded" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setFormData({ ...formData, logo_url: '' })}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Logo
                </Button>
              </>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {isSaved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}