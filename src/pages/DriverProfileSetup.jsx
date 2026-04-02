import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';

const SOCIAL_FIELDS = [
  { key: 'instagram_url', label: 'Instagram' },
  { key: 'x_url', label: 'X / Twitter' },
  { key: 'tiktok_url', label: 'TikTok' },
  { key: 'youtube_url', label: 'YouTube' },
  { key: 'facebook_url', label: 'Facebook' },
];

export default function DriverProfileSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const driverIdParam = urlParams.get('driver_id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Resolve driver — by URL param or user's primary entity
  const driverId = driverIdParam || user?.primary_entity_id;

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['driver_setup', driverId],
    queryFn: () => driverId
      ? base44.entities.Driver.filter({ id: driverId })
      : base44.entities.Driver.filter({ owner_user_id: user?.id }),
    enabled: !!user,
  });

  const driver = drivers[0] || null;

  const [form, setForm] = useState({
    bio: '',
    tagline: '',
    profile_image_url: '',
    hero_image_url: '',
    website_url: '',
    instagram_url: '',
    x_url: '',
    tiktok_url: '',
    youtube_url: '',
    facebook_url: '',
    visibility_status: 'draft',
  });

  useEffect(() => {
    if (driver) {
      setForm({
        bio: driver.bio || '',
        tagline: driver.tagline || '',
        profile_image_url: driver.profile_image_url || '',
        hero_image_url: driver.hero_image_url || '',
        website_url: driver.website_url || '',
        instagram_url: driver.instagram_url || '',
        x_url: driver.x_url || '',
        tiktok_url: driver.tiktok_url || '',
        youtube_url: driver.youtube_url || '',
        facebook_url: driver.facebook_url || '',
        visibility_status: driver.visibility_status || 'draft',
      });
    }
  }, [driver]);

  const mutation = useMutation({
    mutationFn: () => base44.entities.Driver.update(driver.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver_setup', driverId] });
      toast.success('Profile saved!');
    },
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  if (!user || isLoading) {
    return (
      <PageShell className="bg-gray-50 min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </PageShell>
    );
  }

  if (!driver) {
    return (
      <PageShell className="bg-gray-50 min-h-screen">
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
          <p className="text-gray-500 text-sm">No driver profile found for your account.</p>
          <Button variant="outline" onClick={() => navigate(createPageUrl('MyDashboard'))}>
            Back to Dashboard
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(createPageUrl('MyDashboard'))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Complete Your Driver Profile</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {driver.first_name} {driver.last_name} · Add your story, photo, and social links
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">

          {/* Bio */}
          <div className="space-y-2">
            <Label>About You</Label>
            <textarea
              value={form.bio}
              onChange={e => set('bio', e.target.value)}
              placeholder="Tell your story — where you started, what you drive, where you're headed."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
              rows={4}
            />
          </div>

          {/* Tagline */}
          <div className="space-y-2">
            <Label>Tagline <span className="text-gray-400 font-normal text-xs ml-1">short headline</span></Label>
            <Input value={form.tagline} onChange={e => set('tagline', e.target.value)}
              placeholder="e.g. Off-road racer from Phoenix, AZ" />
          </div>

          {/* Profile Image */}
          <div className="space-y-2">
            <Label>Profile Photo URL</Label>
            <Input value={form.profile_image_url} onChange={e => set('profile_image_url', e.target.value)}
              placeholder="https://..." />
            {form.profile_image_url && (
              <img src={form.profile_image_url} alt="Preview" className="w-16 h-16 rounded-full object-cover border border-gray-200 mt-2" />
            )}
          </div>

          {/* Hero Image */}
          <div className="space-y-2">
            <Label>Hero / Banner Image URL <span className="text-gray-400 font-normal text-xs ml-1">optional</span></Label>
            <Input value={form.hero_image_url} onChange={e => set('hero_image_url', e.target.value)}
              placeholder="https://..." />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label>Website <span className="text-gray-400 font-normal text-xs ml-1">optional</span></Label>
            <Input value={form.website_url} onChange={e => set('website_url', e.target.value)}
              placeholder="https://yoursite.com" />
          </div>

          {/* Social */}
          <div className="space-y-3">
            <Label>Social Links <span className="text-gray-400 font-normal text-xs ml-1">optional</span></Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SOCIAL_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <Input value={form[key]} onChange={e => set(key, e.target.value)} placeholder="URL or handle" />
                </div>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Profile Visibility</Label>
            <Select value={form.visibility_status} onValueChange={v => set('visibility_status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft — only visible to you</SelectItem>
                <SelectItem value="live">Live — visible to the public</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !driver}
              className="bg-[#232323] hover:bg-black text-white flex-1 sm:flex-none gap-2"
            >
              {mutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : mutation.isSuccess ? (
                <><CheckCircle2 className="w-4 h-4" /> Saved</>
              ) : 'Save Profile'}
            </Button>
            <Button variant="outline" onClick={() => navigate(createPageUrl('MyDashboard'))}>
              Back to Dashboard
            </Button>
          </div>
        </div>

      </div>
    </PageShell>
  );
}