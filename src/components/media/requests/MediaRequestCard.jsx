// MediaRequestCard — single request card for creator view (dark theme)

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar, MapPin, Package, ShieldAlert, ChevronDown, CheckCircle2, XCircle, ExternalLink, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  REQUEST_TYPES, REQUEST_STATUSES, PRIORITY_COLORS_DARK,
  convertRequestToAssignment, checkRequestCredentialEligibility, logRequestEvent,
} from './requestHelpers';

export default function MediaRequestCard({ request, currentUser, mediaUserId, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [credCheck, setCredCheck] = useState(null);
  const queryClient = useQueryClient();

  const statusInfo = REQUEST_STATUSES[request.request_status] || { label: request.request_status, dark: 'bg-gray-700 text-gray-400' };
  const deliverables = Array.isArray(request.deliverables) ? request.deliverables : [];
  const typeLabel = REQUEST_TYPES[request.request_type]?.label || request.request_type;
  const isDeadlineSoon = request.deadline && new Date(request.deadline) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const isExpired = request.deadline && new Date(request.deadline) < new Date();

  const canAct = ['sent_to_creator', 'open', 'matched'].includes(request.request_status);

  const acceptMutation = useMutation({
    mutationFn: async () => {
      // Check credential if required
      if (request.credential_required && mediaUserId) {
        const check = await checkRequestCredentialEligibility(request, mediaUserId);
        setCredCheck(check);
        if (!check.eligible) throw new Error(check.reason);
      }
      // Update request first
      await base44.entities.MediaRequest.update(request.id, { request_status: 'accepted' });
      await logRequestEvent('media_request_accepted', {
        requestId: request.id,
        targetCreatorProfileId: request.target_creator_profile_id,
        actedByUserId: currentUser?.id,
        previousStatus: request.request_status,
        newStatus: 'accepted',
      });
      // Convert to assignment
      const assignment = await convertRequestToAssignment(request, currentUser);
      await logRequestEvent('media_request_converted_to_assignment', {
        requestId: request.id,
        targetCreatorProfileId: request.target_creator_profile_id,
        actedByUserId: currentUser?.id,
        previousStatus: 'accepted',
        newStatus: 'converted_to_assignment',
      });
      return assignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myIncomingRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myAssignments'] });
      toast.success('Request accepted — assignment created!');
      onUpdated?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.MediaRequest.update(request.id, {
        request_status: 'declined',
        decline_reason: declineReason || null,
      });
      await logRequestEvent('media_request_declined', {
        requestId: request.id,
        targetCreatorProfileId: request.target_creator_profile_id,
        actedByUserId: currentUser?.id,
        previousStatus: request.request_status,
        newStatus: 'declined',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myIncomingRequests'] });
      toast.success('Request declined');
      setShowDeclineInput(false);
      onUpdated?.();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className={`bg-[#171717] border rounded-xl overflow-hidden transition-colors ${
      isExpired ? 'border-gray-800 opacity-60' : 'border-gray-800 hover:border-gray-700'
    }`}>
      <button
        className="w-full text-left p-4 flex items-start justify-between gap-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-gray-500 text-xs">{typeLabel}</span>
            {request.requested_by_entity_name && (
              <span className="text-gray-600 text-xs">from {request.requested_by_entity_name}</span>
            )}
            {isDeadlineSoon && !isExpired && (
              <span className="text-yellow-400 text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Deadline soon
              </span>
            )}
          </div>
          <p className="font-semibold text-white">{request.request_title}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
            {request.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{request.location}</span>
            )}
            {request.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Due {new Date(request.deadline).toLocaleDateString()}
              </span>
            )}
            {deliverables.length > 0 && (
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" /> {deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''}
              </span>
            )}
            {request.credential_required && (
              <span className="text-orange-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Credential required
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`text-xs ${PRIORITY_COLORS_DARK[request.priority || 'medium']}`}>{request.priority || 'medium'}</Badge>
          <Badge className={`text-xs ${statusInfo.dark}`}>{statusInfo.label}</Badge>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {request.request_description && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{request.request_description}</p>
            </div>
          )}

          {deliverables.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Deliverables</p>
              <ul className="space-y-0.5">
                {deliverables.map((d, i) => (
                  <li key={i} className="text-gray-400 text-xs">
                    • {d.quantity > 1 ? `${d.quantity}x ` : ''}{d.type}{d.notes ? ` — ${d.notes}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {request.credential_required && (
            <div className="bg-orange-900/20 border border-orange-800/40 rounded-lg p-3">
              <p className="text-orange-300 text-xs font-medium flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Credential Required
              </p>
              <p className="text-orange-400/80 text-xs mt-0.5">
                You must hold a valid active credential for this event or series.
                {credCheck && !credCheck.eligible && (
                  <span className="block mt-1 text-red-400">{credCheck.reason}</span>
                )}
              </p>
            </div>
          )}

          {request.converted_assignment_id && (
            <div className="bg-teal-900/20 border border-teal-800/40 rounded-lg p-3">
              <p className="text-teal-300 text-xs">✓ Converted to assignment — check your Assignments tab.</p>
            </div>
          )}

          {/* Actions */}
          {canAct && !showDeclineInput && (
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                className="bg-white text-black hover:bg-gray-100 gap-1"
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {acceptMutation.isPending ? 'Accepting…' : 'Accept Request'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-400 hover:text-red-400 gap-1"
                onClick={() => setShowDeclineInput(true)}
              >
                <XCircle className="w-3.5 h-3.5" /> Decline
              </Button>
            </div>
          )}

          {showDeclineInput && (
            <div className="space-y-2">
              <Textarea
                className="bg-[#232323] border-gray-700 text-white text-sm"
                rows={2}
                placeholder="Optional: reason for declining…"
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => declineMutation.mutate()}
                  disabled={declineMutation.isPending}>
                  {declineMutation.isPending ? 'Declining…' : 'Confirm Decline'}
                </Button>
                <Button size="sm" variant="ghost" className="text-gray-500"
                  onClick={() => setShowDeclineInput(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}