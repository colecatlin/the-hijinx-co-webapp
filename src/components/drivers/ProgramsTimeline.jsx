import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import { Badge } from '@/components/ui/badge';
import { Flag, Calendar, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

function ProgramCard({ program, isActive, allSeries = [], allClasses = [] }) {
  const resolvedSeriesName = program.series_id
    ? allSeries.find(s => s.id === program.series_id)?.name || program.series_name || 'Unknown Series'
    : program.series_name || 'Unknown Series';

  const name = program.program_type === 'single_event'
    ? (program.event_name || 'Unnamed Event')
    : resolvedSeriesName;

  const resolvedClassName = program.series_class_id
    ? allClasses.find(c => c.id === program.series_class_id)?.class_name || program.class_name
    : program.class_name;

  const dateRange = program.program_type === 'single_event'
    ? (program.event_date || '')
    : program.status === 'inactive' && program.end_year
      ? `${program.start_year} – ${program.end_year}`
      : `${program.start_year} – Present`;

  return (
    <Link
      to={`${createPageUrl('DriverProgramProfile')}?programId=${program.id}`}
      className={`block group border rounded-xl p-4 transition-all hover:shadow-md ${
        isActive
          ? 'border-[#00FFDA] bg-white hover:border-[#00FFDA]'
          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {program.program_type === 'single_event' ? (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                <Calendar className="w-3 h-3" /> Single Event
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                <Flag className="w-3 h-3" /> Series
              </span>
            )}
            {isActive && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                ● Active
              </span>
            )}
          </div>

          <div className="font-bold text-[#232323] text-base leading-tight truncate">{name}</div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-gray-500">
            {program.car_number && (
              <span className="font-semibold text-[#232323]">#{program.car_number}</span>
            )}
            {resolvedClassName && (
              <span className="flex items-center gap-1">
                {resolvedClassName}
                {program.is_rookie && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-yellow-400 text-black font-black text-xs leading-none">R</span>
                )}
              </span>
            )}
            {program.team_name && <span>{program.team_name}</span>}
            {dateRange && <span className="text-xs">{dateRange}</span>}
            {program.track_name && <span className="text-xs">{program.track_name}</span>}
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-[#00FFDA] shrink-0 mt-1 transition-colors" />
      </div>
    </Link>
  );
}

export default function ProgramsTimeline({ programs = [], teams = [], allSeries = [], allClasses = [] }) {
  // Enrich with team name
  const enriched = programs.map(p => ({
    ...p,
    team_name: p.team_name || teams.find(t => t.id === p.team_id)?.name || '',
  }));

  // Sort: active first, then by most recent end date
  const sorted = enriched.sort((a, b) => {
    const aActive = a.status === 'active' ? 1 : 0;
    const bActive = b.status === 'active' ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    const getEndDate = (p) => {
      if (p.end_date) return new Date(p.end_date).getTime();
      if (p.end_year) return new Date(`${p.end_year}-12-31`).getTime();
      return 0;
    };
    return getEndDate(b) - getEndDate(a);
  });

  if (programs.length === 0) {
    return (
      <p className="text-gray-400 text-sm italic">No racing programs listed.</p>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map(p => (
        <ProgramCard key={p.id} program={p} isActive={p.status === 'active'} allSeries={allSeries} allClasses={allClasses} />
      ))}
    </div>
  );
}