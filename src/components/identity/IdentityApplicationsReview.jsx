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

  const counts = {
    pending: applications.filter((a) => a.status === 'pending').length,
    needs_more_info: applications.filter((a) => a.status === 'needs_more_info').length,
    approved: applications.filter((a) => a.status === 'approved').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
    all: applications.length,
  };

  const filterMeta = {
    pending: { headline: 'No pending applications', desc: 'New identity requests awaiting your review will appear here. When users submit an application, it lands in this queue for approval.' },
    needs_more_info: { headline: 'No applications need more info', desc: 'Applications where you requested additional evidence or clarification will show here once applicants respond.' },
    approved: { headline: 'No approved applications', desc: 'Approved identity requests are archived here for reference. Newly approved applications will appear in this list.' },
    rejected: { headline: 'No rejected applications', desc: 'Declined identity requests are retained here for audit purposes. Rejected applications will appear in this list.' },
    all: { headline: 'No applications yet', desc: 'Identity applications submitted by users requesting a non-Fan role will appear here for your review.' },
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black" style={{ color: 'hsl(var(--foreground))' }}>Identity Applications</h2>
        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
          Review and approve identity requests from users.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 rounded-xl p-2"
        style={{ background: 'hsl(var(--surface-elevated) / 0.5)', border: '1px solid hsl(var(--divider) / 0.5)' }}>
        {filters.map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
            style={filter === f ? {
              background: MOTION, color: 'hsl(var(--canvas))',
            } : {
              background: 'hsl(var(--surface-interactive) / 0.3)',
              color: 'hsl(var(--foreground-quiet))',
              border: '1px solid hsl(var(--divider) / 0.6)',
            }}>
            {f.replace(/_/g, ' ')}
            {counts[f] > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={filter === f
                  ? { background: 'hsl(var(--canvas) / 0.2)', color: 'hsl(var(--canvas))' }
                  : { background: 'hsl(var(--motion) / 0.15)', color: MOTION }}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
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
        <div className="flex items-center justify-center py-10">
          <div className="max-w-md w-full rounded-2xl p-8 text-center space-y-4"
            style={{ background: 'hsl(var(--surface-elevated) / 0.6)', border: '1px solid hsl(var(--divider) / 0.6)' }}>
            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
              style={{ background: 'hsl(var(--motion) / 0.1)', border: '1px solid hsl(var(--motion) / 0.2)' }}>
              <FileText className="w-6 h-6" style={{ color: MOTION }} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black" style={{ color: 'hsl(var(--foreground))' }}>
                {filterMeta[filter].headline}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                {filterMeta[filter].desc}
              </p>
            </div>
            {filters.filter((f) => f !== filter && counts[f] > 0).length > 0 && (
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'hsl(var(--foreground-quiet))' }}>
                  Jump to where work exists
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {filters.filter((f) => f !== filter && counts[f] > 0).map((f) => (
                    <button key={f} type="button" onClick={() => setFilter(f)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                      style={{ background: 'hsl(var(--motion) / 0.08)', color: MOTION, border: '1px solid hsl(var(--motion) / 0.25)' }}>
                      {f.replace(/_/g, ' ')}
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: 'hsl(var(--motion) / 0.2)', color: MOTION }}>
                        {counts[f]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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