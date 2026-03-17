// AssignmentCard — used in MediaPortal contributor view (dark theme)

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  ChevronDown, Calendar, AlertTriangle, Zap, FileText,
  CheckCircle2, ArrowRight, Clock, Package,
} from 'lucide-react';
import {
  ASSIGNMENT_STATUS_COLORS_DARK, ASSIGNMENT_STATUSES,
  PRIORITY_COLORS_DARK, ASSIGNMENT_TYPES,
  formatDeliverable, isOverdue, logAssignmentEvent,
} from './assignmentHelpers';

export default function AssignmentCard({ assignment, currentUser }) {
  const [expanded, setExpanded] = useState(false);
  const [contributorNotes, setContributorNotes] = useState(assignment.contributor_notes || '');
  const queryClient = useQueryClient();

  const statusInfo = ASSIGNMENT_STATUSES[assignment.status] || { label: assignment.status };
  const statusColor = ASSIGNMENT_STATUS_COLORS_DARK[assignment.status] || 'bg-gray-700 text-gray-400';
  const priorityColor = PRIORITY_COLORS_DARK[assignment.priority || 'medium'];
  const typeInfo = ASSIGNMENT_TYPES[assignment.assignment_type] || { label: assignment.assignment_type };
  const overdue = isOverdue(assignment);
  const deliverables = Array.isArray(assignment.deliverables) ? assignment.deliverables : [];

  const updateMutation = useMutation({
    mutationFn: async ({ newStatus, notes }) => {
      const now = new Date().toISOString();
      const update = { status: newStatus };
      if (notes !== undefined) update.contributor_notes = notes;
      if (newStatus === 'submitted') update.submitted_at = now;
      await base44.entities.MediaAssignment.update(assignment.id, update);
      await logAssignmentEvent(`media_assignment_${newStatus.replace('in_progress', 'started')}`, {
        assignmentId: assignment.id,
        assignedToUserId: assignment.assigned_to_user_id,
        assignedToProfileId: assignment.assigned_to_profile_id,
        actedByUserId: currentUser?.id,
        previousStatus: assignment.status,
        newStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAssignments'] });
      toast.success('Assignment updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const canAccept    = assignment.status === 'assigned';
  const canDecline   = assignment.status === 'assigned';
  const canStart     = assignment.status === 'accepted';
  const canSubmit    = assignment.status === 'in_progress';
  const credBlocked  = assignment.credential_required && !assignment.credential_verified;

  return (
    <div className={`bg-[#171717] border rounded-xl overflow-hidden ${
      overdue ? 'border-red-800/60' : 'border-gray-800'
    }`}>
      <button
        className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-[#1a1a1a] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-gray-500 text-xs uppercase tracking-wide">{typeInfo.label}</span>
            {overdue && (
              <span className="flex items-center gap-1 text-red-400 text-xs">
                <AlertTriangle className="w-3 h-3" /> Overdue
              </span>
            )}
          </div>
          <p className="text-white text-sm font-medium">{assignment.assignment_title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {assignment.due_date && (
              <span className="flex items-center gap-1 text-gray-500 text-xs">
                <Calendar className="w-3 h-3" />
                {new Date(assignment.due_date).toLocaleDateString()}
              </span>
            )}
            {deliverables.length > 0 && (
              <span className="flex items-center gap-1 text-gray-600 text-xs">
                <Package className="w-3 h-3" /> {deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={priorityColor + ' text-xs'}>{assignment.priority || 'medium'}</Badge>
          <Badge className={statusColor + ' text-xs'}>{statusInfo.label}</Badge>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {/* Credential warning */}
          {credBlocked && (
            <div className="bg-red-900/10 border border-red-800/50 rounded p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 text-xs font-medium">Credential Required</p>
                <p className="text-red-400 text-xs mt-0.5">
                  This assignment requires an active RaceCore credential for the linked event, series, or track.
                  Please apply for your credential through the Credentials tab before this assignment can proceed.
                </p>
              </div>
            </div>
          )}

          {/* Briefing notes */}
          {assignment.assignment_notes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Briefing</p>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{assignment.assignment_notes}</p>
            </div>
          )}

          {/* Deliverables */}
          {deliverables.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Deliverables</p>
              <ul className="space-y-1">
                {deliverables.map((d, i) => (
                  <li key={i} className="text-gray-300 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-gray-600 shrink-0 mt-0.5" />
                    {formatDeliverable(d)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Deliverable notes */}
          {assignment.deliverable_notes && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Deliverable Notes</p>
              <p className="text-gray-400 text-xs whitespace-pre-wrap">{assignment.deliverable_notes}</p>
            </div>
          )}

          {/* Editor notes (visible to contributor) */}
          {assignment.editor_notes && (
            <div className="bg-blue-900/10 border border-blue-900/30 rounded p-3">
              <p className="text-blue-300 text-xs font-medium mb-1">Editor Notes</p>
              <p className="text-blue-200 text-xs whitespace-pre-wrap">{assignment.editor_notes}</p>
            </div>
          )}

          {/* Linked objects */}
          <div className="flex flex-wrap gap-2 text-xs">
            {assignment.linked_story_id && (
              <span className="bg-[#0A0A0A] border border-gray-800 rounded px-2 py-1 text-gray-400 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Linked Story
              </span>
            )}
            {assignment.linked_recommendation_id && (
              <span className="bg-[#0A0A0A] border border-gray-800 rounded px-2 py-1 text-gray-400 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Recommendation
              </span>
            )}
            {assignment.linked_research_packet_id && (
              <span className="bg-[#0A0A0A] border border-gray-800 rounded px-2 py-1 text-gray-400 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Research Packet
              </span>
            )}
          </div>

          {/* Contributor notes input */}
          {(canSubmit || assignment.status === 'needs_revision') && (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Your Notes (optional)</label>
              <Textarea
                value={contributorNotes}
                onChange={e => setContributorNotes(e.target.value)}
                placeholder="Add notes for your editor…"
                rows={3}
                className="bg-[#0A0A0A] border-gray-700 text-white placeholder:text-gray-600 text-sm resize-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {canAccept && !credBlocked && (
              <Button
                size="sm"
                className="bg-white text-black hover:bg-gray-100 gap-1 text-xs"
                onClick={() => updateMutation.mutate({ newStatus: 'accepted' })}
                disabled={updateMutation.isPending}
              >
                <CheckCircle2 className="w-3 h-3" /> Accept
              </Button>
            )}
            {canDecline && (
              <Button
                size="sm" variant="outline"
                className="border-red-800 text-red-400 hover:bg-red-900/20 gap-1 text-xs"
                onClick={() => updateMutation.mutate({ newStatus: 'declined' })}
                disabled={updateMutation.isPending}
              >
                Decline
              </Button>
            )}
            {canStart && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 gap-1 text-xs"
                onClick={() => updateMutation.mutate({ newStatus: 'in_progress' })}
                disabled={updateMutation.isPending}
              >
                <ArrowRight className="w-3 h-3" /> Start Work
              </Button>
            )}
            {canSubmit && (
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 gap-1 text-xs"
                onClick={() => updateMutation.mutate({ newStatus: 'submitted', notes: contributorNotes })}
                disabled={updateMutation.isPending}
              >
                <Clock className="w-3 h-3" /> Submit Work
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}