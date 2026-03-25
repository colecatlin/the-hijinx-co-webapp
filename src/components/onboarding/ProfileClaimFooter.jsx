import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Footer-level claim CTA shown at the bottom of all entity profiles.
 * - If unclaimed: shows "Claim this profile" → routes to /dashboard/claims?mode=claim
 * - If claimed: shows "This profile is already claimed" + "Request ownership review" → mode=dispute
 */
export default function ProfileClaimFooter({ entityType, entityId, entityName }) {
  const navigate = useNavigate();

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    staleTime: 60_000,
  });

  const { data: collabs = [] } = useQuery({
    queryKey: ['claimFooter_collabs', entityType, entityId],
    queryFn: () => base44.entities.EntityCollaborator.filter({ entity_type: entityType, entity_id: entityId }),
    enabled: !!entityId,
    staleTime: 60_000,
  });

  const isClaimed = collabs.some(c => c.role === 'owner');

  const buildUrl = (mode) => {
    const p = new URLSearchParams({
      entityType: entityType || '',
      entityId: entityId || '',
      entityName: entityName || '',
      mode,
    });
    return `/dashboard/claims?${p.toString()}`;
  };

  const handleAction = (mode) => {
    if (!isAuthenticated) {
      base44.auth.redirectToLogin(buildUrl(mode));
      return;
    }
    navigate(buildUrl(mode));
  };

  if (!entityId) return null;

  return (
    <div className="border-t border-gray-100 mt-16 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start gap-2.5">
          {isClaimed
            ? <ShieldAlert className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            : <ShieldCheck className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          }
          <div>
            <p className="text-sm font-medium text-gray-600">
              {isClaimed ? 'This profile is already claimed.' : 'Is this your profile?'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isClaimed
                ? 'If you believe you are the rightful owner, you can request an ownership review.'
                : 'Claim this profile to manage it and keep information up to date.'}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          {isClaimed ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction('dispute')}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              Request ownership review
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('claim')}
              className="text-xs border-gray-300 text-gray-600 hover:text-gray-900 gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Claim this profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}