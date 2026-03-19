import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/components/utils';
import {
  ShieldCheck, CheckCircle2, AlertCircle, Clock, XCircle,
  Search, ArrowLeft, User, Users, MapPin, Trophy, Loader2, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';
import { invalidateDataGroups } from '@/components/data/invalidationContract';

const ENTITY_ICONS = { Driver: User, Team: Users, Track: MapPin, Series: Trophy };
const ENTITY_COLORS = {
  Driver: 'bg-blue-50 border-blue-200 text-blue-700',
  Team: 'bg-purple-50 border-purple-200 text-purple-700',
  Track: 'bg-green-50 border-green-200 text-green-700',
  Series: 'bg-orange-50 border-orange-200 text-orange-700',
};
const STATUS_CONFIG = {
  pending: { label: 'Pending Review', color: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-50 text-green-700 border-green-200', Icon: CheckCircle2 },
  rejected: { label: 'Denied', color: 'bg-red-50 text-red-700 border-red-200', Icon: XCircle },
  needs_more_info: { label: 'Needs More Info', color: 'bg-blue-50 text-blue-700 border-blue-200', Icon: AlertCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Badge className={`${cfg.color} border text-xs flex items-center gap-1 h-auto py-0.5`}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

function ClaimForm({ user, prefill, onSuccess }) {
  const [step, setStep] = useState(prefill?.entityId ? 'form' : 'search');
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState(prefill?.entityType || 'Driver');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(
    prefill?.entityId ? { id: prefill.entityId, name: prefill.entityName, type: prefill.entityType } : null
  );
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const qc = useQueryClient();

  const ENTITY_FETCH = {
    Driver: () => base44.entities.Driver.filter({ first_name: search.split(' ')[0] || '' }, '-updated_date', 20),
    Team: () => base44.entities.Team.filter({}, '-updated_date', 20),
    Track: () => base44.entities.Track.filter({}, '-updated_date', 20),
    Series: () => base44.entities.Series.filter({}, '-updated_date', 20),
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      let results = [];
      if (entityType === 'Driver') {
        const all = await base44.entities.Driver.list('-updated_date', 200);
        const q = search.toLowerCase();
        results = all.filter(d =>
          `${d.first_name} ${d.last_name}`.toLowerCase().includes(q)
        ).slice(0, 10).map(d => ({ id: d.id, name: `${d.first_name} ${d.last_name}`, type: 'Driver' }));
      } else if (entityType === 'Team') {
        const all = await base44.entities.Team.list('-updated_date', 200);
        const q = search.toLowerCase();
        results = all.filter(t => t.name?.toLowerCase().includes(q)).slice(0, 10).map(t => ({ id: t.id, name: t.name, type: 'Team' }));
      } else if (entityType === 'Track') {
        const all = await base44.entities.Track.list('-updated_date', 200);
        const q = search.toLowerCase();
        results = all.filter(t => t.name?.toLowerCase().includes(q)).slice(0, 10).map(t => ({ id: t.id, name: t.name, type: 'Track' }));
      } else if (entityType === 'Series') {
        const all = await base44.entities.Series.list('-updated_date', 200);
        const q = search.toLowerCase();
        results = all.filter(s => s.name?.toLowerCase().includes(q)).slice(0, 10).map(s => ({ id: s.id, name: s.name, type: 'Series' }));
      }
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    const res = await base44.functions.invoke('requestEntityClaim', {
      entity_type: selected.type,
      entity_id: selected.id,
      message,
    });
    const data = res?.data;
    if (!data?.ok) {
      toast.error(data?.error || 'Failed to submit claim. Please try again.');
      setSubmitting(false);
      return;
    }
    invalidateDataGroups(qc, ['access']);
    toast.success('Claim submitted! An admin will review it shortly.');
    setSubmitting(false);
    onSuccess?.();
  };

  const Icon = selected ? (ENTITY_ICONS[selected.type] || User) : null;

  return (
    <div className="space-y-5">
      {step === 'search' && (
        <>
          <div>
            <Label className="text-sm font-semibold">Entity Type</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {['Driver', 'Team', 'Track', 'Series'].map(t => (
                <button
                  key={t}
                  onClick={() => { setEntityType(t); setSearchResults([]); }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    entityType === t ? 'bg-[#232323] text-white border-[#232323]' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold">Search for a profile to claim</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={`Search ${entityType} profiles…`}
              />
              <Button onClick={handleSearch} disabled={searching || !search.trim()} className="bg-[#232323]">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
              {searchResults.map(r => {
                const RIcon = ENTITY_ICONS[r.type] || User;
                return (
                  <button
                    key={r.id}
                    onClick={() => { setSelected(r); setStep('form'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${ENTITY_COLORS[r.type] || 'bg-gray-50 border-gray-200'}`}>
                      <RIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-gray-900">{r.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{r.type}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </button>
                );
              })}
            </div>
          )}

          {searchResults.length === 0 && search && !searching && (
            <p className="text-sm text-gray-400 text-center py-3">No results found. Try a different name.</p>
          )}
        </>
      )}

      {step === 'form' && selected && (
        <>
          <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            {Icon && (
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${ENTITY_COLORS[selected.type] || 'bg-gray-50 border-gray-200'}`}>
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">{selected.name}</p>
              <p className="text-xs text-gray-500">{selected.type} Profile</p>
            </div>
            {!prefill?.entityId && (
              <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setStep('search'); }} className="text-xs text-gray-400">
                Change
              </Button>
            )}
          </div>

          <div>
            <Label className="text-sm font-semibold">
              Why are you the rightful owner?
              <span className="text-gray-400 font-normal ml-1">(optional but helpful)</span>
            </Label>
            <Textarea
              className="mt-2"
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. I am this driver / I run this team / I operate this track..."
            />
          </div>

          <div className="flex justify-end gap-3">
            {!prefill?.entityId && (
              <Button variant="outline" onClick={() => setStep('search')}>Back</Button>
            )}
            <Button onClick={handleSubmit} disabled={submitting} className="bg-[#232323] text-white gap-1.5">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><ShieldCheck className="w-4 h-4" /> Submit Claim</>}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function MyClaims({ userId }) {
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['myClaims', userId],
    queryFn: () => base44.entities.EntityClaimRequest.filter({ user_id: userId }, '-created_date'),
    enabled: !!userId,
    staleTime: 30_000,
  });

  if (isLoading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  if (claims.length === 0) {
    return (
      <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-xl">
        <ShieldCheck className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-500 text-sm">No claims submitted yet</p>
        <p className="text-xs text-gray-400 mt-1">Use the form above to start a claim.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {claims.map(claim => {
        const Icon = ENTITY_ICONS[claim.entity_type] || User;
        const d = claim.created_date ? new Date(claim.created_date) : null;
        return (
          <div key={claim.id} className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${ENTITY_COLORS[claim.entity_type] || 'bg-gray-50 border-gray-200'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900">{claim.entity_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {claim.entity_type} · {d && isValid(d) ? format(d, 'MMM d, yyyy') : ''}
              </p>
              {claim.justification && (
                <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">"{claim.justification}"</p>
              )}
            </div>
            <StatusBadge status={claim.status} />
          </div>
        );
      })}
    </div>
  );
}

export default function ClaimsCenter() {
  const navigate = useNavigate();
  const [formSuccess, setFormSuccess] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Read prefill from URL params
  const params = new URLSearchParams(window.location.search);
  const prefill = {
    entityType: params.get('entityType') || '',
    entityId: params.get('entityId') || '',
    entityName: params.get('entityName') || '',
  };
  const hasPrefill = !!prefill.entityId;

  useEffect(() => {
    if (!userLoading && !user) {
      base44.auth.redirectToLogin(window.location.href);
    }
  }, [user, userLoading]);

  if (userLoading || !user) {
    return <PageShell><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div></PageShell>;
  }

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('MyDashboard')}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Claims Center</h1>
            <p className="text-sm text-gray-500">Claim and manage your racing profile ownership</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Claim Form Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck className="w-5 h-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-900">
                {hasPrefill ? `Claim ${prefill.entityName || prefill.entityType + ' Profile'}` : 'Start a Claim'}
              </h2>
            </div>

            {formSuccess ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <p className="font-semibold text-gray-900">Claim submitted successfully!</p>
                <p className="text-sm text-gray-500 text-center">An admin will review your request and notify you. Track your status below.</p>
                <Button variant="outline" size="sm" onClick={() => setFormSuccess(false)}>Submit Another Claim</Button>
              </div>
            ) : (
              <ClaimForm
                user={user}
                prefill={hasPrefill ? prefill : null}
                onSuccess={() => setFormSuccess(true)}
              />
            )}
          </div>

          {/* My Claims Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">My Claims</h2>
            <MyClaims userId={user.id} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}