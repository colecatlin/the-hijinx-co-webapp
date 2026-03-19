import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

/**
 * Shows a "Claim this profile" CTA on entity public pages.
 * Routes to the Claims Center dashboard with prefilled entity params.
 * Only visible when:
 * - user is logged in
 * - user has no existing collaborator access
 * - entity has no current owner
 * - no pending/approved claim exists
 */
export default function ClaimEntityButton({ entityType, entityId, entityName }) {
  const navigate = useNavigate();

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    staleTime: 60_000,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
    staleTime: 60_000,
  });

  const { data: existingCollabs = [] } = useQuery({
    queryKey: ['claimCheck_collabs', entityType, entityId, user?.id],
    queryFn: () => base44.entities.EntityCollaborator.filter({ entity_type: entityType, entity_id: entityId }),
    enabled: !!isAuthenticated && !!entityId,
    staleTime: 30_000,
  });

  const { data: existingClaims = [] } = useQuery({
    queryKey: ['claimCheck_claims', entityType, entityId, user?.id],
    queryFn: () => base44.entities.EntityClaimRequest.filter({
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
    }),
    enabled: !!user?.id && !!entityId,
    staleTime: 30_000,
  });

  if (!isAuthenticated) return null;

  const userHasAccess = existingCollabs.some(c => c.user_id === user?.id);
  if (userHasAccess) return null;

  const hasOwner = existingCollabs.some(c => c.role === 'owner');
  if (hasOwner) return null;

  const existingPending = existingClaims.find(c => c.status === 'pending');
  const existingApproved = existingClaims.find(c => c.status === 'approved');
  if (existingApproved) return null;

  const claimsUrl = `/ClaimsCenter?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}&entityName=${encodeURIComponent(entityName || '')}`;

  if (existingPending) {
    return (
      <button
        onClick={() => navigate(claimsUrl)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
        Claim pending · View status
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate(claimsUrl)}
      className="gap-1.5 text-xs border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400"
    >
      <ShieldCheck className="w-3.5 h-3.5" />
      Claim Profile
    </Button>
  );
}