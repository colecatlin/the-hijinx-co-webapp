import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export default function TrackCompletenessIndicator({ completeness = {} }) {
  const { score = 0, checks = [], missing = [] } = completeness;

  const getColor = () => {
    if (score >= 80) return 'hsl(var(--success))';
    if (score >= 50) return 'hsl(var(--warning))';
    return 'hsl(var(--danger))';
  };

  return (
    <div className="p-4 rounded-lg border border-divider" style={{ background: 'hsl(var(--surface-interactive) / 0.3)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground-secondary">Profile Completeness</h3>
        <span className="text-lg font-black" style={{ color: getColor() }}>{score}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full mb-3 overflow-hidden" style={{ background: 'hsl(var(--divider))' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: getColor() }} />
      </div>

      {/* Missing items */}
      {missing.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-widest text-foreground-quiet mb-1">Missing</p>
          {missing.slice(0, 6).map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-foreground-quiet">
              <Circle className="w-3 h-3" style={{ color: 'hsl(var(--danger) / 0.6)' }} />
              {item.label}
            </div>
          ))}
        </div>
      )}

      {missing.length === 0 && (
        <p className="text-xs text-success flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Profile is complete!
        </p>
      )}
    </div>
  );
}