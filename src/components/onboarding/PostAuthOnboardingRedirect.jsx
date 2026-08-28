import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { resolveOnboardingStage, stagePath } from '@/components/onboarding/onboardingConfig';

/**
 * Bridges Base44 auth completion → onboarding wizard.
 *
 * Every time an incomplete non-admin user authenticates, if they are not
 * already inside the setup flow, redirect them to their current onboarding
 * stage. This fires on EVERY auth completion — no once-per-session gate —
 * so users who skip setup are always sent back to it on login.
 *
 * The OnboardingGuard backs this up on guarded routes.
 */
export default function PostAuthOnboardingRedirect() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoadingAuth || !isAuthenticated || !user) return;
    // Admins skip the wizard entirely.
    if (user.role === 'admin') return;
    // Already done — nothing to bridge.
    if (user.onboarding_complete === true) return;
    // Don't fight the wizard if they're already inside it.
    if (location.pathname.startsWith('/ProfileSetup')) return;
    if (location.pathname.startsWith('/ClaimUsername')) return;

    const stage = resolveOnboardingStage(user);
    const target = stagePath(stage);
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated, user, location.pathname, navigate]);

  return null;
}