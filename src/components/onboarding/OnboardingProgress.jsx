import React from 'react';
import { STAGE_META, ONBOARDING_STAGES, stageIndex } from '@/components/onboarding/onboardingConfig';

const MOTION = 'hsl(var(--motion))';

/**
 * Five-step progress indicator for the onboarding wizard.
 * Shows Identity · About · Roles · Connections · Review with the active
 * step highlighted and completed steps filled.
 *
 * When `clickable` is true (user has reached Review), each step indicator
 * becomes a button that calls `onSelect(stage)` to jump back and edit.
 */
export default function OnboardingProgress({ currentStage, clickable = false, onSelect }) {
  const currentIndex = stageIndex(currentStage);

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6">
      {ONBOARDING_STAGES.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isActive = i === currentIndex;
        const meta = STAGE_META[stage];
        const canClick = clickable && onSelect && !isActive;

        const indicatorStyle = {
          background: isActive
            ? MOTION
            : isComplete
              ? 'hsl(var(--motion) / 0.25)'
              : 'hsl(var(--surface-interactive))',
          color: isActive ? 'hsl(var(--canvas))' : isComplete ? MOTION : 'hsl(var(--foreground-quiet))',
          border: isActive ? `1px solid ${MOTION}` : '1px solid hsl(var(--divider))',
          boxShadow: isActive ? `0 0 18px hsl(var(--motion) / 0.35)` : 'none',
        };

        const labelStyle = {
          color: isActive ? MOTION : isComplete ? 'hsl(var(--motion) / 0.6)' : 'hsl(var(--foreground-quiet))',
        };

        return (
          <React.Fragment key={stage}>
            <div className="flex flex-col items-center gap-1">
              {canClick ? (
                <button
                  type="button"
                  onClick={() => onSelect(stage)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 cursor-pointer"
                  style={indicatorStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = MOTION; e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = isActive ? MOTION : 'hsl(var(--divider))'; e.currentTarget.style.opacity = '1'; }}
                >
                  {isComplete ? '✓' : i + 1}
                </button>
              ) : (
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={indicatorStyle}
                >
                  {isComplete ? '✓' : i + 1}
                </div>
              )}
              <span
                className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider hidden sm:block"
                style={labelStyle}
              >
                {meta.label}
              </span>
            </div>
            {i < ONBOARDING_STAGES.length - 1 && (
              <div
                className="h-px flex-1 max-w-[36px] transition-all duration-300"
                style={{
                  background: i < currentIndex ? 'hsl(var(--motion) / 0.4)' : 'hsl(var(--divider))',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}