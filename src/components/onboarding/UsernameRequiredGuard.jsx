import React, { useMemo } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useUsernameRequired, resolveReturnPath } from '@/hooks/useUsernameRequired';
import { createPageUrl } from '@/components/utils';

const Loading = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#060A0A' }}>
    <div className="w-8 h-8 border-4 border-slate-700 border-t-[#1DA1A1] rounded-full animate-spin" />
  </div>
);

/**
 * UsernameRequiredGuard
 * ---------------------------------------------------------------------------
 * Wraps any feature that requires a public identity. If the current user has
 * no username, they're redirected to the lightweight ClaimUsername flow with
 * a `?return_to=` that sends them straight back to this feature once they
 * choose one.
 *
 * - Public visitors (not logged in) render children unchanged — auth
 *   guards handle unauthenticated access elsewhere.
 * - Admins bypass the guard.
 * - Never fires inside the /ProfileSetup flow (avoids a redirect loop while
 *   onboarding is in progress).
 * - The username uniqueness check itself stays in the backend
 *   `checkUsernameUnique` function — this guard only checks presence.
 *
 * Usage:
 *   <UsernameRequiredGuard><CreateTeamButton /></UsernameRequiredGuard>
 */
export default function UsernameRequiredGuard({ children, featureLabel }) {
  const { hasUsername, isAuthenticated, isLoading } = useUsernameRequired();
  const location = useLocation();
  const navigate = useNavigate();

  const target = useMemo(() => {
    const params = new URLSearchParams();
    if (featureLabel) params.set('feature', featureLabel);
    params.set('return_to', location.pathname + (location.search || ''));
    return `/ClaimUsername?${params.toString()}`;
    // Only depend on the guard-relevant inputs; `navigate` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, featureLabel]);

  if (isLoading) return <Loading />;

  // If not authenticated, allow render — a higher-level auth gate handles login.
  if (!isAuthenticated) return children;

  // Avoid redirect loops if the guard is somehow rendered inside setup.
  if (location.pathname.startsWith('/ProfileSetup') || location.pathname.startsWith('/ClaimUsername')) {
    return children;
  }

  // Has a username → feature proceeds normally.
  if (hasUsername) return children;

  // No username → never block onboarding progress. Only block explicit
  // public-identity features.
  return <Navigate to={target} replace />;
}

/**
 * Helper: other code can call this to decide whether to show its own inline
 * prompt instead of wrapping with the guard. Returns true when the current
 * user needs a username.
 */
export function useNeedsUsername() {
  const { hasUsername, isAuthenticated, isLoading } = useUsernameRequired();
  return { needsUsername: isAuthenticated && !hasUsername, isLoading };
}