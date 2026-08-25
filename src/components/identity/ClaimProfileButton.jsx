/**
 * ClaimProfileButton.jsx
 *
 * Phase 8 — Public-facing claim UI for the RacerProfile page.
 *
 * States:
 *   - Unclaimed + logged out      → "Sign in to claim" (redirects to login)
 *   - Unclaimed + logged in       → "Claim This Profile" (opens evidence dialog)
 *   - Pending (this user)         → "Claim Pending Review" (read-only)
 *   - Claimed (this user)         → "Verified Owner" badge
 *   - Claimed (other user)        → "Claimed" badge (read-only)
 *   - Rejected                    → "Claim Rejected" + resubmit option
 *
 * No redesign of the RacerProfile page is required — this is a self-contained
 * component placed in the action row.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ShieldCheck, Clock, XCircle, BadgeCheck, Lock } from 'lucide-react';
import { submitIdentityClaim, resolveOwnershipState } from '@/components/identity/identityOwnershipApi';

export default function ClaimProfileButton({ identity, racerProfileSlug }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evidence, setEvidence] = useState({ license_number: '', date_of_birth: '', contact_email: '', notes: '' });

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  if (!identity) return null;

  const state = resolveOwnershipState(identity, user?.id);

  // Claimed by this user — show verified owner badge
  if (state.isOwner) {
    return (
      <Badge className="bg-teal-500/15 text-teal-700 border border-teal-500/30 text-xs flex items-center gap-1.5 px-3 py-1.5">
        <BadgeCheck className="w-3.5 h-3.5" /> Verified Owner
      </Badge>
    );
  }

  // Claimed by someone else — read-only badge
  if (state.claimedByOther) {
    return (
      <Badge className="bg-gray-100 text-gray-500 border border-gray-200 text-xs flex items-center gap-1.5 px-3 py-1.5">
        <ShieldCheck className="w-3.5 h-3.5" /> Claimed
      </Badge>
    );
  }

  // Pending claim by this user
  if (state.hasPendingClaim) {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs flex items-center gap-1.5 px-3 py-1.5">
        <Clock className="w-3.5 h-3.5" /> Claim Pending Review
      </Badge>
    );
  }

  // Rejected — show + allow resubmit
  if (state.claimState === 'rejected' && user) {
    return (
      <>
        <Badge className="bg-red-50 text-red-600 border border-red-200 text-xs flex items-center gap-1.5 px-3 py-1.5">
          <XCircle className="w-3.5 h-3.5" /> Claim Rejected
        </Badge>
        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setDialogOpen(true)}>
          Resubmit Claim
        </Button>
        <ClaimDialog
          open={dialogOpen}
          setOpen={setDialogOpen}
          evidence={evidence}
          setEvidence={setEvidence}
          submitting={submitting}
          onSubmit={handleSubmit}
          racerProfileSlug={racerProfileSlug}
        />
      </>
    );
  }

  // Not logged in — prompt sign in
  if (!isAuthenticated) {
    return (
      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => base44.auth.redirectToLogin(window.location.pathname)}>
        <Lock className="w-3 h-3 mr-1" /> Sign in to Claim
      </Button>
    );
  }

  // Logged in + can claim
  return (
    <>
      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setDialogOpen(true)}>
        <ShieldCheck className="w-3 h-3 mr-1" /> Claim This Profile
      </Button>
      <ClaimDialog
        open={dialogOpen}
        setOpen={setDialogOpen}
        evidence={evidence}
        setEvidence={setEvidence}
        submitting={submitting}
        onSubmit={handleSubmit}
        racerProfileSlug={racerProfileSlug}
      />
    </>
  );

  async function handleSubmit() {
    setSubmitting(true);

    // Optimistic update: immediately mark the identity as having a pending
    // claim in the cached experience data so the badge switches without
    // waiting for the server round-trip.
    const queryKey = ['racerProfileExperience', racerProfileSlug];
    const previous = racerProfileSlug ? queryClient.getQueryData(queryKey) : null;
    const nowIso = new Date().toISOString();
    if (racerProfileSlug && previous) {
      queryClient.setQueryData(queryKey, (old) => {
        const data = old?.data || old;
        if (!data) return old;
        const patchIdentity = (id) => id ? { ...id, claim_status: 'pending', claim_submitted_at: nowIso } : id;
        return {
          ...old,
          data: {
            ...data,
            identity: patchIdentity(data.identity),
            page_data: data.page_data ? {
              ...data.page_data,
              identity: patchIdentity(data.page_data.identity),
            } : data.page_data,
          },
        };
      });
    }

    try {
      const payload = {
        racerProfileSlug,
        evidence: {
          license_number: evidence.license_number?.trim() || undefined,
          date_of_birth: evidence.date_of_birth || undefined,
          contact_email: evidence.contact_email?.trim() || undefined,
          notes: evidence.notes?.trim() || undefined,
        },
      };
      const result = await submitIdentityClaim(payload);
      toast({ title: 'Claim submitted', description: result.message || 'Your claim is pending review. Most claims are reviewed within 48 hours.' });
      setDialogOpen(false);
      setEvidence({ license_number: '', date_of_birth: '', contact_email: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['racerProfileExperience', racerProfileSlug] });
    } catch (err) {
      // Revert optimistic update on error
      if (previous) queryClient.setQueryData(queryKey, previous);
      toast({ title: 'Claim failed', description: err?.message || 'Could not submit claim.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }
}

function ClaimDialog({ open, setOpen, evidence, setEvidence, submitting, onSubmit, racerProfileSlug }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Claim This Racer Profile</DialogTitle>
          <DialogDescription>
            Submit evidence verifying your relationship to this racer profile. Our team reviews every claim manually — most are reviewed within 48 hours.
            False claims may result in loss of platform access.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>What we need:</strong> Any combination of the fields below that helps us verify you are the rightful owner.
              You don't need to fill in every field — just enough for us to confirm your identity.
            </p>
          </div>
          <div>
            <Label htmlFor="claim-license">Racing License Number</Label>
            <Input id="claim-license" value={evidence.license_number} onChange={(e) => setEvidence({ ...evidence, license_number: e.target.value })} placeholder="e.g. SCCA-12345" />
          </div>
          <div>
            <Label htmlFor="claim-dob">Date of Birth</Label>
            <Input id="claim-dob" type="date" value={evidence.date_of_birth} onChange={(e) => setEvidence({ ...evidence, date_of_birth: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="claim-email">Contact Email</Label>
            <Input id="claim-email" type="email" value={evidence.contact_email} onChange={(e) => setEvidence({ ...evidence, contact_email: e.target.value })} placeholder="you@example.com" />
          </div>
          <div>
            <Label htmlFor="claim-notes">Additional Evidence / Notes</Label>
            <Textarea id="claim-notes" value={evidence.notes} onChange={(e) => setEvidence({ ...evidence, notes: e.target.value })} placeholder="e.g. team affiliation, social media handles, links to results pages, or any other information that helps verify your identity" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Claim'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}