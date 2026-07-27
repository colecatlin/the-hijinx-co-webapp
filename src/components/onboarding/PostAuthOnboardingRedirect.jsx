import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { resolveOnboardingStage, stagePath } from '@/components/onboarding/onboardingConfig';

/**
 * Bridges Base44 auth completion → onboarding wizard.
 *
 * Right after a user authenticates (register or login), if their onboarding
 * is not yet complete and they are not already inside the setup flow, this
 * gently redirects them once to their current onboarding stage so they are
 * never left wondering "what do I do now?".
 *
 * Fires at most once per browser session (sessionStorage flag) so returning
 * incomplete users who just want to browse public pages are not trapped.
 * The OnboardingGuard still backs this up on any guarded route.
 */
const SESSION_FLAG = 'r44_onboarding_handoff_done';

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
    // Only hand off once per browser session.
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    sessionStorage.setItem(SESSION_FLAG, '1');

    const stage = resolveOnboardingStage(user);
    const target = stagePath(stage);
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [isLoadingAuth, isAuthenticated, user, location.pathname, navigate]);

  return null;
}