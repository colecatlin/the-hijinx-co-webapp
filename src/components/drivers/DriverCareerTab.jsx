import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Flag, BookOpen, Star } from 'lucide-react';

const STATUS_COLORS = {
  Active: 'bg-green-50 text-green-700 border-green-200',
  Completed: 'bg-blue-50 text-blue-700 border-blue-200',
  Planned: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Partial: 'bg-orange-50 text-orange-700 border-orange-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
};

function EntryBlock({ entry, isPrimary }) {
  const label = entry.season_label || entry.series_name_override || entry.class_name_override || null;
  const team = entry.team_name_override || null;
  const hasStats = entry.starts || entry.wins || entry.podiums || entry.top_fives || entry.top_tens;

  return (
    <div className={`rounded-xl p-5 border transition-colors ${
      isPrimary
        ? 'border-[#232323] bg-white shadow-sm'
        : 'border-gray-200 bg-gray-50/60'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isPrimary && (
              <Badge className="bg-[#232323] text-white text-[10px] px-1.5 py-0 h-auto flex items-center gap-1">
                <Star className="w-2.5 h-2.5" />Primary
              </Badge>
            )}
            {entry.number && (
              <span className="text-sm font-bold text-gray-500">#{entry.number}</span>
            )}
            {entry.program_status && (
              <Badge className={`text-[10px] px-1.5 py-0 h-auto border ${STATUS_COLORS[entry.program_status] || 'bg-gray-100 text-gray-600'}`}>
                {entry.program_status}
              </Badge>
            )}
            {entry.championship_position && (
              <Badge className="bg-[#00FFDA]/10 text-[#006B5A] border border-[#00FFDA]/30 text-[10px]">
                <Trophy className="w-2.5 h-2.5 mr-1" />P{entry.championship_position} Championship
              </Badge>
            )}
          </div>

          {label && (
            <p className={`font-semibold leading-snug ${isPrimary ? 'text-[#232323]' : 'text-gray-600'}`}>{label}</p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-gray-500 mt-0.5">
            {team && <span>{team}</span>}
            {entry.vehicle && <span>· {entry.vehicle}</span>}
            {entry.manufacturer && <span>· {entry.manufacturer}</span>}
          </div>
        </div>
        {isPrimary && <Flag className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />}
      </div>

      {hasStats && (
        <div className="grid grid-cols-5 gap-2 mb-3">
          {[
            ['Starts', entry.starts],
            ['Wins', entry.wins],
            ['Podiums', entry.podiums],
            ['Top 5', entry.top_fives],
            ['Top 10', entry.top_tens],
          ].map(([lbl, val]) => val != null ? (
            <div key={lbl} className={`rounded-lg p-2.5 text-center border ${isPrimary ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100'}`}>
              <div className="text-lg font-black text-[#232323]">{val}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">{lbl}</div>
            </div>
          ) : null)}
        </div>
      )}

      {entry.notes && (
        <p className={`text-sm rounded-lg p-3 leading-relaxed ${
          isPrimary
            ? 'text-gray-600 bg-gray-50 border-l-2 border-[#00FFDA]'
            : 'text-gray-500 bg-white border-l-2 border-gray-200'
        }`}>
          {entry.notes}
        </p>
      )}
    </div>
  );
}

export default function DriverCareerTab({ driverId, initialEntries }) {
  const [filterYear, setFilterYear] = useState('all');

  const { data: careerEntries = [], isLoading } = useQuery({
    queryKey: ['driverCareerEntries', driverId],
    queryFn: () => base44.entities.DriverCareerEntry.filter({ driver_id: driverId }, '-year'),
    enabled: !!driverId,
    staleTime: 5 * 60 * 1000,
    initialData: initialEntries?.length > 0 ? initialEntries : undefined,
  });

  const years = useMemo(() =>
    [...new Set(careerEntries.map(e => e.year))].filter(Boolean).sort((a, b) => b - a),
    [careerEntries]
  );

  // Aggregate career totals (primary programs only to avoid double-counting where possible)
  const totals = useMemo(() => {
    const toCount = careerEntries.filter(e => e.is_primary_program || careerEntries.filter(x => x.year === e.year).length === 1);
    return toCount.reduce((acc, e) => ({
      starts: acc.starts + (e.starts || 0),
      wins: acc.wins + (e.wins || 0),
      podiums: acc.podiums + (e.podiums || 0),
      top_fives: acc.top_fives + (e.top_fives || 0),
      top_tens: acc.top_tens + (e.top_tens || 0),
    }), { starts: 0, wins: 0, podiums: 0, top_fives: 0, top_tens: 0 });
  }, [careerEntries]);

  // Group and sort by year
  const groupedYears = useMemo(() => {
    const filtered = filterYear === 'all' ? years : years.filter(y => String(y) === filterYear);
    return filtered.map(year => {
      const yearEntries = careerEntries
        .filter(e => e.year === year)
        .sort((a, b) => {
          if (a.is_primary_program && !b.is_primary_program) return -1;
          if (!a.is_primary_program && b.is_primary_program) return 1;
          return (a.sort_order ?? 99) - (b.sort_order ?? 99);
        });
      return { year, entries: yearEntries };
    });
  }, [careerEntries, years, filterYear]);

  if (isLoading) return <div className="py-12 text-center text-gray-400 text-sm">Loading career history…</div>;

  if (careerEntries.length === 0) {
    return (
      <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl">
        <BookOpen className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-500">No career history yet</p>
        <p className="text-sm text-gray-400 mt-1">Career entries will appear here when added.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Career Totals */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Career Totals</h3>
        <div className="grid grid-cols-5 gap-3">
          {[
            ['Starts', totals.starts],
            ['Wins', totals.wins],
            ['Podiums', totals.podiums],
            ['Top 5s', totals.top_fives],
            ['Top 10s', totals.top_tens],
          ].map(([label, val]) => (
            <div key={label} className="bg-[#232323] text-white rounded-lg p-4 text-center">
              <div className="text-2xl font-black">{val}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Year filter */}
      {years.length > 1 && (
        <div className="flex flex-wrap gap-3">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Timeline — grouped by year */}
      <div className="space-y-8">
        {groupedYears.map(({ year, entries }) => (
          <div key={year}>
            {/* Year heading */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black text-[#232323]">{year}</span>
              {entries.length > 1 && (
                <span className="text-xs text-gray-400 font-medium">{entries.length} programs</span>
              )}
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Primary entry */}
            {entries.filter(e => e.is_primary_program).map(e => (
              <EntryBlock key={e.id} entry={e} isPrimary={true} />
            ))}

            {/* Secondary entries (or sole entry with no primary flag) */}
            {entries.filter(e => !e.is_primary_program).length > 0 && (
              <div className={entries.some(e => e.is_primary_program) ? 'mt-3 space-y-2 pl-4 border-l-2 border-gray-100' : 'space-y-2'}>
                {entries.filter(e => !e.is_primary_program).map(e => (
                  <EntryBlock key={e.id} entry={e} isPrimary={false} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}