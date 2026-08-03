/**
 * REVISION 7D — Event Readiness Score
 * Lightweight derived operational readiness indicator.
 * Shows weekend readiness percentage based on operational state.
 * Read-only; no persistence.
 */
import React, { useMemo } from 'react';

import { calculateEventReadiness } from '../ops/sessionReadinessCalculator';

function ReadinessGauge({ score }) {
  const getColor = (s) => {
    if (s >= 80) return 'hsl(var(--success))';
    if (s >= 60) return 'hsl(var(--warning))';
    return 'hsl(var(--danger))';
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="hsl(var(--divider))"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke={getColor(score)}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-foreground">{score}%</span>
        </div>
      </div>
      <div className="text-xs">
        <p className="uppercase tracking-widest font-bold text-foreground-quiet">Weekend Readiness</p>
        <p className="text-xs text-foreground-secondary mt-1">
          {score >= 80 && 'Fully operational'}
          {score >= 60 && score < 80 && 'Nearly ready'}
          {score < 60 && 'Action needed'}
        </p>
      </div>
    </div>
  );
}

export default function EventReadinessScore({
  selectedEvent = {},
  sessions = [],
  entries = [],
  results = [],
  standings = [],
}) {
  const score = useMemo(
    () => calculateEventReadiness(selectedEvent, sessions, entries, results, standings),
    [selectedEvent, sessions, entries, results, standings]
  );

  return (
    <div className="bg-surface-elevated border border-divider rounded-lg p-4">
      <ReadinessGauge score={score} />
    </div>
  );
}