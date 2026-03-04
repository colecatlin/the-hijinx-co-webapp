import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function PolicyAcceptancePanel({
  mediaUserId,
  request,
  resolvedScopeEntityIds,
  onRequestStatusChange,
}) {
  const [changeDialog, setChangeDialog] = useState({ open: false, policyId: null });
  const [changeForm, setChangeForm] = useState({ category: '', details: '' });
  const queryClient = useQueryClient();

  // Load policies for all scope entities
  const { data: policies = [] } = useQuery({
    queryKey: ['policies_for_scope', resolvedScopeEntityIds],
    queryFn: async () => {
      if (!resolvedScopeEntityIds || resolvedScopeEntityIds.length === 0) return [];
      const allPolicies = await base44.entities.Policy.list();
      return allPolicies
        .filter(
          (p) =>
            resolvedScopeEntityIds.includes(p.entity_id) &&
            p.active === true &&
            ['general', 'liability', 'insurance', 'conduct', 'operational', 'media_rules'].includes(
              p.policy_type
            )
        )
        .sort((a, b) => {
          if (a.entity_id !== b.entity_id) return a.entity_id.localeCompare(b.entity_id);
          if (a.policy_type !== b.policy_type) return a.policy_type.localeCompare(b.policy_type);
          return (b.version || 0) - (a.version || 0);
        });
    },
    enabled: !!mediaUserId && !!request?.id && resolvedScopeEntityIds?.length > 0,
  });

  // Load acceptances for this request
  const { data: acceptances = [] } = useQuery({
    queryKey: ['policy_acceptances', request?.id, mediaUserId],
    queryFn: async () => {
      if (!request?.id || !mediaUserId) return [];
      return base44.entities.PolicyAcceptance.filter({
        request_id: request.id,
        holder_media_user_id: mediaUserId,
      });
    },
    enabled: !!request?.id && !!mediaUserId,
  });

  const acceptanceMutation = useMutation({
    mutationFn: async ({ policyId, status, category, details }) => {
      const existing = acceptances.find((a) => a.policy_id === policyId);
      const data = {
        policy_id: policyId,
        holder_media_user_id: mediaUserId,
        request_id: request.id,
        status,
        ...(status === 'change_requested' && { change_category: category, change_details: details }),
      };

      if (existing?.id) {
        return base44.entities.PolicyAcceptance.update(existing.id, data);
      } else {
        return base44.entities.PolicyAcceptance.create({
          ...data,
          ...(status === 'accepted' && { accepted_at: new Date().toISOString() }),
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['policy_acceptances'] });
      const updatedAcceptances = await base44.entities.PolicyAcceptance.filter({
        request_id: request.id,
        holder_media_user_id: mediaUserId,
      });
      computeAndUpdateStatus(updatedAcceptances);
      setChangeDialog({ open: false, policyId: null });
      setChangeForm({ category: '', details: '' });
      toast.success('Saved');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const continueWithoutPoliciesMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.CredentialRequest.update(request.id, {
        status: 'under_review',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential_request', request.id] });
      onRequestStatusChange?.('under_review');
      toast.success('Moved to review');
    },
  });

  const computeAndUpdateStatus = async (updatedAcceptances) => {
    if (policies.length === 0) return;

    const changeRequested = updatedAcceptances.some((a) => a.status === 'change_requested');
    const allAccepted =
      updatedAcceptances.length === policies.length &&
      updatedAcceptances.every((a) => a.status === 'accepted');

    let newStatus = 'applied';
    if (changeRequested) {
      newStatus = 'change_requested';
    } else if (allAccepted) {
      newStatus = 'under_review';
    }

    if (newStatus !== request.status) {
      await base44.entities.CredentialRequest.update(request.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['credential_request', request.id] });
      onRequestStatusChange?.(newStatus);
    }
  };

  // Group policies by entity_id
  const groupedPolicies = useMemo(() => {
    const groups = {};
    policies.forEach((p) => {
      if (!groups[p.entity_id]) groups[p.entity_id] = [];
      groups[p.entity_id].push(p);
    });
    return groups;
  }, [policies]);

  const acceptedCount = acceptances.filter((a) => a.status === 'accepted').length;
  const changeRequestedExists = acceptances.some((a) => a.status === 'change_requested');

  if (policies.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">No active policies found</p>
            <p className="text-xs text-blue-700 mt-1">
              No active policies found for this entity, you can still submit, but approval may require additional steps.
            </p>
          </div>
        </div>
        <Button
          onClick={() => continueWithoutPoliciesMutation.mutate()}
          disabled={continueWithoutPoliciesMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Continue to Review
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Completion Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded p-4">
        <p className="text-sm font-medium text-gray-900">
          Policies completed: {acceptedCount} of {policies.length}
        </p>
        {changeRequestedExists && (
          <p className="text-xs text-red-700 mt-2 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Change requested on one or more policies, this request will not move forward until resolved.
          </p>
        )}
      </div>

      {/* Policies by Entity */}
      {Object.entries(groupedPolicies).map(([entityId, entityPolicies]) => (
        <Card key={entityId} className="bg-white border-gray-200">
          <CardHeader className="border-b border-gray-100 pb-3">
            <p className="text-xs text-gray-600 uppercase tracking-wide">Entity: {entityId.slice(0, 8)}</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {entityPolicies.map((policy) => {
              const acceptance = acceptances.find((a) => a.policy_id === policy.id);
              const isAccepted = acceptance?.status === 'accepted';
              const isChangeRequested = acceptance?.status === 'change_requested';
              return (
                <PolicyCard
                  key={policy.id}
                  policy={policy}
                  isAccepted={isAccepted}
                  isChangeRequested={isChangeRequested}
                  changeDetails={acceptance?.change_details}
                  onAccept={() => {
                    acceptanceMutation.mutate({
                      policyId: policy.id,
                      status: 'accepted',
                    });
                  }}
                  onRequestChange={() => {
                    setChangeDialog({ open: true, policyId: policy.id });
                  }}
                  isPending={acceptanceMutation.isPending}
                />
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Change Request Dialog */}
      <Dialog open={changeDialog.open} onOpenChange={(open) => setChangeDialog({ ...changeDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Request Policy Change</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            if (!changeForm.category || !changeForm.details) {
              toast.error('Please fill in all fields');
              return;
            }
            acceptanceMutation.mutate({
              policyId: changeDialog.policyId,
              status: 'change_requested',
              category: changeForm.category,
              details: changeForm.details,
            });
          }}>
            <div>
              <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Category</label>
              <Select value={changeForm.category} onValueChange={(v) => setChangeForm({...changeForm, category: v})}>
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="deliverables">Deliverables</SelectItem>
                  <SelectItem value="usage_rights">Usage Rights</SelectItem>
                  <SelectItem value="conduct">Conduct</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-600 uppercase tracking-wide mb-1 block">Details</label>
              <Textarea
                value={changeForm.details}
                onChange={(e) => setChangeForm({...changeForm, details: e.target.value})}
                placeholder="Explain what changes you need..."
                rows={3}
                className="border-gray-200"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setChangeDialog({ open: false, policyId: null })}
                className="flex-1 border-gray-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={acceptanceMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Submit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PolicyCard({
  policy,
  isAccepted,
  isChangeRequested,
  changeDetails,
  onAccept,
  onRequestChange,
  isPending,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded p-4 ${isChangeRequested ? 'bg-red-50 border-red-200' : isAccepted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-gray-900">{policy.title}</p>
            <Badge className="text-xs">{policy.policy_type}</Badge>
            <span className="text-xs text-gray-500">v{policy.version || 1}</span>
          </div>
          {isChangeRequested && changeDetails && (
            <p className="text-xs text-red-700 mt-1">Change requested: {changeDetails}</p>
          )}
        </div>
        {isAccepted && (
          <Badge className="bg-green-700 text-white text-xs">Accepted</Badge>
        )}
        {isChangeRequested && (
          <Badge className="bg-red-700 text-white text-xs">Change Request</Badge>
        )}
      </div>

      {/* Body Preview */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-gray-600 mb-3 hover:text-gray-900"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {expanded ? 'Hide policy' : 'View policy'}
      </button>

      {expanded && (
        <div className="bg-white rounded p-3 mb-3 max-h-48 overflow-y-auto">
          <div className="text-xs text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{__html: policy.body_rich_text}} />
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        {!isAccepted && (
          <Button
            onClick={onAccept}
            disabled={isPending || isAccepted}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
          >
            Accept
          </Button>
        )}
        {!isAccepted && (
          <Button
            onClick={onRequestChange}
            disabled={isPending}
            variant="outline"
            className="flex-1 border-gray-200 text-xs"
          >
            Request Change
          </Button>
        )}
        {isAccepted && (
          <p className="flex-1 text-xs text-green-700 font-medium">✓ Accepted</p>
        )}
      </div>
    </div>
  );
}