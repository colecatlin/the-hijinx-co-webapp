import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, ExternalLink, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_COLORS, computeEventCredentialExpiry } from './mediaAccess';
import MediaThreadPanel from './MediaThreadPanel';
import MediaDeliverablesPanel from './MediaDeliverablesPanel';

export default function MediaRequestDrawer({ request, onClose, selectedEvent, selectedTrack, selectedSeries, currentUser, isAdmin, hasAuthority, issuerOptions, invalidateAfterOperation }) {
  const [denyDialog, setDenyDialog] = useState(false);
  const [denyNotes, setDenyNotes] = useState('');
  const [issueDialog, setIssueDialog] = useState(false);
  const [issueIssuerId, setIssueIssuerId] = useState(issuerOptions?.[0]?.id || '');
  const [issueAccessLevel, setIssueAccessLevel] = useState(request?.requested_access_level || 'general');
  const [issueRoles, setIssueRoles] = useState(request?.requested_roles?.join(', ') || '');
  const [issueNotes, setIssueNotes] = useState('');
  const [approveWithExceptions, setApproveWithExceptions] = useState(false);
  const queryClient = useQueryClient();

  const { data: mediaUser } = useQuery({
    queryKey: ['mediaUserById', request?.holder_media_user_id],
    queryFn: () => base44.entities.MediaUser.get(request.holder_media_user_id),
    enabled: !!request?.holder_media_user_id,
  });

  const { data: mediaOrg } = useQuery({
    queryKey: ['mediaOrgById', mediaUser?.organization_id],
    queryFn: () => base44.entities.MediaOrganization.get(mediaUser.organization_id),
    enabled: !!mediaUser?.organization_id,
  });

  const { data: policyAcceptances = [] } = useQuery({
    queryKey: ['policyAcceptances', request?.id],
    queryFn: () => base44.entities.PolicyAcceptance.filter({ request_id: request.id }),
    enabled: !!request?.id,
  });

  const { data: waiverSigs = [] } = useQuery({
    queryKey: ['waiverSigsForRequest', request?.id],
    queryFn: () => base44.entities.WaiverSignature.filter({ request_id: request.id }),
    enabled: !!request?.id,
  });

  const { data: waiverTemplates = [] } = useQuery({
    queryKey: ['waiverTemplatesAll'],
    queryFn: () => base44.entities.WaiverTemplate.list(),
  });

  // Load required waivers for this request
  const { data: requiredWaiversData } = useQuery({
    queryKey: ['requiredWaivers', request?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getRequiredWaiversForRequest', { request_id: request.id });
      return res?.data?.templates || [];
    },
    enabled: !!request?.id,
  });
  const requiredWaivers = requiredWaiversData || [];
  const signedTemplateIds = new Set(waiverSigs.filter(s => s.status === 'valid').map(s => s.template_id));
  const missingWaivers = requiredWaivers.filter(t => !signedTemplateIds.has(t.id));

  const { data: deliverableAgreements = [] } = useQuery({
    queryKey: ['deliverableAgreementsForRequest', request?.id],
    queryFn: () => base44.entities.DeliverableAgreement.filter({ request_id: request.id }),
    enabled: !!request?.id,
  });

  const getTemplateName = (id) => waiverTemplates.find(t => t.id === id)?.title || id?.slice(0,8) || '—';

  const hasChangeRequested = policyAcceptances.some(p => p.status === 'change_requested');
  const acceptedCount = policyAcceptances.filter(p => p.status === 'accepted').length;

  const markUnderReviewMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CredentialRequest.update(request.id, { status: 'under_review', updated_at: new Date().toISOString() });
      invalidateAfterOperation?.('media_request_updated');
      toast.success('Marked as under review');
      onClose();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.CredentialRequest.update(request.id, { status: 'cancelled', updated_at: new Date().toISOString() });
      invalidateAfterOperation?.('media_request_updated');
      toast.success('Request cancelled');
      onClose();
    },
  });

  const denyMutation = useMutation({
    mutationFn: async () => {
      if (!denyNotes.trim()) { toast.error('Review notes required to deny'); return; }
      const now = new Date().toISOString();
      await base44.entities.CredentialRequest.update(request.id, {
        status: 'denied',
        review_notes: denyNotes,
        reviewed_at: now,
        reviewed_by_user_id: currentUser?.id,
        updated_at: now,
      });
      await base44.entities.OperationLog.create({
        operation_type: 'media_request_denied',
        source_type: 'media',
        entity_name: 'CredentialRequest',
        status: 'success',
        metadata: { request_id: request.id, event_id: selectedEvent?.id },
        notes: denyNotes,
      }).catch(() => {});
      invalidateAfterOperation?.('media_request_updated');
      toast.success('Request denied');
      setDenyDialog(false);
      onClose();
    },
  });

  const issueMutation = useMutation({
    mutationFn: async () => {
      if (hasChangeRequested && !approveWithExceptions) {
        toast.error('Resolve change requests first or enable "Approve with exceptions"');
        return;
      }
      const now = new Date().toISOString();
      const expiresAt = computeEventCredentialExpiry(selectedEvent);
      const chosenIssuer = issuerOptions.find(o => o.id === issueIssuerId) || issuerOptions[0];
      const roles = issueRoles.split(',').map(r => r.trim()).filter(Boolean);

      await base44.entities.CredentialRequest.update(request.id, {
        status: 'approved',
        reviewed_at: now,
        reviewed_by_user_id: currentUser?.id,
        updated_at: now,
      });

      const cred = await base44.entities.MediaCredential.create({
        issuer_entity_id: chosenIssuer?.id,
        issuer_entity_type: chosenIssuer?.type,
        holder_media_user_id: request.holder_media_user_id,
        scope_entity_id: selectedEvent?.id,
        scope_entity_type: 'event',
        roles,
        access_level: issueAccessLevel,
        status: 'active',
        issued_at: now,
        ...(expiresAt && { expires_at: expiresAt }),
        ...(issueNotes && { notes: approveWithExceptions ? `OVERRIDE: ${issueNotes}` : issueNotes }),
        created_at: now,
        updated_at: now,
      });

      await base44.entities.OperationLog.create({
        operation_type: 'media_credential_issued',
        source_type: 'media',
        entity_name: 'MediaCredential',
        status: 'success',
        metadata: { request_id: request.id, credential_id: cred.id, event_id: selectedEvent?.id },
      }).catch(() => {});

      invalidateAfterOperation?.('media_credential_issued');
      toast.success('Credential issued');
      setIssueDialog(false);
      onClose();
    },
  });

  if (!request) return null;

  return (
    <>
      <Sheet open={!!request} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="bg-[#1A1A1A] border-gray-800 w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-white flex items-center gap-2">
              Credential Request
              <Badge className={STATUS_COLORS[request.status] || 'bg-gray-700 text-gray-300'}>{request.status}</Badge>
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="details">
            <TabsList className="bg-[#262626] border border-gray-700 mb-4">
              <TabsTrigger value="details" className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700 text-xs">Details</TabsTrigger>
              <TabsTrigger value="compliance" className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700 text-xs">Compliance</TabsTrigger>
              <TabsTrigger value="deliverables" className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700 text-xs">Deliverables</TabsTrigger>
              <TabsTrigger value="threads" className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700 text-xs">Threads</TabsTrigger>
            </TabsList>

            {/* DETAILS TAB */}
            <TabsContent value="details" className="space-y-4">
              {/* Applicant */}
              <div className="bg-[#262626] border border-gray-700 rounded p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Applicant</p>
                  {request.holder_media_user_id && (
                    <a href={`${window.location.origin}${createPageUrl('MediaProfile')}?mediaUserId=${request.holder_media_user_id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                      View Profile <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Name: </span><span className="text-white">{mediaUser?.legal_name || mediaUser?.full_name || '—'}</span></div>
                  <div><span className="text-gray-500">Email: </span><span className="text-white">{mediaUser?.email || '—'}</span></div>
                  <div><span className="text-gray-500">Phone: </span><span className="text-white">{mediaUser?.phone || '—'}</span></div>
                  {mediaOrg && <div className="col-span-2"><span className="text-gray-500">Org: </span><span className="text-white">{mediaOrg.name}</span></div>}
                  {mediaUser?.portfolio_url && <div className="col-span-2"><a href={mediaUser.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">Portfolio ↗</a></div>}
                  {mediaUser?.instagram_url && <div className="col-span-2"><a href={mediaUser.instagram_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">Instagram ↗</a></div>}
                </div>
              </div>

              {/* Request details */}
              <div className="bg-[#262626] border border-gray-700 rounded p-4 space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Request</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Access: </span><span className="text-white">{request.requested_access_level}</span></div>
                  <div><span className="text-gray-500">Roles: </span><span className="text-white">{request.requested_roles?.join(', ') || '—'}</span></div>
                  <div><span className="text-gray-500">Target: </span><span className="text-white">{request.target_entity_type}</span></div>
                  <div><span className="text-gray-500">Created: </span><span className="text-white">{request.created_at ? new Date(request.created_at).toLocaleDateString() : '—'}</span></div>
                </div>
                {request.assignment_description && (
                  <div className="mt-2">
                    <p className="text-gray-500 text-xs mb-1">Assignment Description</p>
                    <p className="text-gray-300 text-xs bg-[#1A1A1A] rounded p-2 border border-gray-800">{request.assignment_description}</p>
                  </div>
                )}
                {request.review_notes && (
                  <div className="mt-2">
                    <p className="text-gray-500 text-xs mb-1">Review Notes</p>
                    <p className="text-gray-300 text-xs bg-[#1A1A1A] rounded p-2 border border-gray-800">{request.review_notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {hasAuthority ? (
                <div className="space-y-2">
                  {['applied', 'change_requested'].includes(request.status) && (
                    <Button className="w-full bg-yellow-800 hover:bg-yellow-700 text-white" size="sm"
                      onClick={() => markUnderReviewMutation.mutate()} disabled={markUnderReviewMutation.isPending}>
                      Mark Under Review
                    </Button>
                  )}
                  {['applied', 'under_review', 'change_requested'].includes(request.status) && (
                    <>
                      {missingWaivers.length > 0 && (
                        <div className="bg-red-900/20 border border-red-800 rounded p-2 flex items-center gap-2 text-xs text-red-300">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          Cannot approve: {missingWaivers.length} required waiver(s) unsigned
                        </div>
                      )}
                      <Button className="w-full bg-green-700 hover:bg-green-600 text-white disabled:opacity-40" size="sm"
                        disabled={missingWaivers.length > 0}
                        onClick={() => { setIssueIssuerId(issuerOptions?.[0]?.id || ''); setIssueAccessLevel(request.requested_access_level || 'general'); setIssueRoles(request.requested_roles?.join(', ') || ''); setIssueDialog(true); }}>
                        Approve & Issue Credential
                      </Button>
                    </>
                  )}
                  {!['denied', 'cancelled', 'approved'].includes(request.status) && (
                    <Button className="w-full bg-red-900 hover:bg-red-800 text-white" size="sm"
                      onClick={() => setDenyDialog(true)}>
                      Deny
                    </Button>
                  )}
                  {isAdmin && !['cancelled'].includes(request.status) && (
                    <Button variant="outline" className="w-full border-gray-700 text-gray-400" size="sm"
                      onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                      Cancel Request
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-gray-800 rounded p-3">
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                  <p className="text-gray-500 text-xs">No credential authority for this event scope</p>
                </div>
              )}
            </TabsContent>

            {/* COMPLIANCE TAB */}
            <TabsContent value="compliance" className="space-y-4">
              {/* Policies */}
              <div className="bg-[#262626] border border-gray-700 rounded p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Policy Acceptances</p>
                {policyAcceptances.length === 0 ? (
                  <p className="text-gray-600 text-xs">No policy acceptances recorded.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">{acceptedCount} accepted, {policyAcceptances.length - acceptedCount} change requested</p>
                    {policyAcceptances.map(pa => (
                      <div key={pa.id} className="flex items-start gap-2 text-xs">
                        <Badge className={pa.status === 'accepted' ? 'bg-green-900/60 text-green-300' : 'bg-orange-900/60 text-orange-300'} >
                          {pa.status === 'accepted' ? '✓' : '!'}
                        </Badge>
                        <div>
                          {pa.status === 'change_requested' && (
                            <><p className="text-orange-300">Category: {pa.change_category}</p><p className="text-gray-400">{pa.change_details}</p></>
                          )}
                          {pa.status === 'accepted' && <p className="text-gray-400">Accepted</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Waivers */}
              <div className="bg-[#262626] border border-gray-700 rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Waiver Signatures</p>
                  {requiredWaivers.length > 0 && (
                    <Badge className={missingWaivers.length === 0 ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'}>
                      {missingWaivers.length === 0 ? `${requiredWaivers.length}/${requiredWaivers.length} complete` : `Missing ${missingWaivers.length}`}
                    </Badge>
                  )}
                </div>
                {requiredWaivers.length === 0 ? (
                  <p className="text-gray-600 text-xs">No waivers required for this request.</p>
                ) : (
                  <div className="space-y-2">
                    {requiredWaivers.map(tmpl => {
                      const sig = waiverSigs.find(s => s.template_id === tmpl.id && s.status === 'valid');
                      return (
                        <div key={tmpl.id} className="flex items-start gap-2 text-xs">
                          <Badge className={sig ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'}>
                            {sig ? '✓' : 'Missing'}
                          </Badge>
                          <div>
                            <p className="text-gray-300 font-medium">{tmpl.title} <span className="text-gray-600">({tmpl._label})</span></p>
                            {sig ? (
                              <p className="text-gray-500">Signed by {sig.signed_name} on {new Date(sig.signed_at).toLocaleDateString()}</p>
                            ) : (
                              <p className="text-red-400">Not signed</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Deliverables */}
              <div className="bg-[#262626] border border-gray-700 rounded p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Deliverable Agreements</p>
                {deliverableAgreements.length === 0 ? (
                  <p className="text-gray-600 text-xs">No deliverable agreements.</p>
                ) : (
                  <div className="space-y-1">
                    {deliverableAgreements.map(da => (
                      <div key={da.id} className="flex items-center gap-2 text-xs">
                        <Badge className={da.status === 'accepted' ? 'bg-green-900/60 text-green-300' : 'bg-orange-900/60 text-orange-300'}>{da.status}</Badge>
                        <span className="text-gray-400">{da.requirement_id?.slice(0,8)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* THREADS TAB */}
            <TabsContent value="threads">
              <MediaThreadPanel request={request} currentUser={currentUser} invalidateAfterOperation={invalidateAfterOperation} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Deny Dialog */}
      <Dialog open={denyDialog} onOpenChange={setDenyDialog}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-md">
          <DialogHeader><DialogTitle className="text-white">Deny Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Provide a reason for denial. This will be visible to the applicant.</p>
            <Textarea value={denyNotes} onChange={e => setDenyNotes(e.target.value)} rows={3}
              className="bg-[#1A1A1A] border-gray-700 text-white resize-none" placeholder="Denial reason (required)..." />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setDenyDialog(false)}>Cancel</Button>
              <Button onClick={() => denyMutation.mutate()} disabled={denyMutation.isPending || !denyNotes.trim()} className="bg-red-800 hover:bg-red-700">
                {denyMutation.isPending ? 'Denying...' : 'Confirm Deny'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Issue Dialog */}
      <Dialog open={issueDialog} onOpenChange={setIssueDialog}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-md">
          <DialogHeader><DialogTitle className="text-white">Issue Credential</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {hasChangeRequested && (
              <div className="bg-orange-900/20 border border-orange-800 rounded p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-300 text-xs font-medium">Unresolved policy change requests</p>
                  <p className="text-orange-400 text-xs">Some policy changes have not been resolved.</p>
                </div>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Issuer Entity</label>
              <Select value={issueIssuerId} onValueChange={setIssueIssuerId}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gray-700">
                  {issuerOptions.map(o => <SelectItem key={o.id} value={o.id} className="text-white">{o.name} ({o.type})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Access Level</label>
              <Select value={issueAccessLevel} onValueChange={setIssueAccessLevel}>
                <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-gray-700">
                  {['general','pit','hot_pit','restricted','drone','all_access'].map(l => <SelectItem key={l} value={l} className="text-white">{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Roles (comma separated)</label>
              <Input value={issueRoles} onChange={e => setIssueRoles(e.target.value)} className="bg-[#1A1A1A] border-gray-700 text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
              <Textarea value={issueNotes} onChange={e => setIssueNotes(e.target.value)} rows={2} className="bg-[#1A1A1A] border-gray-700 text-white resize-none" />
            </div>
            {selectedEvent && (
              <p className="text-xs text-gray-500">Expires: {computeEventCredentialExpiry(selectedEvent) ? new Date(computeEventCredentialExpiry(selectedEvent)).toLocaleDateString() : 'N/A'}</p>
            )}
            {hasChangeRequested && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="approveExceptions" checked={approveWithExceptions} onChange={e => setApproveWithExceptions(e.target.checked)} />
                <label htmlFor="approveExceptions" className="text-xs text-orange-300">Approve with exceptions (admin override)</label>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="border-gray-700 text-gray-300" onClick={() => setIssueDialog(false)}>Cancel</Button>
              <Button onClick={() => issueMutation.mutate()}
                disabled={issueMutation.isPending || (hasChangeRequested && !approveWithExceptions) || issuerOptions.length === 0}
                className="bg-green-700 hover:bg-green-600">
                {issueMutation.isPending ? 'Issuing...' : 'Issue Credential'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}