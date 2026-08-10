import React from 'react';

export default function SponsorReadinessGauge({ readiness }) {
  const score = readiness?.score ?? 0;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="rounded-xl border p-6 h-full flex flex-col" style={{ borderColor: 'hsl(var(--divider))', background: 'hsl(var(--surface))' }}>
      <h3 className="text-sm font-bold uppercase tracking-wide mb-4">ROI Readiness</h3>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-32 h-32 mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" style={{ stroke: 'hsl(var(--divider))' }} />
            <circle
              cx="50" cy="50" r="45" fill="none" strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ stroke: score >= 70 ? 'hsl(var(--success))' : score >= 40 ? 'hsl(var(--warning))' : 'hsl(var(--danger))', transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold">{score}%</span>
          </div>
        </div>
        <p className="text-xs opacity-60 text-center max-w-[200px] mb-4">
          {readiness?.note || 'Scores measurement completeness, not sponsorship success.'}
        </p>
      </div>
      {readiness?.dimensions && (
        <div className="space-y-2 mt-2">
          {readiness.dimensions.map((dim) => (
            <div key={dim.key} className="flex items-center justify-between text-xs">
              <span className="opacity-70">{dim.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--divider))' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${dim.score}%`, background: dim.score >= 70 ? 'hsl(var(--success))' : dim.score >= 40 ? 'hsl(var(--warning))' : 'hsl(var(--danger))' }}
                  />
                </div>
                <span className="font-mono w-8 text-right">{dim.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}