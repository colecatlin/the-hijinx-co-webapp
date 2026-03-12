import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

/**
 * Shows a "Claim this profile" button on entity public pages.
 * Only visible when:
 * - user is logged in
 * - user has no existing collaborator access
 * - entity has no current owner
 */
export default function ClaimEntityButton({ entityType, entityId, entityName }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    staleTime: 60_000,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
    staleTime: 60_000,
  });

  // Check if user already has access
  const { data: existingCollabs = [] } = useQuery({
    queryKey: ['claimCheck_collabs', entityType, entityId, user?.id],
    queryFn: () => base44.entities.EntityCollaborator.filter({
      entity_type: entityType,
      entity_id: entityId,
    }),
    enabled: !!isAuthenticated && !!entityId,
    staleTime: 30_000,
  });

  // Check for existing pending claim by this user
  const { data: existingClaims = [] } = useQuery({
    queryKey: ['claimCheck_claims', entityType, entityId, user?.id],
    queryFn: () => base44.entities.EntityClaimRequest.filter({
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
    }),
    enabled: !!user?.id && !!entityId,
    staleTime: 30_000,
  });

  if (!isAuthenticated) return null;

  // Hide if user already has any access
  const userHasAccess = existingCollabs.some(c => c.user_id === user?.id);
  if (userHasAccess) return null;

  // Hide if entity already has an owner
  const hasOwner = existingCollabs.some(c => c.role === 'owner');
  if (hasOwner) return null;

  const existingPending = existingClaims.find(c => c.status === 'pending');
  const existingApproved = existingClaims.find(c => c.status === 'approved');

  if (existingApproved) return null; // Already approved

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = await base44.functions.invoke('requestEntityClaim', {
      entity_type: entityType,
      entity_id: entityId,
      message,
    });
    const data = res?.data;
    if (!data?.ok) {
      setError(data?.error || 'Failed to submit claim. Please try again.');
      setSubmitting(false);
      return;
    }
    // Invalidate claim queries
    queryClient.invalidateQueries({ queryKey: ['claimCheck_claims', entityType, entityId, user?.id] });
    queryClient.invalidateQueries({ queryKey: ['allClaims', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['claimRequests', user?.id] });
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => {
      setOpen(false);
      navigate(createPageUrl('MyDashboard') + '?claim_submitted=1');
    }, 1500);
  };

  if (existingPending) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
        Claim pending review
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        Claim Profile
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gray-700" />
              Claim {entityType} Profile
            </DialogTitle>
            <DialogDescription>
              Submit a claim request to become the owner of <strong>{entityName}</strong>. An admin will review your request.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <p className="text-sm font-medium text-gray-800">Claim submitted successfully!</p>
              <p className="text-xs text-gray-500">Redirecting to your dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <Badge variant="outline" className="text-xs">{entityType}</Badge>
                  <span className="text-sm font-semibold text-gray-900">{entityName}</span>
                </div>
                <Label className="text-sm font-medium">
                  Why are you the rightful owner of this profile?
                  <span className="text-gray-400 font-normal ml-1">(optional but helpful)</span>
                </Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. I am this driver / I run this team / I operate this track..."
                  className="mt-2 text-sm"
                  rows={3}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-[#232323] hover:bg-black text-white gap-1.5">
                  {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</> : 'Submit Claim'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}