import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from 'lucide-react';
import {
  CREDENTIAL_STATUS_COLORS, REQUEST_STATUS_COLORS, REQUEST_STATUS_LABELS,
  ACCESS_LEVEL_LABELS, CREDENTIAL_LEVEL_LABELS,
  getEffectiveCredentialStatus, logCredentialEvent,
} from '@/components/media/credentials/credentialHelpers.js';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

// ── Credential card ───────────────────────────────────────────────────────────

function CredentialCard({ cred, entityName }) {
  const [open, setOpen] = useState(false);
  const status = getEffectiveCredentialStatus(cred);
  const statusColor = CREDENTIAL_STATUS_COLORS[status] || 'bg-gray-700 text-gray-300';

  return (
    <div className="bg-[#171717] border border-gray-800 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-medium text-sm">{entityName || cred.scope_entity_id?.slice(0, 8)}</p>
              <Badge className={`text-xs ${statusColor}`}>{status}</Badge>
              {cred.credential_level && (
                <Badge className="bg-gray-800 text-gray-400 text-xs">
                  {CREDENTIAL_LEVEL_LABELS[cred.credential_level] || cred.credential_level}
                </Badge>
              )}
            </div>
            <p className="text-gray-500 text-xs mt-0.5 capitalize">
              {cred.scope_entity_type} · {ACCESS_LEVEL_LABELS[cred.access_level] || cred.access_level}
            </p>
            {cred.roles?.length > 0 && (
              <p className="text-gray-600 text-xs mt-0.5">{cred.roles.join(', ')}</p>
            )}
          </div>
          <div className="text-right text-xs text-gray-600 shrink-0">
            {cred.issued_at && <p>Issued {new Date(cred.issued_at).toLocaleDateString()}</p>}
            {cred.expires_at && (
              <p className={status === 'expired' ? 'text-red-400' : 'text-gray-600'}>
                {status === 'expired' ? 'Expired' : 'Expires'} {new Date(cred.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className="mt-2 text-xs text-gray-700 hover:text-gray-500 flex items-center gap-1 transition-colors"
        >
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {open ? 'Less' : 'Details'}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-800 p-4 bg-[#111] space-y-2 text-xs">
          {cred.requester_outlet_id && (
            <p className="text-gray-500">Outlet affiliated: <span className="text-gray-400">{cred.requester_outlet_id.slice(0, 12)}…</span></p>
          )}
          {cred.credential_scope && (
            <p className="text-gray-500">Scope: <span className="text-gray-400 capitalize">{cred.credential_scope}</span></p>
          )}
          {cred.scope_entity_type === 'event' && cred.scope_entity_id && (
            <Link
              to={`/EventProfile?id=${cred.scope_entity_id}`}
              className="flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> View Event
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Request card ─────────────────────────────────────────────────────────────

function RequestCard({ req, entityName }) {
  const [open, setOpen] = useState(false);
  const statusColor  = REQUEST_STATUS_COLORS[req.status] || 'bg-gray-700 text-gray-400';
  const statusLabel  = REQUEST_STATUS_LABELS[req.status] || req.status;

  return (
    <div className="bg-[#171717] border border-gray-800 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-medium text-sm">{entityName || req.target_entity_id?.slice(0, 8)}</p>
              <Badge className={`text-xs ${statusColor}`}>{statusLabel}</Badge>
            </div>
            <p className="text-gray-500 text-xs mt-0.5 capitalize">
              {req.target_entity_type} · {ACCESS_LEVEL_LABELS[req.requested_access_level] || req.requested_access_level}
            </p>
            {req.requested_roles?.length > 0 && (
              <p className="text-gray-600 text-xs mt-0.5">{req.requested_roles.join(', ')}</p>
            )}
          </div>
          <div className="text-right text-xs text-gray-600 shrink-0">
            {req.created_at && <p>Submitted {new Date(req.created_at).toLocaleDateString()}</p>}
            {req.reviewed_at && <p>Reviewed {new Date(req.reviewed_at).toLocaleDateString()}</p>}
          </div>
        </div>

        {req.status === 'denied' && req.review_notes && (
          <div className="mt-2 flex items-start gap-1.5 bg-red-900/10 border border-red-900/30 rounded p-2">
            <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-xs">{req.review_notes}</p>
          </div>
        )}

        {req.status === 'change_requested' && req.review_notes && (
          <div className="mt-2 flex items-start gap-1.5 bg-orange-900/10 border border-orange-900/30 rounded p-2">
            <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />
            <p className="text-orange-300 text-xs">{req.review_notes}</p>
          </div>
        )}

        {req.assignment_description && (
          <button
            onClick={() => setOpen(o => !o)}
            className="mt-2 text-xs text-gray-700 hover:text-gray-500 flex items-center gap-1 transition-colors"
          >
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {open ? 'Less' : 'Assignment details'}
          </button>
        )}
      </div>
      {open && req.assignment_description && (
        <div className="border-t border-gray-800 p-4 bg-[#111]">
          <p className="text-gray-500 text-xs leading-relaxed">{req.assignment_description}</p>
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, count, icon: Icon, iconClass, children, empty }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${iconClass}`} />
        <h3 className="text-gray-300 font-semibold text-sm">{title}</h3>
        <span className="text-gray-600 text-xs">({count})</span>
      </div>
      {count === 0 ? (
        <p className="text-gray-700 text-xs pl-6">{empty}</p>
      ) : children}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function MyCredentialsTab({ mediaUser, currentUser }) {
  const [view, setView] = useState('all'); // all | active | requests | expired

  const { data: credentials = [], isLoading: loadingCreds } = useQuery({
    queryKey: ['myMediaCredentials', mediaUser?.id],
    queryFn: () => base44.entities.MediaCredential.filter({ holder_media_user_id: mediaUser.id }),
    enabled: !!mediaUser?.id,
    select: data => [...data].sort((a, b) =>
      new Date(b.issued_at || b.created_date || 0) - new Date(a.issued_at || a.created_date || 0)
    ),
  });

  const { data: requests = [], isLoading: loadingReqs } = useQuery({
    queryKey: ['myCredentialRequests', mediaUser?.id],
    queryFn: () => base44.entities.CredentialRequest.filter({ holder_media_user_id: mediaUser.id }),
    enabled: !!mediaUser?.id,
    select: data => [...data].sort((a, b) =>
      new Date(b.created_at || b.created_date || 0) - new Date(a.created_at || a.created_date || 0)
    ),
  });

  // Reference data for resolving entity names
  const { data: events = [] } = useQuery({
    queryKey: ['eventsForCreds'],
    queryFn: () => base44.entities.Event.list(),
    enabled: !!mediaUser,
  });
  const { data: tracks = [] } = useQuery({
    queryKey: ['tracksForCreds'],
    queryFn: () => base44.entities.Track.list(),
    enabled: !!mediaUser,
  });
  const { data: seriesList = [] } = useQuery({
    queryKey: ['seriesForCreds'],
    queryFn: () => base44.entities.Series.list(),
    enabled: !!mediaUser,
  });

  const resolveEntityName = (type, id) => {
    if (!id) return null;
    if (type === 'event')  return events.find(e => e.id === id)?.name;
    if (type === 'track')  return tracks.find(t => t.id === id)?.name;
    if (type === 'series') return seriesList.find(s => s.id === id)?.name;
    return id.slice(0, 10);
  };

  if (!mediaUser) return (
    <div className="text-center py-16 text-gray-600">
      <p className="text-sm">Complete your profile to view credentials.</p>
    </div>
  );

  const loading = loadingCreds || loadingReqs;

  // Derived groups
  const activeCreds   = credentials.filter(c => getEffectiveCredentialStatus(c) === 'active');
  const expiredCreds  = credentials.filter(c => getEffectiveCredentialStatus(c) === 'expired');
  const revokedCreds  = credentials.filter(c => getEffectiveCredentialStatus(c) === 'revoked');

  const pendingReqs   = requests.filter(r => ['draft', 'applied', 'change_requested', 'under_review'].includes(r.status));
  const approvedReqs  = requests.filter(r => r.status === 'approved');
  const deniedReqs    = requests.filter(r => r.status === 'denied');

  const tabs = [
    { id: 'all',      label: 'All' },
    { id: 'active',   label: `Active (${activeCreds.length})` },
    { id: 'requests', label: `Requests (${pendingReqs.length})` },
    { id: 'history',  label: 'History' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Credentials</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {credentials.length} issued · {activeCreds.length} active · {requests.length} requests
          </p>
        </div>
        <Link to={createPageUrl('MediaPortal') + '?tab=requests'}>
          <Button size="sm" className="bg-white text-black hover:bg-gray-100 text-xs gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Request Credential
          </Button>
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[#111] rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
              view === t.id ? 'bg-[#232323] text-white' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-600 text-sm">Loading...</p>
      ) : (
        <div className="space-y-8">
          {/* ALL or ACTIVE */}
          {(view === 'all' || view === 'active') && (
            <Section title="Active Credentials" count={activeCreds.length} icon={CheckCircle2} iconClass="text-green-500" empty="No active credentials.">
              <div className="space-y-3">
                {activeCreds.map(c => (
                  <CredentialCard key={c.id} cred={c} entityName={resolveEntityName(c.scope_entity_type, c.scope_entity_id)} />
                ))}
              </div>
            </Section>
          )}

          {/* REQUESTS */}
          {(view === 'all' || view === 'requests') && (
            <Section title="Pending Requests" count={pendingReqs.length} icon={Clock} iconClass="text-amber-400" empty="No pending requests.">
              <div className="space-y-3">
                {pendingReqs.map(r => (
                  <RequestCard key={r.id} req={r} entityName={resolveEntityName(r.target_entity_type, r.target_entity_id)} />
                ))}
              </div>
            </Section>
          )}

          {/* HISTORY */}
          {(view === 'all' || view === 'history') && (
            <>
              {expiredCreds.length > 0 && (
                <Section title="Expired" count={expiredCreds.length} icon={Clock} iconClass="text-gray-600" empty="">
                  <div className="space-y-3">
                    {expiredCreds.map(c => (
                      <CredentialCard key={c.id} cred={c} entityName={resolveEntityName(c.scope_entity_type, c.scope_entity_id)} />
                    ))}
                  </div>
                </Section>
              )}
              {revokedCreds.length > 0 && (
                <Section title="Revoked" count={revokedCreds.length} icon={XCircle} iconClass="text-red-500" empty="">
                  <div className="space-y-3">
                    {revokedCreds.map(c => (
                      <CredentialCard key={c.id} cred={c} entityName={resolveEntityName(c.scope_entity_type, c.scope_entity_id)} />
                    ))}
                  </div>
                </Section>
              )}
              {deniedReqs.length > 0 && (
                <Section title="Denied Requests" count={deniedReqs.length} icon={XCircle} iconClass="text-red-500" empty="">
                  <div className="space-y-3">
                    {deniedReqs.map(r => (
                      <RequestCard key={r.id} req={r} entityName={resolveEntityName(r.target_entity_type, r.target_entity_id)} />
                    ))}
                  </div>
                </Section>
              )}
              {approvedReqs.length > 0 && (
                <Section title="Approved Requests" count={approvedReqs.length} icon={CheckCircle2} iconClass="text-green-500" empty="">
                  <div className="space-y-3">
                    {approvedReqs.map(r => (
                      <RequestCard key={r.id} req={r} entityName={resolveEntityName(r.target_entity_type, r.target_entity_id)} />
                    ))}
                  </div>
                </Section>
              )}
              {expiredCreds.length === 0 && revokedCreds.length === 0 && deniedReqs.length === 0 && approvedReqs.length === 0 && (
                <p className="text-gray-700 text-xs">No credential history yet.</p>
              )}
            </>
          )}

          {/* Empty overall state */}
          {credentials.length === 0 && requests.length === 0 && (
            <Card className="bg-[#171717] border-gray-800">
              <CardContent className="py-12 text-center">
                <Shield className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No credentials or requests yet.</p>
                <p className="text-gray-600 text-xs mt-1">Request a credential to cover events, tracks, or series.</p>
                <Link to={createPageUrl('MediaPortal') + '?tab=requests'}>
                  <Button size="sm" variant="outline" className="mt-4 border-gray-700 text-gray-400">
                    Submit a Credential Request
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}