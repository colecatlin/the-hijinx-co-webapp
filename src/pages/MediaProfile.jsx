import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Building2, Shield, Save, ArrowRight, Eye } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';

export default function MediaProfile() {
  const queryClient = useQueryClient();

  // Check for admin view mode
  const urlParams = new URLSearchParams(window.location.search);
  const viewMediaUserId = urlParams.get('mediaUserId');

  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
  });

  const isAdmin = currentUser?.role === 'admin';
  const isAdminView = !!viewMediaUserId && isAdmin;

  // Load the target media user
  const { data: mediaUser, isLoading: muLoading } = useQuery({
    queryKey: ['mediaUser', viewMediaUserId || currentUser?.id],
    queryFn: async () => {
      if (isAdminView) {
        return base44.entities.MediaUser.get(viewMediaUserId);
      }
      const results = await base44.entities.MediaUser.filter({ user_id: currentUser.id });
      return results[0] || null;
    },
    enabled: isAdminView ? !!viewMediaUserId : !!currentUser?.id,
  });

  const { data: insuranceProfile } = useQuery({
    queryKey: ['insuranceProfile', mediaUser?.id],
    queryFn: async () => {
      const results = await base44.entities.InsuranceProfile.filter({ media_user_id: mediaUser.id });
      return results[0] || null;
    },
    enabled: !!mediaUser?.id,
  });

  const { data: mediaOrg } = useQuery({
    queryKey: ['mediaOrg', mediaUser?.organization_id],
    queryFn: () => base44.entities.MediaOrganization.get(mediaUser.organization_id),
    enabled: !!mediaUser?.organization_id,
  });

  // Form state
  const [profile, setProfile] = useState({ full_name: '', legal_name: '', email: '', phone: '', portfolio_url: '', instagram_url: '', website_url: '' });
  const [org, setOrg] = useState({ name: '', website_url: '', primary_contact_name: '', primary_contact_email: '' });
  const [insurance, setInsurance] = useState({ carrier_name: '', expiration_date: '', certificate_drive_file_id: '' });
  const [createOrg, setCreateOrg] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (mediaUser && !initialized) {
      setProfile({
        full_name: mediaUser.full_name || '',
        legal_name: mediaUser.legal_name || '',
        email: mediaUser.email || currentUser?.email || '',
        phone: mediaUser.phone || '',
        portfolio_url: mediaUser.portfolio_url || '',
        instagram_url: mediaUser.instagram_url || '',
        website_url: mediaUser.website_url || '',
      });
      setInitialized(true);
    } else if (!mediaUser && currentUser && !initialized) {
      setProfile(p => ({ ...p, email: currentUser.email || '', full_name: currentUser.full_name || '' }));
      setInitialized(true);
    }
  }, [mediaUser, currentUser, initialized]);

  useEffect(() => {
    if (insuranceProfile) {
      setInsurance({
        carrier_name: insuranceProfile.carrier_name || '',
        expiration_date: insuranceProfile.expiration_date || '',
        certificate_drive_file_id: insuranceProfile.certificate_drive_file_id || '',
      });
    }
  }, [insuranceProfile]);

  useEffect(() => {
    if (mediaOrg) {
      setOrg({ name: mediaOrg.name, website_url: mediaOrg.website_url || '', primary_contact_name: mediaOrg.primary_contact_name, primary_contact_email: mediaOrg.primary_contact_email });
    }
  }, [mediaOrg]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      let orgId = mediaUser?.organization_id || null;

      // Handle org
      if (createOrg && org.name && !orgId) {
        const newOrg = await base44.entities.MediaOrganization.create({ ...org, created_at: now, updated_at: now });
        orgId = newOrg.id;
      } else if (orgId && mediaOrg) {
        await base44.entities.MediaOrganization.update(orgId, { ...org, updated_at: now });
      }

      // Save/create MediaUser
      let muId = mediaUser?.id;
      if (muId) {
        await base44.entities.MediaUser.update(muId, { ...profile, ...(orgId && { organization_id: orgId }), updated_at: now });
      } else {
        const mu = await base44.entities.MediaUser.create({
          ...profile,
          user_id: currentUser.id,
          ...(orgId && { organization_id: orgId }),
          status: 'pending',
          created_at: now,
          updated_at: now,
        });
        muId = mu.id;
      }

      // Insurance (optional)
      if (insurance.carrier_name) {
        const insData = { ...insurance, media_user_id: muId, verification_status: 'unverified', updated_at: now };
        if (insuranceProfile?.id) {
          await base44.entities.InsuranceProfile.update(insuranceProfile.id, insData);
        } else {
          await base44.entities.InsuranceProfile.create({ ...insData, created_at: now });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['myMediaUser'] });
      queryClient.invalidateQueries({ queryKey: ['mediaUser'] });
      queryClient.invalidateQueries({ queryKey: ['mediaUsers'] });
      toast.success('Media profile saved');
    },
  });

  useEffect(() => {
    if (authLoading === false && !isAuthenticated && !isAdminView) {
      base44.auth.redirectToLogin(window.location.href);
    }
  }, [isAuthenticated, authLoading, isAdminView]);

  if (authLoading || muLoading) return (
    <PageShell>
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]"><BurnoutSpinner /></div>
    </PageShell>
  );

  const readOnly = isAdminView;

  const statusColors = { pending: 'bg-yellow-900/60 text-yellow-300', verified: 'bg-green-900/60 text-green-300', rejected: 'bg-red-900/60 text-red-300' };

  return (
    <PageShell>
      <div className="min-h-screen bg-[#0A0A0A]">
        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black text-white">{isAdminView ? 'Media User Profile' : 'My Media Profile'}</h1>
              <p className="text-gray-400 text-sm mt-1">{isAdminView ? 'Admin view — read only' : 'Manage your media professional profile'}</p>
            </div>
            <div className="flex items-center gap-2">
              {mediaUser?.status && <Badge className={statusColors[mediaUser.status] || 'bg-gray-700 text-gray-300'}>{mediaUser.status}</Badge>}
              {!readOnly && (
                <Link to={createPageUrl('MediaApply')}>
                  <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800" size="sm">
                    Apply for Credentials <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Profile Section */}
          <Card className="bg-[#171717] border-gray-800 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2"><User className="w-4 h-4 text-blue-400" />Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Full Name *</label>
                  <Input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Legal Name *</label>
                  <Input value={profile.legal_name} onChange={e => setProfile(p => ({ ...p, legal_name: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Email *</label>
                  <Input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Phone</label>
                  <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Portfolio URL</label>
                  <Input value={profile.portfolio_url} onChange={e => setProfile(p => ({ ...p, portfolio_url: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Instagram</label>
                  <Input value={profile.instagram_url} onChange={e => setProfile(p => ({ ...p, instagram_url: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" placeholder="https://instagram.com/..." />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">Website</label>
                  <Input value={profile.website_url} onChange={e => setProfile(p => ({ ...p, website_url: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" placeholder="https://..." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card className="bg-[#171717] border-gray-800 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-400" />Organization (Optional)</CardTitle>
                {!readOnly && !mediaUser?.organization_id && !createOrg && (
                  <Button size="sm" variant="outline" className="border-gray-700 text-gray-400 h-7 px-2 text-xs" onClick={() => setCreateOrg(true)}>+ Add Org</Button>
                )}
              </div>
            </CardHeader>
            {(createOrg || mediaUser?.organization_id) && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Organization Name *</label>
                    <Input value={org.name} onChange={e => setOrg(o => ({ ...o, name: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Website</label>
                    <Input value={org.website_url} onChange={e => setOrg(o => ({ ...o, website_url: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Primary Contact Name *</label>
                    <Input value={org.primary_contact_name} onChange={e => setOrg(o => ({ ...o, primary_contact_name: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Primary Contact Email *</label>
                    <Input value={org.primary_contact_email} onChange={e => setOrg(o => ({ ...o, primary_contact_email: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Insurance */}
          <Card className="bg-[#171717] border-gray-800 mb-8">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" />Insurance (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Carrier Name</label>
                  <Input value={insurance.carrier_name} onChange={e => setInsurance(i => ({ ...i, carrier_name: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Expiration Date</label>
                  <Input type="date" value={insurance.expiration_date} onChange={e => setInsurance(i => ({ ...i, expiration_date: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">Certificate Drive File ID / URL</label>
                  <Input value={insurance.certificate_drive_file_id} onChange={e => setInsurance(i => ({ ...i, certificate_drive_file_id: e.target.value }))} readOnly={readOnly} className="bg-[#0A0A0A] border-gray-700 text-white" placeholder="Drive file ID or URL" />
                </div>
              </div>
              {insuranceProfile && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">Verification:</span>
                  <Badge className="text-xs bg-gray-700 text-gray-300">{insuranceProfile.verification_status}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {!readOnly && (
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !profile.full_name || !profile.legal_name || !profile.email}
              className="w-full bg-blue-700 hover:bg-blue-600 text-white py-5 text-base font-semibold"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : mediaUser ? 'Save Profile' : 'Create Media Profile'}
            </Button>
          )}
        </div>
      </div>
    </PageShell>
  );
}