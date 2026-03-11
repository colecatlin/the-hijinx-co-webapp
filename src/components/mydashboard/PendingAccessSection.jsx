import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Mail, ChevronRight } from 'lucide-react';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';

export default function PendingAccessSection({ user }) {
  const { data: pendingClaims = [] } = useQuery({
    queryKey: ['pendingClaims', user?.id],
    queryFn: () => base44.entities.EntityClaimRequest.filter({ user_id: user.id, status: 'pending' }),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['pendingInvitations', user?.email],
    queryFn: () => base44.entities.Invitation.filter({ email: user.email, status: 'pending' }),
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  if (pendingClaims.length === 0 && pendingInvitations.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">Pending Access</h2>

      {pendingClaims.map(claim => (
        <div key={claim.id} className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">{claim.entity_name}</p>
            <p className="text-xs text-amber-700">Ownership claim pending admin review</p>
          </div>
          <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">Pending</Badge>
        </div>
      ))}

      {pendingInvitations.map(inv => (
        <div key={inv.id} className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800">{inv.entity_name}</p>
            <div className="flex items-center gap-2 flex-wrap">
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
    </div>
  );
}