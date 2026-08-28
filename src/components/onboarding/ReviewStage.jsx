import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import { getRole, getCapabilityLabel } from '@/config/onboardingRoles';
import StageErrorBanner, { normalizeBackendError } from '@/components/onboarding/StageErrorBanner';
import { getRelationshipStatusMeta } from '@/components/onboarding/relationshipStatus';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil, Sparkles } from 'lucide-react';

const TEAL = '#1DA1A1';

export default function ReviewStage() {
  const navigate = useNavigate();
  const {
    user,
    relationships = [],
    completeOnboarding,
    selectedRoleIds,
    rolesChosenThisSession,
  } = useOnboardingWizard();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const primaryCap = user?.primary_profile_type || 'fan';
  const primaryCapabilityLabel = getCapabilityLabel(primaryCap);

  // Granular role labels for the primary are shown ONLY when we know them
  // from the current wizard session (B6: never fabricate after a refresh).
  const primaryGranularRole = React.useMemo(() => {
    if (!rolesChosenThisSession || !selectedRoleIds?.length) return null;
    const matching = selectedRoleIds
      .map((id) => getRole(id))
      .filter((r) => r?.can_be_primary && r?.capability === primaryCap);
    return matching.length === 1 ? matching[0] : null;
  }, [rolesChosenThisSession, selectedRoleIds, primaryCap]);

  const additionalCapabilities = React.useMemo(() => {
    const types = user?.profile_types || ['fan'];
    return Array.from(
      new Set(types.filter((t) => t !== 'fan' && t !== primaryCap)),
    );
  }, [user?.profile_types, primaryCap]);

  const additionalGranularRoles = React.useMemo(() => {
    if (!rolesChosenThisSession || !selectedRoleIds?.length) return [];
    return selectedRoleIds
      .map((id) => getRole(id))
      .filter(Boolean)
      .filter((r) => r.id !== primaryGranularRole?.id && r.id !== 'fan');
  }, [rolesChosenThisSession, selectedRoleIds, primaryGranularRole]);

  const edit = (stage) => navigate(`/ProfileSetup/${stage}`);

  const handleFinish = async (e) => {
    e?.preventDefault?.();
    setError('');
    setSaving(true);
    try {
      await completeOnboarding();
    } catch (err) {
      setError(normalizeBackendError(err));
      setSaving(false);
    }
  };

  const Row = ({ label, value, onEdit, stage }) => (
    <div className="flex items-start justify-between gap-3 py-3"
      style={{ borderBottom: '1px solid hsl(var(--divider) / 0.6)' }}>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--foreground-quiet))' }}>{label}</p>
        <p className="text-sm font-medium mt-0.5" style={{ color: 'hsl(var(--foreground))' }}>{value || '—'}</p>
      </div>
      {onEdit && (
        <button type="button" onClick={() => edit(stage)}
          className="flex items-center gap-1 text-xs transition-colors flex-shrink-0"
          style={{ color: 'hsl(var(--foreground-secondary))' }}>
          <Pencil className="w-3 h-3" /> Edit
        </button>
      )}
    </div>
  );

  const RelationshipRow = ({ c }) => {
    const meta = getRelationshipStatusMeta(c.status);
    const roleLabel = c.role_key ? getRole(c.role_key)?.display_name : null;
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg"
        style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
        <div className="min-w-0">
          <span className="text-sm block" style={{ color: 'hsl(var(--foreground))' }}>
            {c.entity_name || c.entity_type}
          </span>
          {roleLabel && roleLabel !== (c.entity_name || c.entity_type) && (
            <span className="text-[10px] block mt-0.5" style={{ color: 'hsl(var(--foreground-secondary))' }}>
              {roleLabel}
            </span>
          )}
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ml-2" style={{ color: meta.color }}>
          {meta.label}
        </span>
      </div>
    );
  };

  return (
    <form onSubmit={handleFinish} className="space-y-5">
      {error && <StageErrorBanner message={error} />}

      <div className="rounded-xl"
        style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider))' }}>
        <div className="px-4">
          <Row label="Name" value={[user?.first_name, user?.last_name].filter(Boolean).join(' ')} onEdit stage="identity" />
          <Row label="Username" value={user?.username ? `@${user.username}` : 'Not set'} onEdit stage="identity" />
          <Row label="Bio" value={user?.bio} onEdit stage="about" />
          <Row label="Location" value={user?.location_display} onEdit stage="about" />
        </div>
      </div>

      {/* Roles — show broad capability (always) + granular selected role (session only). */}
      <div className="rounded-xl p-4"
        style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider))' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--foreground-quiet))' }}>Primary participation</h3>
          <button type="button" onClick={() => edit('roles')} className="flex items-center gap-1 text-xs"
            style={{ color: 'hsl(var(--foreground-secondary))' }}>
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">{primaryCapabilityLabel}</span>
          {primaryGranularRole && (
            <span className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(29,161,161,0.1)', color: TEAL, border: '1px solid rgba(29,161,161,0.25)' }}>
              Selected role: {primaryGranularRole.display_name}
            </span>
          )}
        </div>
        {(additionalCapabilities.length > 0 || additionalGranularRoles.length > 0) && (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--foreground-quiet))' }}>Additional</p>
            <div className="flex flex-wrap gap-1.5">
              {additionalCapabilities.map((cap) => (
                <span key={`cap-${cap}`} className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: 'hsl(var(--surface-interactive) / 0.5)', color: 'hsl(var(--foreground-secondary))', border: '1px solid hsl(var(--divider))' }}>
                  {getCapabilityLabel(cap)}
                </span>
              ))}
              {additionalGranularRoles.map((r) => (
                <span key={`role-${r.id}`} className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(29,161,161,0.1)', color: TEAL, border: '1px solid rgba(29,161,161,0.25)' }}>
                  {r.display_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connections — true statuses. */}
      <div className="rounded-xl p-4"
        style={{ background: 'hsl(var(--surface-interactive) / 0.3)', border: '1px solid hsl(var(--divider))' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--foreground-quiet))' }}>Connections</h3>
          <button type="button" onClick={() => edit('connections')} className="flex items-center gap-1 text-xs"
            style={{ color: 'hsl(var(--foreground-secondary))' }}>
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>
        {(relationships || []).length === 0 ? (
          <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            No connection requests. You can request organization access anytime from your garage.
          </p>
        ) : (
          <div className="space-y-2">
            {relationships.map((c) => (
              <RelationshipRow key={c.id} c={c} />
            ))}
          </div>
        )}
        <p className="text-[11px] mt-3" style={{ color: 'hsl(var(--foreground-quiet))' }}>
          Requests are submitted as you add them and remain pending until an org admin approves them.
        </p>
      </div>

      <Button
        type="submit"
        disabled={saving}
        className="w-full gap-2 h-12 text-sm font-bold"
        style={{ background: TEAL, color: '#050A0A' }}
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Launching…</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Launch my dashboard</>
        )}
      </Button>
    </form>
  );
}