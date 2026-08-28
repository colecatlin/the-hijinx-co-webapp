import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';
import { useOnboardingWizard } from '@/components/onboarding/OnboardingWizardContext';
import { resolveOnboardingStage, stageIndex, STAGE_META, prevStage } from '@/components/onboarding/onboardingConfig';

/**
 * Shared shell for every wizard stage: progress indicator, stage title,
 * description, Back button, and a "Save & finish later" link. The actual
 * stage form (with its own Continue/validation) is passed as children.
 */
export default function OnboardingWizardLayout({ stage, children }) {
  const navigate = useNavigate();
  const { user } = useOnboardingWizard();
  const meta = STAGE_META[stage] || { label: 'Setup', description: '' };
  const isFirst = stage === 'identity';

  // Step indicators become clickable once the user has reached the review
  // stage — they can jump back to any earlier stage to edit, then Continue
  // returns them to review.
  const userStage = user ? resolveOnboardingStage(user) : 'identity';
  const hasReachedReview = stageIndex(userStage) >= stageIndex('review');
  const handleStepSelect = (targetStage) => navigate(`/ProfileSetup/${targetStage}`);

  const handleBack = () => {
    if (isFirst) return;
    const p = prevStage(stage);
    navigate(`/ProfileSetup/${p}`);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: 'hsl(var(--canvas))',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(var(--motion) / 0.10) 0%, transparent 60%)',
      }}
    >
      <div className="w-full max-w-lg">
        <div className="text-center mb-2">
          <span
            className="inline-block text-[10px] font-mono tracking-[0.35em] uppercase mb-3"
            style={{ color: 'hsl(var(--motion) / 0.7)' }}
          >
            Profile Setup · {meta.label}
          </span>
        </div>

        <OnboardingProgress
          currentStage={stage}
          clickable={hasReachedReview}
          onSelect={handleStepSelect}
        />

        <div
          className="rounded-2xl p-6 sm:p-7"
          style={{
            background: 'hsl(var(--surface-elevated) / 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid hsl(var(--divider))',
            boxShadow: '0 8px 48px hsl(0 0% 0% / 0.5)',
          }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-xl font-black tracking-tight" style={{ color: 'hsl(var(--foreground))' }}>{meta.label}</h1>
              <p className="text-sm mt-1" style={{ color: 'hsl(var(--foreground-secondary))' }}>
                {meta.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/Home')}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'hsl(var(--foreground-quiet))' }}
              aria-label="Save and finish later"
              title="Save and finish later"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!isFirst && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs font-semibold mb-4 transition-colors"
              style={{ color: 'hsl(var(--foreground-secondary))' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}