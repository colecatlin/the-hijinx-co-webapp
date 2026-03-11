import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock } from 'lucide-react';

export default function PendingClaimsNotice({ userId }) {
  const { data: claims = [] } = useQuery({
    queryKey: ['pendingClaims', userId],
    queryFn: () => base44.entities.EntityClaimRequest.filter({ user_id: userId, status: 'pending' }),
    enabled: !!userId,
    staleTime: 60_000,
  });

  if (!claims.length) return null;

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-800">
          {claims.length} Pending Claim{claims.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          {claims.map(c => c.entity_name).join(', ')} — awaiting admin review.
        </p>
      </div>
    </div>
  );
}