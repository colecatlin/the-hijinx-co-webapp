import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import { getRole } from '@/config/onboardingRoles';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Pencil, Sparkles } from 'lucide-react';

const TEAL = '#1DA1A1';

export default function ReviewStage() {
  const navigate = useNavigate();
  const { user, pendingConnections, completeOnboarding } = useOnboardingWizard();
  const [saving, setSaving] = React.useState(false);

  const primaryRole = getRole(user?.primary_profile_type);
  const additionalRoles = (user?.profile_types || ['fan'])
    .filter((t) => t !== 'fan' && t !== user?.primary_profile_type)
    .map((t) => getRole(t))
    .filter(Boolean);

  const edit = (stage) => navigate(`/ProfileSetup/${stage}`);

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Phase 2: finalize account setup. Org approval status is never a gate.
      await completeOnboarding();
    } catch (e) {
      setSaving(false);
    }
  };

  const Row = ({ label, value, onEdit, stage }) => (
    <div className="flex items-start justify-between gap-3 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
        <p className="text-sm font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>{value || '—'}</p>
      </div>
      {onEdit && (
        <button type="button" onClick={() => edit(stage)}
          className="flex items-center gap-1 text-xs transition-colors flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Pencil className="w-3 h-3" /> Edit
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="px-4">
          <Row label="Name" value={[user?.first_name, user?.last_name].filter(Boolean).join(' ')} onEdit stage="identity" />
          <Row label="Username" value={user?.username ? `@${user.username}` : 'Not set'} onEdit stage="identity" />
          <Row label="Bio" value={user?.bio} onEdit stage="about" />
          <Row label="Location" value={user?.location_display} onEdit stage="about" />
        </div>
      </div>

      {/* Roles */}
      <div className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Primary role</h3>
          <button type="button" onClick={() => edit('roles')} className="flex items-center gap-1 text-xs"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>
        {primaryRole ? (
          <div className="flex items-center gap-2 mb-3">
            <primaryRole.icon className="w-4 h-4" style={{ color: TEAL }} />
            <span className="text-sm font-bold text-white">{primaryRole.display_name}</span>
          </div>
        ) : (
          <p className="text-xs" style={{ color: 'rgba(239,68,68,0.7)' }}>No primary role selected.</p>
        )}
        {additionalRoles.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Additional roles</p>
            <div className="flex flex-wrap gap-1.5">
              {additionalRoles.map((r) => (
                <span key={r.id} className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(29,161,161,0.1)', color: TEAL, border: '1px solid rgba(29,161,161,0.25)' }}>
                  {r.display_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connections */}
      <div className="rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Connections</h3>
          <button type="button" onClick={() => edit('connections')} className="flex items-center gap-1 text-xs"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>
        {pendingConnections.length === 0 ? (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            No connection requests. You can request organization access anytime from your garage.
          </p>
        ) : (
          <div className="space-y-2">
            {pendingConnections.map((c, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: 'rgba(29,161,161,0.05)', border: '1px solid rgba(29,161,161,0.15)' }}>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{c.entityName}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: c.mode === 'create' ? TEAL : 'rgba(255,255,255,0.4)' }}>
                  {c.mode === 'create' ? 'New · Pending' : 'Pending approval'}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Organization requests are submitted after you launch. Approval is handled separately by org admins.
        </p>
      </div>

      <Button
        onClick={handleFinish}
        disabled={saving}
        className="w-full gap-2 h-12 text-sm font-bold"
        style={{ background: TEAL, color: '#050A0A' }}
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Launching…</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Launch my garage</>
        )}
      </Button>
    </div>
  );
}