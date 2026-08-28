import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  STAGE_ORDER,
  STAGE_META,
  nextStage,
  prevStage,
  stagePath,
  stageIndex,
} from '@/components/onboarding/onboardingConfig';
import {
  getRole,
  buildProfileTypesFromRoles,
  reconstructOnboardingRolesFromCapabilities,
} from '@/config/onboardingRoles';

const WizardContext = createContext(null);

export function OnboardingWizardProvider({ children }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Single source for the current user — auth.me() returns the live record
  // and is invalidated after every save so stages always read fresh data.
  const { data: user, isLoading } = useQuery({
    queryKey: ['onboarding_user'],
    queryFn: () => base44.auth.me(),
  });

  // Server-backed relationship state. No onboarding component owns relationship
  // records — EntityCollaborator is the single source of truth, so the wizard
  // simply reads and refreshes it here. Survives refresh and cross-entry reuse.
  const { data: relationships = [], refetch: refetchRelationships, isLoading: relationshipsLoading } = useQuery({
    queryKey: ['onboarding_relationships', user?.id],
    queryFn: () => base44.entities.EntityCollaborator.filter({ user_id: user.id }, '-updated_date', 200),
    enabled: !!user,
  });

  // Granular onboarding role IDs the user selected during the Roles stage.
  // SESSION STATE ONLY — User.profile_types stores broad capabilities to
  // satisfy the User schema enum; granular identity lives only in
  // EntityCollaborator.role_key. After a refresh, `rolesChosenThisSession`
  // resets to false and Connection/Review reconstruct from capabilities.
  const [sessionSelectedRoleIds, setSessionSelectedRoleIds] = useState([]);
  const [rolesChosenThisSession, setRolesChosenThisSession] = useState(false);

  const selectedRoleIds = useMemo(() => {
    if (rolesChosenThisSession) return sessionSelectedRoleIds;
    return reconstructOnboardingRolesFromCapabilities(user?.profile_types);
  }, [rolesChosenThisSession, sessionSelectedRoleIds, user?.profile_types]);

  const refreshRelationships = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['onboarding_relationships', user?.id] });
    await queryClient.refetchQueries({ queryKey: ['onboarding_relationships', user?.id] });
  }, [queryClient, user?.id]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['onboarding_user'] });
    await queryClient.refetchQueries({ queryKey: ['onboarding_user'] });
  }, [queryClient]);

  // Persist a partial update to the User + advance the onboarding stage,
  // then navigate to the next stage route. Returns the next stage.
  const advanceTo = useCallback(
    async (fields, toStage) => {
      // Don't regress: if the user jumped back from a later stage (e.g. Review)
      // to edit an earlier one, Continue returns them to their highest-achieved
      // stage rather than re-walking through intermediate stages.
      const highestStage = user?.onboarding_complete ? 'review' : user?.onboarding_stage;
      const targetStage = highestStage && stageIndex(highestStage) > stageIndex(toStage)
        ? highestStage
        : toStage;
      await base44.auth.updateMe({ ...fields, onboarding_stage: targetStage });
      // Optimistically update the cache so the WizardShell clamp guard sees
      // the new onboarding_stage BEFORE the refetch completes and before
      // navigate fires — prevents a stale-user bounce-back to the prior stage.
      queryClient.setQueryData(['onboarding_user'], (old) => ({
        ...(old || {}),
        ...fields,
        onboarding_stage: targetStage,
      }));
      navigate(stagePath(targetStage));
      // Refetch in the background to sync the full record from the server.
      refresh();
      return targetStage;
    },
    [navigate, refresh, queryClient, user?.onboarding_stage, user?.onboarding_complete],
  );

  const saveIdentity = useCallback(
    async (data) => {
      const payload = {};
      if (data.first_name?.trim()) payload.first_name = data.first_name.trim();
      if (data.last_name?.trim()) payload.last_name = data.last_name.trim();
      if (data.username?.trim()) {
        const slug = data.username.toLowerCase().trim();
        // Server-authoritative uniqueness re-check immediately before the
        // final write (B3). The current user may retain their own username.
        const check = await base44.functions.invoke('checkUsernameUnique', {
          username: slug,
          current_user_id: user?.id,
        });
        if (check?.data && check.data.available === false) {
          const err = new Error(check.data.reason || 'That username is already taken.');
          err.code = 'username_conflict';
          throw err;
        }
        payload.username = slug;
        payload.username_slug = slug;
      }
      if (data.contact_email?.trim()) payload.contact_email = data.contact_email.trim();
      return advanceTo(payload, 'about');
    },
    [advanceTo, user?.id],
  );

  const saveAbout = useCallback(
    async (data) => advanceTo({ ...data }, 'roles'),
    [advanceTo],
  );

  const saveRoles = useCallback(
    async (primaryRole, additionalRoles) => {
      // B1: store the broad CAPABILITY the role maps to on User.profile_types
      // (schema-valid enum), NOT the granular registry id. Granular identity
      // stays in session state + EntityCollaborator.role_key.
      // Primary role is optional — a user who skips stays a pure Fan.
      const cleanExtras = (additionalRoles || []).filter((r) => r !== primaryRole && r !== 'fan');
      const primaryCfg = primaryRole ? getRole(primaryRole) : null;
      if (primaryRole && !primaryCfg) throw new Error('Please choose a valid primary role.');
      if (primaryCfg && !primaryCfg.capability) {
        throw new Error('Selected role is missing a capability mapping.');
      }
      const profileTypes = buildProfileTypesFromRoles(primaryRole || 'fan', cleanExtras);
      setSessionSelectedRoleIds(primaryRole ? [primaryRole, ...cleanExtras] : [...cleanExtras]);
      setRolesChosenThisSession(true);
      return advanceTo(
        {
          primary_profile_type: primaryCfg ? primaryCfg.capability : 'fan',
          profile_types: profileTypes,
        },
        'connections',
      );
    },
    [advanceTo],
  );

  const saveConnections = useCallback(async () => advanceTo({}, 'review'), [advanceTo]);

  const { refreshUser } = useAuth();

  const completeOnboarding = useCallback(async () => {
    await base44.auth.updateMe({ onboarding_complete: true, onboarding_stage: 'complete' });
    await refresh();
    // Refresh the AuthContext user so OnboardingGuard sees onboarding_complete
    // === true BEFORE we navigate to /MyDashboard — otherwise the guard reads
    // the stale AuthContext user (still onboarding_complete: false) and bounces
    // the user straight back to ProfileSetup, making the button appear to do nothing.
    await refreshUser();
    navigate('/MyDashboard');
  }, [navigate, refresh, refreshUser]);

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
      relationships,
      relationshipsLoading,
      refreshRelationships,
      // B1 session-state — granular role identity for the current session.
      selectedRoleIds,
      rolesChosenThisSession,
    }),
    [
      user, isLoading, saveIdentity, saveAbout, saveRoles, saveConnections,
      completeOnboarding, goBack, goForward, saveAndExit, relationships,
      relationshipsLoading, refreshRelationships, selectedRoleIds,
      rolesChosenThisSession,
    ],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useOnboardingWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useOnboardingWizard must be used within OnboardingWizardProvider');
  return ctx;
}