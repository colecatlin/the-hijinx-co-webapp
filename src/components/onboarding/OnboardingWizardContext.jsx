import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  STAGE_ORDER,
  STAGE_META,
  nextStage,
  prevStage,
  stagePath,
} from '@/components/onboarding/onboardingConfig';

const WizardContext = createContext(null);

export function OnboardingWizardProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pendingConnections, setPendingConnections] = useState([]);

  // Single source for the current user — auth.me() returns the live record
  // and is invalidated after every save so stages always read fresh data.
  const { data: user, isLoading } = useQuery({
    queryKey: ['onboarding_user'],
    queryFn: () => base44.auth.me(),
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['onboarding_user'] });
    // Provide an immediate refresh so navigation runs against fresh data.
    await queryClient.refetchQueries({ queryKey: ['onboarding_user'] });
  }, [queryClient]);

  // Persist a partial update to the User + advance the onboarding stage,
  // then navigate to the next stage route. Returns the next stage.
  const advanceTo = useCallback(
    async (fields, toStage) => {
      await base44.auth.updateMe({ ...fields, onboarding_stage: toStage });
      await refresh();
      navigate(stagePath(toStage));
      return toStage;
    },
    [navigate, refresh],
  );

  const saveIdentity = useCallback(
    async (data) => {
      const payload = {};
      if (data.first_name?.trim()) payload.first_name = data.first_name.trim();
      if (data.last_name?.trim()) payload.last_name = data.last_name.trim();
      if (data.username?.trim()) {
        const slug = data.username.toLowerCase().trim();
        payload.username = slug;
        payload.username_slug = slug;
      }
      return advanceTo(payload, 'about');
    },
    [advanceTo],
  );

  const saveAbout = useCallback(
    async (data) => advanceTo({ ...data }, 'roles'),
    [advanceTo],
  );

  const saveRoles = useCallback(
    async (primaryRole, additionalRoles) => {
      // Fan is always present per schema convention. Primary included in types.
      const typesSet = new Set(['fan', primaryRole, ...additionalRoles]);
      return advanceTo(
        {
          primary_profile_type: primaryRole,
          profile_types: Array.from(typesSet),
        },
        'connections',
      );
    },
    [advanceTo],
  );

  const saveConnections = useCallback(async () => advanceTo({}, 'review'), [advanceTo]);

  const completeOnboarding = useCallback(async () => {
    await base44.auth.updateMe({ onboarding_complete: true, onboarding_stage: 'complete' });
    await refresh();
    navigate('/MyDashboard');
  }, [navigate, refresh]);

  const goBack = useCallback(
    (currentStage) => {
      const p = prevStage(currentStage);
      if (p !== currentStage) navigate(stagePath(p));
    },
    [navigate],
  );

  const goForward = useCallback(
    (currentStage) => {
      const n = nextStage(currentStage);
      if (n !== currentStage) navigate(stagePath(n));
    },
    [navigate],
  );

  const saveAndExit = useCallback(() => {
    // Exit to the public home — avoids the onboarding guard redirect loop
    // for users who haven't completed setup yet.
    navigate('/Home');
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      error: null,
      stageMeta: STAGE_META,
      stageOrder: STAGE_ORDER,
      saveIdentity,
      saveAbout,
      saveRoles,
      saveConnections,
      completeOnboarding,
      goBack,
      goForward,
      saveAndExit,
      pendingConnections,
      setPendingConnections,
    }),
    [user, isLoading, saveIdentity, saveAbout, saveRoles, saveConnections, completeOnboarding, goBack, goForward, saveAndExit, pendingConnections],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useOnboardingWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useOnboardingWizard must be used within OnboardingWizardProvider');
  return ctx;
}