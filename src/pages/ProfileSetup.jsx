import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { OnboardingWizardProvider } from '@/components/onboarding/OnboardingWizardContext';
import OnboardingWizardLayout from '@/components/onboarding/OnboardingWizardLayout';
import IdentityStage from '@/components/onboarding/IdentityStage';
import AboutStage from '@/components/onboarding/AboutStage';
import RolesStage from '@/components/onboarding/RolesStage';
import ConnectionsStage from '@/components/onboarding/ConnectionsStage';
import ReviewStage from '@/components/onboarding/ReviewStage';
import {
  resolveOnboardingStage,
  clampRequestedStage,
  ONBOARDING_STAGES,
} from '@/components/onboarding/onboardingConfig';
import { useAuth } from '@/lib/AuthContext';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import { Loader2 } from 'lucide-react';

const STAGE_COMPONENTS = {
  identity: IdentityStage,
  about: AboutStage,
  roles: RolesStage,
  connections: ConnectionsStage,
  review: ReviewStage,
};

function WizardShell() {
  const { stage: requested } = useParams();
  const { user: staleUser, isLoadingAuth } = useAuth();
  const { user: freshUser, isLoading } = useOnboardingWizard();

  // Prefer the wizard's React-Query user (invalidated/refetched after every
  // advanceTo) so the clamp guard sees the updated onboarding_stage
  // immediately after a save — instead of the stale AuthContext user that
  // never refreshes post-updateMe. Falls back to the AuthContext user until
  // the wizard query resolves.
  const user = freshUser || staleUser;

  if (isLoadingAuth || (!user && isLoading) || !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#060A0A' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#1DA1A1' }} />
      </div>
    );
  }

  // Completed users who somehow land here go to their dashboard.
  if (user.onboarding_complete === true && !requested) {
    return <Navigate to="/MyDashboard" replace />;
  }

  const userStage = resolveOnboardingStage(user);

  // If no stage in URL (bare /ProfileSetup), send to resolved stage.
  if (!requested) {
    const target = userStage === 'complete' ? 'review' : userStage;
    return <Navigate to={`/ProfileSetup/${target}`} replace />;
  }

  // Reject unknown stage values.
  if (!ONBOARDING_STAGES.includes(requested)) {
    return <Navigate to={`/ProfileSetup/${userStage === 'complete' ? 'review' : userStage}`} replace />;
  }

  // Prevent skipping ahead of the user's actual progress.
  const effectiveStage = userStage === 'complete' ? requested : clampRequestedStage(userStage, requested);

  if (effectiveStage !== requested) {
    return <Navigate to={`/ProfileSetup/${effectiveStage}`} replace />;
  }

  const StageComponent = STAGE_COMPONENTS[requested];
  return (
    <OnboardingWizardLayout stage={requested}>
      <StageComponent />
    </OnboardingWizardLayout>
  );
}

export default function ProfileSetup() {
  return (
    <OnboardingWizardProvider>
      <WizardShell />
    </OnboardingWizardProvider>
  );
}