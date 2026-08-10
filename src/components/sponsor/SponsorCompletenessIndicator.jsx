import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

export default function SponsorCompletenessIndicator({ completeness }) {
  if (!completeness) return null;
  const { score, checks = [], missing = [], recommendations = [] } = completeness;
  const completed = checks.filter(c => c.passed);

  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  const ringColor = score >= 80 ? 'hsl(var(--success))' : score >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--foreground-quiet))';

  return (
    <div className="rounded-xl p-4" style={{ border: '1px solid hsl(var(--divider))', background: 'hsl(var(--surface) / 0.5)' }}>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="hsl(var(--divider))" strokeWidth="6" />
            <circle cx="40" cy="40" r="36" fill="none" stroke={ringColor} strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" className="transition-all duration-500" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-black" style={{ color: 'hsl(var(--foreground))' }}>{score}%</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold mb-0.5" style={{ color: 'hsl(var(--foreground))' }}>Profile Completeness</h3>
          <p className="text-xs" style={{ color: 'hsl(var(--foreground-quiet))' }}>
            {completed.length} of {checks.length} sections complete
          </p>
          {missing.length > 0 && score < 100 && (
            <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--foreground-quiet))' }}>
              Missing: {missing.slice(0, 3).map(m => m.label).join(', ')}{missing.length > 3 ? '...' : ''}
            </p>
          )}
        </div>
      </div>
      {score < 100 && missing.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid hsl(var(--divider))' }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'hsl(var(--foreground-quiet))' }}>Improve This Profile</div>
          <div className="flex flex-wrap gap-1.5">
            {missing.map(check => (
              <span key={check.key} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md"
                style={{ background: 'hsl(var(--surface-interactive))', color: 'hsl(var(--foreground-quiet))', border: '1px solid hsl(var(--divider))' }}>
                <Circle className="w-2.5 h-2.5" /> {check.label}
              </span>
            ))}
          </div>
          {recommendations.length > 0 && (
            <div className="mt-2 space-y-1">
              {recommendations.slice(0, 3).map((r, i) => (
                <p key={i} className="text-[10px]" style={{ color: 'hsl(var(--foreground-quiet))' }}>• {r}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}