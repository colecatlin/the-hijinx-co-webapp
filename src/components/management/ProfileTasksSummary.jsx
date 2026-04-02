import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import {
  checkDriverCompleteness,
  checkTeamCompleteness,
  checkTrackCompleteness,
  checkSeriesCompleteness,
} from '@/components/system/profileCompleteness';

const checkers = {
  Driver: checkDriverCompleteness,
  Team: checkTeamCompleteness,
  Track: checkTrackCompleteness,
  Series: checkSeriesCompleteness,
};

const editorPaths = {
  Driver: (id) => `/race-core/drivers/${id}`,
  Team: (id) => `/race-core/teams/${id}`,
  Track: (id) => `/race-core/tracks/${id}`,
  Series: (id) => `/race-core/series/${id}`,
};

const getLabel = (entity, entityType) => {
  if (entityType === 'Driver') return `${entity.first_name} ${entity.last_name}`;
  return entity.name;
};

export default function ProfileTasksSummary({ entityType, records = [] }) {
  const navigate = useNavigate();
  const check = checkers[entityType];
  if (!check || records.length === 0) return null;

  const incomplete = records
    .map(r => ({ record: r, result: check(r) }))
    .filter(({ result }) => result.level !== 'public_ready')
    .slice(0, 5);

  if (incomplete.length === 0) return null;

  const totalIncomplete = records.filter(r => check(r).level !== 'public_ready').length;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-sm font-semibold text-amber-900">
          {totalIncomplete} {entityType}{totalIncomplete !== 1 ? 's' : ''} need profile attention
        </p>
      </div>
      <div className="space-y-1.5">
        {incomplete.map(({ record, result }) => (
          <div key={record.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`shrink-0 w-2 h-2 rounded-full ${result.level === 'incomplete' ? 'bg-red-400' : 'bg-yellow-400'}`} />
              <span className="text-sm text-gray-800 truncate">{getLabel(record, entityType)}</span>
              <span className="text-xs text-gray-500 truncate hidden sm:block">
                — {[...result.missingRequired, ...result.missingRecommended].slice(0, 2).join(', ')}
              </span>
            </div>
            <button
              onClick={() => navigate(editorPaths[entityType](record.id))}
              className="shrink-0 inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
            >
              Fix <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      {totalIncomplete > 5 && (
        <p className="text-xs text-amber-600 mt-2">+{totalIncomplete - 5} more</p>
      )}
    </div>
  );
}