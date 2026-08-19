import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Clock, Mail, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';

const MOTION = 'hsl(var(--motion))';
const MOTION_HOVER = 'hsl(var(--motion-hover))';
const WARNING = 'hsl(var(--warning))';
const DANGER = 'hsl(var(--danger))';

const STATUS_STYLES = {
  invitation: {
    bg: `hsl(var(--motion) / 0.08)`,
    border: `hsl(var(--motion) / 0.25)`,
    iconColor: MOTION,
    textColor: MOTION,
    Icon: Mail,
    label: 'Invitation',
  },
  pending: {
    bg: `hsl(var(--warning) / 0.08)`,
    border: `hsl(var(--warning) / 0.25)`,
    iconColor: WARNING,
    textColor: WARNING,
    Icon: Clock,
    label: 'Under Review',
  },
  approved: {
    bg: `hsl(var(--motion) / 0.08)`,
    border: `hsl(var(--motion) / 0.2)`,
    iconColor: MOTION,
    textColor: MOTION,
    Icon: CheckCircle2,
    label: 'Approved',
  },
  rejected: {
    bg: `hsl(var(--danger) / 0.08)`,
    border: `hsl(var(--danger) / 0.2)`,
    iconColor: DANGER,
    textColor: DANGER,
    Icon: XCircle,
    label: 'Not Approved',
  },
};

function AccessRow({ style, children, badge, action }) {
  const { bg, border, iconColor, Icon, label, textColor } = style;
  const BadgeIcon = Icon;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: bg, border: `1px solid ${border}` }}>
      <BadgeIcon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor }} />
      <div className="flex-1 min-w-0">{children}</div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textColor }}>{badge || label}</span>
        {action}
      </div>
    </div>
  );
}

export default function PendingAccessSection({ user }) {
  const { data: claims = [] } = useQuery({
    queryKey: ['allClaims', user?.id],
    queryFn: () => base44.entities.EntityClaimRequest.filter({ user_id: user.id }, '-created_date', 20),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['pendingInvitations', user?.email],
    queryFn: async () => {
      const norm = (user.email || '').toLowerCase();
      const [exact, normalized] = await Promise.all([
        base44.entities.Invitation.filter({ email: user.email, status: 'pending' }),
        norm !== user.email ? base44.entities.Invitation.filter({ email: norm, status: 'pending' }) : Promise.resolve([]),
      ]);
      const seen = new Set();
      return [...exact, ...normalized].filter(inv => {
        if (seen.has(inv.id)) return false;
        seen.add(inv.id);
        return true;
      });
    },
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const pendingClaims = claims.filter(c => c.status === 'pending');
  const approvedClaims = claims.filter(c => c.status === 'approved');
  const rejectedClaims = claims.filter(c => c.status === 'rejected');
  const hasAnything = pendingClaims.length > 0 || approvedClaims.length > 0 || rejectedClaims.length > 0 || pendingInvitations.length > 0;

  if (!hasAnything) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: 'hsl(var(--foreground-quiet))' }}>
        Pending Access
      </p>

      {pendingInvitations.map(inv => (
        <AccessRow key={inv.id} style={STATUS_STYLES.invitation} badge="Invited"
          action={
            <button type="button"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
              style={{ background: MOTION, color: 'hsl(var(--canvas))' }}
              onClick={() => window.location.href = `${createPageUrl('AcceptInvitation')}?code=${inv.code}`}
              onMouseEnter={e => e.currentTarget.style.background = MOTION_HOVER}
              onMouseLeave={e => e.currentTarget.style.background = MOTION}
            >
              Accept <ChevronRight className="w-3 h-3" />
            </button>
          }
        >
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{inv.entity_name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            {inv.entity_type} · Invitation to join as editor
            {inv.expiration_date && (() => {
              try { return ` · Expires ${format(new Date(inv.expiration_date), 'MMM d')}`; }
              catch { return ''; }
            })()}
          </p>
        </AccessRow>
      ))}

      {pendingClaims.map(claim => (
        <AccessRow key={claim.id} style={STATUS_STYLES.pending}>
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{claim.entity_name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            {claim.entity_type} · Ownership claim pending admin review
            {claim.created_date && (() => {
              try { return ` · Submitted ${format(new Date(claim.created_date), 'MMM d')}`; }
              catch { return ''; }
            })()}
          </p>
        </AccessRow>
      ))}

      {approvedClaims.map(claim => (
        <AccessRow key={claim.id} style={STATUS_STYLES.approved} badge="Approved">
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{claim.entity_name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            {claim.entity_type} · Claim approved · access is active
          </p>
        </AccessRow>
      ))}

      {rejectedClaims.map(claim => (
        <AccessRow key={claim.id} style={STATUS_STYLES.rejected} badge="Rejected">
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{claim.entity_name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            {claim.entity_type} · Not approved · contact support if this is an error
          </p>
        </AccessRow>
      ))}
    </div>
  );
}