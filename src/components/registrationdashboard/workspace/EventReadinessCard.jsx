/**
 * R9CR — EventReadinessCard
 * Compact readiness score widget shown in Overview and Command Header.
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function EventReadinessCard({ score, tier, checks, onNavigate }) {
  const [expanded, setExpanded] = useState(false);

  const tierColors = {
    green: { bar: '#16a34a', text: 'text-green-300', bg: 'border-green-700/40 bg-green-950/20' },
    amber: { bar: '#d97706', text: 'text-amber-300', bg: 'border-amber-700/40 bg-amber-950/15' },
    red:   { bar: '#dc2626', text: 'text-red-300',   bg: 'border-red-700/40 bg-red-950/15' },
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
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-0.5">Event Readiness</p>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-black ${colors.text}`}>{score}%</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden max-w-[80px]">
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
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />}
      </button>

      {/* Expanded checklist */}
      {expanded && (
        <div className="border-t border-white/[0.05] px-3 py-2 space-y-0.5">
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
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${check.passed ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-[10px] flex-1 ${check.passed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                {check.label}
              </span>
              {check.detail && !check.passed && (
                <span className="text-[9px] text-gray-600">{check.detail}</span>
              )}
              {!check.passed && NAVIGATE_MAP[check.id] && onNavigate && (
                <span className="text-[9px] text-teal-500">→</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}