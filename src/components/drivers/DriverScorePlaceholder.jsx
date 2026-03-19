import React from 'react';
import { TrendingUp, Zap, Star, Users } from 'lucide-react';

const SCORE_DIMS = [
  { label: 'Performance', Icon: TrendingUp, color: 'text-blue-400', desc: 'Race results & championship data' },
  { label: 'Brand', Icon: Star, color: 'text-yellow-400', desc: 'Social presence & media coverage' },
  { label: 'Alignment', Icon: Zap, color: 'text-green-400', desc: 'Sponsor & partner fit score' },
  { label: 'Momentum', Icon: Users, color: 'text-purple-400', desc: 'Trajectory & season trend signals' },
];

export default function DriverScorePlaceholder() {
  return (
    <div className="border border-dashed border-gray-200 rounded-xl p-6 bg-gray-50/50">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#00FFDA] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Driver Score</span>
          </div>
          <p className="text-sm text-gray-500">Full scoring engine coming soon</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-gray-200">—</div>
          <div className="text-[10px] text-gray-300 uppercase tracking-wide">Overall</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SCORE_DIMS.map(({ label, Icon, color, desc }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-lg p-3">
            <Icon className={`w-4 h-4 ${color} mb-2 opacity-60`} />
            <div className="text-xs font-bold text-gray-300 uppercase tracking-wide mb-0.5">{label}</div>
            <div className="text-lg font-black text-gray-200">—</div>
            <div className="text-[10px] text-gray-400 mt-1 leading-tight">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}