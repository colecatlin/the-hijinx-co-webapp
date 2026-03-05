import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { User, Building2, Save, Plus } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-yellow-900/60 text-yellow-300',
  verified: 'bg-green-900/60 text-green-300',
  rejected: 'bg-red-900/60 text-red-300',
};

export default function ProfileTab({ currentUser, mediaUser, onSaved }) {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({ full_name: '', legal_name: '', email: '', phone: '', portfolio_url: '', instagram_url: '', website_url: '' });
  const [orgId, setOrgId] = useState('');
  const [newOrgDialog, setNewOrgDialog] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', website_url: '', primary_contact_name: '', primary_contact_email: '' });
  const [initialized, setInitialized] = useState(false);

  const { data: organizations = [] } = useQuery({
    queryKey: ['mediaOrganizations'],
    queryFn: () => base44.entities.MediaOrganization.list(),
  });

  useEffect(() => {
    if (initialized) return;
    if (mediaUser) {
      setProfile({
        full_name: mediaUser.full_name || '',
        legal_name: mediaUser.legal_name || '',
        email: mediaUser.email || currentUser?.email || '',
        phone: mediaUser.phone || '',
        portfolio_url: mediaUser.portfolio_url || '',
        instagram_url: mediaUser.instagram_url || '',
        website_url: mediaUser.website_url || '',
      });
      setOrgId(mediaUser.organization_id || '');
      setInitialized(true);
    } else if (currentUser) {
      setProfile(p => ({ ...p, email: currentUser.email || '', full_name: currentUser.full_name || '' }));
      setInitialized(true);
    }
  }, [mediaUser, currentUser, initialized]);

  const createOrgMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const org = await base44.entities.MediaOrganization.create({ ...newOrg, created_at: now, updated_at: now });
      queryClient.invalidateQueries({ queryKey: ['mediaOrganizations'] });
      setOrgId(org.id);
      setNewOrgDialog(false);
      setNewOrg({ name: '', website_url: '', primary_contact_name: '', primary_contact_email: '' });
      toast.success('Organization created');
      return org;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      let mu;
      if (mediaUser?.id) {
        await base44.entities.MediaUser.update(mediaUser.id, {
          ...profile,
          email: currentUser.email,
          ...(orgId && { organization_id: orgId }),
          updated_at: now,
        });
        mu = { ...mediaUser, ...profile, organization_id: orgId || mediaUser.organization_id };
      } else {
        mu = await base44.entities.MediaUser.create({
          ...profile,
          email: currentUser.email,
          user_id: currentUser.id,
          ...(orgId && { organization_id: orgId }),
          status: 'pending',
          created_at: now,
          updated_at: now,
        });
      }
      await base44.entities.OperationLog.create({
        operation_type: 'media_profile_saved',
        source_type: 'media',
        status: 'success',
        metadata: { media_user_id: mu.id },
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['mediaUserByEmail', currentUser.email] });
      toast.success('Profile saved');
      onSaved?.();
    },
  });

  const canSave = profile.full_name && profile.legal_name && profile.email;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Media Profile</h2>
          <p className="text-gray-500 text-sm">Your media professional identity</p>
        </div>
        {mediaUser?.status && <Badge className={STATUS_COLORS[mediaUser.status] || 'bg-gray-700 text-gray-300'}>{mediaUser.status}</Badge>}
      </div>

      {/* Profile Details */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-sm flex items-center gap-2"><User className="w-4 h-4 text-blue-400" />Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Full Name *</label>
              <Input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Legal Name *</label>
              <Input value={profile.legal_name} onChange={e => setProfile(p => ({ ...p, legal_name: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email *</label>
              <Input value={currentUser?.email || profile.email} readOnly className="bg-[#0A0A0A] border-gray-700 text-gray-400 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Phone</label>
              <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Portfolio URL</label>
              <Input value={profile.portfolio_url} onChange={e => setProfile(p => ({ ...p, portfolio_url: e.target.value }))} placeholder="https://..." className="bg-[#0A0A0A] border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Instagram</label>
              <Input value={profile.instagram_url} onChange={e => setProfile(p => ({ ...p, instagram_url: e.target.value }))} placeholder="https://instagram.com/..." className="bg-[#0A0A0A] border-gray-700 text-white" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Website</label>
              <Input value={profile.website_url} onChange={e => setProfile(p => ({ ...p, website_url: e.target.value }))} placeholder="https://..." className="bg-[#0A0A0A] border-gray-700 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization */}
      <Card className="bg-[#171717] border-gray-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-400" />Organization (Optional)</CardTitle>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-gray-700 text-gray-400" onClick={() => setNewOrgDialog(true)}>
              <Plus className="w-3 h-3 mr-1" />New Org
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger className="bg-[#0A0A0A] border-gray-700 text-white">
              <SelectValue placeholder="Select organization (optional)..." />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-gray-700 max-h-48 overflow-y-auto">
              <SelectItem value={null} className="text-gray-400">None</SelectItem>
              {organizations.map(o => (
                <SelectItem key={o.id} value={o.id} className="text-white">{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {orgId && organizations.find(o => o.id === orgId) && (
            <div className="mt-2 text-xs text-gray-500">
              {organizations.find(o => o.id === orgId)?.primary_contact_name} — {organizations.find(o => o.id === orgId)?.primary_contact_email}
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canSave} className="bg-blue-700 hover:bg-blue-600 text-white w-full sm:w-auto px-8">
        <Save className="w-4 h-4 mr-2" />
        {saveMutation.isPending ? 'Saving...' : mediaUser ? 'Save Profile' : 'Create Media Profile'}
      </Button>

      {/* New Org Dialog */}
      <Dialog open={newOrgDialog} onOpenChange={setNewOrgDialog}>
        <DialogContent className="bg-[#1A1A1A] border-gray-700 max-w-md">
          <DialogHeader><DialogTitle className="text-white">New Organization</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Organization Name *</label>
              <Input value={newOrg.name} onChange={e => setNewOrg(o => ({ ...o, name: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Website</label>
              <Input value={newOrg.website_url} onChange={e => setNewOrg(o => ({ ...o, website_url: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" placeholder="https://..." />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Primary Contact Name</label>
              <Input value={newOrg.primary_contact_name} onChange={e => setNewOrg(o => ({ ...o, primary_contact_name: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Primary Contact Email</label>
              <Input type="email" value={newOrg.primary_contact_email} onChange={e => setNewOrg(o => ({ ...o, primary_contact_email: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setNewOrgDialog(false)}>Cancel</Button>
              <Button onClick={() => createOrgMutation.mutate()} disabled={createOrgMutation.isPending || !newOrg.name} className="bg-blue-700 hover:bg-blue-600">
                {createOrgMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}