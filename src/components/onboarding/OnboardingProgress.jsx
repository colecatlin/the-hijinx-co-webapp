import React from 'react';
import { STAGE_META, ONBOARDING_STAGES, stageIndex } from '@/components/onboarding/onboardingConfig';

const TEAL = '#1DA1A1';

/**
 * Five-step progress indicator for the onboarding wizard.
 * Shows Identity · About · Roles · Connections · Review with the active
 * step highlighted and completed steps filled.
 */
export default function OnboardingProgress({ currentStage }) {
  const currentIndex = stageIndex(currentStage);

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6">
      {ONBOARDING_STAGES.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isActive = i === currentIndex;
        const meta = STAGE_META[stage];
        return (
          <React.Fragment key={stage}>
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background: isActive
                    ? TEAL
                    : isComplete
                      ? 'rgba(29,161,161,0.25)'
                      : 'rgba(255,255,255,0.05)',
                  color: isActive ? '#050A0A' : isComplete ? TEAL : 'rgba(255,255,255,0.4)',
                  border: isActive ? '1px solid ' + TEAL : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isActive ? '0 0 18px rgba(29,161,161,0.35)' : 'none',
                }}
              >
                {isComplete ? '✓' : i + 1}
              </div>
              <span
                className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider hidden sm:block"
                style={{ color: isActive ? TEAL : isComplete ? 'rgba(29,161,161,0.6)' : 'rgba(255,255,255,0.25)' }}
              >
                {meta.label}
              </span>
            </div>
            {i < ONBOARDING_STAGES.length - 1 && (
              <div
                className="h-px flex-1 max-w-[36px] transition-all duration-300"
                style={{
                  background: i < currentIndex ? 'rgba(29,161,161,0.4)' : 'rgba(255,255,255,0.08)',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}