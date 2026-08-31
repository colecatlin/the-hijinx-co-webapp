import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle, FileText } from 'lucide-react';

const MOTION = 'hsl(var(--motion))';
const DANGER = 'hsl(var(--danger))';
const WARNING = 'hsl(var(--warning))';

export default function IdentityApplicationsReview() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending');
  const [actioningId, setActioningId] = useState(null);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['identityApplications', filter],
    queryFn: () => base44.entities.IdentityApplication.list('-submitted_at', 100),
  });

  const filtered = applications.filter((a) => filter === 'all' || a.status === filter);

  const handleAction = async (applicationId, action) => {
    setActioningId(applicationId);
    setError(null);
    try {
      const res = await base44.functions.invoke('reviewIdentityApplication', {
        application_id: applicationId,
        action,
        admin_notes: notes[applicationId] || '',
      });
      if (res?.data?.error) throw new Error(res.data.error);
      await queryClient.invalidateQueries({ queryKey: ['identityApplications'] });
      setNotes((prev) => { const next = { ...prev }; delete next[applicationId]; return next; });
    } catch (e) {
      setError(e?.message || 'Action failed');
    } finally {
      setActioningId(null);
    }
  };

  const statusMeta = {
    pending: { color: WARNING, label: 'Pending', Icon: Clock },
    approved: { color: MOTION, label: 'Approved', Icon: CheckCircle2 },
    rejected: { color: DANGER, label: 'Rejected', Icon: XCircle },
    needs_more_info: { color: WARNING, label: 'More Info', Icon: AlertCircle },
  };

  const filters = ['pending', 'needs_more_info', 'approved', 'rejected', 'all'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black" style={{ color: 'hsl(var(--foreground))' }}>Identity Applications</h2>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            Review and approve identity requests from users.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
              style={filter === f ? {
                background: MOTION, color: 'hsl(var(--canvas))',
              } : {
                background: 'hsl(var(--surface-interactive) / 0.3)',
                color: 'hsl(var(--foreground-quiet))',
                border: '1px solid hsl(var(--divider) / 0.6)',
              }}>
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5"
          style={{ background: 'hsl(var(--danger) / 0.08)', color: DANGER, border: '1px solid hsl(var(--danger) / 0.2)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: MOTION }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'hsl(var(--foreground-quiet))' }} />
          <p className="text-sm" style={{ color: 'hsl(var(--foreground-quiet))' }}>No {filter} applications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const meta = statusMeta[app.status] || statusMeta.pending;
            const StatusIcon = meta.Icon;
            const isActionable = app.status === 'pending' || app.status === 'needs_more_info';
            return (
              <div key={app.id} className="rounded-2xl p-5 space-y-3"
                style={{
                  background: 'hsl(var(--surface-elevated) / 0.7)',
                  border: '1px solid hsl(var(--divider) / 0.6)',
                }}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                        {app.display_name}
                      </p>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: `${meta.color} / 0.15)`, color: meta.color }}>
                        {meta.label}
                      </span>
                      {app.review_tier === 'light' && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: 'hsl(var(--surface-interactive) / 0.5)', color: 'hsl(var(--foreground-quiet))' }}>
                          Light
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                      {app.user_name || 'Unknown'} · {app.user_email}
                    </p>
                  </div>
                  <div className="text-right text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                    <p>{app.application_mode === 'existing' ? 'Claiming existing' : 'New profile'}</p>
                    {app.entity_name && <p className="font-medium" style={{ color: 'hsl(var(--foreground-secondary))' }}>{app.entity_name}</p>}
                  </div>
                </div>

                {/* Role fields */}
                {app.role_fields && Object.keys(app.role_fields).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(app.role_fields).map(([key, val]) => (
                      val ? (
                        <span key={key} className="text-xs px-2.5 py-1 rounded-lg"
                          style={{ background: 'hsl(var(--surface-interactive) / 0.3)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider) / 0.6)' }}>
                          <span className="font-bold" style={{ color: 'hsl(var(--foreground-quiet))' }}>{key.replace(/_/g, ' ')}:</span> {val}
                        </span>
                      ) : null
                    ))}
                  </div>
                )}

                {/* Evidence */}
                {(app.evidence_links?.length > 0 || app.evidence_notes) && (
                  <div className="space-y-1.5">
                    {app.evidence_links?.filter(Boolean).map((link, i) => (
                      <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs hover:underline"
                        style={{ color: MOTION }}>
                        <FileText className="w-3 h-3" /> {link}
                      </a>
                    ))}
                    {app.evidence_notes && (
                      <p className="text-xs" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                        "{app.evidence_notes}"
                      </p>
                    )}
                  </div>
                )}

                {/* Admin notes input + actions */}
                {isActionable && (
                  <div className="space-y-2 pt-2" style={{ borderTop: '1px solid hsl(var(--divider) / 0.6)' }}>
                    <input
                      value={notes[app.id] || ''}
                      onChange={(e) => setNotes({ ...notes, [app.id]: e.target.value })}
                      placeholder="Admin notes (shown to applicant for 'more info', internal for rejections)"
                      className="w-full h-9 rounded-lg px-3 text-sm focus-visible:outline-none"
                      style={{ background: 'hsl(var(--surface-interactive) / 0.4)', border: '1px solid hsl(var(--divider))', color: 'hsl(var(--foreground))' }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm"
                        disabled={actioningId === app.id}
                        onClick={() => handleAction(app.id, 'approve')}
                        className="gap-1.5 text-xs font-bold"
                        style={{ background: MOTION, color: 'hsl(var(--canvas))' }}>
                        {actioningId === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Approve
                      </Button>
                      <Button type="button" size="sm" variant="ghost"
                        disabled={actioningId === app.id}
                        onClick={() => handleAction(app.id, 'needs_more_info')}
                        className="gap-1.5 text-xs font-bold"
                        style={{ background: 'hsl(var(--warning) / 0.1)', color: WARNING, border: `1px solid ${WARNING} / 0.3)` }}>
                        <AlertCircle className="w-3.5 h-3.5" /> More Info
                      </Button>
                      <Button type="button" size="sm" variant="ghost"
                        disabled={actioningId === app.id}
                        onClick={() => handleAction(app.id, 'reject')}
                        className="gap-1.5 text-xs font-bold"
                        style={{ background: 'hsl(var(--danger) / 0.08)', color: DANGER, border: `1px solid ${DANGER} / 0.25)` }}>
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Reviewed info */}
                {!isActionable && app.reviewed_at && (
                  <p className="text-[11px] pt-1" style={{ borderTop: '1px solid hsl(var(--divider) / 0.6)', color: 'hsl(var(--foreground-quiet))' }}>
                    Reviewed {new Date(app.reviewed_at).toLocaleDateString()}
                    {app.admin_notes && ` · ${app.admin_notes}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}