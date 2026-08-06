import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { User, Shield, Tag, FileText, History, CheckCircle2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const CONFIDENCE_COLORS = {
  verified:   'bg-green-900/60 text-green-300 border-green-700',
  high:       'bg-teal-900/60 text-teal-300 border-teal-700',
  medium:     'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  low:        'bg-orange-900/60 text-orange-300 border-orange-700',
  unverified: 'bg-surface-interactive text-foreground-quiet border-divider',
};

export default function PersonIdentityPanel({ identityId }) {
  const qc = useQueryClient();
  const [newAlias, setNewAlias] = useState('');
  const [newAliasType, setNewAliasType] = useState('manual');

  const { data: identity, isLoading } = useQuery({
    queryKey: ['person-identity', identityId],
    queryFn: () => base44.entities.PersonIdentity.filter({ id: identityId }).then(r => r[0]),
    enabled: !!identityId,
  });

  const { data: aliases = [] } = useQuery({
    queryKey: ['identity-aliases', identityId],
    queryFn: () => base44.entities.IdentityAlias.filter({ identity_id: identityId }, '-created_date', 50),
    enabled: !!identityId,
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ['identity-evidence', identityId],
    queryFn: () => base44.entities.IdentityEvidence.filter({ identity_id: identityId }, '-created_date', 50),
    enabled: !!identityId,
  });

  const { data: mergeLedger = [] } = useQuery({
    queryKey: ['merge-ledger', identityId],
    queryFn: () => base44.entities.IdentityMergeLedger.filter({ survivor_identity_id: identityId }, '-created_date', 20),
    enabled: !!identityId,
  });

  const { data: driver } = useQuery({
    queryKey: ['driver-for-identity', identity?.canonical_driver_id],
    queryFn: () => base44.entities.Driver.filter({ id: identity.canonical_driver_id }).then(r => r[0]),
    enabled: !!identity?.canonical_driver_id,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ['programs-for-driver', identity?.canonical_driver_id],
    queryFn: () => base44.entities.DriverProgram.filter({ driver_id: identity.canonical_driver_id }, '-created_date', 20),
    enabled: !!identity?.canonical_driver_id,
  });

  const addAliasMutation = useMutation({
    mutationFn: async () => {
      if (!newAlias.trim()) throw new Error('Alias name required');
      const normalized = newAlias.trim().toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      await base44.entities.IdentityAlias.create({
        identity_id: identityId,
        alias_name: newAlias.trim(),
        alias_normalized: normalized,
        alias_type: newAliasType,
        confidence: 50,
        source: 'manual_admin',
        source_type: 'manual_admin',
        is_primary: false,
        active: true,
      });
    },
    onSuccess: () => {
      toast.success('Alias added');
      setNewAlias('');
      qc.invalidateQueries({ queryKey: ['identity-aliases', identityId] });
    },
    onError: e => toast.error(e.message),
  });

  const deactivateAlias = useMutation({
    mutationFn: (aliasId) => base44.entities.IdentityAlias.update(aliasId, { active: false }),
    onSuccess: () => {
      toast.success('Alias deactivated');
      qc.invalidateQueries({ queryKey: ['identity-aliases', identityId] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      await base44.entities.PersonIdentity.update(identityId, {
        confidence_level: 'verified',
        confidence_score: 100,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        verification_source: 'manual_admin',
      });
    },
    onSuccess: () => {
      toast.success('Identity verified');
      qc.invalidateQueries({ queryKey: ['person-identity', identityId] });
    },
  });

  if (isLoading) return <div className="p-6 text-slate-500">Loading identity…</div>;
  if (!identity) return <div className="p-6 text-slate-500">Identity not found.</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-surface-elevated/80 border-divider">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-900/60 border border-teal-700/50 flex items-center justify-center">
                <User className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-white text-lg">{identity.canonical_name}</CardTitle>
                {identity.legal_name && identity.legal_name !== identity.canonical_name && (
                  <div className="text-xs text-slate-500 mt-0.5">Legal: {identity.legal_name}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs border ${CONFIDENCE_COLORS[identity.confidence_level]}`}>
                {identity.confidence_level} · {identity.confidence_score ?? '—'}
              </Badge>
              <Badge className="bg-surface-interactive text-foreground-quiet border-divider text-xs capitalize">
                {identity.status}
              </Badge>
              {identity.confidence_level !== 'verified' && (
                <Button
                  size="sm"
                  className="bg-green-800 hover:bg-green-700 text-white text-xs h-7"
                  onClick={() => verifyMutation.mutate()}
                  disabled={verifyMutation.isPending}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Verify
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Date of Birth</div>
              <div className="text-slate-200">{identity.date_of_birth || '—'}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Nationality</div>
              <div className="text-slate-200">{identity.nationality || '—'}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">External UID</div>
              <div className="text-slate-200 font-mono text-xs">{identity.external_uid || '—'}</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">License #</div>
              <div className="text-slate-200 font-mono text-xs">{identity.license_number || '—'}</div>
            </div>
          </div>
          {driver && (
            <div className="mt-4 pt-4 border-t border-divider flex items-center justify-between">
              <div className="text-xs text-foreground-quiet">
                Canonical Driver: <span className="text-teal-400 font-medium">{driver.first_name} {driver.last_name}</span>
              </div>
              <div className="flex gap-2 text-xs text-slate-500">
                <span>{programs.length} program{programs.length !== 1 ? 's' : ''}</span>
                {identity.merged_driver_ids?.length > 0 && (
                  <span>· {identity.merged_driver_ids.length} absorbed driver{identity.merged_driver_ids.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="aliases">
        <TabsList className="bg-surface-interactive border border-divider">
          <TabsTrigger value="aliases">
            <Tag className="w-3.5 h-3.5 mr-1.5" /> Aliases ({aliases.length})
          </TabsTrigger>
          <TabsTrigger value="evidence">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Evidence ({evidence.length})
          </TabsTrigger>
          <TabsTrigger value="merges">
            <History className="w-3.5 h-3.5 mr-1.5" /> Merges ({mergeLedger.length})
          </TabsTrigger>
          <TabsTrigger value="programs">
            <Shield className="w-3.5 h-3.5 mr-1.5" /> Programs ({programs.length})
          </TabsTrigger>
        </TabsList>

        {/* Aliases Tab */}
        <TabsContent value="aliases" className="mt-3 space-y-3">
          {/* Add alias */}
          <div className="flex gap-2">
            <Input
              value={newAlias}
              onChange={e => setNewAlias(e.target.value)}
              placeholder="Add alias name…"
              className="bg-surface-elevated border-divider text-white text-sm h-8"
              onKeyDown={e => e.key === 'Enter' && addAliasMutation.mutate()}
            />
            <select
              value={newAliasType}
              onChange={e => setNewAliasType(e.target.value)}
              className="bg-surface-elevated border border-divider text-slate-300 text-xs rounded-md px-2 h-8"
            >
              {['nickname', 'abbreviation', 'informal', 'surname_first', 'legal', 'source_variant', 'manual'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <Button size="sm" className="h-8 bg-teal-700 hover:bg-teal-600 text-white" onClick={() => addAliasMutation.mutate()}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-2">
            {aliases.map(alias => (
              <div key={alias.id} className="flex items-center justify-between bg-surface-elevated/60 border border-divider rounded-lg px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${alias.is_primary ? 'text-teal-300' : 'text-slate-200'}`}>
                    {alias.alias_name}
                  </span>
                  <Badge className="text-[9px] bg-surface-interactive text-foreground-quiet border-divider">{alias.alias_type}</Badge>
                  {alias.is_primary && <Badge className="text-[9px] bg-teal-900/50 text-teal-300 border-teal-700">primary</Badge>}
                  {!alias.active && <Badge className="text-[9px] bg-red-900/50 text-red-300 border-red-700">inactive</Badge>}
                  <span className="text-[10px] text-slate-600 font-mono">{alias.alias_normalized}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{alias.confidence ?? '—'}/100</span>
                  {alias.active && !alias.is_primary && (
                    <button
                      onClick={() => deactivateAlias.mutate(alias.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="mt-3 space-y-2">
          {evidence.map(ev => (
            <div key={ev.id} className="bg-surface-elevated/60 border border-divider rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-medium">{ev.source_name}</span>
                <Badge className={`text-[9px] ${ev.status === 'attached' ? 'bg-green-900/50 text-green-300 border-green-700' : ev.status === 'rejected' ? 'bg-red-900/50 text-red-300 border-red-700' : 'bg-surface-interactive text-foreground-quiet border-divider'}`}>
                  {ev.status}
                </Badge>
              </div>
              <div className="text-xs text-slate-500">
                Raw name: <span className="text-foreground-quiet">{ev.raw_driver_name}</span>
                {ev.raw_season && <> · Season: {ev.raw_season}</>}
                {ev.raw_series_name && <> · {ev.raw_series_name}</>}
                {ev.confidence_weight != null && <> · Weight: {ev.confidence_weight}</>}
              </div>
              {ev.confidence_signals?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {ev.confidence_signals.map((s, i) => (
                    <span key={i} className="text-[9px] font-mono bg-surface-interactive text-slate-500 px-1.5 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </TabsContent>

        {/* Merge Ledger Tab */}
        <TabsContent value="merges" className="mt-3 space-y-2">
          {mergeLedger.length === 0 ? (
            <div className="text-slate-500 text-sm py-4 text-center">No merges recorded for this identity.</div>
          ) : mergeLedger.map(ledger => (
            <div key={ledger.id} className="bg-surface-elevated/60 border border-divider rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300">
                  Absorbed: <span className="text-white font-medium">{ledger.merged_name}</span>
                </span>
                <Badge className={`text-[9px] ${ledger.status === 'applied' ? 'bg-teal-900/50 text-teal-300 border-teal-700' : 'bg-orange-900/50 text-orange-300 border-orange-700'}`}>
                  {ledger.status}
                </Badge>
              </div>
              <div className="text-xs text-slate-500">
                By {ledger.performed_by_name || ledger.performed_by} · {ledger.performed_at ? new Date(ledger.performed_at).toLocaleDateString() : '—'}
              </div>
              {ledger.reason && <div className="text-xs text-slate-500 mt-0.5">Reason: {ledger.reason}</div>}
            </div>
          ))}
        </TabsContent>

        {/* Programs Tab */}
        <TabsContent value="programs" className="mt-3 space-y-2">
          {programs.length === 0 ? (
            <div className="text-slate-500 text-sm py-4 text-center">No programs linked to this identity's driver.</div>
          ) : programs.map(prog => (
            <div key={prog.id} className="bg-surface-elevated/60 border border-divider rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">
                  {prog.season_year || prog.start_date?.slice(0, 4) || '?'} — #{prog.car_number || '?'}
                </span>
                <Badge className="text-[9px] bg-surface-interactive text-foreground-quiet border-divider capitalize">
                  {prog.status || 'active'}
                </Badge>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}