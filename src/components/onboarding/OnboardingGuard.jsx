import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { resolveOnboardingStage, stagePath } from '@/components/onboarding/onboardingConfig';

const Loading = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#060A0A' }}>
    <div className="w-8 h-8 border-4 border-slate-700 border-t-[#1DA1A1] rounded-full animate-spin" />
  </div>
);

/**
 * Centralized onboarding guard.
 *
 * - Incomplete onboarding (onboarding_complete !== true) → redirect to the
 *   user's current Profile Setup stage.
 * - Never fires inside the /ProfileSetup flow (prevents loops).
 * - Admins bypass the guard.
 * - Public/legal/auth routes are not wrapped, so they stay accessible.
 * - Does NOT depend on pending EntityCollaborator approvals — approval status
 *   is separate from onboarding completion.
 *
 * Wrap any protected route's element with <OnboardingGuard>...</OnboardingGuard>.
 */
export default function OnboardingGuard({ children }) {
  const { user, isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoadingAuth || !isAuthenticated) {
    // If not yet authenticated, let auth flow / protected route handle it.
    if (!isAuthenticated && !isLoadingAuth) return children;
    return <Loading />;
  }

  // Admins are always admitted.
  if (user?.role === 'admin') return children;

  // Avoid redirect loop inside the setup flow itself.
  if (location.pathname.startsWith('/ProfileSetup')) return children;

  // Completed users proceed normally.
  if (user?.onboarding_complete === true) return children;

  // Incomplete — send to their current stage.
  const stage = resolveOnboardingStage(user);
  const target = stagePath(stage);
  if (location.pathname === target) return children;
  return <Navigate to={target} replace />;
}