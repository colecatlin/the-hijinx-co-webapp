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

export default function ProfileSetup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const driverIdParam = urlParams.get('driver_id');
  const isNew = urlParams.get('new') === '1';

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
  });
  const [published, setPublished] = useState(false);
  const [publishedDriver, setPublishedDriver] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated === true,
  });

  // Redirect unauthenticated visitors to login, then back to this page
  useEffect(() => {
    if (!authLoading && isAuthenticated === false) {
      base44.auth.redirectToLogin(window.location.pathname + window.location.search);
    }
  }, [authLoading, isAuthenticated]);

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
        first_name: driver.first_name || '',
        last_name: driver.last_name || '',
      });
      if (driver.visibility_status === 'live') setPublished(true);
    }
  }, [driver]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const saveMutation = useMutation({
    mutationFn: (extraFields = {}) =>
      base44.entities.Driver.update(driver.id, {
        ...extraFields,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['driver_setup', driverId] });
      if (variables?.visibility_status === 'live') {
        setPublishedDriver(driver);
        setPublished(true);
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (extraFields = {}) =>
      base44.entities.Driver.create({
        first_name: form.first_name,
        last_name: form.last_name,
        owner_user_id: user?.id,
        ...extraFields,
      }),
    onSuccess: (created, variables) => {
      queryClient.invalidateQueries({ queryKey: ['driver_setup', driverId] });
      if (variables?.visibility_status === 'live') {
        setPublishedDriver(created);
        setPublished(true);
      }
    },
  });

  const isCreating = !driver;
  const isPending = saveMutation.isPending || createMutation.isPending;

  const handlePublish = () => {
    if (isCreating) {
      createMutation.mutate({ visibility_status: 'live' });
    } else {
      saveMutation.mutate({ visibility_status: 'live' });
    }
  };

  const handleSkip = () => {
    navigate(createPageUrl('MyDashboard'));
  };

  const profileUrl = (driver || publishedDriver)
    ? `${window.location.origin}/drivers/${(driver || publishedDriver).slug || (driver || publishedDriver).id}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authLoading || !isAuthenticated || !user || isLoading) {
    return (
      <PageShell className="bg-gray-50 min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
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
            <h1 className="text-2xl font-bold text-gray-900">Your profile is live</h1>
            <p className="text-gray-500 text-sm mt-2">
              {publishedDriver?.first_name} {publishedDriver?.last_name} is now visible on Index46.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              className="bg-[#232323] hover:bg-black text-white gap-2 w-full"
              onClick={() => navigate(`/drivers/${publishedDriver?.slug || publishedDriver?.id}`)}
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
            {isNew || isCreating ? 'Welcome to Index46!' : 'Complete Your Profile'}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Setup</h1>
          <p className="text-gray-500 text-sm mt-2">
            {driver
              ? `${driver.first_name} ${driver.last_name} — add the basics so fans and teams can find you.`
              : 'Tell us who you are so fans and teams can find you.'}
          </p>
        </div>

        <div className="space-y-5">

          {/* Section: Identity */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#0a0a0a' }}>Identity</h2>

            {isCreating && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label style={{ color: '#0a0a0a' }}>First Name <span className="text-red-500 font-normal text-xs">required</span></Label>
                  <Input
                    value={form.first_name}
                    onChange={e => set('first_name', e.target.value)}
                    placeholder="First name"
                    className="text-zinc-900 placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label style={{ color: '#0a0a0a' }}>Last Name <span className="text-red-500 font-normal text-xs">required</span></Label>
                  <Input
                    value={form.last_name}
                    onChange={e => set('last_name', e.target.value)}
                    placeholder="Last name"
                    className="text-zinc-900 placeholder:text-zinc-500"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handlePublish}
              disabled={isPending || (isCreating && (!form.first_name.trim() || !form.last_name.trim()))}
              className="bg-[#232323] hover:bg-black text-white w-full gap-2 h-11 text-sm font-semibold"
            >
              {isPending
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