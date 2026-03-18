import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { useSlugField } from '@/hooks/useSlugField';

const OUTLET_TYPES = [
  { value: 'publication', label: 'Publication' },
  { value: 'creator_brand', label: 'Creator Brand' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'video_channel', label: 'Video Channel' },
  { value: 'journalist_collective', label: 'Journalist Collective' },
  { value: 'team_media', label: 'Team Media' },
  { value: 'series_media', label: 'Series Media' },
  { value: 'track_media', label: 'Track Media' },
];

const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'x', label: 'X (Twitter)' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'tiktok', label: 'TikTok' },
];

export default function OutletForm({ outlet, onSaved, onCancel }) {
  const isEdit = !!outlet?.id;
  const [fields, setFields] = useState({
    name: outlet?.name || '',
    outlet_type: outlet?.outlet_type || '',
    description: outlet?.description || '',
    website_url: outlet?.website_url || '',
    logo_url: outlet?.logo_url || '',
    cover_image_url: outlet?.cover_image_url || '',
    social_links: outlet?.social_links || {},
    outlet_status: outlet?.outlet_status || 'draft',
    verification_status: outlet?.verification_status || 'pending',
    public_visible: outlet?.public_visible || false,
    monetization_eligible: outlet?.monetization_eligible || false,
  });
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setFields(f => ({ ...f, [key]: val }));
  const setSocial = (key, val) => set('social_links', { ...fields.social_links, [key]: val });

  const handleSave = async () => {
    if (!fields.name || !fields.outlet_type) {
      toast.error('Name and outlet type are required');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const result = await base44.functions.invoke('updateMediaOutlet', {
          outlet_id: outlet.id,
          fields,
        });
        if (result.data?.success) {
          toast.success('Outlet updated');
          onSaved?.();
        } else {
          toast.error(result.data?.error || 'Failed to update');
        }
      } else {
        const result = await base44.functions.invoke('createMediaOutlet', fields);
        if (result.data?.success) {
          toast.success(`Outlet created — slug: ${result.data.slug}`);
          onSaved?.();
        } else {
          toast.error(result.data?.error || 'Failed to create');
        }
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">Outlet Name *</Label>
          <Input value={fields.name} onChange={e => set('name', e.target.value)} className="bg-[#1a1a1a] border-gray-700 text-white" placeholder="Publication or brand name" />
        </div>
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">Outlet Type *</Label>
          <Select value={fields.outlet_type} onValueChange={v => set('outlet_type', v)}>
            <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {OUTLET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-gray-400 text-xs mb-1 block">Description</Label>
        <Textarea value={fields.description} onChange={e => set('description', e.target.value)} className="bg-[#1a1a1a] border-gray-700 text-white resize-none" rows={3} placeholder="Brief outlet description..." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">Website URL</Label>
          <Input value={fields.website_url} onChange={e => set('website_url', e.target.value)} className="bg-[#1a1a1a] border-gray-700 text-white" placeholder="https://" />
        </div>
        <div>
          <Label className="text-gray-400 text-xs mb-1 block">Logo URL</Label>
          <Input value={fields.logo_url} onChange={e => set('logo_url', e.target.value)} className="bg-[#1a1a1a] border-gray-700 text-white" placeholder="https://" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SOCIAL_FIELDS.map(f => (
          <div key={f.key}>
            <Label className="text-gray-400 text-xs mb-1 block">{f.label}</Label>
            <Input value={fields.social_links?.[f.key] || ''} onChange={e => setSocial(f.key, e.target.value)} className="bg-[#1a1a1a] border-gray-700 text-white text-xs" placeholder="@handle or URL" />
          </div>
        ))}
      </div>

      {isEdit && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border border-purple-800/50 rounded-xl p-4 bg-purple-900/10">
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">Status</Label>
            <Select value={fields.outlet_status} onValueChange={v => set('outlet_status', v)}>
              <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['draft', 'active', 'hidden'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">Verification</Label>
            <Select value={fields.verification_status} onValueChange={v => set('verification_status', v)}>
              <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['pending', 'verified', 'featured', 'suspended'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!fields.public_visible} onChange={e => set('public_visible', e.target.checked)} className="rounded" />
              <span className="text-gray-300 text-xs">Public Visible</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!fields.monetization_eligible} onChange={e => set('monetization_eligible', e.target.checked)} className="rounded" />
              <span className="text-gray-300 text-xs">Monetization</span>
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</Button>
        )}
        <Button onClick={handleSave} disabled={saving} className="bg-white text-black hover:bg-gray-100 gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Outlet'}
        </Button>
      </div>
    </div>
  );
}