import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Save, X, Plus } from 'lucide-react';

const PRIMARY_ROLES = ['writer', 'editor', 'photographer', 'videographer', 'journalist', 'creator', 'outlet_representative'];
const AFFILIATION_TYPES = ['independent', 'outlet', 'team_media', 'series_media', 'track_media'];
const AVAILABILITY_OPTIONS = ['unavailable', 'limited', 'available'];

const SPECIALTY_SUGGESTIONS = [
  'Off Road', 'Short Track Oval', 'Drag Racing', 'Road Racing', 'Rallycross',
  'Snowmobile', 'Driver Profiles', 'Business & Industry', 'Tech Coverage',
  'Event Coverage', 'Championship Racing', 'Grassroots Racing',
];

const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram', placeholder: '@handle or URL' },
  { key: 'x', label: 'X (Twitter)', placeholder: '@handle or URL' },
  { key: 'youtube', label: 'YouTube', placeholder: 'Channel URL' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@handle' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'Profile URL' },
];

export default function MediaProfileEditor({ profile, user, isAdmin, onSaved }) {
  const [fields, setFields] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    primary_role: profile?.primary_role || '',
    role_tags: profile?.role_tags || [],
    specialties: profile?.specialties || [],
    location_city: profile?.location_city || '',
    location_state: profile?.location_state || '',
    location_country: profile?.location_country || '',
    website_url: profile?.website_url || '',
    social_links: profile?.social_links || {},
    primary_affiliation_type: profile?.primary_affiliation_type || '',
    primary_outlet_name: profile?.primary_outlet_name || '',
    availability_status: profile?.availability_status || 'unavailable',
    profile_image_url: profile?.profile_image_url || '',
    cover_image_url: profile?.cover_image_url || '',
    // Admin-only
    profile_status: profile?.profile_status || 'draft',
    verification_status: profile?.verification_status || 'pending',
    public_visible: profile?.public_visible || false,
    creator_directory_eligible: profile?.creator_directory_eligible || false,
    credentialed_media: profile?.credentialed_media || false,
    monetization_eligible: profile?.monetization_eligible || false,
  });

  const [specialtyInput, setSpecialtyInput] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setFields(f => ({ ...f, [key]: val }));

  const toggleSpecialty = (s) => {
    const list = fields.specialties || [];
    set('specialties', list.includes(s) ? list.filter(x => x !== s) : [...list, s]);
  };

  const addCustomSpecialty = () => {
    const s = specialtyInput.trim();
    if (s && !(fields.specialties || []).includes(s)) {
      set('specialties', [...(fields.specialties || []), s]);
    }
    setSpecialtyInput('');
  };

  const setSocial = (key, val) => {
    set('social_links', { ...fields.social_links, [key]: val });
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const result = await base44.functions.invoke('updateMediaProfile', {
        profile_id: profile.id,
        fields,
      });
      if (result.data?.success) {
        toast.success('Profile saved');
        onSaved?.(result.data);
      } else {
        toast.error(result.data?.error || 'Failed to save');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Identity */}
      <section>
        <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">Display Name</Label>
            <Input
              value={fields.display_name}
              onChange={e => set('display_name', e.target.value)}
              className="bg-[#1a1a1a] border-gray-700 text-white"
              placeholder="Your public name"
            />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">Primary Role</Label>
            <Select value={fields.primary_role} onValueChange={v => set('primary_role', v)}>
              <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {PRIMARY_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Bio */}
      <section>
        <Label className="text-gray-400 text-xs mb-1 block">Bio</Label>
        <Textarea
          value={fields.bio}
          onChange={e => set('bio', e.target.value)}
          className="bg-[#1a1a1a] border-gray-700 text-white resize-none"
          rows={4}
          placeholder="Short professional bio..."
        />
      </section>

      {/* Specialties */}
      <section>
        <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Specialties</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {SPECIALTY_SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => toggleSpecialty(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                (fields.specialties || []).includes(s)
                  ? 'bg-blue-800 border-blue-600 text-blue-100'
                  : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={specialtyInput}
            onChange={e => setSpecialtyInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomSpecialty()}
            placeholder="Add custom specialty..."
            className="bg-[#1a1a1a] border-gray-700 text-white text-xs"
          />
          <Button size="sm" variant="outline" onClick={addCustomSpecialty} className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        {(fields.specialties || []).filter(s => !SPECIALTY_SUGGESTIONS.includes(s)).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {fields.specialties.filter(s => !SPECIALTY_SUGGESTIONS.includes(s)).map(s => (
              <Badge key={s} className="bg-gray-800 text-gray-300 gap-1">
                {s}
                <button onClick={() => toggleSpecialty(s)}><X className="w-2.5 h-2.5" /></button>
              </Badge>
            ))}
          </div>
        )}
      </section>

      {/* Location */}
      <section>
        <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Location</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">City</Label>
            <Input value={fields.location_city} onChange={e => set('location_city', e.target.value)} className="bg-[#1a1a1a] border-gray-700 text-white" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">State / Region</Label>
            <Input value={fields.location_state} onChange={e => set('location_state', e.target.value)} className="bg-[#1a1a1a] border-gray-700 text-white" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">Country</Label>
            <Input value={fields.location_country} onChange={e => set('location_country', e.target.value)} className="bg-[#1a1a1a] border-gray-700 text-white" />
          </div>
        </div>
      </section>

      {/* Affiliation */}
      <section>
        <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Affiliation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">Affiliation Type</Label>
            <Select value={fields.primary_affiliation_type} onValueChange={v => set('primary_affiliation_type', v)}>
              <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {AFFILIATION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">Outlet / Organization</Label>
            <Input value={fields.primary_outlet_name} onChange={e => set('primary_outlet_name', e.target.value)} className="bg-[#1a1a1a] border-gray-700 text-white" placeholder="Outlet or org name" />
          </div>
        </div>
      </section>

      {/* Web & Social */}
      <section>
        <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Web & Social</h3>
        <div className="mb-3">
          <Label className="text-gray-400 text-xs mb-1 block">Website</Label>
          <Input value={fields.website_url} onChange={e => set('website_url', e.target.value)} className="bg-[#1a1a1a] border-gray-700 text-white" placeholder="https://" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SOCIAL_FIELDS.map(f => (
            <div key={f.key}>
              <Label className="text-gray-400 text-xs mb-1 block">{f.label}</Label>
              <Input
                value={fields.social_links?.[f.key] || ''}
                onChange={e => setSocial(f.key, e.target.value)}
                className="bg-[#1a1a1a] border-gray-700 text-white"
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Images */}
      <section>
        <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Images</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">Profile Image URL</Label>
            <Input value={fields.profile_image_url} onChange={e => set('profile_image_url', e.target.value)} className="bg-[#1a1a1a] border-gray-700 text-white" placeholder="https://" />
          </div>
          <div>
            <Label className="text-gray-400 text-xs mb-1 block">Cover Image URL</Label>
            <Input value={fields.cover_image_url} onChange={e => set('cover_image_url', e.target.value)} className="bg-[#1a1a1a] border-gray-700 text-white" placeholder="https://" />
          </div>
        </div>
      </section>

      {/* Availability */}
      <section>
        <h3 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Availability</h3>
        <div className="flex gap-2">
          {AVAILABILITY_OPTIONS.map(a => (
            <button
              key={a}
              onClick={() => set('availability_status', a)}
              className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${
                fields.availability_status === a
                  ? a === 'available' ? 'bg-green-800 border-green-600 text-green-100'
                  : a === 'limited' ? 'bg-amber-800 border-amber-600 text-amber-100'
                  : 'bg-gray-700 border-gray-500 text-gray-200'
                  : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </section>

      {/* Admin-only fields */}
      {isAdmin && (
        <section className="border border-purple-800/50 rounded-xl p-4 bg-purple-900/10">
          <h3 className="text-purple-300 text-sm font-semibold mb-3 uppercase tracking-wider">Admin Controls</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-400 text-xs mb-1 block">Profile Status</Label>
              <Select value={fields.profile_status} onValueChange={v => set('profile_status', v)}>
                <SelectTrigger className="bg-[#1a1a1a] border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['draft', 'active', 'hidden'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-400 text-xs mb-1 block">Verification Status</Label>
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
              {[
                { key: 'public_visible', label: 'Public Visible' },
                { key: 'creator_directory_eligible', label: 'Directory Eligible' },
                { key: 'credentialed_media', label: 'Credentialed Media' },
                { key: 'monetization_eligible', label: 'Monetization Eligible' },
              ].map(f => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!fields[f.key]}
                    onChange={e => set(f.key, e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-300 text-xs">{f.label}</span>
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="bg-white text-black hover:bg-gray-100 gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}