// AssignmentReviewPanel — admin/editor view for managing all assignments

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, CheckCircle2, RefreshCw, X, Eye, AlertTriangle, Calendar, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  ASSIGNMENT_TYPES, ASSIGNMENT_STATUSES, PRIORITY_COLORS,
  formatDeliverable, isOverdue, logAssignmentEvent,
} from './assignmentHelpers';
import AssignmentCreateForm from './AssignmentCreateForm';

const ALL = 'all';

export default function AssignmentReviewPanel({ currentUser }) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [filterType, setFilterType] = useState(ALL);
  const [selected, setSelected] = useState(null);
  const [editorNotes, setEditorNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['mediaAssignments'],
    queryFn: () => base44.entities.MediaAssignment.list('-created_date', 200),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['mediaProfilesForAssignment'],
    queryFn: () => base44.entities.MediaProfile.list('-created_date', 200),
  });

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));

  const filtered = assignments.filter(a => {
    const q = search.toLowerCase();
    const matchQ = !q || a.assignment_title?.toLowerCase().includes(q);
    const matchStatus = filterStatus === ALL || a.status === filterStatus;
    const matchType = filterType === ALL || a.assignment_type === filterType;
    return matchQ && matchStatus && matchType;
  });

  const pendingReview = assignments.filter(a => a.status === 'submitted').length;

  const openDetail = (a) => {
    setSelected(a);
    setEditorNotes(a.editor_notes || '');
  };

  const reviewMutation = useMutation({
    mutationFn: async ({ newStatus, notes, credVerified }) => {
      const now = new Date().toISOString();
      const update = { status: newStatus, editor_notes: notes ?? selected.editor_notes };
      if (newStatus === 'approved') update.approved_at = now;
      if (newStatus === 'completed') update.completed_at = now;
      if (newStatus === 'cancelled') update.cancelled_at = now;
      if (credVerified !== undefined) update.credential_verified = credVerified;
      await base44.entities.MediaAssignment.update(selected.id, update);
      await logAssignmentEvent(`media_assignment_${newStatus}`, {
        assignmentId: selected.id,
        assignedToUserId: selected.assigned_to_user_id,
        assignedToProfileId: selected.assigned_to_profile_id,
        linkedEventId: selected.linked_event_id,
        linkedStoryId: selected.linked_story_id,
        actedByUserId: currentUser?.id,
        previousStatus: selected.status,
        newStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['myAssignments'] });
      setSelected(null);
      toast.success('Assignment updated');
    },
    onError: (err) => toast.error(err.message),
  });

  const assignee = selected ? profileMap[selected.assigned_to_profile_id] : null;
  const deliverables = selected ? (Array.isArray(selected.deliverables) ? selected.deliverables : []) : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Assignments</h2>
          <p className="text-gray-500 text-sm">{pendingReview} submitted for review</p>
        </div>
        <Button
          size="sm"
          className="bg-[#232323] hover:bg-[#1A3249] gap-1.5 text-xs"
          onClick={() => setShowCreate(s => !s)}
        >
          <Plus className="w-3.5 h-3.5" /> {showCreate ? 'Cancel' : 'New Assignment'}
        </Button>
      </div>

      {showCreate && (
        <AssignmentCreateForm
          currentUser={currentUser}
          onSuccess={() => setShowCreate(false)}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Statuses</SelectItem>
            {Object.entries(ASSIGNMENT_STATUSES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Types</SelectItem>
            {Object.entries(ASSIGNMENT_TYPES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No assignments found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Assignment</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Contributor</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Due</th>
                <th className="w-16 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const statusInfo = ASSIGNMENT_STATUSES[a.status] || { label: a.status, color: 'bg-gray-100 text-gray-600' };
                const contributor = profileMap[a.assigned_to_profile_id];
                const overdue = isOverdue(a);
                return (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-[200px]">{a.assignment_title}</p>
                      {a.priority && (
                        <Badge className={`mt-0.5 text-[10px] ${PRIORITY_COLORS[a.priority]}`}>{a.priority}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 text-xs">
                      {contributor?.display_name || a.assigned_to_user_id || '—'}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">
                      {ASSIGNMENT_TYPES[a.assignment_type]?.label || a.assignment_type}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs">
                      {a.due_date ? (
                        <span className={overdue ? 'text-red-500 font-medium flex items-center gap-1' : 'text-gray-500'}>
                          {overdue && <AlertTriangle className="w-3 h-3" />}
                          {new Date(a.due_date).toLocaleDateString()}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => openDetail(a)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Dialog */}
      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">{selected.assignment_title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge className={ASSIGNMENT_STATUSES[selected.status]?.color || 'bg-gray-100'}>
                  {ASSIGNMENT_STATUSES[selected.status]?.label || selected.status}
                </Badge>
                <Badge className={PRIORITY_COLORS[selected.priority || 'medium']}>{selected.priority || 'medium'}</Badge>
                <Badge className="bg-gray-100 text-gray-600">{ASSIGNMENT_TYPES[selected.assignment_type]?.label}</Badge>
                {isOverdue(selected) && (
                  <Badge className="bg-red-100 text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Overdue
                  </Badge>
                )}
              </div>

              {/* Assignee */}
              {assignee && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-semibold text-gray-700 mb-1">Contributor</p>
                  <p>{assignee.display_name}</p>
                  {assignee.primary_outlet_name && <p className="text-xs text-gray-400">{assignee.primary_outlet_name}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">Trust: {assignee.writer_trust_level || 'none'}</p>
                </div>
              )}

              {/* Credential */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium">Credential Required</p>
                  <p className="text-xs text-gray-500">Verified: {selected.credential_verified ? 'Yes' : 'No'}</p>
                </div>
                <Switch
                  checked={selected.credential_verified || false}
                  onCheckedChange={v => reviewMutation.mutate({ newStatus: selected.status, credVerified: v })}
                  disabled={reviewMutation.isPending}
                />
              </div>

              {/* Due date */}
              {selected.due_date && (
                <p className="text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Due: {new Date(selected.due_date).toLocaleString()}
                </p>
              )}

              {/* Deliverables */}
              {deliverables.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                    <Package className="w-4 h-4" /> Deliverables
                  </p>
                  <ul className="space-y-1">
                    {deliverables.map((d, i) => (
                      <li key={i} className="text-gray-600 text-xs">• {formatDeliverable(d)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Briefing */}
              {selected.assignment_notes && (
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Briefing</p>
                  <p className="text-gray-600 whitespace-pre-wrap">{selected.assignment_notes}</p>
                </div>
              )}

              {/* Contributor notes */}
              {selected.contributor_notes && (
                <div className="bg-indigo-50 border border-indigo-100 rounded p-3">
                  <p className="font-semibold text-indigo-700 mb-1">Contributor Notes</p>
                  <p className="text-indigo-600 whitespace-pre-wrap text-xs">{selected.contributor_notes}</p>
                </div>
              )}

              {/* Editor notes */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Editor Notes</label>
                <Textarea
                  value={editorNotes}
                  onChange={e => setEditorNotes(e.target.value)}
                  rows={3}
                  className="text-sm"
                  placeholder="Notes visible to the contributor…"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {selected.status === 'submitted' && (
                  <>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 gap-1"
                      onClick={() => reviewMutation.mutate({ newStatus: 'approved', notes: editorNotes })}
                      disabled={reviewMutation.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 gap-1"
                      onClick={() => reviewMutation.mutate({ newStatus: 'completed', notes: editorNotes })}
                      disabled={reviewMutation.isPending}
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      className="text-orange-600 border-orange-200 hover:bg-orange-50 gap-1"
                      onClick={() => reviewMutation.mutate({ newStatus: 'needs_revision', notes: editorNotes })}
                      disabled={reviewMutation.isPending}
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Needs Revision
                    </Button>
                  </>
                )}
                {!['cancelled', 'completed', 'approved'].includes(selected.status) && (
                  <Button
                    size="sm" variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                    onClick={() => reviewMutation.mutate({ newStatus: 'cancelled', notes: editorNotes })}
                    disabled={reviewMutation.isPending}
                  >
                    <X className="w-3.5 h-3.5" /> Cancel Assignment
                  </Button>
                )}
                {/* Save notes-only update */}
                <Button
                  size="sm" variant="outline"
                  onClick={() => reviewMutation.mutate({ newStatus: selected.status, notes: editorNotes })}
                  disabled={reviewMutation.isPending}
                >
                  Save Notes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}