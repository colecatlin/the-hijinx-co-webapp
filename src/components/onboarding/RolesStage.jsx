import React, { useState, useMemo, useEffect } from 'react';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import {
  ROLES_BY_CATEGORY,
  ROLE_CATEGORIES,
  DEFAULT_ROLE,
  getRole,
  reconstructPrimaryRoleFromCapability,
} from '@/config/onboardingRoles';
import StageErrorBanner, { normalizeBackendError } from '@/components/onboarding/StageErrorBanner';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const TEAL = '#1DA1A1';

export default function RolesStage() {
  const { user, saveRoles, selectedRoleIds } = useOnboardingWizard();

  // Seed granular roles from wizard session state when available (the exact
  // roles the user picked this session); otherwise best-effort reconstruct the
  // primary from the stored broad capability. Fan and non-canonical values
  // map to an empty selection rather than a fabricated role.
  const seedPrimary = useMemo(() => {
    const fromSession = (selectedRoleIds || []).find((id) => getRole(id)?.can_be_primary);
    if (fromSession) return fromSession;
    if (user?.primary_profile_type && user.primary_profile_type !== DEFAULT_ROLE) {
      return reconstructPrimaryRoleFromCapability(user.primary_profile_type);
    }
    return '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.primary_profile_type, selectedRoleIds]);

  const seedAdditional = useMemo(
    () => (selectedRoleIds || []).filter((id) => id !== seedPrimary && id !== DEFAULT_ROLE),
    [selectedRoleIds, seedPrimary],
  );

  const [primaryRole, setPrimaryRole] = useState(seedPrimary);
  const [additionalRoles, setAdditionalRoles] = useState(seedAdditional);

  // Re-seed once the async user query / session state resolves.
  useEffect(() => { setPrimaryRole(seedPrimary); }, [seedPrimary]);
  useEffect(() => { setAdditionalRoles(seedAdditional); }, [seedAdditional]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleAdditional = (roleId) => {
    setAdditionalRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId],
    );
  };

  const canContinue = !saving;

  const handleContinue = async (e) => {
    e?.preventDefault?.();
    setError('');
    setSaving(true);
    try {
      await saveRoles(primaryRole || null, additionalRoles.filter((r) => r !== primaryRole));
    } catch (err) {
      setError(normalizeBackendError(err));
      setSaving(false);
    }
  };

  const categories = Object.entries(ROLE_CATEGORIES)
    .map(([key, cat]) => ({ ...cat, key }))
    .sort((a, b) => a.order - b.order);

  return (
    <form onSubmit={handleContinue} className="space-y-5">
      {error && <StageErrorBanner message={error} />}

      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Pick a <span className="font-bold" style={{ color: TEAL }}>primary role</span> to customize your experience — or skip to stay a Fan.
        Add any extra roles you want available. Roles unlock modules; they don't grant management access.
      </p>

      {categories.map((cat) => {
        const roles = ROLES_BY_CATEGORY[cat.key] || [];
        if (!roles.length) return null;
        return (
          <div key={cat.key} className="space-y-2">
            <h3
              className="text-[10px] font-bold uppercase tracking-[0.3em] pt-1"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              {cat.label}
            </h3>
            <div className="space-y-1.5">
              {roles.map((role) => {
                const isPrimary = primaryRole === role.id;
                const isAdditional = additionalRoles.includes(role.id);
                const Icon = role.icon;
                const selectable = role.can_be_primary;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      if (selectable) {
                        setPrimaryRole(isPrimary ? '' : role.id);
                        setAdditionalRoles((prev) => prev.filter((r) => r !== role.id));
                      } else {
                        toggleAdditional(role.id);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                    style={{
                      background: isPrimary
                        ? 'rgba(29,161,161,0.12)'
                        : isAdditional
                          ? 'rgba(29,161,161,0.06)'
                          : 'rgba(255,255,255,0.03)',
                      border: isPrimary
                        ? '1px solid rgba(29,161,161,0.4)'
                        : isAdditional
                          ? '1px solid rgba(29,161,161,0.2)'
                          : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isPrimary || isAdditional ? 'rgba(29,161,161,0.15)' : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: isPrimary || isAdditional ? TEAL : 'rgba(255,255,255,0.5)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color: isPrimary || isAdditional ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                        {role.display_name}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {role.description}
                      </div>
                    </div>
                    {selectable ? (
                      isPrimary ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(29,161,161,0.2)', color: TEAL, border: '1px solid rgba(29,161,161,0.4)' }}>
                          Primary
                        </span>
                      ) : isAdditional ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}>
                          Added
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          Select
                        </span>
                      )
                    ) : isAdditional ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider"
                        style={{ color: TEAL }}>
                        Added
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        Add
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <Button
        type="submit"
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full gap-2 h-11 text-sm font-bold"
        style={{ background: canContinue ? TEAL : 'rgba(255,255,255,0.08)', color: canContinue ? '#050A0A' : 'rgba(255,255,255,0.3)' }}
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Continue'}
      </Button>
    </form>
  );
}