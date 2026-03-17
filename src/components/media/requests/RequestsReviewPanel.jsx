// RequestsReviewPanel — admin-facing request management (light theme)

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Calendar, MapPin, ShieldAlert, RefreshCw, Loader2, XCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  REQUEST_TYPES, REQUEST_STATUSES, PRIORITY_COLORS,
  logRequestEvent, convertRequestToAssignment,
} from './requestHelpers';
import MediaRequestCreateForm from './MediaRequestCreateForm';

function StatusBadge({ status }) {
  const info = REQUEST_STATUSES[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return <Badge className={`text-xs ${info.color}`}>{info.label}</Badge>;
}

function RequestDetailModal({ request, currentUser, onClose }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(request.admin_notes || '');

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.MediaRequest.update(request.id, { request_status: 'cancelled' });
      await logRequestEvent('media_request_cancelled', {
        requestId: request.id,
        actedByUserId: currentUser?.id,
        previousStatus: request.request_status,
        newStatus: 'cancelled',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaRequests'] });
      toast.success('Request cancelled');
      onClose();
    },
  });

  const convertMutation = useMutation({
    mutationFn: () => convertRequestToAssignment(request, currentUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaRequests'] });
      queryClient.invalidateQueries({ queryKey: ['mediaAssignments'] });
      toast.success('Converted to assignment');
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const saveNotesMutation = useMutation({
    mutationFn: () => base44.entities.MediaRequest.update(request.id, { admin_notes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaRequests'] });
      toast.success('Notes saved');
    },
  });

  const deliverables = Array.isArray(request.deliverables) ? request.deliverables : [];
  const canConvert = ['accepted'].includes(request.request_status) && !request.converted_assignment_id;
  const canCancel = !['cancelled', 'converted_to_assignment', 'expired'].includes(request.request_status);

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="pr-8">{request.request_title}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 mt-2">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={request.request_status} />
          <Badge className={`text-xs ${PRIORITY_COLORS[request.priority || 'medium']}`}>{request.priority}</Badge>
          <Badge variant="outline" className="text-xs">{REQUEST_TYPES[request.request_type]?.label}</Badge>
          {request.credential_required && (
            <Badge className="text-xs bg-orange-100 text-orange-700 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Credential Required
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {request.requested_by_entity_name && (
            <div><span className="text-gray-500">From:</span> <span className="font-medium">{request.requested_by_entity_name}</span></div>
          )}
          {request.target_creator_name && (
            <div><span className="text-gray-500">Creator:</span> <span className="font-medium">{request.target_creator_name}</span></div>
          )}
          {request.location && (
            <div><span className="text-gray-500">Location:</span> {request.location}</div>
          )}
          {request.deadline && (
            <div><span className="text-gray-500">Deadline:</span> {new Date(request.deadline).toLocaleDateString()}</div>
          )}
          {request.linked_event_name && (
            <div><span className="text-gray-500">Event:</span> {request.linked_event_name}</div>
          )}
          {request.open_to_applicants && (
            <div><span className="text-gray-500">Visibility:</span> Open to all eligible creators</div>
          )}
          {request.converted_assignment_id && (
            <div className="col-span-2"><span className="text-gray-500">Assignment:</span> <span className="text-teal-600 font-medium">#{request.converted_assignment_id.slice(-6)}</span></div>
          )}
        </div>

        {request.request_description && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{request.request_description}</p>
          </div>
        )}

        {deliverables.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Deliverables</p>
            <ul className="space-y-0.5">
              {deliverables.map((d, i) => (
                <li key={i} className="text-gray-600 text-xs">
                  • {d.quantity > 1 ? `${d.quantity}x ` : ''}{d.type}{d.notes ? ` — ${d.notes}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {request.decline_reason && (
          <div className="bg-red-50 border border-red-100 rounded p-3">
            <p className="text-xs font-medium text-red-700 mb-0.5">Decline Reason</p>
            <p className="text-red-600 text-xs">{request.decline_reason}</p>
          </div>
        )}

        {/* Admin notes */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Admin Notes</p>
          <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" />
          <Button size="sm" variant="ghost" className="mt-1 text-xs" onClick={() => saveNotesMutation.mutate()}
            disabled={saveNotesMutation.isPending}>Save Notes</Button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          {canConvert && (
            <Button size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700"
              onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
              <ArrowRight className="w-3.5 h-3.5" />
              {convertMutation.isPending ? 'Converting…' : 'Convert to Assignment'}
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
              <XCircle className="w-3.5 h-3.5" />
              {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Request'}
            </Button>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

export default function RequestsReviewPanel({ currentUser }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['mediaRequests'],
    queryFn: () => base44.entities.MediaRequest.list('-created_date', 200),
  });

  const filtered = requests.filter(r => {
    const matchSearch = !search || r.request_title?.toLowerCase().includes(search.toLowerCase())
      || r.target_creator_name?.toLowerCase().includes(search.toLowerCase())
      || r.requested_by_entity_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.request_status === statusFilter;
    const matchType = typeFilter === 'all' || r.request_type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const stats = {
    open: requests.filter(r => ['open', 'sent_to_creator', 'matched'].includes(r.request_status)).length,
    accepted: requests.filter(r => r.request_status === 'accepted').length,
    converted: requests.filter(r => r.request_status === 'converted_to_assignment').length,
    declined: requests.filter(r => r.request_status === 'declined').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active', value: stats.open, color: 'text-blue-600' },
          { label: 'Accepted', value: stats.accepted, color: 'text-green-600' },
          { label: 'Converted', value: stats.converted, color: 'text-teal-600' },
          { label: 'Declined', value: stats.declined, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="border border-gray-200 rounded-lg p-3 bg-white">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 text-sm h-8" placeholder="Search requests…" value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(REQUEST_STATUSES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(REQUEST_TYPES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['mediaRequests'] })}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
        <Button size="sm" className="bg-[#232323] hover:bg-[#1A3249] gap-1"
          onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> New Request
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-4">New Media Request</h3>
          <MediaRequestCreateForm
            currentUser={currentUser}
            dark={false}
            onCreated={() => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['mediaRequests'] }); }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-gray-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No requests found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <button
              key={r.id}
              className="w-full text-left border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              onClick={() => setSelected(r)}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-gray-400 text-xs">{REQUEST_TYPES[r.request_type]?.label}</span>
                    {r.requested_by_entity_name && (
                      <span className="text-gray-400 text-xs">· {r.requested_by_entity_name}</span>
                    )}
                    {r.credential_required && (
                      <span className="text-orange-500 text-xs flex items-center gap-0.5">
                        <ShieldAlert className="w-3 h-3" /> Credential
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900 truncate">{r.request_title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
                    {r.target_creator_name && <span>→ {r.target_creator_name}</span>}
                    {r.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.location}</span>}
                    {r.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(r.deadline).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-xs ${PRIORITY_COLORS[r.priority || 'medium']}`}>{r.priority || 'medium'}</Badge>
                  <StatusBadge status={r.request_status} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <RequestDetailModal request={selected} currentUser={currentUser} onClose={() => setSelected(null)} />
        </Dialog>
      )}
    </div>
  );
}