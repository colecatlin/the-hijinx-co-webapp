import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  CheckCircle2, Clock, XCircle, AlertCircle, ChevronRight,
  User, Globe, Briefcase, Loader2, FileText
} from 'lucide-react';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { APPLICATION_TYPES, MEDIA_ROLES } from '@/components/media/mediaPermissions';

const STATUS_CONFIG = {
  pending:          { label: 'Pending',        badge: 'bg-amber-100 text-amber-700 border-amber-200', Icon: Clock },
  approved:         { label: 'Approved',       badge: 'bg-green-100 text-green-700 border-green-200', Icon: CheckCircle2 },
  denied:           { label: 'Denied',         badge: 'bg-red-100 text-red-700 border-red-200',       Icon: XCircle },
  needs_more_info:  { label: 'Needs Info',     badge: 'bg-blue-100 text-blue-700 border-blue-200',    Icon: AlertCircle },
  withdrawn:        { label: 'Withdrawn',      badge: 'bg-gray-100 text-gray-500 border-gray-200',    Icon: XCircle },
};

function ApplicationCard({ app, onSelect, selected }) {
  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
  const Icon = cfg.Icon;
  return (
    <button
      onClick={() => onSelect(app)}
      className={`w-full text-left p-4 rounded-xl border transition-colors ${
        selected ? 'border-[#232323] bg-gray-50' : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{app.display_name || app.user_email}</p>
          <p className="text-xs text-gray-500 truncate">{app.user_email}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(app.application_type || []).slice(0, 3).map(t => (
              <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded capitalize">{t}</span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge className={`text-xs border flex items-center gap-1 ${cfg.badge}`}>
            <Icon className="w-3 h-3" /> {cfg.label}
          </Badge>
          {app.created_date && (
            <span className="text-xs text-gray-400">
              {(() => { try { return format(new Date(app.created_date), 'MMM d'); } catch { return ''; } })()}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ApplicationDetail({ app, onReviewed }) {
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState(app.review_notes || '');
  const [grantedRoles, setGrantedRoles] = useState(app.granted_roles || []);
  const [submitting, setSubmitting] = useState(false);

  const toggleRole = (role) => {
    setGrantedRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role]);
  };

  const handleReview = async () => {
    if (!action) { toast.error('Select an action first.'); return; }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('reviewMediaApplication', {
        application_id: app.id,
        action,
        review_notes: notes,
        granted_roles: action === 'approve' ? grantedRoles : [],
      });
      if (res.data?.success) {
        toast.success(`Application ${res.data.new_status}.`);
        onReviewed?.();
      } else {
        toast.error(res.data?.error || 'Review failed');
      }
    } catch {
      toast.error('Review request failed');
    }
    setSubmitting(false);
  };

  const appTypeLabel = (t) => APPLICATION_TYPES.find(a => a.value === t)?.label || t;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-gray-500" />
        </div>
        <div>
          <p className="font-bold text-gray-900">{app.display_name || app.user_email}</p>
          <p className="text-sm text-gray-500">{app.user_email}</p>
          {app.created_date && (
            <p className="text-xs text-gray-400 mt-0.5">
              Applied {(() => { try { return format(new Date(app.created_date), 'MMM d, yyyy'); } catch { return ''; } })()}
            </p>
          )}
        </div>
      </div>

      {/* Application types */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Application Type</p>
        <div className="flex flex-wrap gap-1.5">
          {(app.application_type || []).map(t => (
            <span key={t} className="px-2.5 py-1 bg-[#232323] text-white text-xs rounded-lg capitalize">{appTypeLabel(t)}</span>
          ))}
        </div>
      </div>

      {/* Bio & reason */}
      {app.bio && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bio</p>
          <p className="text-sm text-gray-700 leading-relaxed">{app.bio}</p>
        </div>
      )}

      {app.reason_for_applying && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reason for Applying</p>
          <p className="text-sm text-gray-700 leading-relaxed">{app.reason_for_applying}</p>
        </div>
      )}

      {/* Affiliation & links */}
      <div className="grid grid-cols-2 gap-3">
        {app.primary_affiliation_type && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5"><Briefcase className="w-3 h-3" /> Affiliation</div>
            <p className="text-sm font-medium text-gray-800 capitalize">{app.primary_affiliation_type.replace(/_/g, ' ')}</p>
            {app.primary_outlet_name && <p className="text-xs text-gray-500">{app.primary_outlet_name}</p>}
          </div>
        )}
        {app.website_url && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-0.5"><Globe className="w-3 h-3" /> Website</div>
            <a href={app.website_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate block">
              {app.website_url}
            </a>
          </div>
        )}
      </div>

      {/* Terms */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className={app.terms_accepted ? 'text-green-600' : 'text-red-500'}>
          {app.terms_accepted ? '✓' : '✗'} Terms accepted
        </span>
        <span className={app.usage_rights_accepted ? 'text-green-600' : 'text-gray-400'}>
          {app.usage_rights_accepted ? '✓' : '–'} Usage rights accepted
        </span>
      </div>

      {/* If already reviewed */}
      {app.status !== 'pending' && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Review Decision</p>
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`text-xs border ${STATUS_CONFIG[app.status]?.badge}`}>{STATUS_CONFIG[app.status]?.label}</Badge>
            {app.reviewed_by && <span className="text-xs text-gray-500">by {app.reviewed_by}</span>}
          </div>
          {app.review_notes && <p className="text-xs text-gray-600 mt-1">{app.review_notes}</p>}
          {app.granted_roles?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {app.granted_roles.map(r => (
                <span key={r} className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded capitalize">{r}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review controls — show for pending or needs_more_info */}
      {(app.status === 'pending' || app.status === 'needs_more_info') && (
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <p className="text-sm font-semibold text-gray-800">Review Decision</p>

          {/* Action selector */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'approve', label: 'Approve', cls: action === 'approve' ? 'bg-green-700 text-white' : 'border-green-200 text-green-700 hover:bg-green-50' },
              { value: 'deny', label: 'Deny', cls: action === 'deny' ? 'bg-red-700 text-white' : 'border-red-200 text-red-700 hover:bg-red-50' },
              { value: 'needs_more_info', label: 'Needs More Info', cls: action === 'needs_more_info' ? 'bg-blue-700 text-white' : 'border-blue-200 text-blue-700 hover:bg-blue-50' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setAction(opt.value)}
                className={`px-4 py-2 text-sm rounded-lg border font-medium transition-colors ${opt.cls}`}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Role grants (approve only) */}
          {action === 'approve' && (
            <div>
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Grant Media Roles</Label>
              <div className="flex flex-wrap gap-1.5">
                {MEDIA_ROLES.map(role => (
                  <button key={role} onClick={() => toggleRole(role)}
                    className={`px-2.5 py-1 text-xs rounded-lg border capitalize transition-colors ${
                      grantedRoles.includes(role)
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}>
                    {role.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Leave empty to auto-derive from application type.</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 mb-1 block">Review Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Notes to applicant or internal admin notes…"
              className="min-h-[80px] text-sm" />
          </div>

          <Button onClick={handleReview} disabled={!action || submitting}
            className="bg-[#232323] hover:bg-black text-white gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
            {submitting ? 'Processing…' : 'Submit Review'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ManageMediaApplications() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['mediaApplications', statusFilter],
    queryFn: () => {
      const query = statusFilter === 'all' ? {} : { status: statusFilter };
      return base44.entities.MediaApplication.filter(query, '-created_date', 100);
    },
    enabled: user?.role === 'admin',
  });

  if (user && user.role !== 'admin') {
    return (
      <ManagementLayout currentPage="ManageMediaApplications">
        <ManagementShell title="Media Applications">
          <div className="text-center py-20 text-gray-500">Admin access required.</div>
        </ManagementShell>
      </ManagementLayout>
    );
  }

  const handleReviewed = () => {
    queryClient.invalidateQueries({ queryKey: ['mediaApplications'] });
    setSelected(null);
  };

  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <ManagementLayout currentPage="ManageMediaApplications">
      <ManagementShell
        title="Media Applications"
        subtitle="Review and approve contributor applications"
        actions={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Applications</SelectItem>
              <SelectItem value="pending">Pending {counts.pending ? `(${counts.pending})` : ''}</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
              <SelectItem value="needs_more_info">Needs Info</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        {/* Summary bar */}
        <div className="flex flex-wrap gap-3 mb-5">
          {Object.entries({ pending: 'amber', approved: 'green', denied: 'red', needs_more_info: 'blue' }).map(([s, c]) => (
            <div key={s} className={`px-3 py-1.5 rounded-lg bg-${c}-50 border border-${c}-200 text-xs font-medium text-${c}-700`}>
              {STATUS_CONFIG[s]?.label}: {counts[s] || 0}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Application list */}
          <div className="lg:col-span-2 space-y-2">
            {isLoading && (
              <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
            )}
            {!isLoading && applications.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No applications for this filter.</p>
              </div>
            )}
            {applications.map(app => (
              <ApplicationCard
                key={app.id}
                app={app}
                selected={selected?.id === app.id}
                onSelect={setSelected}
              />
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <ApplicationDetail app={selected} onReviewed={handleReviewed} />
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center h-64">
                <p className="text-sm text-gray-400">Select an application to review</p>
              </div>
            )}
          </div>
        </div>
      </ManagementShell>
    </ManagementLayout>
  );
}