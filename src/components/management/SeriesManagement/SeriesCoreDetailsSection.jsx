import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Trash2, Plus, X } from 'lucide-react';
import EntityImagePanel from '@/components/shared/EntityImagePanel';

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

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Route through syncSourceAndEntityRecord so name edits refresh
      // normalized_name, canonical_slug, and canonical_key automatically.
      const prepareRes = await base44.functions.invoke('prepareSourcePayloadForSync', {
        entity_type: 'series',
        payload: { ...data, id: seriesId },
      });
      const preparedPayload = prepareRes?.data?.payload ?? { ...data, id: seriesId };

      const syncRes = await base44.functions.invoke('syncSourceAndEntityRecord', {
        entity_type: 'series',
        payload: preparedPayload,
        user_id: currentUser?.id,
        triggered_from: 'management_ui',
      });
      if (syncRes?.data?.error) throw new Error(syncRes.data.error);

      // If name changed, cascade update event.series text field for display consistency
      const oldName = seriesRecord?.name;
      const newName = data.name;
      if (oldName && newName && oldName !== newName) {
        const allEvents = await base44.entities.Event.list('event_date', 500);
        const linkedEvents = allEvents.filter(e => e.series && e.series.trim() === oldName.trim());
        await Promise.all(linkedEvents.map(e => base44.entities.Event.update(e.id, { series: newName })));
        if (linkedEvents.length > 0) {
          toast.info(`Updated ${linkedEvents.length} linked event(s) to new series name.`);
        }
      }
      return syncRes?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series', seriesId] });
      queryClient.invalidateQueries({ queryKey: ['seriesEventsManagement', seriesId] });
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

        <div>
          <label className="text-sm font-medium">Discipline</label>
          <Select value={formData.discipline || ''} onValueChange={(value) => setFormData({ ...formData, discipline: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select discipline" />
            </SelectTrigger>
            <SelectContent>
              {['Stock Car','Off Road','Dirt Oval','Snowmobile','Dirt Bike','Open Wheel','Sports Car','Touring Car','Rally','Drag','Motorcycle','Karting','Water','Alternative'].map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            placeholder="Series description..."
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

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-1">Founded Year</h3>
          <p className="text-xs text-gray-400 mb-3">The year the series was originally established.</p>
          <Input
            type="number"
            placeholder="e.g. 1995"
            value={formData.founded_year || ''}
            onChange={(e) => setFormData({ ...formData, founded_year: e.target.value ? Number(e.target.value) : null })}
            className="w-40"
          />
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-1">Name History</h3>
          <p className="text-xs text-gray-400 mb-3">Track name changes over the years (e.g. sponsor title changes).</p>
          <div className="space-y-3">
            {(formData.name_history || []).map((entry, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">Entry {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(formData.name_history || [])];
                      updated.splice(idx, 1);
                      setFormData({ ...formData, name_history: updated });
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Name</label>
                    <Input
                      value={entry.name || ''}
                      onChange={(e) => {
                        const updated = [...(formData.name_history || [])];
                        updated[idx] = { ...updated[idx], name: e.target.value };
                        setFormData({ ...formData, name_history: updated });
                      }}
                      placeholder="Series name at this time"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Year Start</label>
                    <Input
                      type="number"
                      value={entry.year_start || ''}
                      onChange={(e) => {
                        const updated = [...(formData.name_history || [])];
                        updated[idx] = { ...updated[idx], year_start: e.target.value ? Number(e.target.value) : null };
                        setFormData({ ...formData, name_history: updated });
                      }}
                      placeholder="e.g. 2015"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Year End (blank if current)</label>
                    <Input
                      type="number"
                      value={entry.year_end || ''}
                      onChange={(e) => {
                        const updated = [...(formData.name_history || [])];
                        updated[idx] = { ...updated[idx], year_end: e.target.value ? Number(e.target.value) : null };
                        setFormData({ ...formData, name_history: updated });
                      }}
                      placeholder="e.g. 2022"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Notes</label>
                    <Input
                      value={entry.notes || ''}
                      onChange={(e) => {
                        const updated = [...(formData.name_history || [])];
                        updated[idx] = { ...updated[idx], notes: e.target.value };
                        setFormData({ ...formData, name_history: updated });
                      }}
                      placeholder="e.g. Title sponsor change"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormData({ ...formData, name_history: [...(formData.name_history || []), { name: '', year_start: null, year_end: null, notes: '' }] })}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Name Entry
            </Button>
          </div>
        </div>

        <EntityImagePanel
          entity={formData}
          onSave={async (imgs) => {
            setFormData(prev => ({ ...prev, ...imgs }));
            await base44.entities.Series.update(seriesId, imgs);
            toast.success('Images saved');
          }}
        />

        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {isSaved ? 'Saved' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  );
}