/**
 * src/hooks/useIdentityAccess.jsx
 *
 * Cached, canonical identity + permission context for any module.
 * Fetches the current user and their EntityCollaborator relationships ONCE and
 * resolves the full identity context through buildIdentityContext (lib/identityAccess).
 * Use this instead of re-fetching base44.auth.me() / EntityCollaborator.filter() and
 * re-implementing permission logic in every component.
 *
 *   const { identity, canManageEntity, hasGrantedPermission, modules, navigation } = useIdentityAccess();
 *
 * Caching: currentUser + collaborators are staleTime 60s and shared by query key,
 * so every component using useIdentityAccess participates in the same cache.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { buildIdentityContext } from '@/lib/identityAccess';

const SHARED_STALE = 60_000;

export function useIdentityAccess() {
  const userQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: SHARED_STALE,
  });

  const user = userQuery.data;

  const collabQuery = useQuery({
    queryKey: ['myCollaborators', user?.id],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_id: user.id }),
    enabled: !!user?.id,
    staleTime: SHARED_STALE,
  });

  const collaborators = collabQuery.data || [];

  const context = useMemo(
    () => buildIdentityContext(user, collaborators),
    [user, collaborators],
  );

  const isLoading = userQuery.isLoading || (!!user && collabQuery.isLoading);
  const error = userQuery.error || collabQuery.error;

  return {
    ...context,
    user,
    rawCollaborators: collaborators,
    isLoading,
    error,
  };
}

export default useIdentityAccess;