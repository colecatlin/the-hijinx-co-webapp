/**
 * AchievementsGrid.jsx — Phase 10
 *
 * Renders automatically-generated achievements from computed experience
 * data. Unlocked achievements show full color; locked achievements show
 * progress bars. Never manually assigned.
 */
import React from 'react';
import { Trophy, Medal, Flag, Crown, Camera, Newspaper, BadgeCheck, Sparkles, Award, MapPin, Zap, TrendingUp, CheckCircle, Lock } from 'lucide-react';

const ICON_MAP = {
  'trophy': Trophy, 'medal': Medal, 'flag': Flag, 'crown': Crown,
  'camera': Camera, 'newspaper': Newspaper, 'badge-check': BadgeCheck,
  'sparkles': Sparkles, 'award': Award, 'map-pin': MapPin, 'zap': Zap,
  'trending-up': TrendingUp, 'check-circle': CheckCircle,
};

const CATEGORY_COLORS = {
  milestone: 'from-blue-50 to-blue-100 border-blue-200',
  wins: 'from-yellow-50 to-yellow-100 border-yellow-200',
  podiums: 'from-orange-50 to-orange-100 border-orange-200',
  championship: 'from-purple-50 to-purple-100 border-purple-200',
  track: 'from-green-50 to-green-100 border-green-200',
  class: 'from-teal-50 to-teal-100 border-teal-200',
  record: 'from-pink-50 to-pink-100 border-pink-200',
};

export default function AchievementsGrid({ achievements = [] }) {
  if (!achievements || achievements.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No achievements yet. Achievements unlock automatically as you race.</p>
      </div>
    );
  }

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <div className="space-y-6">
      {unlocked.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Unlocked ({unlocked.length})</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {unlocked.map(ach => {
              const Icon = ICON_MAP[ach.icon] || Trophy;
              const colorClass = CATEGORY_COLORS[ach.category] || 'from-gray-50 to-gray-100 border-gray-200';
              return (
                <div key={ach.id} className={`bg-gradient-to-br ${colorClass} border rounded-xl p-3 text-center`}>
                  <div className="w-10 h-10 mx-auto rounded-full bg-white/60 flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-[#232323]" />
                  </div>
                  <div className="text-xs font-bold text-[#232323] leading-tight">{ach.title}</div>
                  <div className="text-[10px] text-gray-500 mt-1 leading-tight">{ach.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-gray-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">In Progress ({locked.length})</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {locked.map(ach => {
              const Icon = ICON_MAP[ach.icon] || Flag;
              const progress = ach.progress || 0;
              const target = ach.target || 1;
              const pct = Math.min(100, Math.round((progress / target) * 100));
              return (
                <div key={ach.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center opacity-70">
                  <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="text-xs font-bold text-gray-500 leading-tight">{ach.title}</div>
                  <div className="text-[10px] text-gray-400 mt-1 leading-tight">{ach.description}</div>
                  {target > 1 && (
                    <div className="mt-2">
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[9px] text-gray-400 mt-1">{progress} / {target}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}