import React from 'react';
import { CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import {
  checkDriverCompleteness,
  checkTeamCompleteness,
  checkTrackCompleteness,
  checkSeriesCompleteness,
  checkEventCompleteness,
} from './profileCompleteness';

const checkers = {
  Driver: checkDriverCompleteness,
  Team: checkTeamCompleteness,
  Track: checkTrackCompleteness,
  Series: checkSeriesCompleteness,
  Event: checkEventCompleteness,
};

const levelStyles = {
  public_ready: 'bg-green-50 text-green-700 border-green-200',
  operational: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  incomplete: 'bg-red-50 text-red-700 border-red-200',
};

const LevelIcon = ({ level }) => {
  if (level === 'public_ready') return <CheckCircle2 className="w-3.5 h-3.5" />;
  if (level === 'operational') return <Eye className="w-3.5 h-3.5" />;
  return <AlertCircle className="w-3.5 h-3.5" />;
};

export default function ProfileCompletenessIndicator({ entityType, record }) {
  if (!record) return null;
  const check = checkers[entityType];
  if (!check) return null;

  const { level, badge, missingRequired, missingRecommended } = check(record);
  const missing = [...missingRequired, ...missingRecommended];

  return (
    <div className="group relative inline-flex">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${levelStyles[level]}`}>
        <LevelIcon level={level} />
        {badge}
      </span>
      {missing.length > 0 && (
        <div className="absolute top-full left-0 mt-1.5 z-50 hidden group-hover:block bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
          {missingRequired.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Required</p>
              {missingRequired.map(f => <p key={f} className="text-xs text-gray-700">· {f}</p>)}
            </div>
          )}
          {missingRecommended.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider mb-1">Recommended</p>
              {missingRecommended.map(f => <p key={f} className="text-xs text-gray-700">· {f}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}