/**
 * R9CR — EventReadinessCard
 * Compact readiness score widget shown in Overview and Command Header.
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function EventReadinessCard({ score, tier, checks, onNavigate }) {
  const [expanded, setExpanded] = useState(false);

  const tierColors = {
    green: { bar: 'hsl(var(--success))', text: 'text-success', bg: 'border-success/40 bg-success/10' },
    amber: { bar: 'hsl(var(--warning))', text: 'text-warning', bg: 'border-warning/40 bg-warning/10' },
    red:   { bar: 'hsl(var(--danger))', text: 'text-danger',   bg: 'border-danger/40 bg-danger/10' },
  };
  const colors = tierColors[tier] || tierColors.amber;

  const NAVIGATE_MAP = {
    schedule:         'schedule',
    officials_rd:     'officials',
    officials_steward:'officials',
    checkin:          'checkin',
    tech:             'compliance',
    results:          'results',
    standings:        'standings',
    incidents:        'race_control',
    export:           'exports',
  };

  return (
    <div className={`rounded border ${colors.bg} overflow-hidden`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left"
      >
        <div className="flex-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-foreground-quiet mb-0.5">Event Readiness</p>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-black ${colors.text}`}>{score}%</span>
            <div className="flex-1 h-1.5 rounded-full bg-surface-interactive/50 overflow-hidden max-w-[80px]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${score}%`, background: colors.bar }}
              />
            </div>
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${colors.text}`}>
              {tier === 'green' ? 'Ready' : tier === 'amber' ? 'Almost' : 'Not Ready'}
            </span>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-foreground-quiet flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-foreground-quiet flex-shrink-0" />}
      </button>

      {/* Expanded checklist */}
      {expanded && (
        <div className="border-t border-divider/50 px-3 py-2 space-y-0.5">
          {checks.map(check => (
            <div
              key={check.id}
              className={`flex items-center gap-2 py-0.5 ${
                NAVIGATE_MAP[check.id] && !check.passed && onNavigate ? 'cursor-pointer hover:opacity-80' : ''
              }`}
              onClick={() => {
                if (!check.passed && NAVIGATE_MAP[check.id] && onNavigate) {
                  onNavigate(NAVIGATE_MAP[check.id]);
                }
              }}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${check.passed ? 'bg-success' : 'bg-danger'}`} />
              <span className={`text-[10px] flex-1 ${check.passed ? 'text-foreground-quiet line-through' : 'text-foreground-secondary'}`}>
                {check.label}
              </span>
              {check.detail && !check.passed && (
                <span className="text-[9px] text-foreground-quiet">{check.detail}</span>
              )}
              {!check.passed && NAVIGATE_MAP[check.id] && onNavigate && (
                <span className="text-[9px] text-motion">→</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}