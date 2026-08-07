import React from 'react';
import { Trophy, Flag, Award, Crown, MapPin, Users, Lock } from 'lucide-react';

const ICON_MAP = { Flag, Trophy, Award, Crown, MapPin, Users, Lock };

export default function VehicleAchievementsGrid({ achievements }) {
  if (!achievements || achievements.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No achievements yet. Achievements unlock as the vehicle competes.</p>
      </div>
    );
  }

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <div className="space-y-6">
      {unlocked.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Unlocked ({unlocked.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {unlocked.map((ach) => {
              const Icon = ICON_MAP[ach.icon] || Trophy;
              return (
                <div key={ach.id} className="bg-gradient-to-br from-[#00FFDA]/10 to-[#00E6CC]/5 rounded-lg border border-[#00FFDA]/30 p-4 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#00FFDA]/20 flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-[#00BFA5]" />
                  </div>
                  <div className="font-bold text-[#232323] text-sm">{ach.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{ach.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {locked.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">In Progress ({locked.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {locked.map((ach) => {
              const Icon = ICON_MAP[ach.icon] || Trophy;
              const progress = ach.progress && ach.target ? Math.round((ach.progress / ach.target) * 100) : 0;
              return (
                <div key={ach.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center opacity-70">
                  <div className="w-10 h-10 mx-auto rounded-full bg-gray-200 flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="font-bold text-gray-500 text-sm">{ach.title}</div>
                  <div className="text-xs text-gray-400 mt-1">{ach.description}</div>
                  {ach.progress !== undefined && ach.target && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#00FFDA] rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{ach.progress} / {ach.target}</div>
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