import React from 'react';
import { Circle } from 'lucide-react';

export default function TeamCompletenessIndicator({ completeness }) {
  if (!completeness) return null;

  const { score, missing = [] } = completeness;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#E5E7EB" strokeWidth="4" />
            <circle
              cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="4"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-black text-[#232323]">{score}%</span>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-[#232323] text-sm">Profile Completeness</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {missing.length === 0 ? 'Profile is complete!' : `${missing.length} item${missing.length !== 1 ? 's' : ''} missing`}
          </p>
        </div>
      </div>
      {missing.length > 0 && (
        <div className="space-y-1">
          {missing.slice(0, 5).map((item) => (
            <div key={item} className="flex items-center gap-2 text-xs text-gray-500">
              <Circle className="w-3 h-3 text-gray-300" />
              {item}
            </div>
          ))}
          {missing.length > 5 && <div className="text-xs text-gray-400 pl-5">+{missing.length - 5} more</div>}
        </div>
      )}
    </div>
  );
}