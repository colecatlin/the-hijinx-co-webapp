import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2, ExternalLink, Copy, Flag } from 'lucide-react';

export default function DriverProfileSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const driverIdParam = urlParams.get('driver_id');
  const isNew = urlParams.get('new') === '1';

  const [form, setForm] = useState({
    profile_image_url: '',
    tagline: '',
    bio: '',
    instagram_url: '',
    website_url: '',
  });
  const [published, setPublished] = useState(false);
  const [publishedDriver, setPublishedDriver] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const driverId = driverIdParam || user?.primary_entity_id;

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['driver_setup', driverId],
    queryFn: () => driverId
      ? base44.entities.Driver.filter({ id: driverId })
      : base44.entities.Driver.filter({ owner_user_id: user?.id }),
    enabled: !!user,
  });

  const driver = drivers[0] || null;

  useEffect(() => {
    if (driver) {
      setForm({
        profile_image_url: driver.profile_image_url || '',
        tagline: driver.tagline || '',
        bio: driver.bio || '',
        instagram_url: driver.instagram_url || '',
        website_url: driver.website_url || '',
      });
      if (driver.visibility_status === 'live') setPublished(true);
    }
  }, [driver]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const saveMutation = useMutation({
    mutationFn: (extraFields = {}) =>
      base44.entities.Driver.update(driver.id, { ...form, ...extraFields }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['driver_setup', driverId] });
      if (variables?.visibility_status === 'live') {
        setPublishedDriver(driver);
        setPublished(true);
      }
    },
  });

  const handlePublish = () => {
    saveMutation.mutate({ visibility_status: 'live' });
  };

  const handleSkip = () => {
    navigate(createPageUrl('MyDashboard'));
  };

  const profileUrl = driver
    ? `${window.location.origin}/drivers/${driver.slug || driver.id}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
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

  // ── Success State ──────────────────────────────────────────────────────────
  if (published && publishedDriver) {
    return (
      <PageShell className="bg-gray-50 min-h-screen">
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your driver profile is live</h1>
            <p className="text-gray-500 text-sm mt-2">
              {driver.first_name} {driver.last_name} is now visible on Index46.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              className="bg-[#232323] hover:bg-black text-white gap-2 w-full"
              onClick={() => navigate(`/drivers/${driver.slug || driver.id}`)}
            >
              <ExternalLink className="w-4 h-4" /> View Profile
            </Button>
            <Button variant="outline" className="gap-2 w-full" onClick={handleCopy}>
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy Profile Link'}
            </Button>
            <Button variant="ghost" className="w-full text-gray-500 text-sm"
              onClick={() => navigate(createPageUrl('MyDashboard'))}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Setup Form ─────────────────────────────────────────────────────────────
  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-4">
            <Flag className="w-3.5 h-3.5" />
            {isNew ? 'Welcome to Index46!' : 'Complete Your Profile'}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your driver profile</h1>
          <p className="text-gray-500 text-sm mt-2">
            {driver.first_name} {driver.last_name} — add the basics so fans and teams can find you.
          </p>
        </div>

        <div className="space-y-5">

          {/* Section: Identity */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Identity</h2>

            <div className="space-y-2">
              <Label>Profile Photo <span className="text-gray-400 font-normal text-xs">URL</span></Label>
              <Input
                value={form.profile_image_url}
                onChange={e => set('profile_image_url', e.target.value)}
                placeholder="https://..."
              />
              {form.profile_image_url && (
                <img
                  src={form.profile_image_url}
                  alt="Preview"
                  className="w-14 h-14 rounded-full object-cover border border-gray-200"
                />
              )}
            </div>
          </div>

          {/* Section: About */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">About</h2>

            <div className="space-y-2">
              <Label>Tagline <span className="text-gray-400 font-normal text-xs">one line</span></Label>
              <Input
                value={form.tagline}
                onChange={e => set('tagline', e.target.value)}
                placeholder="e.g. Off-road racer from Phoenix, AZ"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio <span className="text-gray-400 font-normal text-xs">your story</span></Label>
              <textarea
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder="Tell your story — where you started, what you drive, where you're headed."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
                rows={4}
              />
            </div>
          </div>

          {/* Section: Links */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Links <span className="text-gray-300 font-normal normal-case tracking-normal">optional</span></h2>

            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input
                value={form.instagram_url}
                onChange={e => set('instagram_url', e.target.value)}
                placeholder="https://instagram.com/yourhandle"
              />
            </div>

            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={form.website_url}
                onChange={e => set('website_url', e.target.value)}
                placeholder="https://yoursite.com"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handlePublish}
              disabled={saveMutation.isPending}
              className="bg-[#232323] hover:bg-black text-white w-full gap-2 h-11 text-sm font-semibold"
            >
              {saveMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
                : <><CheckCircle2 className="w-4 h-4" /> Publish Profile</>}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-sm text-gray-400 hover:text-gray-700"
              onClick={handleSkip}
            >
              Finish later
            </Button>
          </div>

        </div>
      </div>
    </PageShell>
  );
}