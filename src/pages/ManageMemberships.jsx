import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Trash2, Crown, Users, Layers, Grid3x3, Plus, Search } from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import AdminAccessDenied from '@/components/shared/AdminAccessDenied';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ENTITLEMENT_GROUPS, ENTITLEMENT_MAP } from '@/config/entitlements';
import { toast } from 'sonner';

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800',
  comp: 'bg-teal-100 text-teal-800',
  past_due: 'bg-yellow-100 text-yellow-800',
  canceled: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-600',
};

export default function ManageMemberships({ embedded = false }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('tiers');
  const [search, setSearch] = useState('');
  const [compUser, setCompUser] = useState('');
  const [compTier, setCompTier] = useState('core');

  // Auth
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  const isAdmin = currentUser?.role === 'admin';

  // Tiers
  const { data: tiers = [], isLoading: loadingTiers } = useQuery({
    queryKey: ['allSubscriptionTiers'],
    queryFn: () => base44.entities.SubscriptionTier.list('display_order', 50),
    enabled: isAdmin,
  });

  // Memberships
  const { data: memberships = [], isLoading: loadingMemberships } = useQuery({
    queryKey: ['allMemberships'],
    queryFn: () => base44.asServiceRole.entities.Membership.list('-created_date', 500),
    enabled: isAdmin,
  });

  // Seed tiers mutation
  const seedMutation = useMutation({
    mutationFn: () => base44.functions.invoke('seedSubscriptionTiers', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSubscriptionTiers'] });
      toast.success('Default tiers seeded.');
    },
  });

  // Update tier mutation
  const updateTierMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SubscriptionTier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allSubscriptionTiers'] });
      queryClient.invalidateQueries({ queryKey: ['allSubscriptionTiers'] });
    },
  });

  // Grant comp mutation
  const grantCompMutation = useMutation({
    mutationFn: ({ user_id, tier_key }) => base44.functions.invoke('grantCompMembership', { user_id, tier_key }),
    onSuccess: (res) => {
      if (res?.data?.error) {
        toast.error(res.data.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ['allMemberships'] });
        toast.success('Complimentary membership granted.');
        setCompUser('');
      }
    },
  });

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: (membership_id) => base44.functions.invoke('revokeMembership', { membership_id }),
    onSuccess: (res) => {
      if (res?.data?.error) {
        toast.error(res.data.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ['allMemberships'] });
        toast.success('Membership revoked.');
      }
    },
  });

  // MRR calculation
  const mrr = useMemo(() => {
    return memberships
      .filter(m => m.status === 'active' || m.status === 'comp')
      .reduce((sum, m) => {
        const tier = tiers.find(t => t.tier_key === m.tier_key);
        const monthly = tier?.interval === 'year' ? (tier.price_cents / 12) : (tier?.price_cents || 0);
        return sum + monthly / 100;
      }, 0);
  }, [memberships, tiers]);

  const filteredMemberships = useMemo(() => {
    if (!search) return memberships;
    const q = search.toLowerCase();
    return memberships.filter(m =>
      (m.user_email || '').toLowerCase().includes(q) ||
      (m.tier_key || '').toLowerCase().includes(q) ||
      (m.status || '').toLowerCase().includes(q)
    );
  }, [memberships, search]);

  if (userLoading) return null;
  if (!currentUser) { base44.auth.redirectToLogin(); return null; }
  if (!isAdmin) {
    return (
      <ManagementLayout currentPage="ManageMemberships" embedded={embedded}>
        <AdminAccessDenied />
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout currentPage="ManageMemberships" embedded={embedded}>
      <ManagementShell title="Membership Management" subtitle="Configure tiers, manage members, and review entitlements" maxWidth="max-w-6xl">

        {/* Stats bar */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="px-4 py-3 rounded-xl border border-gray-200 bg-white">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Members</p>
            <p className="text-2xl font-black text-gray-900">{memberships.filter(m => m.status === 'active' || m.status === 'comp').length}</p>
          </div>
          <div className="px-4 py-3 rounded-xl border border-gray-200 bg-white">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">MRR</p>
            <p className="text-2xl font-black text-gray-900">${mrr.toFixed(0)}</p>
          </div>
          <div className="px-4 py-3 rounded-xl border border-gray-200 bg-white">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Tiers</p>
            <p className="text-2xl font-black text-gray-900">{tiers.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <TabButton active={activeTab === 'tiers'} onClick={() => setActiveTab('tiers')} icon={Layers}>
            Tiers
          </TabButton>
          <TabButton active={activeTab === 'memberships'} onClick={() => setActiveTab('memberships')} icon={Users}>
            Memberships
          </TabButton>
          <TabButton active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={Grid3x3}>
            Entitlement Map
          </TabButton>
        </div>

        {/* TIERS TAB */}
        {activeTab === 'tiers' && (
          <div className="space-y-4">
            {tiers.length === 0 && !loadingTiers && (
              <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl">
                <p className="text-sm text-gray-500 mb-4">No tiers configured yet.</p>
                <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                  {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Seed Default Tiers
                </Button>
              </div>
            )}

            {tiers.map(tier => (
              <TierEditor
                key={tier.id}
                tier={tier}
                onSave={(data) => updateTierMutation.mutate({ id: tier.id, data })}
                saving={updateTierMutation.isPending && updateTierMutation.variables?.id === tier.id}
              />
            ))}
          </div>
        )}

        {/* MEMBERSHIPS TAB */}
        {activeTab === 'memberships' && (
          <div className="space-y-4">
            {/* Grant comp */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <p className="text-sm font-bold mb-3 text-gray-900">Grant Complimentary Access</p>
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="User ID"
                  value={compUser}
                  onChange={e => setCompUser(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
                <select
                  value={compTier}
                  onChange={e => setCompTier(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                >
                  <option value="core">Core</option>
                  <option value="pro">Pro</option>
                  <option value="elite">Elite</option>
                </select>
                <Button
                  onClick={() => grantCompMutation.mutate({ user_id: compUser, tier_key: compTier })}
                  disabled={!compUser || grantCompMutation.isPending}
                >
                  {grantCompMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                  Grant
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Enter the user's Base44 ID. The user will get full access with no Stripe link.</p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by email, tier, or status..."
                className="pl-9"
              />
            </div>

            {/* Memberships table */}
            {loadingMemberships ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : filteredMemberships.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No memberships found.</div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">User</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Tier</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Renewal</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMemberships.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{m.user_email || m.user_id?.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="secondary" className="capitalize">{m.tier_key}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${STATUS_STYLES[m.status] || 'bg-gray-100 text-gray-800'}`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {m.current_period_end ? new Date(m.current_period_end).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {m.status !== 'canceled' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 h-7 px-2 text-xs"
                              onClick={() => {
                                if (window.confirm(`Revoke ${m.user_email || m.user_id?.slice(0,8)}'s membership?`)) {
                                  revokeMutation.mutate(m.id);
                                }
                              }}
                              disabled={revokeMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3 mr-1" /> Revoke
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ENTITLEMENT MAP TAB */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            {ENTITLEMENT_GROUPS.map(group => (
              <div key={group.group}>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{group.group}</p>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-gray-600">Entitlement</th>
                        {tiers.map(t => (
                          <th key={t.tier_key} className="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-gray-600">
                            {t.display_name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.entitlements.map(ent => (
                        <tr key={ent.key} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-sm">
                            <p className="font-medium text-gray-900">{ent.label}</p>
                            <p className="text-xs text-gray-500">{ent.description}</p>
                          </td>
                          {tiers.map(t => {
                            const has = (t.features || []).includes(ent.key);
                            return (
                              <td key={t.tier_key} className="px-4 py-2.5 text-center">
                                {has ? (
                                  <span className="text-green-600 font-bold">✓</span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </ManagementShell>
    </ManagementLayout>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
        active ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-900'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

function TierEditor({ tier, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: tier.display_name,
    description: tier.description,
    price_cents: tier.price_cents,
    stripe_price_id: tier.stripe_price_id || '',
    features: tier.features || [],
    is_active: tier.is_active !== false,
    highlight: tier.highlight || false,
  });

  const toggleFeature = (key) => {
    setForm(f => ({
      ...f,
      features: f.features.includes(key)
        ? f.features.filter(k => k !== key)
        : [...f.features, key],
    }));
  };

  const handleSave = () => {
    onSave({
      ...form,
      price_cents: parseInt(form.price_cents) || 0,
    });
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="p-4 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900">{tier.display_name}</h3>
              <Badge variant="secondary" className="capitalize">{tier.tier_key}</Badge>
              {tier.highlight && <Badge className="bg-teal-100 text-teal-800">Popular</Badge>}
              {tier.is_active === false && <Badge className="bg-gray-100 text-gray-600">Inactive</Badge>}
            </div>
            <p className="text-sm text-gray-500 mb-2">{tier.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{tier.price_cents > 0 ? `$${(tier.price_cents / 100).toFixed(0)}/${tier.interval}` : 'Free'}</span>
              <span>{(tier.features || []).length} entitlements</span>
              {tier.stripe_price_id && <span className="font-mono text-[10px]">Stripe: {tier.stripe_price_id.slice(0, 14)}…</span>}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl border-2 border-teal-300 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Edit {tier.display_name}</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">Display Name</label>
          <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">Price (cents)</label>
          <Input type="number" value={form.price_cents} onChange={e => setForm(f => ({ ...f, price_cents: e.target.value }))} />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">Description</label>
        <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>

      <div className="mb-4">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">Stripe Price ID</label>
        <Input
          value={form.stripe_price_id}
          onChange={e => setForm(f => ({ ...f, stripe_price_id: e.target.value }))}
          placeholder="price_..."
          className="font-mono text-xs"
        />
        <p className="text-xs text-gray-500 mt-1">Create a recurring price in Stripe and paste the ID here.</p>
      </div>

      <div className="mb-4 flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.highlight} onChange={e => setForm(f => ({ ...f, highlight: e.target.checked }))} />
          Highlight as popular
        </label>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Entitlements</p>
        <div className="space-y-3">
          {ENTITLEMENT_GROUPS.map(group => (
            <div key={group.group}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{group.group}</p>
              <div className="flex flex-wrap gap-2">
                {group.entitlements.map(ent => {
                  const checked = form.features.includes(ent.key);
                  return (
                    <button
                      key={ent.key}
                      onClick={() => toggleFeature(ent.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        checked
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {checked ? '✓ ' : ''}{ent.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}