import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const REVIEW_COLORS = {
  pending: 'bg-yellow-900/60 text-yellow-300',
  accepted: 'bg-green-900/60 text-green-300',
  revisions_needed: 'bg-orange-900/60 text-orange-300',
  rejected: 'bg-red-900/60 text-red-300',
};

const REVIEW_ICONS = {
  pending: Clock,
  accepted: CheckCircle,
  revisions_needed: AlertCircle,
  rejected: XCircle,
};

// MediaDeliverablesPanel — exported unchanged, usage rights panel is separate
export default function MediaDeliverablesPanel({ request, currentUser, invalidateAfterOperation }) {
  const queryClient = useQueryClient();
  const [reviewDialog, setReviewDialog] = useState(null); // { submission, action }
  const [reviewNotes, setReviewNotes] = useState('');

  // Load required deliverables for this request
  const { data: requiredDeliverables = [] } = useQuery({
    queryKey: ['requiredDeliverables', request?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('getDeliverableRequirementsForRequest', { request_id: request.id });
      return res?.data?.requirements || [];
    },
    enabled: !!request?.id,
  });

  // Load agreements
  const { data: agreements = [] } = useQuery({
    queryKey: ['deliverableAgreements', request?.id],
    queryFn: () => base44.entities.DeliverableAgreement.filter({ request_id: request.id }),
    enabled: !!request?.id,
  });

  // Load submissions by this user
  const { data: submissions = [] } = useQuery({
    queryKey: ['deliverableSubmissions', request?.holder_media_user_id],
    queryFn: () => base44.entities.DeliverableSubmission.filter({ holder_media_user_id: request.holder_media_user_id }),
    enabled: !!request?.holder_media_user_id,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ submissionId, newStatus, notes }) => {
      const now = new Date().toISOString();
      await base44.entities.DeliverableSubmission.update(submissionId, {
        review_status: newStatus,
        reviewer_user_id: currentUser?.id,
        reviewer_notes: notes || undefined,
        updated_at: now,
      });
      // Trigger compliance recalc
      await base44.functions.invoke('updateMediaCompliance', { holder_media_user_id: request.holder_media_user_id });
      queryClient.invalidateQueries({ queryKey: ['deliverableSubmissions'] });
      invalidateAfterOperation?.('media_deliverable_reviewed');
    },
    onSuccess: () => {
      toast.success('Submission review updated');
      setReviewDialog(null);
      setReviewNotes('');
    },
  });

  if (requiredDeliverables.length === 0 && submissions.length === 0) {
    return (
      <div className="bg-[#262626] border border-gray-700 rounded p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Deliverables</p>
        <p className="text-gray-600 text-xs">No deliverable requirements for this request.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#262626] border border-gray-700 rounded p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Deliverables</p>

        {requiredDeliverables.map(req => {
          const agreement = agreements.find(a => a.requirement_id === req.id);
          const submission = submissions.find(s => s.requirement_id === req.id);
          const Icon = REVIEW_ICONS[submission?.review_status || 'pending'];

          return (
            <div key={req.id} className="border border-gray-700 rounded p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white text-xs font-medium">{req.title}</p>
                  <p className="text-gray-500 text-xs">{req.requirement_type} · {req.enforcement_level}</p>
                </div>
                <Badge className={agreement?.status === 'accepted' ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'}>
                  {agreement?.status === 'accepted' ? 'Ack.' : 'Not ack.'}
                </Badge>
              </div>

              {req.due_rule_type !== 'none' && (
                <p className="text-gray-500 text-xs">
                  Due: {req.due_rule_type === 'hours_after_event_end'
                    ? `${req.due_hours_after_event_end}h after event`
                    : req.due_datetime ? new Date(req.due_datetime).toLocaleDateString() : '—'}
                </p>
              )}

              {submission ? (
                <div className="flex items-center justify-between bg-[#1A1A1A] rounded p-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3 h-3" />
                    <span className="text-xs text-gray-300">{submission.asset_ids?.length || 0} asset(s) submitted</span>
                    <Badge className={REVIEW_COLORS[submission.review_status]}>{submission.review_status}</Badge>
                  </div>
                  {submission.review_status !== 'accepted' && (
                    <Button size="sm" variant="ghost" className="text-xs text-blue-400 hover:text-blue-300 h-6 px-2"
                      onClick={() => { setReviewDialog({ submission, req }); setReviewNotes(submission.reviewer_notes || ''); }}>
                      Review
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 text-xs italic">No submission yet</p>
              )}

              {submission?.reviewer_notes && (
                <p className="text-orange-300 text-xs bg-orange-900/10 border border-orange-900/40 rounded p-1">{submission.reviewer_notes}</p>
              )}
            </div>
          );
        })}

        {/* Show any extra submissions not in required list */}
        {submissions.filter(s => !requiredDeliverables.find(r => r.id === s.requirement_id)).map(sub => (
          <div key={sub.id} className="border border-gray-700 rounded p-3">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs">Extra submission ({sub.requirement_id?.slice(0, 8)})</p>
              <Badge className={REVIEW_COLORS[sub.review_status]}>{sub.review_status}</Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={o => !o && setReviewDialog(null)}>
        <DialogContent className="bg-[#262626] border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-sm">Review Submission — {reviewDialog?.req?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-gray-400 text-xs">{reviewDialog?.submission?.asset_ids?.length || 0} assets submitted on {reviewDialog?.submission?.submitted_at ? new Date(reviewDialog.submission.submitted_at).toLocaleDateString() : '—'}</p>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Reviewer Notes (optional)</label>
              <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={2}
                className="bg-[#1A1A1A] border-gray-700 text-white resize-none text-xs"
                placeholder="Feedback for media professional..." />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-green-800 hover:bg-green-700 text-white"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ submissionId: reviewDialog.submission.id, newStatus: 'accepted', notes: reviewNotes })}>
                <CheckCircle className="w-3 h-3 mr-1" /> Accept
              </Button>
              <Button size="sm" className="flex-1 bg-orange-800 hover:bg-orange-700 text-white"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ submissionId: reviewDialog.submission.id, newStatus: 'revisions_needed', notes: reviewNotes })}>
                <AlertCircle className="w-3 h-3 mr-1" /> Revisions
              </Button>
              <Button size="sm" className="flex-1 bg-red-900 hover:bg-red-800 text-white"
                disabled={reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ submissionId: reviewDialog.submission.id, newStatus: 'rejected', notes: reviewNotes })}>
                <XCircle className="w-3 h-3 mr-1" /> Reject
              </Button>
            </div>
            <Button variant="outline" className="w-full border-gray-700 text-gray-400" onClick={() => setReviewDialog(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}