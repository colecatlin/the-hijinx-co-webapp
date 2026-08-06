/**
 * IdentityOwnershipPanel.jsx
 *
 * Phase 8 — Admin management panel for User ↔ PersonIdentity ownership.
 *
 * Shows:
 *   - Claim status (unclaimed / pending / claimed / rejected)
 *   - Owner (user ID)
 *   - Pending claims awaiting review
 *   - Claim history (append-only audit trail)
 *   - PersonIdentity ↔ RacerProfile linkage
 *   - Approve / Reject / Revoke actions
 *
 * Intended for use inside RaceCore admin / management pages.
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ShieldCheck, Clock, XCircle, UserCheck, UserX, RotateCcw, History } from 'lucide-react';
import { reviewIdentityClaim, revokeIdentityOwnership } from '@/components/identity/identityOwnershipApi';

const STATUS_STYLES = {
  unclaimed: { label: 'Unclaimed', icon: UserX, className: 'bg-gray-100 text-gray-600 border-gray-200' },
  pending: { label: 'Pending Review', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  claimed: { label: 'Claimed', icon: ShieldCheck, className: 'bg-teal-50 text-teal-700 border-teal-200' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-50 text-red-600 border-red-200' },
};

export default function IdentityOwnershipPanel({ identity, racerProfile }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState('approve');
  const [reviewReason, setReviewReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!identity) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-400">
        No PersonIdentity linked to this racer profile.
      </div>
    );
  }

  const status = identity.claim_status || 'unclaimed';
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.unclaimed;
  const StatusIcon = statusStyle.icon;

  const handleReview = async () => {
    setBusy(true);
    try {
      const result = await reviewIdentityClaim({
        identityId: identity.id,
        action: reviewAction,
        reason: reviewReason?.trim() || undefined,
      });
      toast({ title: `Claim ${reviewAction === 'approve' ? 'approved' : 'rejected'}`, description: result.message });
      setReviewOpen(false);
      setReviewReason('');
      queryClient.invalidateQueries();
    } catch (err) {
      toast({ title: 'Review failed', description: err?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    setBusy(true);
    try {
      const result = await revokeIdentityOwnership({
        identityId: identity.id,
        reason: revokeReason?.trim() || undefined,
      });
      toast({ title: 'Ownership revoked', description: result.message });
      setRevokeOpen(false);
      setRevokeReason('');
      queryClient.invalidateQueries();
    } catch (err) {
      toast({ title: 'Revoke failed', description: err?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-teal-600" /> Identity Ownership
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">User → PersonIdentity → RacerProfile</p>
        </div>
        <Badge className={`text-xs flex items-center gap-1.5 ${statusStyle.className}`}>
          <StatusIcon className="w-3 h-3" /> {statusStyle.label}
        </Badge>
      </div>

      {/* Owner info */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-gray-400 uppercase tracking-wide mb-0.5">Owner User ID</div>
          <div className="font-mono text-gray-700 break-all">{identity.owner_user_id || '— (unclaimed)'}</div>
        </div>
        <div>
          <div className="text-gray-400 uppercase tracking-wide mb-0.5">Claimed At</div>
          <div className="text-gray-700">{identity.claimed_at ? new Date(identity.claimed_at).toLocaleString() : '—'}</div>
        </div>
        <div>
          <div className="text-gray-400 uppercase tracking-wide mb-0.5">Claimant (pending)</div>
          <div className="font-mono text-gray-700 break-all">{identity.claimed_by_user_id || '—'}</div>
        </div>
        <div>
          <div className="text-gray-400 uppercase tracking-wide mb-0.5">Submitted At</div>
          <div className="text-gray-700">{identity.claim_submitted_at ? new Date(identity.claim_submitted_at).toLocaleString() : '—'}</div>
        </div>
      </div>

      {/* Linkage */}
      <div className="text-xs border-t border-gray-100 pt-3 space-y-1">
        <div><span className="text-gray-400">PersonIdentity ID:</span> <span className="font-mono text-gray-600">{identity.id}</span></div>
        <div><span className="text-gray-400">RaceCore ID:</span> <span className="font-mono text-teal-600">{identity.racecore_id || '—'}</span></div>
        {racerProfile && (
          <div><span className="text-gray-400">RacerProfile:</span> <span className="text-gray-600">{racerProfile.display_name} ({racerProfile.slug})</span></div>
        )}
      </div>

      {/* Evidence (if pending) */}
      {status === 'pending' && identity.claim_evidence && (
        <div className="bg-amber-50/50 border border-amber-100 rounded p-3 text-xs space-y-1">
          <div className="font-semibold text-amber-800 mb-1">Submitted Evidence</div>
          {identity.claim_evidence.license_number && <div><span className="text-amber-700">License:</span> {identity.claim_evidence.license_number}</div>}
          {identity.claim_evidence.date_of_birth && <div><span className="text-amber-700">DOB:</span> {identity.claim_evidence.date_of_birth}</div>}
          {identity.claim_evidence.contact_email && <div><span className="text-amber-700">Email:</span> {identity.claim_evidence.contact_email}</div>}
          {identity.claim_evidence.notes && <div><span className="text-amber-700">Notes:</span> {identity.claim_evidence.notes}</div>}
        </div>
      )}

      {/* Rejection reason */}
      {status === 'rejected' && identity.claim_rejection_reason && (
        <div className="bg-red-50/50 border border-red-100 rounded p-3 text-xs">
          <div className="font-semibold text-red-800 mb-1">Rejection Reason</div>
          <div className="text-red-700">{identity.claim_rejection_reason}</div>
        </div>
      )}

      {/* Admin actions */}
      {status === 'pending' && (
        <div className="flex gap-2">
          <Button size="sm" className="h-8 text-xs bg-teal-600 hover:bg-teal-700" onClick={() => { setReviewAction('approve'); setReviewOpen(true); }}>
            <ShieldCheck className="w-3 h-3 mr-1" /> Approve Claim
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setReviewAction('reject'); setReviewOpen(true); }}>
            <XCircle className="w-3 h-3 mr-1" /> Reject
          </Button>
        </div>
      )}
      {status === 'claimed' && (
        <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => setRevokeOpen(true)}>
          <RotateCcw className="w-3 h-3 mr-1" /> Revoke Ownership
        </Button>
      )}

      {/* Claim history */}
      {Array.isArray(identity.claim_history) && identity.claim_history.length > 0 && (
        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-2">
            <History className="w-3 h-3" /> Claim History
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {identity.claim_history.slice().reverse().map((entry, i) => (
              <div key={i} className="text-xs border-l-2 border-gray-200 pl-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700 capitalize">{entry.action}</span>
                  <span className="text-gray-400">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}</span>
                </div>
                {entry.evidence_summary && <div className="text-gray-500 mt-0.5">{entry.evidence_summary}</div>}
                {entry.reason && <div className="text-gray-500 italic mt-0.5">"{entry.reason}"</div>}
                {entry.reviewed_by && <div className="text-gray-400 mt-0.5">Reviewed by: {entry.reviewed_by}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{reviewAction === 'approve' ? 'Approve Claim' : 'Reject Claim'}</DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve'
                ? 'This will transfer ownership to the claiming user. The user will be able to edit the RacerProfile.'
                : 'This will reject the claim. The user may resubmit with new evidence.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="review-reason">Reason / Notes (optional)</Label>
            <Textarea id="review-reason" value={reviewReason} onChange={(e) => setReviewReason(e.target.value)} rows={3} placeholder="Admin notes for this decision" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={busy}>Cancel</Button>
            <Button
              onClick={handleReview}
              disabled={busy}
              className={reviewAction === 'approve' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {busy ? 'Processing…' : reviewAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke dialog */}
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke Ownership</DialogTitle>
            <DialogDescription>
              This will remove the current owner and set the identity back to unclaimed. No records will be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="revoke-reason">Reason (required)</Label>
            <Textarea id="revoke-reason" value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} rows={3} placeholder="Why is ownership being revoked?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleRevoke} disabled={busy} className="bg-red-600 hover:bg-red-700">
              {busy ? 'Processing…' : 'Revoke Ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}