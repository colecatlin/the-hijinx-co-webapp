import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Flag, BookOpen, Star } from 'lucide-react';

const STATUS_COLORS = {
  Active: 'bg-green-50 text-green-700 border-green-200',
  Completed: 'bg-blue-50 text-blue-700 border-blue-200',
  Partial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Planned: 'bg-purple-50 text-purple-700 border-purple-200',
  Cancelled: 'bg-red-50 text-red-600 border-red-200',
};

function EntryCard({ entry, isPrimary }) {
  const seriesLabel = entry.series_name_override;
  const classLabel = entry.class_name_override;
  const teamLabel = entry.team_name_override;

  return (
    <div className={`rounded-xl p-5 border transition-colors ${
      isPrimary
        ? 'border-[#232323] bg-white shadow-sm'
        : 'border-gray-100 bg-gray-50/50'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isPrimary && (
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#232323]">
                <Star className="w-3 h-3 fill-[#232323]" />
                Primary
              </div>
            )}
            {entry.season_label && (
              <span className={`font-bold ${isPrimary ? 'text-lg text-[#232323]' : 'text-sm text-gray-700'}`}>
                {entry.season_label}
              </span>
            )}
            {entry.program_status && entry.program_status !== 'Completed' && (
              <Badge className={`text-[10px] px-1.5 py-0 h-auto border ${STATUS_COLORS[entry.program_status] || ''}`}>
                {entry.program_status}
              </Badge>
            )}
            {entry.championship_position && (
              <Badge className="bg-[#00FFDA]/10 text-[#006B5A] border border-[#00FFDA]/30 text-xs">
                <Trophy className="w-3 h-3 mr-1" />P{entry.championship_position}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-gray-600">
            {seriesLabel && <span className="font-medium">{seriesLabel}</span>}
            {classLabel && <span>· {classLabel}</span>}
            {teamLabel && <span className="text-gray-500">· {teamLabel}</span>}
            {entry.number && <span className="text-gray-500">#{entry.number}</span>}
            {entry.vehicle && <span>· {entry.vehicle}</span>}
            {entry.manufacturer && <span>· {entry.manufacturer}</span>}
          </div>
        </div>
        {!isPrimary && <Flag className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1" />}
      </div>

      {/* Stats */}
      {(entry.starts || entry.wins || entry.podiums || entry.rounds_contested) ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            ['Rounds', entry.rounds_contested],
            ['Starts', entry.starts],
            ['Wins', entry.wins],
            ['Podiums', entry.podiums],
            ['Top 5', entry.top_fives],
            ['Top 10', entry.top_tens],
          ].filter(([, v]) => v != null).map(([label, val]) => (
            <div key={label} className={`rounded-lg px-3 py-2 text-center border ${isPrimary ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100'}`}>
              <div className={`font-black ${isPrimary ? 'text-base text-[#232323]' : 'text-sm text-gray-700'}`}>{val}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      ) : null}

      {entry.notes && (
        <p className={`text-sm bg-gray-50 rounded-lg p-3 leading-relaxed ${isPrimary ? 'border-l-2 border-[#00FFDA] text-gray-600' : 'text-gray-500 italic'}`}>
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

  // Group by year; primary first within each year
  const grouped = useMemo(() => {
    const filtered = filterYear === 'all'
      ? careerEntries
      : careerEntries.filter(e => String(e.year) === filterYear);

    return years
      .filter(y => filterYear === 'all' || String(y) === filterYear)
      .map(year => {
        const yearEntries = filtered
          .filter(e => e.year === year)
          .sort((a, b) => {
            if (a.is_primary_program && !b.is_primary_program) return -1;
            if (!a.is_primary_program && b.is_primary_program) return 1;
            return (a.sort_order ?? 99) - (b.sort_order ?? 99);
          });
        return { year, entries: yearEntries };
      })
      .filter(g => g.entries.length > 0);
  }, [careerEntries, years, filterYear]);

  // Career totals (primary programs only for cleaner stat aggregation)
  const totals = useMemo(() => careerEntries.reduce((acc, e) => ({
    starts: acc.starts + (e.starts || 0),
    wins: acc.wins + (e.wins || 0),
    podiums: acc.podiums + (e.podiums || 0),
    top_fives: acc.top_fives + (e.top_fives || 0),
    top_tens: acc.top_tens + (e.top_tens || 0),
  }), { starts: 0, wins: 0, podiums: 0, top_fives: 0, top_tens: 0 }), [careerEntries]);

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
        <div>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Timeline grouped by year */}
      <div className="space-y-8">
        {grouped.map(({ year, entries: yearEntries }) => {
          const primary = yearEntries.find(e => e.is_primary_program);
          const secondary = yearEntries.filter(e => !e.is_primary_program);

          return (
            <div key={year}>
              {/* Year header */}
              <div className="flex items-center gap-4 mb-3">
                <span className="text-3xl font-black text-[#232323]">{year}</span>
                <div className="flex-1 h-px bg-gray-200" />
                {yearEntries.length > 1 && (
                  <span className="text-xs text-gray-400">{yearEntries.length} programs</span>
                )}
              </div>

              <div className="space-y-3">
                {/* Primary program */}
                {primary && <EntryCard entry={primary} isPrimary={true} />}

                {/* Secondary programs */}
                {secondary.length > 0 && (
                  <div className="space-y-2 pl-4 border-l-2 border-gray-100">
                    {secondary.length > 0 && (
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                        Additional Programs
                      </p>
                    )}
                    {secondary.map(entry => (
                      <EntryCard key={entry.id} entry={entry} isPrimary={false} />
                    ))}
                  </div>
                )}

                {/* If no primary designated, just show all */}
                {!primary && yearEntries.map(entry => (
                  <EntryCard key={entry.id} entry={entry} isPrimary={false} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}