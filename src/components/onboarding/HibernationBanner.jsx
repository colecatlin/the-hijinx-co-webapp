import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { resolveOnboardingStage, stagePath } from '@/components/onboarding/onboardingConfig';
import { AlertCircle, ArrowRight } from 'lucide-react';

/**
 * HibernationBanner — shown to authenticated non-admin users whose onboarding
 * is not yet complete.
 *
 * - On public pages: a full-width bar below the header with "Your account is
 *   paused — complete setup to activate" and a "Complete setup →" button.
 * - On ProfileSetup: a compact inline notice above the progress indicator
 *   with "Complete your profile to activate your account — a handle is required".
 */
export default function HibernationBanner() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoadingAuth || !isAuthenticated || !user) return null;
  if (user.role === 'admin') return null;
  if (user.onboarding_complete === true) return null;

  const isProfileSetup = location.pathname.startsWith('/ProfileSetup');

  const handleCompleteSetup = () => {
    const stage = resolveOnboardingStage(user);
    navigate(stagePath(stage));
  };

  if (isProfileSetup) {
    return (
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl mb-4"
        style={{
          background: 'hsl(var(--warning) / 0.12)',
          border: '1px solid hsl(var(--warning) / 0.3)',
        }}
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--warning))' }} />
        <p className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>
          Complete your profile to activate your account — a handle is required.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5"
      style={{
        background: 'hsl(var(--warning) / 0.15)',
        borderBottom: '1px solid hsl(var(--warning) / 0.3)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'hsl(var(--warning))' }} />
        <p className="text-xs sm:text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
          Your account is paused — complete setup to activate.
        </p>
      </div>
      <button
        onClick={handleCompleteSetup}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex-shrink-0"
        style={{
          background: 'hsl(var(--warning))',
          color: 'hsl(var(--canvas))',
        }}
      >
        Complete setup
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}