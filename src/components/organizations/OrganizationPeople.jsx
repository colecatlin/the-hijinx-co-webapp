import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { approveRelationship, denyRelationship, revokeRelationship } from '@/components/relationships/relationshipService';
import { buildJoinUrl } from '@/components/organizations/organizationService';
import { Copy, Check, CheckCircle2, XCircle, UserPlus, Shield, RefreshCw, Trash2 } from 'lucide-react';

const TEAL = '#1DA1A1';

/**
 * People — reuse the Organization Management / lifecycle system. Reads
 * members (EntityCollaborator) and exposes approve / deny / revoke + invite
 * link. No org-specific logic.
 */
export default function OrganizationPeople({ orgType, entityId, members = [], isAdmin, currentUser, onMutated }) {
  const pending = members.filter((m) => m.status === 'pending');
  const admins = members.filter((m) => m.status === 'approved' && m.permission_level === 'admin');
  const staff = members.filter((m) => m.status === 'approved' && (m.permission_level === 'staff' || !m.permission_level));
  const historical = members.filter((m) => m.status === 'revoked' || m.status === 'denied');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(null);

  const joinUrl = buildJoinUrl(orgType, entityId);

  const copy = () => {
    navigator.clipboard?.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const act = async (action, collab) => {
    setBusy(collab.id);
    try {
      if (action === 'approve') {
        const tmpl = buildOwnerTemplate(collab.role_key);
        await approveRelationship({
          collaboratorId: collab.id,
          permissionLevel: tmpl.permissionLevel,
          grantedPermissions: tmpl.grantedPermissions,
          reviewNotes: 'Approved via organization People panel.',
        });
      } else if (action === 'deny') {
        await denyRelationship({ collaboratorId: collab.id, reviewNotes: 'Denied by org admin.' });
      } else if (action === 'revoke') {
        await revokeRelationship({ collaboratorId: collab.id, reviewNotes: 'Revoked by org admin.' });
      }
      onMutated?.();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Invite link */}
      <div className="p-4 rounded-xl" style={{ background: 'rgba(29,161,161,0.06)', border: '1px solid rgba(29,161,161,0.18)' }}>
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="w-4 h-4" style={{ color: TEAL }} />
          <h3 className="text-sm font-bold text-white">Invite People</h3>
        </div>
        <p className="text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Share this link. Joining goes through the standard relationship approval flow.
        </p>
        <div className="flex items-center gap-2">
          <input readOnly value={joinUrl} className="flex-1 h-9 px-3 rounded-lg text-xs font-mono"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }} />
          <button onClick={copy} className="px-3 h-9 rounded-lg text-xs font-bold flex items-center gap-1"
            style={{ background: TEAL, color: '#050A0A' }}>
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
        </div>
      </div>

      <Section title="Pending Requests" count={pending.length} empty="No pending requests.">
        {pending.map((m) => (
          <MemberRow key={m.id} m={m} busy={busy === m.id} isAdmin={isAdmin}
            actions={[
              { label: 'Approve', icon: CheckCircle2, color: TEAL, onClick: () => act('approve', m) },
              { label: 'Deny', icon: XCircle, color: '#ef4444', onClick: () => act('deny', m) },
            ]} />
        ))}
      </Section>

      <Section title="Administrators" count={admins.length} empty="No administrators.">
        {admins.map((m) => (
          <MemberRow key={m.id} m={m} busy={busy === m.id} isAdmin={isAdmin}
            actions={isAdmin && m.user_id !== currentUser?.id
              ? [{ label: 'Revoke', icon: Trash2, color: '#ef4444', onClick: () => act('revoke', m) }]
              : []} />
        ))}
      </Section>

      <Section title="Staff & Members" count={staff.length} empty="No staff members.">
        {staff.map((m) => (
          <MemberRow key={m.id} m={m} busy={busy === m.id} isAdmin={isAdmin}
            actions={isAdmin ? [{ label: 'Revoke', icon: Trash2, color: '#ef4444', onClick: () => act('revoke', m) }] : []} />
        ))}
      </Section>

      <Section title="Historical" count={historical.length} empty="No historical members.">
        {historical.map((m) => (
          <MemberRow key={m.id} m={m} muted />
        ))}
      </Section>
    </div>
  );
}

function buildOwnerTemplate(roleKey) {
  if (roleKey === 'owner') return { permissionLevel: 'admin', grantedPermissions: ['*'] };
  return { permissionLevel: 'staff', grantedPermissions: [] };
}

function Section({ title, count, empty, children }) {
  const items = children ? (Array.isArray(children) ? children : [children]) : [];
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: 'rgba(255,255,255,0.4)' }}>{title}</h3>
        <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>({count})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] px-3 py-2" style={{ color: 'rgba(255,255,255,0.25)' }}>{empty}</p>
      ) : (
        <div className="space-y-1.5">{items}</div>
      )}
    </div>
  );
}

function MemberRow({ m, actions = [], busy, isAdmin, muted }) {
  const statusColor = m.status === 'approved' ? TEAL : m.status === 'pending' ? '#f59e0b' : 'rgba(255,255,255,0.3)';
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', opacity: muted ? 0.55 : 1 }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(29,161,161,0.1)', border: '1px solid rgba(29,161,161,0.25)' }}>
        <Shield className="w-3.5 h-3.5" style={{ color: TEAL }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white truncate">{m.user_email || 'Member'}</div>
        <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: statusColor }}>
          {m.role_key || 'member'} · {m.status}{m.permission_level ? ` · ${m.permission_level}` : ''}
        </div>
      </div>
      {isAdmin && actions.length > 0 && (
        <div className="flex items-center gap-1">
          {actions.map((a) => (
            <button key={a.label} onClick={a.onClick} disabled={busy}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
              style={{ background: `${a.color}22`, color: a.color, border: `1px solid ${a.color}44` }}>
              <a.icon className="w-3.5 h-3.5" /> {a.label}
            </button>
          ))}
          {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: 'rgba(255,255,255,0.4)' }} />}
        </div>
      )}
    </div>
  );
}