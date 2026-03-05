import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Send } from 'lucide-react';

const STEPS = ['Target', 'Details', 'Policies', 'Review'];
const ACCESS_LEVELS = ['general', 'pit', 'hot_pit', 'restricted', 'drone', 'all_access'];
const ROLES = ['photographer', 'videographer', 'editor', 'social', 'writer', 'other'];

export default function ApplyTab({ currentUser, mediaUser, onSubmitted }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const [targetType, setTargetType] = useState('event');
  const [targetId, setTargetId] = useState('');
  const [roles, setRoles] = useState([]);
  const [accessLevel, setAccessLevel] = useState('general');
  const [assignmentDesc, setAssignmentDesc] = useState('');
  const [policyAcceptances, setPolicyAcceptances] = useState({});
  const [changeReqDialog, setChangeReqDialog] = useState(null);
  const [changeCategory, setChangeCategory] = useState('other');
  const [changeDetails, setChangeDetails] = useState('');

  const { data: events = [] } = useQuery({
    queryKey: ['eventsForMediaApply'],
    queryFn: () => base44.entities.Event.list('-event_date', 200),
    enabled: !!currentUser,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracksForMediaApply'],
    queryFn: () => base44.entities.Track.list('name'),
    enabled: !!currentUser,
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['seriesForMediaApply'],
    queryFn: () => base44.entities.Series.list('name'),
    enabled: !!currentUser,
  });

  const selectedEvent = targetType === 'event' ? events.find(e => e.id === targetId) : null;
  const selectedTrack = targetType === 'track' ? tracks.find(t => t.id === targetId) : null;
  const selectedSeries = targetType === 'series' ? seriesList.find(s => s.id === targetId) : null;

  const policyEntityIds = [];
  if (targetId) policyEntityIds.push(targetId);
  if (selectedEvent?.track_id) policyEntityIds.push(selectedEvent.track_id);
  if (selectedEvent?.series_id) policyEntityIds.push(selectedEvent.series_id);

  const { data: policies = [] } = useQuery({
    queryKey: ['policiesByEntity', policyEntityIds.join(',')],
    queryFn: async () => {
      const all = await base44.entities.Policy.list();
      const active = all.filter(p => p.active);
      const relevant = new Map();
      active.forEach(p => {
        if (policyEntityIds.includes(p.entity_id)) relevant.set(p.id, p);
      });
      return Array.from(relevant.values());
    },
    enabled: policyEntityIds.length > 0,
  });

  const { data: deliverables = [] } = useQuery({
    queryKey: ['policiesByEntity', 'deliverables_' + targetId],
    queryFn: async () => {
      const all = await base44.entities.DeliverableRequirement.list();
      return all.filter(r => r.active && (r.entity_id === targetId || (selectedEvent?.id && r.event_id === selectedEvent.id)));
    },
    enabled: !!targetId,
  });

  // Reset policy acceptances when target changes
  useEffect(() => { setPolicyAcceptances({}); }, [targetId]);

  const toggleRole = (r) => setRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const saveChangeReq = () => {
    if (!changeDetails.trim()) return;
    setPolicyAcceptances(prev => ({ ...prev, [changeReqDialog.id]: { status: 'change_requested', category: changeCategory, details: changeDetails } }));
    setChangeReqDialog(null);
    setChangeDetails('');
    setChangeCategory('other');
    toast.success('Change request noted — will be submitted with application');
  };

  const allPoliciesAnswered = policies.every(p => !!policyAcceptances[p.id]);
  const hasChangeReqs = policies.some(p => policyAcceptances[p.id]?.status === 'change_requested');

  const canProceed = () => {
    if (step === 0) return !!targetId;
    if (step === 1) return roles.length > 0 && !!assignmentDesc.trim();
    if (step === 2) return allPoliciesAnswered;
    return true;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const status = hasChangeReqs ? 'change_requested' : 'applied';

      const credReq = await base44.entities.CredentialRequest.create({
        holder_media_user_id: mediaUser.id,
        target_entity_type: targetType,
        target_entity_id: targetId,
        ...(targetType === 'event' && { related_event_id: targetId }),
        requested_roles: roles,
        requested_access_level: accessLevel,
        assignment_description: assignmentDesc,
        status,
        created_at: now,
        updated_at: now,
      });

      for (const policy of policies) {
        const acc = policyAcceptances[policy.id];
        if (!acc) continue;
        const pa = await base44.entities.PolicyAcceptance.create({
          policy_id: policy.id,
          holder_media_user_id: mediaUser.id,
          request_id: credReq.id,
          status: acc.status,
          ...(acc.category && { change_category: acc.category }),
          ...(acc.details && { change_details: acc.details }),
          created_at: now,
          accepted_at: acc.status === 'accepted' ? now : undefined,
        });

        if (acc.status === 'change_requested') {
          const thread = await base44.entities.PolicyThread.create({
            request_id: credReq.id,
            policy_id: policy.id,
            status: 'open',
            created_at: now,
            updated_at: now,
          });
          if (acc.details) {
            await base44.entities.PolicyMessage.create({
              thread_id: thread.id,
              sender_user_id: currentUser.id,
              message_text: acc.details,
              created_at: now,
            });
          }
        }
      }

      await base44.entities.OperationLog.create({
        operation_type: 'media_request_submitted',
        source_type: 'media',
        status: 'success',
        metadata: { request_id: credReq.id, target_entity_id: targetId, related_event_id: targetType === 'event' ? targetId : null },
      }).catch(() => {});

      queryClient.invalidateQueries({ queryKey: ['myCredentialRequests', mediaUser.id] });
      return credReq;
    },
    onSuccess: (req) => {
      onSubmitted?.(req);
      // Reset form
      setStep(0);
      setTargetId('');
      setRoles([]);
      setAccessLevel('general');
      setAssignmentDesc('');
      setPolicyAcceptances({});
    },
  });

  if (!mediaUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="bg-[#171717] border-gray-800 max-w-sm w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
            <h3 className="text-white font-bold mb-2">Profile Required</h3>
            <p className="text-gray-400 text-sm">Complete your media profile in the Profile tab before applying.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const targetOptions = targetType === 'track' ? tracks : targetType === 'series' ? seriesList : events;
  const targetName = targetOptions.find(x => x.id === targetId)?.name || '—';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-white font-bold text-lg">Apply for Credentials</h2>
        <p className="text-gray-500 text-sm">Submit a new credential request</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === step ? 'bg-blue-700 text-white' : i < step ? 'bg-green-800 text-green-300' : 'bg-gray-800 text-gray-500'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${i === step ? 'text-white' : 'text-gray-600'}`}>{s}</span>
            {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-700" />}
          </div>
        ))}
      </div>

      {/* Step 0: Target */}
      {step === 0 && (
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader><CardTitle className="text-white text-sm">Select Target</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Entity Type</label>
              <div className="flex gap-2">
                {['event', 'track', 'series'].map(t => (
                  <button key={t} onClick={() => { setTargetType(t); setTargetId(''); }}
                    className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${targetType === t ? 'bg-blue-800 border-blue-600 text-blue-100' : 'bg-[#262626] border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{targetType.charAt(0).toUpperCase() + targetType.slice(1)}</label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="bg-[#0A0A0A] border-gray-700 text-white">
                  <SelectValue placeholder={`Select ${targetType}...`} />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gray-700 max-h-64 overflow-y-auto">
                  {targetOptions.map(e => (
                    <SelectItem key={e.id} value={e.id} className="text-white">
                      {e.name}{e.event_date ? ` — ${e.event_date}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader><CardTitle className="text-white text-sm">Request Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Requested Roles *</label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map(r => (
                  <button key={r} onClick={() => toggleRole(r)}
                    className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${roles.includes(r) ? 'bg-blue-800 border-blue-600 text-blue-100' : 'bg-[#262626] border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Access Level</label>
              <Select value={accessLevel} onValueChange={setAccessLevel}>
                <SelectTrigger className="bg-[#0A0A0A] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gray-700">
                  {ACCESS_LEVELS.map(l => <SelectItem key={l} value={l} className="text-white">{l.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Assignment Description *</label>
              <Textarea value={assignmentDesc} onChange={e => setAssignmentDesc(e.target.value)} rows={4}
                className="bg-[#0A0A0A] border-gray-700 text-white resize-none"
                placeholder="Describe your assignment, publication, and intended use of media..." />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Policies */}
      {step === 2 && (
        <div className="space-y-4">
          {policies.length === 0 ? (
            <Card className="bg-[#171717] border-gray-800">
              <CardContent className="py-8 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No policies required for this target.</p>
              </CardContent>
            </Card>
          ) : policies.map(policy => {
            const acc = policyAcceptances[policy.id];
            return (
              <Card key={policy.id} className="bg-[#171717] border-gray-800">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="text-white font-semibold text-sm">{policy.title}</span>
                      <span className="ml-2 text-xs text-gray-500">{policy.policy_type} v{policy.version}</span>
                    </div>
                    {acc && <Badge className={acc.status === 'accepted' ? 'bg-green-900/60 text-green-300' : 'bg-orange-900/60 text-orange-300'}>{acc.status}</Badge>}
                  </div>
                  <div className="bg-[#0A0A0A] border border-gray-800 rounded p-3 mb-3 max-h-32 overflow-y-auto">
                    <p className="text-gray-400 text-xs whitespace-pre-wrap">{policy.body_rich_text}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setPolicyAcceptances(prev => ({ ...prev, [policy.id]: { status: 'accepted' } }))}
                      className={`flex-1 text-xs ${acc?.status === 'accepted' ? 'bg-green-800 text-green-100 hover:bg-green-700' : 'bg-[#262626] border border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setChangeReqDialog(policy); setChangeCategory('other'); setChangeDetails(''); }}
                      className={`text-xs ${acc?.status === 'change_requested' ? 'border-orange-700 bg-orange-900/20 text-orange-300' : 'border-gray-700 text-gray-400'}`}>
                      Request Change
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Waivers placeholder */}
          <Card className="bg-[#171717] border-gray-800 border-dashed">
            <CardContent className="py-4 px-5">
              <p className="text-gray-500 text-xs">📋 Waiver signing will be required after submission and before event day.</p>
            </CardContent>
          </Card>

          {/* Deliverables preview */}
          {deliverables.length > 0 && (
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-xs font-medium">Deliverable Requirements ({deliverables.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {deliverables.map(d => (
                  <div key={d.id} className="flex items-start gap-2 text-xs">
                    <AlertCircle className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                    <span className="text-gray-400"><span className="text-white">{d.title}</span> — {d.requirement_type} • {d.enforcement_level} enforcement</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card className="bg-[#171717] border-gray-800">
          <CardHeader><CardTitle className="text-white text-sm">Review & Submit</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm divide-y divide-gray-800">
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Target</span>
                <span className="text-white">{targetType}: {targetName}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Roles</span>
                <span className="text-white">{roles.join(', ') || '—'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Access Level</span>
                <span className="text-white">{accessLevel.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Policies</span>
                <span className="text-white">{policies.filter(p => policyAcceptances[p.id]?.status === 'accepted').length}/{policies.length} accepted
                  {hasChangeReqs && <span className="text-orange-400 ml-1">(changes requested)</span>}
                </span>
              </div>
            </div>
            {hasChangeReqs && (
              <div className="bg-orange-900/20 border border-orange-800 rounded p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
                <p className="text-orange-300 text-xs">Your application will be submitted as <strong>change_requested</strong>. The review team will reach out regarding the policy changes.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="bg-blue-700 hover:bg-blue-600">
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="bg-green-700 hover:bg-green-600 px-8">
            <Send className="w-4 h-4 mr-1" />{submitMutation.isPending ? 'Submitting...' : 'Submit Application'}
          </Button>
        )}
      </div>

      {/* Change Request Dialog */}
      <Dialog open={!!changeReqDialog} onOpenChange={o => !o && setChangeReqDialog(null)}>
        <DialogContent className="bg-[#1A1A1A] border-gray-700 max-w-md">
          <DialogHeader><DialogTitle className="text-white">Request Policy Change</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-gray-400 text-sm font-medium">{changeReqDialog?.title}</p>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Category</label>
              <Select value={changeCategory} onValueChange={setChangeCategory}>
                <SelectTrigger className="bg-[#0A0A0A] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-gray-700">
                  {['liability','insurance','deliverables','usage_rights','conduct','other'].map(c => (
                    <SelectItem key={c} value={c} className="text-white">{c.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Details *</label>
              <Textarea value={changeDetails} onChange={e => setChangeDetails(e.target.value)} rows={3} className="bg-[#0A0A0A] border-gray-700 text-white resize-none" placeholder="Describe the specific change needed..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setChangeReqDialog(null)}>Cancel</Button>
              <Button onClick={saveChangeReq} disabled={!changeDetails.trim()} className="bg-orange-700 hover:bg-orange-600">Record Request</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}