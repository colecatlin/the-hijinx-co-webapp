import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, XCircle, Clock, ArrowUpCircle, User, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import PersonIdentityPanel from './PersonIdentityPanel';

const STATUS_TABS = ['pending', 'in_review', 'approved', 'rejected', 'escalated'];

const PRIORITY_COLORS = {
  critical: 'bg-red-900/60 text-red-300 border-red-700',
  high:     'bg-orange-900/60 text-orange-300 border-orange-700',
  normal:   'bg-blue-900/40 text-blue-300 border-blue-700',
  low:      'bg-slate-800 text-slate-400 border-slate-600',
};

const CONFLICT_ICONS = {
  dob_conflict:     <AlertTriangle className="w-4 h-4 text-red-400" />,
  license_conflict: <AlertTriangle className="w-4 h-4 text-orange-400" />,
  name_ambiguous:   <Clock className="w-4 h-4 text-yellow-400" />,
  multi_candidate:  <ArrowUpCircle className="w-4 h-4 text-blue-400" />,
  none:             null,
};

export default function IdentityReviewDashboard() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedIdentityId, setSelectedIdentityId] = useState(null);

  const { data: queueItems = [], isLoading } = useQuery({
    queryKey: ['identity-review-queue', activeTab],
    queryFn: () => base44.entities.IdentityReviewQueue.filter({ status: activeTab }, '-created_date', 100),
  });

  const { data: evidenceMap = {} } = useQuery({
    queryKey: ['identity-evidence-for-queue', queueItems.map(q => q.evidence_id).join(',')],
    queryFn: async () => {
      const ids = [...new Set(queueItems.map(q => q.evidence_id).filter(Boolean))];
      if (!ids.length) return {};
      const all = await Promise.all(ids.map(id =>
        base44.entities.IdentityEvidence.filter({ id }).catch(() => [])
      ));
      const map = {};
      all.forEach(arr => arr.forEach(e => { map[e.id] = e; }));
      return map;
    },
    enabled: queueItems.length > 0,
  });

  const { data: identityMap = {} } = useQuery({
    queryKey: ['identity-map-for-queue', queueItems.map(q => q.candidate_a_identity_id).join(',')],
    queryFn: async () => {
      const ids = [...new Set(queueItems.map(q => q.candidate_a_identity_id).filter(Boolean))];
      if (!ids.length) return {};
      const all = await Promise.all(ids.map(id =>
        base44.entities.PersonIdentity.filter({ id }).catch(() => [])
      ));
      const map = {};
      all.forEach(arr => arr.forEach(i => { map[i.id] = i; }));
      return map;
    },
    enabled: queueItems.length > 0,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ queueId, resolution, evidenceId, identityId, notes }) => {
      const now = new Date().toISOString();
      await base44.entities.IdentityReviewQueue.update(queueId, {
        status: ['attach_to_candidate_a', 'attach_to_candidate_b', 'create_new_identity', 'merge_candidates'].includes(resolution)
          ? 'approved' : resolution === 'rejected_evidence' ? 'rejected' : 'approved',
        resolution,
        reviewed_by: (await base44.auth.me()).id,
        reviewed_at: now,
        review_notes: notes || '',
      });

      if (resolution === 'attach_to_candidate_a' && evidenceId && identityId) {
        await base44.entities.IdentityEvidence.update(evidenceId, {
          identity_id: identityId,
          status: 'attached',
          verified: true,
          verified_at: now,
        });
      } else if (resolution === 'rejected_evidence' && evidenceId) {
        await base44.entities.IdentityEvidence.update(evidenceId, {
          status: 'rejected',
          rejection_reason: notes || 'Rejected via review queue',
        });
      } else if (resolution === 'create_new_identity' && evidenceId) {
        const evidence = evidenceMap[evidenceId];
        if (evidence) {
          const newIdentity = await base44.entities.PersonIdentity.create({
            canonical_name: evidence.raw_driver_name,
            status: 'active',
            confidence_level: 'unverified',
            confidence_score: 20,
            data_source: evidence.source_name,
          });
          await base44.entities.IdentityEvidence.update(evidenceId, {
            identity_id: newIdentity.id,
            status: 'attached',
          });
        }
      }
    },
    onSuccess: () => {
      toast.success('Review queue item resolved');
      qc.invalidateQueries({ queryKey: ['identity-review-queue'] });
      setSelectedItem(null);
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const escalateMutation = useMutation({
    mutationFn: async ({ queueId, reason }) => {
      await base44.entities.IdentityReviewQueue.update(queueId, {
        status: 'escalated',
        escalation_reason: reason || 'Escalated for senior review',
      });
    },
    onSuccess: () => {
      toast.success('Item escalated');
      qc.invalidateQueries({ queryKey: ['identity-review-queue'] });
      setSelectedItem(null);
    },
  });

  const counts = {};
  STATUS_TABS.forEach(s => { counts[s] = s === activeTab ? queueItems.length : '…'; });

  if (selectedIdentityId) {
    return (
      <div className="p-6">
        <Button variant="outline" size="sm" className="mb-4" onClick={() => setSelectedIdentityId(null)}>
          ← Back to Queue
        </Button>
        <PersonIdentityPanel identityId={selectedIdentityId} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Identity Review Queue</h1>
          <p className="text-sm text-slate-400 mt-1">
            Review pending identity matches before they are permanently attached.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['identity-review-queue'] })}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setSelectedItem(null); }}>
        <TabsList className="bg-slate-800 border border-slate-700">
          {STATUS_TABS.map(s => (
            <TabsTrigger key={s} value={s} className="capitalize">
              {s} {s === activeTab && queueItems.length > 0 && (
                <span className="ml-1.5 bg-slate-600 text-xs px-1.5 py-0.5 rounded-full">{queueItems.length}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {isLoading ? (
              <div className="text-center py-12 text-slate-500">Loading queue items…</div>
            ) : queueItems.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No {tab} items.</div>
            ) : (
              <div className="grid gap-3">
                {queueItems.map(item => {
                  const evidence = evidenceMap[item.evidence_id];
                  const identity = identityMap[item.candidate_a_identity_id];
                  const isSelected = selectedItem?.id === item.id;

                  return (
                    <Card
                      key={item.id}
                      className={`cursor-pointer transition-all border ${isSelected ? 'border-teal-500/60' : 'border-slate-700'} bg-slate-900/60`}
                      onClick={() => setSelectedItem(isSelected ? null : item)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {CONFLICT_ICONS[item.conflict_type]}
                            <span className="font-semibold text-white text-sm">
                              {evidence?.raw_driver_name || '—'}
                            </span>
                            <Badge className={`text-[10px] border ${PRIORITY_COLORS[item.priority]}`}>
                              {item.priority}
                            </Badge>
                            {item.conflict_type && item.conflict_type !== 'none' && (
                              <Badge className="bg-red-900/60 text-red-300 border-red-700 text-[10px]">
                                {item.conflict_type.replace('_', ' ').toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-slate-400">Score</div>
                            <div className={`text-lg font-bold ${item.confidence_score >= 95 ? 'text-green-400' : item.confidence_score >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {item.confidence_score}
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                          <div>
                            <div className="text-slate-500 uppercase tracking-wider text-[9px] mb-0.5">Source</div>
                            <div className="text-slate-300">{evidence?.source_name || '—'}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 uppercase tracking-wider text-[9px] mb-0.5">Series</div>
                            <div className="text-slate-300">{item.series_context || evidence?.raw_series_name || '—'}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 uppercase tracking-wider text-[9px] mb-0.5">Season</div>
                            <div className="text-slate-300">{item.season_context || evidence?.raw_season || '—'}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 uppercase tracking-wider text-[9px] mb-0.5">Team</div>
                            <div className="text-slate-300">{evidence?.raw_team_name || '—'}</div>
                          </div>
                        </div>

                        {/* Candidate Identity */}
                        {identity && (
                          <div className="bg-slate-800/60 rounded-lg p-3 mb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-teal-400" />
                                <span className="text-sm font-medium text-white">{identity.canonical_name}</span>
                                <Badge className="text-[9px] bg-teal-900/50 text-teal-300 border-teal-700">
                                  {identity.confidence_level}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-slate-400 h-6 px-2"
                                onClick={e => { e.stopPropagation(); setSelectedIdentityId(identity.id); }}
                              >
                                View Profile →
                              </Button>
                            </div>
                            {identity.date_of_birth && (
                              <div className="text-xs text-slate-500 mt-1">DOB: {identity.date_of_birth}</div>
                            )}
                          </div>
                        )}

                        {/* Signals */}
                        {item.confidence_signals?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {item.confidence_signals.map((sig, i) => (
                              <span key={i} className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                                {sig}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Raw evidence context */}
                        {evidence && (
                          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            {evidence.raw_car_number && (
                              <div><span className="text-slate-500">Car # </span><span className="text-slate-300">#{evidence.raw_car_number}</span></div>
                            )}
                            {evidence.raw_dob && (
                              <div><span className="text-slate-500">DOB (raw) </span><span className="text-slate-300">{evidence.raw_dob}</span></div>
                            )}
                            {evidence.raw_license_number && (
                              <div><span className="text-slate-500">License </span><span className="text-slate-300">{evidence.raw_license_number}</span></div>
                            )}
                            {evidence.raw_class_name && (
                              <div><span className="text-slate-500">Class </span><span className="text-slate-300">{evidence.raw_class_name}</span></div>
                            )}
                          </div>
                        )}

                        {/* Actions (expanded when selected) */}
                        {isSelected && tab === 'pending' && (
                          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700">
                            {item.candidate_a_identity_id && (
                              <Button
                                size="sm"
                                className="bg-green-700 hover:bg-green-600 text-white text-xs"
                                onClick={e => { e.stopPropagation(); resolveMutation.mutate({ queueId: item.id, resolution: 'attach_to_candidate_a', evidenceId: item.evidence_id, identityId: item.candidate_a_identity_id }); }}
                                disabled={resolveMutation.isPending}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Approve — Attach to {item.candidate_a_name || 'Candidate A'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="bg-blue-700 hover:bg-blue-600 text-white text-xs"
                              onClick={e => { e.stopPropagation(); resolveMutation.mutate({ queueId: item.id, resolution: 'create_new_identity', evidenceId: item.evidence_id }); }}
                              disabled={resolveMutation.isPending}
                            >
                              <User className="w-3 h-3 mr-1" /> Create New Identity
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-orange-700 text-orange-400 hover:bg-orange-900/30"
                              onClick={e => { e.stopPropagation(); escalateMutation.mutate({ queueId: item.id, reason: 'Escalated from pending queue' }); }}
                              disabled={escalateMutation.isPending}
                            >
                              <ArrowUpCircle className="w-3 h-3 mr-1" /> Escalate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-red-800 text-red-400 hover:bg-red-900/30"
                              onClick={e => { e.stopPropagation(); resolveMutation.mutate({ queueId: item.id, resolution: 'rejected_evidence', evidenceId: item.evidence_id, notes: 'Rejected — invalid evidence' }); }}
                              disabled={resolveMutation.isPending}
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Reject Evidence
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}