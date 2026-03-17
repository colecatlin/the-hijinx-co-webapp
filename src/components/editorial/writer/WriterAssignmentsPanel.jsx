// WriterAssignmentsPanel — assignment visibility inside WriterWorkspace (light theme)

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Briefcase, AlertTriangle, Calendar, Package, ChevronDown, CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  ASSIGNMENT_STATUSES, ASSIGNMENT_TYPES, PRIORITY_COLORS,
  formatDeliverable, isOverdue, logAssignmentEvent,
} from '@/components/media/assignments/assignmentHelpers';

function AssignmentRow({ assignment, currentUser }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(assignment.contributor_notes || '');
  const queryClient = useQueryClient();

  const statusInfo = ASSIGNMENT_STATUSES[assignment.status] || { label: assignment.status, color: 'bg-gray-100 text-gray-600' };
  const overdue = isOverdue(assignment);
  const deliverables = Array.isArray(assignment.deliverables) ? assignment.deliverables : [];

  const updateMutation = useMutation({
    mutationFn: async ({ newStatus, contributorNotes }) => {
      const now = new Date().toISOString();
      const update = { status: newStatus };
      if (contributorNotes !== undefined) update.contributor_notes = contributorNotes;
      if (newStatus === 'submitted') update.submitted_at = now;
      await base44.entities.MediaAssignment.update(assignment.id, update);
      await logAssignmentEvent(`media_assignment_${newStatus === 'in_progress' ? 'started' : newStatus}`, {
        assignmentId: assignment.id,
        assignedToUserId: assignment.assigned_to_user_id,
        actedByUserId: currentUser?.id,
        previousStatus: assignment.status,
        newStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['writerAssignments'] });
      toast.success('Assignment updated');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className={`border rounded-lg overflow-hidden ${overdue ? 'border-red-200' : 'border-gray-200'}`}>
      <button
        className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-gray-400 text-xs">{ASSIGNMENT_TYPES[assignment.assignment_type]?.label}</span>
            {overdue && (
              <span className="text-red-500 text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Overdue
              </span>
            )}
          </div>
          <p className="font-semibold text-gray-900">{assignment.assignment_title}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
            {assignment.due_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(assignment.due_date).toLocaleDateString()}
              </span>
            )}
            {deliverables.length > 0 && (
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" /> {deliverables.length} deliverable{deliverables.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`text-xs ${PRIORITY_COLORS[assignment.priority || 'medium']}`}>{assignment.priority || 'medium'}</Badge>
          <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3 bg-white">
          {assignment.assignment_notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Briefing</p>
              <p className="text-gray-700 text-sm whitespace-pre-wrap">{assignment.assignment_notes}</p>
            </div>
          )}
          {deliverables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Deliverables</p>
              <ul className="space-y-0.5">
                {deliverables.map((d, i) => (
                  <li key={i} className="text-gray-600 text-xs">• {formatDeliverable(d)}</li>
                ))}
              </ul>
            </div>
          )}
          {assignment.editor_notes && (
            <div className="bg-blue-50 border border-blue-100 rounded p-3">
              <p className="text-xs font-medium text-blue-700 mb-1">Editor Notes</p>
              <p className="text-blue-600 text-xs whitespace-pre-wrap">{assignment.editor_notes}</p>
            </div>
          )}
          {/* Links */}
          <div className="flex flex-wrap gap-2 text-xs">
            {assignment.linked_story_id && <Badge variant="outline">Linked Story</Badge>}
            {assignment.linked_recommendation_id && <Badge variant="outline">Recommendation</Badge>}
            {assignment.linked_research_packet_id && <Badge variant="outline">Research Packet</Badge>}
            {assignment.linked_event_id && <Badge variant="outline">Event</Badge>}
          </div>

          {(assignment.status === 'in_progress' || assignment.status === 'needs_revision') && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Your Notes</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="text-sm"
                placeholder="Add notes for your editor…"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {assignment.status === 'assigned' && (
              <Button size="sm" className="gap-1 bg-[#232323] hover:bg-[#1A3249]"
                onClick={() => updateMutation.mutate({ newStatus: 'accepted' })}
                disabled={updateMutation.isPending}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Accept
              </Button>
            )}
            {assignment.status === 'accepted' && (
              <Button size="sm" className="gap-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => updateMutation.mutate({ newStatus: 'in_progress' })}
                disabled={updateMutation.isPending}>
                <ArrowRight className="w-3.5 h-3.5" /> Start Work
              </Button>
            )}
            {assignment.status === 'in_progress' && (
              <Button size="sm" className="gap-1 bg-purple-600 hover:bg-purple-700"
                onClick={() => updateMutation.mutate({ newStatus: 'submitted', contributorNotes: notes })}
                disabled={updateMutation.isPending}>
                <Clock className="w-3.5 h-3.5" /> Submit Work
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WriterAssignmentsPanel({ currentUser }) {
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['writerAssignments', currentUser?.id],
    queryFn: () => base44.entities.MediaAssignment.filter(
      { assigned_to_user_id: currentUser.id },
      '-created_date',
      100
    ),
    enabled: !!currentUser?.id,
  });

  const active = assignments.filter(a =>
    ['assigned', 'accepted', 'in_progress', 'submitted', 'needs_revision'].includes(a.status)
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-12 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading assignments…
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div className="text-center py-16 border border-gray-200 rounded-lg bg-gray-50">
        <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No active assignments.</p>
        <p className="text-gray-400 text-xs mt-1">Assignments are created by the editorial team and will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{active.length} active assignment{active.length !== 1 ? 's' : ''}</p>
      {active.map(a => (
        <AssignmentRow key={a.id} assignment={a} currentUser={currentUser} />
      ))}
    </div>
  );
}