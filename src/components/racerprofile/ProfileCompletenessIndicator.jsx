/**
 * ProfileCompletenessIndicator.jsx — Phase 10
 *
 * Renders a profile completeness score with a circular progress ring
 * and a breakdown of completed/missing items. Automatically recomputed.
 */
import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

export default function ProfileCompletenessIndicator({ completeness }) {
  if (!completeness) return null;
  const { score, checks = [] } = completeness;
  const completed = checks.filter(c => c.passed);
  const missing = checks.filter(c => !c.passed);

  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  const scoreColor = score >= 80 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-gray-400';
  const ringColor = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#9ca3af';

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="36" fill="none" stroke={ringColor} strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-black ${scoreColor}`}>{score}%</span>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-[#232323] mb-0.5">Profile Completeness</h3>
          <p className="text-xs text-gray-400">
            {completed.length} of {checks.length} sections complete
          </p>
          {missing.length > 0 && score < 100 && (
            <p className="text-[10px] text-gray-400 mt-1">
              Missing: {missing.slice(0, 3).map(m => m.label).join(', ')}{missing.length > 3 ? '...' : ''}
            </p>
          )}
        </div>
      </div>
      {score < 100 && missing.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Improve Your Profile</div>
          <div className="flex flex-wrap gap-1.5">
            {missing.map(check => (
              <span key={check.key} className="inline-flex items-center gap-1 text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-md border border-gray-200">
                <Circle className="w-2.5 h-2.5" /> {check.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}