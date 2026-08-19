import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Central membership hook — used by MembershipGuard, MembershipPaywall,
 * MembershipPanel, and any component that needs to check entitlements.
 *
 * Ensures a Free membership exists for the user on first load.
 */
export function useMembership() {
  const queryClient = useQueryClient();

  const { data: isAuthenticated } = useQuery({
    queryKey: ['isAuthenticated'],
    queryFn: () => base44.auth.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: !!isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const membershipQuery = useQuery({
    queryKey: ['myMembership'],
    queryFn: async () => {
      const res = await base44.functions.invoke('ensureFreeMembership', {});
      return res?.data?.membership;
    },
    enabled: !!isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  const membership = membershipQuery.data;
  const tierKey = membership?.tier_key;

  const tierQuery = useQuery({
    queryKey: ['myTier', tierKey],
    queryFn: async () => {
      const tiers = await base44.entities.SubscriptionTier.filter({ tier_key: tierKey });
      return (tiers || [])[0];
    },
    enabled: !!tierKey,
    staleTime: 5 * 60 * 1000,
  });

  const allTiersQuery = useQuery({
    queryKey: ['allSubscriptionTiers'],
    queryFn: () => base44.entities.SubscriptionTier.list('display_order', 50),
    staleTime: 5 * 60 * 1000,
  });

  const checkoutMutation = useMutation({
    mutationFn: (tier_key) => base44.functions.invoke('createSubscriptionCheckout', { tier_key }),
    onSuccess: (res) => {
      const url = res?.data?.url;
      if (url) window.location.href = url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => base44.functions.invoke('createCustomerPortalSession', {}),
    onSuccess: (res) => {
      const url = res?.data?.url;
      if (url) window.location.href = url;
    },
  });

  const isAdmin = user?.role === 'admin';
  const features = tierQuery.data?.features || [];
  const hasRaceCoreAccess = isAdmin || features.includes('racecore:access');

  return {
    user,
    membership,
    tier: tierQuery.data,
    allTiers: allTiersQuery.data || [],
    isLoading: membershipQuery.isLoading || (!!tierKey && tierQuery.isLoading),
    isAdmin,
    features,
    hasRaceCoreAccess,
    checkoutMutation,
    portalMutation,
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['myMembership'] });
      queryClient.invalidateQueries({ queryKey: ['myTier'] });
    },
  };
}

/**
 * Check if the current user has a specific entitlement.
 * Returns false for admins' use case is not covered here — admins should
 * be checked separately. This hook is for UI gating only.
 */
export function useHasEntitlement(key) {
  const { features, isAdmin } = useMembership();
  return isAdmin || features.includes(key);
}