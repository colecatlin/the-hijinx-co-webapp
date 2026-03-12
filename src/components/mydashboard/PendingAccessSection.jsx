import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Mail, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';

const ENTITY_TYPE_COLORS = {
  Driver: 'bg-blue-50 text-blue-700 border-blue-200',
  Team: 'bg-purple-50 text-purple-700 border-purple-200',
  Track: 'bg-green-50 text-green-700 border-green-200',
  Series: 'bg-orange-50 text-orange-700 border-orange-200',
};

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
      // Match both exact and lowercase email (invitations stored normalized)
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
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">Pending Access</h2>

      {/* Pending invitations */}
      {pendingInvitations.map(inv => (
        <div key={inv.id} className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800">{inv.entity_name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs border px-1.5 py-0 ${ENTITY_TYPE_COLORS[inv.entity_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {inv.entity_type}
              </Badge>
              <p className="text-xs text-blue-700">Invitation to join as editor</p>
              {inv.expiration_date && (() => {
                try { return <span className="text-xs text-blue-500">· Expires {format(new Date(inv.expiration_date), 'MMM d')}</span>; }
                catch { return null; }
              })()}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => window.location.href = `${createPageUrl('AcceptInvitation')}?code=${inv.code}`}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1 flex-shrink-0"
          >
            Accept <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      ))}

      {/* Pending claims */}
      {pendingClaims.map(claim => (
        <div key={claim.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">{claim.entity_name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs border px-1.5 py-0 ${ENTITY_TYPE_COLORS[claim.entity_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {claim.entity_type}
              </Badge>
              <p className="text-xs text-amber-700">Ownership claim · pending admin review</p>
              {claim.created_date && (() => {
                try { return <span className="text-xs text-amber-500">· Submitted {format(new Date(claim.created_date), 'MMM d')}</span>; }
                catch { return null; }
              })()}
            </div>
          </div>
          <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">Pending</Badge>
        </div>
      ))}

      {/* Approved claims */}
      {approvedClaims.map(claim => (
        <div key={claim.id} className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800">{claim.entity_name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs border px-1.5 py-0 ${ENTITY_TYPE_COLORS[claim.entity_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {claim.entity_type}
              </Badge>
              <p className="text-xs text-green-700">Claim approved · access is active</p>
            </div>
          </div>
          <Badge className="text-xs bg-green-100 text-green-700 border border-green-200 flex-shrink-0">Approved</Badge>
        </div>
      ))}

      {/* Rejected claims */}
      {rejectedClaims.map(claim => (
        <div key={claim.id} className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">{claim.entity_name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs border px-1.5 py-0 ${ENTITY_TYPE_COLORS[claim.entity_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {claim.entity_type}
              </Badge>
              <p className="text-xs text-red-600">Claim was not approved · contact support if this is an error</p>
            </div>
          </div>
          <Badge className="text-xs bg-red-100 text-red-600 border border-red-200 flex-shrink-0">Rejected</Badge>
        </div>
      ))}
    </div>
  );
}