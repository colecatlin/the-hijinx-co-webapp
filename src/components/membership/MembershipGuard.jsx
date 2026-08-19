import React from 'react';
import { Outlet } from 'react-router-dom';
import { useMembership } from '@/hooks/useMembership';
import MembershipPaywall from './MembershipPaywall';

const Loading = () => (
  <div className="flex h-screen items-center justify-center" style={{ background: 'hsl(var(--canvas))' }}>
    <div className="w-6 h-6 border-2 border-divider border-t-motion rounded-full animate-spin" />
  </div>
);

/**
 * MembershipGuard — gates all /racecore/* routes behind an active membership.
 *
 * - Admins bypass entirely.
 * - Users with racecore:access entitlement (Core/Pro/Elite) see RaceCoreLayout.
 * - Free tier and no-membership users see the MembershipPaywall.
 *
 * Used as an outer layout route wrapping RaceCoreLayout in App.jsx:
 *   <Route element={<MembershipGuard />}>
 *     <Route element={<RaceCoreLayout />}>...</Route>
 *   </Route>
 */
export default function MembershipGuard() {
  const { user, membership, tier, isLoading, isAdmin, hasRaceCoreAccess } = useMembership();

  if (isLoading || !user) return <Loading />;
  if (isAdmin || hasRaceCoreAccess) return <Outlet />;

  return <MembershipPaywall currentTier={tier} />;
}