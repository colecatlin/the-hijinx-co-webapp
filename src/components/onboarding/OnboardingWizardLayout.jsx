import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import OnboardingProgress from '@/components/onboarding/OnboardingProgress';
import { STAGE_META, prevStage } from '@/components/onboarding/onboardingConfig';

/**
 * Shared shell for every wizard stage: progress indicator, stage title,
 * description, Back button, and a "Save & finish later" link. The actual
 * stage form (with its own Continue/validation) is passed as children.
 */
export default function OnboardingWizardLayout({ stage, children }) {
  const navigate = useNavigate();
  const meta = STAGE_META[stage] || { label: 'Setup', description: '' };
  const isFirst = stage === 'identity';

  const handleBack = () => {
    if (isFirst) return;
    const p = prevStage(stage);
    navigate(`/ProfileSetup/${p}`);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: '#060A0A',
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(29,161,161,0.10) 0%, transparent 60%)',
      }}
    >
      <div className="w-full max-w-lg">
        <div className="text-center mb-2">
          <span
            className="inline-block text-[10px] font-mono tracking-[0.35em] uppercase mb-3"
            style={{ color: 'rgba(29,161,161,0.7)' }}
          >
            Profile Setup · {meta.label}
          </span>
        </div>

        <OnboardingProgress currentStage={stage} />

        <div
          className="rounded-2xl p-6 sm:p-7"
          style={{
            background: 'rgba(8,12,14,0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">{meta.label}</h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {meta.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/Home')}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)' }}
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
              style={{ color: 'rgba(255,255,255,0.4)' }}
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