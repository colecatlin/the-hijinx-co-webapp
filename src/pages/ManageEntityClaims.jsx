import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ManagementLayout from '@/components/management/ManagementLayout';
import ManagementShell from '@/components/management/ManagementShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Clock, User, Users, MapPin, Trophy, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', Icon: Clock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700 border-green-200', Icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', Icon: XCircle },
};

const TYPE_ICONS = { Driver: User, Team: Users, Track: MapPin, Series: Trophy };
const FILTERS = ['pending', 'all', 'approved', 'rejected'];

export default function ManageEntityClaims() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);
  // grant role override per claim
  const [roleOverrides, setRoleOverrides] = useState({});

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['entityClaimRequests', filter],
    queryFn: () =>
      filter === 'all'
        ? base44.entities.EntityClaimRequest.list('-created_date', 100)
        : base44.entities.EntityClaimRequest.filter({ status: filter }, '-created_date', 100),
    staleTime: 30_000,
  });

  const pendingCount = claims.filter(c => c.status === 'pending').length;

  const handleAction = async (claimId, action) => {
    const role = roleOverrides[claimId] || 'owner';
    setActionLoading(claimId + action);
    const res = await base44.functions.invoke('approveEntityClaim', { claim_id: claimId, action, role }).catch(() => null);
    setActionLoading(null);
    if (res?.data?.success) {
      queryClient.invalidateQueries({ queryKey: ['entityClaimRequests'] });
    }
  };

  return (
    <ManagementLayout currentPage="ManageEntityClaims">
      <ManagementShell
        title="Entity Claims"
        subtitle="Review ownership and access claim requests submitted by users."
        maxWidth="max-w-4xl"
      >
        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
              {f === 'pending' && pendingCount > 0 && filter !== 'pending' && (
                <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No {filter !== 'all' ? filter : ''} claims found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map(claim => {
              const { label, color, Icon: StatusIcon } = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
              const TypeIcon = TYPE_ICONS[claim.entity_type] || User;
              const isPending = claim.status === 'pending';
              const currentRole = roleOverrides[claim.id] || 'owner';

              return (
                <div key={claim.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <TypeIcon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">{claim.entity_name}</span>
                          <Badge className={`text-[10px] px-2 py-0.5 border ${color}`}>
                            <StatusIcon className="w-3 h-3 mr-1 inline" />{label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{claim.entity_type}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Requested by <strong>{claim.user_email}</strong>
                          {claim.created_date && ` · ${format(new Date(claim.created_date), 'MMM d, yyyy')}`}
                        </p>
                        {claim.justification && (
                          <p className="text-xs text-gray-600 mt-2 italic bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            "{claim.justification}"
                          </p>
                        )}
                        {!isPending && claim.reviewed_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            Reviewed {format(new Date(claim.reviewed_at), 'MMM d, yyyy')}
                            {claim.granted_role && ` · Granted: ${claim.granted_role}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {/* Role selector for this claim */}
                        <div className="flex gap-1 bg-gray-100 p-0.5 rounded-md">
                          {['owner', 'editor'].map(r => (
                            <button
                              key={r}
                              onClick={() => setRoleOverrides(prev => ({ ...prev, [claim.id]: r }))}
                              className={`px-2.5 py-1 text-xs rounded transition-all ${
                                currentRole === r ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500'
                              }`}
                            >
                              Grant as {r}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!!actionLoading}
                            onClick={() => handleAction(claim.id, 'reject')}
                            className="text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50 flex-1"
                          >
                            {actionLoading === claim.id + 'reject'
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <XCircle className="w-3.5 h-3.5" />}
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            disabled={!!actionLoading}
                            onClick={() => handleAction(claim.id, 'approve')}
                            className="text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white flex-1"
                          >
                            {actionLoading === claim.id + 'approve'
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Approve
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ManagementShell>
    </ManagementLayout>
  );
}