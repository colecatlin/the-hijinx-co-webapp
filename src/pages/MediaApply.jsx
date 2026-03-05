import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Send, MessageSquare, Plus } from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import BurnoutSpinner from '@/components/shared/BurnoutSpinner';

const STEPS = ['Target', 'Event', 'Details', 'Policies', 'Waiver', 'Deliverables', 'Submit'];

export default function MediaApply() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(null);

  // Target
  const [targetType, setTargetType] = useState('event');
  const [targetId, setTargetId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');

  // Details
  const [roles, setRoles] = useState([]);
  const [accessLevel, setAccessLevel] = useState('general');
  const [assignmentDesc, setAssignmentDesc] = useState('');

  // Policies
  const [policyAcceptances, setPolicyAcceptances] = useState({}); // policyId -> 'accepted'|'change_requested'
  const [changeReqDialog, setChangeReqDialog] = useState(null);
  const [changeCategory, setChangeCategory] = useState('other');
  const [changeDetails, setChangeDetails] = useState('');

  // Thread messaging
  const [threadMessages, setThreadMessages] = useState({}); // policyId -> messages[]
  const [newMsg, setNewMsg] = useState({});
  const [threads, setThreads] = useState({}); // policyId -> thread
  const [threadDialog, setThreadDialog] = useState(null);

  // Waiver — per-template signing
  const [waiverSignatures, setWaiverSignatures] = useState({}); // templateId -> signature record
  const [waiverSignDialog, setWaiverSignDialog] = useState(null); // template being signed
  const [waiverForm, setWaiverForm] = useState({ signed_name: '', signed_email: '', signed_phone: '', date_of_birth: '', emergency_contact_name: '', emergency_contact_phone: '' });
  const [waiverSigning, setWaiverSigning] = useState(false);

  // Deliverables
  const [deliverableAcks, setDeliverableAcks] = useState({}); // reqId -> 'accepted'|'declined'

  const { data: isAuthenticated, isLoading: authLoading } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
  });

  const { data: mediaUser } = useQuery({
    queryKey: ['myMediaUser'],
    queryFn: async () => {
      const r = await base44.entities.MediaUser.filter({ user_id: currentUser.id });
      return r[0] || null;
    },
    enabled: !!currentUser?.id,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list(),
    enabled: !!isAuthenticated,
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ['series'],
    queryFn: () => base44.entities.Series.list(),
    enabled: !!isAuthenticated,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    enabled: !!isAuthenticated,
  });

  // Resolve selected target entity
  const selectedTrack = targetType === 'track' ? tracks.find(t => t.id === targetId) : null;
  const selectedSeries = targetType === 'series' ? seriesList.find(s => s.id === targetId) : null;
  const selectedEvent = targetType === 'event' ? events.find(e => e.id === targetId) : events.find(e => e.id === selectedEventId);

  // Filtered events for target
  const filteredEvents = events.filter(e => {
    if (targetType === 'track') return e.track_id === targetId;
    if (targetType === 'series') return e.series_id === targetId;
    return false;
  }).sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  // Load policies
  const { data: policies = [] } = useQuery({
    queryKey: ['applicantPolicies', targetId, selectedEventId, selectedEvent?.track_id, selectedEvent?.series_id],
    queryFn: async () => {
      const all = await base44.entities.Policy.list();
      const active = all.filter(p => p.active);
      const relevant = new Map();
      active.forEach(p => {
        if (targetId && p.entity_id === targetId) relevant.set(p.id, p);
        if (selectedEvent?.track_id && p.entity_id === selectedEvent.track_id) relevant.set(p.id, p);
        if (selectedEvent?.series_id && p.entity_id === selectedEvent.series_id) relevant.set(p.id, p);
        if (selectedEvent?.id && p.entity_id === selectedEvent.id) relevant.set(p.id, p);
      });
      return Array.from(relevant.values());
    },
    enabled: !!targetId,
  });

  // Load waiver templates
  const { data: waiverTemplates = [] } = useQuery({
    queryKey: ['applicantWaivers', targetId, selectedEventId],
    queryFn: async () => {
      const all = await base44.entities.WaiverTemplate.list();
      return all.filter(t => t.active && (
        t.entity_id === targetId ||
        (selectedEvent?.track_id && t.entity_id === selectedEvent.track_id) ||
        (selectedEvent?.id && t.entity_id === selectedEvent.id)
      ));
    },
    enabled: !!targetId,
  });

  // Load deliverable requirements
  const { data: deliverables = [] } = useQuery({
    queryKey: ['applicantDeliverables', targetId, selectedEventId],
    queryFn: async () => {
      const all = await base44.entities.DeliverableRequirement.list();
      return all.filter(r => r.active && (
        r.entity_id === targetId ||
        (selectedEvent?.id && r.event_id === selectedEvent.id)
      ));
    },
    enabled: !!targetId,
  });

  useEffect(() => {
    if (authLoading === false && !isAuthenticated) {
      base44.auth.redirectToLogin(window.location.href);
    }
  }, [isAuthenticated, authLoading]);

  // Pre-fill waiver email
  useEffect(() => {
    if (mediaUser && !waiverForm.signed_email) {
      setWaiverForm(f => ({ ...f, signed_name: mediaUser.full_name || '', signed_email: mediaUser.email || '' }));
    }
  }, [mediaUser]);

  const toggleRole = (role) => {
    setRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role]);
  };

  const saveChangeRequest = async () => {
    if (!changeReqDialog) return;
    const policyId = changeReqDialog.id;
    const now = new Date().toISOString();
    // Optimistic UI update only — actual PolicyAcceptance+Thread created on submit
    setPolicyAcceptances(prev => ({ ...prev, [policyId]: { status: 'change_requested', category: changeCategory, details: changeDetails } }));
    setChangeReqDialog(null);
    setChangeDetails('');
    setChangeCategory('other');
    toast.success('Change request recorded — will be submitted with application');
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const allAccepted = policies.every(p => policyAcceptances[p.id]?.status === 'accepted');
      const status = allAccepted ? 'applied' : 'change_requested';

      const actualTargetId = targetType === 'event' ? targetId : targetId;
      const relatedEventId = targetType === 'event' ? targetId : (selectedEventId || null);

      const credReq = await base44.entities.CredentialRequest.create({
        holder_media_user_id: mediaUser.id,
        target_entity_type: targetType,
        target_entity_id: actualTargetId,
        ...(relatedEventId && { related_event_id: relatedEventId }),
        requested_roles: roles,
        requested_access_level: accessLevel,
        assignment_description: assignmentDesc,
        status,
        created_at: now,
        updated_at: now,
      });

      // Create PolicyAcceptances
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

      // Create WaiverSignature
      if (waiverTemplates.length > 0 && waiverSigned) {
        for (const tmpl of waiverTemplates) {
          await base44.entities.WaiverSignature.create({
            template_id: tmpl.id,
            holder_media_user_id: mediaUser.id,
            request_id: credReq.id,
            ...(selectedEvent?.id && { event_id: selectedEvent.id }),
            signed_name: waiverForm.signed_name,
            signed_email: waiverForm.signed_email,
            signed_phone: waiverForm.signed_phone,
            date_of_birth: waiverForm.date_of_birth || undefined,
            emergency_contact_name: waiverForm.emergency_contact_name || undefined,
            emergency_contact_phone: waiverForm.emergency_contact_phone || undefined,
            signed_at: now,
            status: 'valid',
            created_at: now,
          });
        }
      }

      // Create DeliverableAgreements
      for (const req of deliverables) {
        const ack = deliverableAcks[req.id];
        if (!ack) continue;
        await base44.entities.DeliverableAgreement.create({
          requirement_id: req.id,
          holder_media_user_id: mediaUser.id,
          request_id: credReq.id,
          status: ack,
          accepted_at: ack === 'accepted' ? now : undefined,
          created_at: now,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['mediaRequests'] });
      queryClient.invalidateQueries({ queryKey: ['policyAcceptances'] });
      queryClient.invalidateQueries({ queryKey: ['waiverSignatures'] });
      queryClient.invalidateQueries({ queryKey: ['deliverableAgreements'] });

      return credReq;
    },
    onSuccess: (credReq) => {
      setSubmitted(credReq);
    },
  });

  const canProceed = () => {
    if (step === 0) return !!targetId;
    if (step === 1) return targetType === 'event' || true; // event selection is optional for track/series
    if (step === 2) return roles.length > 0 && !!assignmentDesc;
    if (step === 3) return policies.every(p => !!policyAcceptances[p.id]);
    if (step === 4) return waiverTemplates.length === 0 || waiverTemplates.every(t => waiverSignatures[t.id]?.status === 'valid');
    if (step === 5) return deliverables.every(d => !!deliverableAcks[d.id]);
    return true;
  };

  if (authLoading) return (
    <PageShell><div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]"><BurnoutSpinner /></div></PageShell>
  );

  if (isAuthenticated && !mediaUser && !authLoading) return (
    <PageShell>
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Card className="bg-[#171717] border-gray-800 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Profile Required</h2>
            <p className="text-gray-400 mb-6 text-sm">You need a media profile before you can apply for credentials.</p>
            <Link to={createPageUrl('MediaProfile')}>
              <Button className="bg-blue-700 hover:bg-blue-600 w-full">Create Media Profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );

  if (submitted) return (
    <PageShell>
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <Card className="bg-[#171717] border-gray-800 max-w-lg w-full">
          <CardContent className="p-10 text-center">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-white text-2xl font-black mb-2">Application Submitted!</h2>
            <p className="text-gray-400 mb-4">Your credential request has been received.</p>
            <div className="bg-[#0A0A0A] border border-gray-800 rounded-lg p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <Badge className={submitted.status === 'applied' ? 'bg-blue-900/60 text-blue-300' : 'bg-orange-900/60 text-orange-300'}>{submitted.status}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Request ID</span>
                <span className="text-white font-mono text-xs">{submitted.id?.slice(0, 12)}...</span>
              </div>
              {submitted.status === 'change_requested' && (
                <p className="text-xs text-orange-300 mt-2">One or more policies have change requests. The review team will be in contact.</p>
              )}
              {submitted.status === 'applied' && (
                <p className="text-xs text-blue-300 mt-2">Your application is under review. You will be notified of any updates.</p>
              )}
            </div>
            <div className="flex gap-3">
              <Link to={createPageUrl('MediaPortal')} className="flex-1">
                <Button variant="outline" className="w-full border-gray-700 text-gray-300">Back to Portal</Button>
              </Link>
              <Link to={createPageUrl('MediaApply')} className="flex-1">
                <Button className="w-full bg-blue-700 hover:bg-blue-600" onClick={() => { setSubmitted(null); setStep(0); setTargetId(''); setRoles([]); setAssignmentDesc(''); setPolicyAcceptances({}); setWaiverSigned(false); setDeliverableAcks({}); }}>
                  New Application
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );

  return (
    <PageShell>
      <div className="min-h-screen bg-[#0A0A0A]">
        <div className="max-w-2xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-6">
            <Link to={createPageUrl('MediaPortal')} className="text-gray-500 text-xs hover:text-gray-300 mb-4 inline-block">← Back to Media Portal</Link>
            <h1 className="text-2xl font-black text-white">Apply for Media Credentials</h1>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
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
              <CardHeader><CardTitle className="text-white text-base">Select Target</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Entity Type</label>
                  <div className="flex gap-2 flex-wrap">
                    {['event', 'track', 'series'].map(t => (
                      <button key={t} onClick={() => { setTargetType(t); setTargetId(''); setSelectedEventId(''); }}
                        className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${targetType === t ? 'bg-blue-800 border-blue-600 text-blue-100' : 'bg-[#262626] border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    {targetType === 'track' ? 'Track' : targetType === 'series' ? 'Series' : 'Event'}
                  </label>
                  <Select value={targetId} onValueChange={setTargetId}>
                    <SelectTrigger className="bg-[#0A0A0A] border-gray-700 text-white">
                      <SelectValue placeholder={`Select ${targetType}...`} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-gray-700">
                      {(targetType === 'track' ? tracks : targetType === 'series' ? seriesList : events.filter(e => e.status === 'Published' || e.status === 'Live' || e.published_flag)).map(e => (
                        <SelectItem key={e.id} value={e.id} className="text-white">{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Event selection */}
          {step === 1 && (
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader><CardTitle className="text-white text-base">Associate Event (Optional)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {targetType === 'event' ? (
                  <p className="text-gray-400 text-sm">You are applying directly to an event. Continue to next step.</p>
                ) : filteredEvents.length === 0 ? (
                  <p className="text-gray-400 text-sm">No events found for this {targetType}. You can skip and apply to the {targetType} directly.</p>
                ) : (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Event (optional)</label>
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                      <SelectTrigger className="bg-[#0A0A0A] border-gray-700 text-white">
                        <SelectValue placeholder="Select event (optional)..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-gray-700">
                        <SelectItem value={null} className="text-gray-400">None (apply to {targetType})</SelectItem>
                        {filteredEvents.map(e => (
                          <SelectItem key={e.id} value={e.id} className="text-white">{e.name} {e.event_date ? `(${e.event_date})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader><CardTitle className="text-white text-base">Request Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Requested Roles *</label>
                  <div className="flex flex-wrap gap-2">
                    {['photographer','videographer','editor','social','writer','other'].map(r => (
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
                      {['general','pit','hot_pit','restricted','drone','all_access'].map(l => (
                        <SelectItem key={l} value={l} className="text-white">{l.replace('_',' ')}</SelectItem>
                      ))}
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

          {/* Step 3: Policies */}
          {step === 3 && (
            <div className="space-y-4">
              {policies.length === 0 ? (
                <Card className="bg-[#171717] border-gray-800">
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-400">No policies required for this target.</p>
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
                          className={`flex-1 ${acc?.status === 'accepted' ? 'bg-green-800 text-green-100' : 'bg-[#262626] border border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setChangeReqDialog(policy)}
                          className="border-orange-800 text-orange-400 hover:bg-orange-900/20">
                          Request Change
                        </Button>
                        {acc?.status === 'change_requested' && (
                          <Button size="sm" variant="ghost" className="text-gray-500 hover:text-gray-300" onClick={() => setThreadDialog(policy)}>
                            <MessageSquare className="w-3 h-3 mr-1" />Thread
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Step 4: Waivers */}
          {step === 4 && (
            <div className="space-y-4">
              {waiverTemplates.length === 0 ? (
                <Card className="bg-[#171717] border-gray-800">
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-400">No waivers required for this target.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {waiverTemplates.map(tmpl => (
                    <Card key={tmpl.id} className="bg-[#171717] border-gray-800">
                      <CardHeader><CardTitle className="text-white text-sm">{tmpl.title}</CardTitle></CardHeader>
                      <CardContent>
                        <div className="bg-[#0A0A0A] border border-gray-800 rounded p-3 mb-4 max-h-40 overflow-y-auto">
                          <p className="text-gray-400 text-xs whitespace-pre-wrap">{tmpl.body_rich_text}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Card className="bg-[#171717] border-gray-800">
                    <CardHeader><CardTitle className="text-white text-sm">Signature</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Full Legal Name *</label>
                          <Input value={waiverForm.signed_name} onChange={e => setWaiverForm(f => ({ ...f, signed_name: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Email *</label>
                          <Input type="email" value={waiverForm.signed_email} onChange={e => setWaiverForm(f => ({ ...f, signed_email: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Phone</label>
                          <Input value={waiverForm.signed_phone} onChange={e => setWaiverForm(f => ({ ...f, signed_phone: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Date of Birth (optional)</label>
                          <Input type="date" value={waiverForm.date_of_birth} onChange={e => setWaiverForm(f => ({ ...f, date_of_birth: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Emergency Contact Name</label>
                          <Input value={waiverForm.emergency_contact_name} onChange={e => setWaiverForm(f => ({ ...f, emergency_contact_name: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Emergency Contact Phone</label>
                          <Input value={waiverForm.emergency_contact_phone} onChange={e => setWaiverForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} className="bg-[#0A0A0A] border-gray-700 text-white" />
                        </div>
                      </div>
                      <div className="flex items-start gap-3 mt-4 p-3 bg-[#0A0A0A] border border-gray-800 rounded">
                        <input type="checkbox" id="waiverSign" checked={waiverSigned}
                          onChange={e => setWaiverSigned(e.target.checked && !!waiverForm.signed_name && !!waiverForm.signed_email)}
                          className="mt-0.5" />
                        <label htmlFor="waiverSign" className="text-xs text-gray-300">
                          By checking this box, I <strong>{waiverForm.signed_name || '___'}</strong>, agree to the terms of all waivers above and acknowledge this constitutes a valid electronic signature.
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Step 5: Deliverables */}
          {step === 5 && (
            <div className="space-y-4">
              {deliverables.length === 0 ? (
                <Card className="bg-[#171717] border-gray-800">
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-400">No deliverable requirements for this target.</p>
                  </CardContent>
                </Card>
              ) : deliverables.map(req => {
                const ack = deliverableAcks[req.id];
                return (
                  <Card key={req.id} className={`bg-[#171717] border-gray-800 ${ack === 'declined' ? 'border-orange-800' : ''}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-white text-sm font-medium">{req.title}</p>
                          <p className="text-gray-500 text-xs">{req.requirement_type} • {req.enforcement_level} enforcement</p>
                        </div>
                        {ack && <Badge className={ack === 'accepted' ? 'bg-green-900/60 text-green-300' : 'bg-orange-900/60 text-orange-300'}>{ack}</Badge>}
                      </div>
                      {req.usage_rights_text && <p className="text-gray-400 text-xs mb-3 bg-[#0A0A0A] border border-gray-800 rounded p-2">{req.usage_rights_text}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setDeliverableAcks(a => ({ ...a, [req.id]: 'accepted' }))}
                          className={`flex-1 ${ack === 'accepted' ? 'bg-green-800 text-green-100' : 'bg-[#262626] border border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                          <CheckCircle className="w-3 h-3 mr-1" /> I Agree
                        </Button>
                        <Button size="sm" onClick={() => setDeliverableAcks(a => ({ ...a, [req.id]: 'declined' }))}
                          className={`flex-1 ${ack === 'declined' ? 'bg-orange-900 text-orange-100' : 'bg-[#262626] border border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {deliverables.some(d => deliverableAcks[d.id] === 'declined') && (
                <div className="flex items-start gap-2 bg-orange-900/20 border border-orange-800 rounded p-3">
                  <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <p className="text-orange-300 text-xs">You have declined one or more deliverables. Your application will still be submitted but this may affect approval.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Submit review */}
          {step === 6 && (
            <Card className="bg-[#171717] border-gray-800">
              <CardHeader><CardTitle className="text-white text-base">Review & Submit</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Target</span>
                    <span className="text-white">{targetType}: {(targetType === 'track' ? tracks : targetType === 'series' ? seriesList : events).find(x => x.id === targetId)?.name}</span>
                  </div>
                  {selectedEvent && (
                    <div className="flex justify-between py-2 border-b border-gray-800">
                      <span className="text-gray-400">Event</span>
                      <span className="text-white">{selectedEvent.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Roles</span>
                    <span className="text-white">{roles.join(', ')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Access Level</span>
                    <span className="text-white">{accessLevel}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Policies</span>
                    <span className="text-white">
                      {policies.filter(p => policyAcceptances[p.id]?.status === 'accepted').length}/{policies.length} accepted
                      {policies.some(p => policyAcceptances[p.id]?.status === 'change_requested') && <span className="text-orange-400 ml-1">(changes requested)</span>}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Waivers</span>
                    <span className={waiverSigned || waiverTemplates.length === 0 ? 'text-green-400' : 'text-red-400'}>{waiverSigned || waiverTemplates.length === 0 ? 'Signed' : 'Not signed'}</span>
                  </div>
                </div>
                {policies.some(p => policyAcceptances[p.id]?.status === 'change_requested') && (
                  <div className="bg-orange-900/20 border border-orange-800 rounded p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-orange-300 text-xs">Your application will be submitted as <strong>change_requested</strong> because one or more policies need revisions. The review team will reach out.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
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
        </div>
      </div>

      {/* Change Request Dialog */}
      <Dialog open={!!changeReqDialog} onOpenChange={o => !o && setChangeReqDialog(null)}>
        <DialogContent className="bg-[#1A1A1A] border-gray-700 max-w-md">
          <DialogHeader><DialogTitle className="text-white">Request Policy Change</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">{changeReqDialog?.title}</p>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Category</label>
              <Select value={changeCategory} onValueChange={setChangeCategory}>
                <SelectTrigger className="bg-[#0A0A0A] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-gray-700">
                  {['liability','insurance','deliverables','usage_rights','conduct','other'].map(c => (
                    <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
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
              <Button onClick={saveChangeRequest} disabled={!changeDetails} className="bg-orange-700 hover:bg-orange-600">Submit Change Request</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thread Dialog */}
      <Dialog open={!!threadDialog} onOpenChange={o => !o && setThreadDialog(null)}>
        <DialogContent className="bg-[#1A1A1A] border-gray-700 max-w-lg">
          <DialogHeader><DialogTitle className="text-white">Policy Thread — {threadDialog?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-[#0A0A0A] border border-gray-800 rounded p-3 text-xs text-gray-400">
              Your change request for this policy has been recorded. After submission, the review team will respond in this thread.
            </div>
            <div className="space-y-2">
              {(threadMessages[threadDialog?.id] || []).map((m, i) => (
                <div key={i} className="bg-[#262626] border border-gray-700 rounded p-2 text-xs text-white">{m}</div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newMsg[threadDialog?.id] || ''}
                onChange={e => setNewMsg(m => ({ ...m, [threadDialog?.id]: e.target.value }))}
                className="bg-[#0A0A0A] border-gray-700 text-white flex-1"
                placeholder="Add a note..."
              />
              <Button size="sm" onClick={() => {
                const pid = threadDialog?.id;
                const msg = newMsg[pid];
                if (!msg) return;
                setThreadMessages(tm => ({ ...tm, [pid]: [...(tm[pid] || []), msg] }));
                setNewMsg(m => ({ ...m, [pid]: '' }));
              }} className="bg-blue-700 hover:bg-blue-600">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <Button onClick={() => setThreadDialog(null)} variant="outline" className="w-full border-gray-700 text-gray-300">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}