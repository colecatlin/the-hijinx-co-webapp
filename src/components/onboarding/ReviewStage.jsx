import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import StageErrorBanner, { normalizeBackendError } from '@/components/onboarding/StageErrorBanner';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil, Sparkles, Heart, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

const TEAL = '#1DA1A1';

export default function ReviewStage() {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useOnboardingWizard();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

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

      {/* Identity confirmation — everyone is a Fan by default. */}
      <div className="rounded-xl p-4"
        style={{ background: 'rgba(29,161,161,0.05)', border: '1px solid rgba(29,161,161,0.2)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(29,161,161,0.15)' }}>
            <Heart className="w-4 h-4" style={{ color: TEAL }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>You're a Fan</p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              Every account starts as a Fan. You can apply for Driver, Team, Track, Media, and other identities anytime from your Profile.
            </p>
          </div>
        </div>
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